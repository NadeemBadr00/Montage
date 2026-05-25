"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRenderJob = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const path = require("path");
const os = require("os");
const fs = require("fs");
const https = require("https");
const http = require("http");
admin.initializeApp();
// Helper: download a URL to a local file
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const protocol = url.startsWith("https") ? https : http;
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on("finish", () => { file.close(); resolve(); });
        }).on("error", (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}
// Main Cloud Function: triggered when a new render doc is created in Firestore
exports.processRenderJob = functions
    .runWith({ timeoutSeconds: 540, memory: "8GB" })
    .firestore
    .document("renders/{renderId}")
    .onCreate(async (snap, context) => {
    var _a, _b, _c, _d, _e, _f;
    const renderId = context.params.renderId;
    const data = snap.data();
    const docRef = snap.ref;
    console.log(`[Render] Starting job ${renderId}`);
    // Mark as processing
    await docRef.update({ status: "PROCESSING", startedAt: admin.firestore.FieldValue.serverTimestamp() });
    const timeline = data.timeline;
    const fps = timeline.fps || 30;
    const resolution = timeline.resolution || { width: 1920, height: 1080 };
    const tracks = timeline.tracks || [];
    const tmpDir = path.join(os.tmpdir(), renderId);
    try {
        // Lazy require ffmpeg to avoid deployment timeout during code analysis
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffmpeg = require("fluent-ffmpeg");
        ffmpeg.setFfmpegPath(ffmpegInstaller.path);
        fs.mkdirSync(tmpDir, { recursive: true });
        // ── 1. Collect all unique asset URLs ────────────────────────────────────
        const assetUrls = new Set();
        for (const track of tracks) {
            for (const clip of (track.clips || [])) {
                const src = clip.assetUrl || clip.src;
                if (src && (src.startsWith("http://") || src.startsWith("https://"))) {
                    assetUrls.add(src);
                }
            }
        }
        // Download all assets in parallel
        const urlToLocal = new Map();
        await Promise.all(Array.from(assetUrls).map(async (url, i) => {
            const ext = url.includes(".png") ? ".png" : url.includes(".jpg") ? ".jpg" : ".mp4";
            const localPath = path.join(tmpDir, `asset_${i}${ext}`);
            try {
                await downloadFile(url, localPath);
                urlToLocal.set(url, localPath);
                console.log(`[Render] Downloaded asset ${i}: ${url.slice(-40)}`);
            }
            catch (e) {
                console.error(`[Render] Failed to download asset: ${url}`, e);
            }
        }));
        // ── 2. Build ffmpeg filter_complex for timeline compositing ─────────────
        // Sort clips by track z-order (first track = bottom)
        const allClips = [];
        for (const track of tracks) {
            for (const clip of (track.clips || [])) {
                const src = clip.assetUrl || clip.src;
                const local = urlToLocal.get(src);
                if (!local && clip.type !== "image")
                    continue;
                allClips.push(Object.assign(Object.assign({}, clip), { localPath: local }));
            }
        }
        if (allClips.length === 0) {
            throw new Error("No downloadable clips found in timeline");
        }
        // Simple approach: use ffmpeg to overlay clips sequentially
        const totalDuration = timeline.duration ||
            Math.max(...allClips.map((c) => (c.start || 0) + (c.duration || 0)));
        // Build a concat/overlay filter
        // For now: create a video from the first video clip, overlay images, mix audio
        const audioClips = allClips.filter((c) => (c.type === "audio" || c.type === "video") && c.localPath);
        const outputPath = path.join(tmpDir, "output.mp4");
        // Build ffmpeg command
        const cmd = ffmpeg();
        // Add background (black or first video)
        let inputIndex = 0;
        // Add all inputs in order, assigning a unique ffmpeg input index to each clip
        for (const clip of allClips) {
            if (!clip.localPath)
                continue;
            cmd.input(clip.localPath);
            if (clip.type === "image") {
                // fluent-ffmpeg applies inputOptions to the LAST added input
                cmd.inputOptions(["-loop", "1"]);
            }
            clip.ffmpegInputIndex = inputIndex++;
        }
        // Build filter_complex
        let filterParts = [];
        let lastVideo = "";
        if (allClips.length === 0) {
            throw new Error("No clips to render");
        }
        const w = resolution.width;
        const h = resolution.height;
        // Create base black canvas
        filterParts.push(`color=black:s=${w}x${h}:r=${fps}:d=${totalDuration}[base]`);
        lastVideo = "[base]";
        // Overlay each clip
        for (const clip of allClips) {
            if (clip.ffmpegInputIndex === undefined)
                continue;
            const idx = clip.ffmpegInputIndex;
            const outLabel = `[out${idx}]`;
            const start = clip.start || 0;
            const duration = clip.duration || 5;
            const x = Math.round((((_a = clip.properties) === null || _a === void 0 ? void 0 : _a.x) || 0) + w / 2 - (((_b = clip.properties) === null || _b === void 0 ? void 0 : _b.width) || w) / 2);
            const y = Math.round((((_c = clip.properties) === null || _c === void 0 ? void 0 : _c.y) || 0) + h / 2 - (((_d = clip.properties) === null || _d === void 0 ? void 0 : _d.height) || h) / 2);
            const cw = ((_e = clip.properties) === null || _e === void 0 ? void 0 : _e.width) || w;
            const ch = ((_f = clip.properties) === null || _f === void 0 ? void 0 : _f.height) || h;
            // Scale clip to its display size and delay start time
            filterParts.push(`[${idx}:v]scale=${cw}:${ch},setpts=PTS-STARTPTS+${start}/TB[${idx}sc]`);
            // Overlay onto canvas at the right time
            filterParts.push(`${lastVideo}[${idx}sc]overlay=${x}:${y}:enable='between(t,${start},${start + duration})':format=auto[${outLabel.slice(1, -1)}]`);
            lastVideo = outLabel;
        }
        // Map final video
        filterParts.push(`${lastVideo}copy[finalv]`);
        // Handle Audio Mixing
        if (audioClips.length > 0) {
            audioClips.forEach(c => {
                const delayMs = (c.start || 0) * 1000;
                filterParts.push(`[${c.ffmpegInputIndex}:a]adelay=${delayMs}|${delayMs}[a${c.ffmpegInputIndex}]`);
            });
            const mixInputs = audioClips.map(c => `[a${c.ffmpegInputIndex}]`).join('');
            filterParts.push(`${mixInputs}amix=inputs=${audioClips.length}:duration=longest[finala]`);
        }
        cmd
            .complexFilter(filterParts)
            .outputOptions([
            `-map [finalv]`,
            "-c:v libx264",
            "-preset fast",
            "-crf 23",
            `-r ${fps}`,
            "-pix_fmt yuv420p",
            "-movflags +faststart",
            `-t ${totalDuration}`
        ]);
        if (audioClips.length > 0) {
            cmd.outputOptions([
                "-map [finala]",
                "-c:a aac",
                "-b:a 128k"
            ]);
        }
        else {
            cmd.outputOptions("-an");
        }
        cmd.output(outputPath);
        console.log(`[Render] Starting ffmpeg render for ${renderId}...`);
        await new Promise((resolve, reject) => {
            cmd
                .on("progress", (p) => {
                var _a;
                console.log(`[Render] Progress: ${((_a = p.percent) === null || _a === void 0 ? void 0 : _a.toFixed(1)) || '?'}%`);
            })
                .on("end", () => {
                console.log(`[Render] ffmpeg done for ${renderId}`);
                resolve();
            })
                .on("error", (err) => {
                console.error(`[Render] ffmpeg error for ${renderId}:`, err);
                reject(err);
            })
                .run();
        });
        // ── 3. Upload output MP4 to Firebase Storage ─────────────────────────────
        const bucket = admin.storage().bucket();
        const storagePath = `renders/${renderId}/output.mp4`;
        const token = require("crypto").randomUUID();
        await bucket.upload(outputPath, {
            destination: storagePath,
            metadata: {
                contentType: "video/mp4",
                metadata: {
                    firebaseStorageDownloadTokens: token
                }
            }
        });
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
        // ── 4. Update Firestore doc with result ──────────────────────────────────
        await docRef.update({
            status: "COMPLETED",
            downloadUrl,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[Render] Job ${renderId} COMPLETED. URL: ${downloadUrl.slice(0, 60)}...`);
        // Cleanup
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    catch (error) {
        console.error(`[Render] Job ${renderId} FAILED:`, error);
        await docRef.update({
            status: "FAILED",
            error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
            failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=index.js.map