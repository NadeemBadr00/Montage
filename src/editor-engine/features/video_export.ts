import * as Mp4Muxer from 'mp4-muxer';

import { MP4Decoder } from './MP4Decoder';
import { mixdownAudio } from './video_export_audio';

import { db, storage } from '../../firebase';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function exportToMP4ClientSide(app: any, options: any) {
    return await startCanvasRecording(app, options);
}

export async function startCanvasRecording(app: any, options: any) {
    const btn = document.getElementById('export-mp4-btn');
    let overlay = document.getElementById('export-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'export-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        overlay.style.backdropFilter = 'blur(5px)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.color = 'white';
        overlay.style.fontFamily = 'Inter, sans-serif';
        overlay.style.fontSize = '24px';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    overlay.innerHTML = `<div><i class="fa-solid fa-spinner fa-spin"></i> Preparing Export...</div>`;

    let decoders: Map<string, MP4Decoder> | undefined;

    try {
        if (typeof (window as any).VideoEncoder === 'undefined') {
            alert("Your browser does not support WebCodecs API. Please use Chrome 94+ or Edge.");
            if (btn) btn.innerHTML = '<i class="fa-solid fa-download"></i> MP4 Export';
            overlay.style.display = 'none';
            return;
        }

        app.isExporting = true;
        app.pausePlayback();
        const duration = isNaN(app.duration) || app.duration === 0 ? 5 : app.duration;
        const fps = app.FPS || 30;
        const totalFrames = Math.ceil(duration * fps);
        
        // Hide UI overlays during export
        const savedSelectedIds = new Set(app.selectedClipIds);
        app.selectedClipIds.clear();
        app.hoveredClip = null;
        
        // ✅ Compute anySolo locally (same as we do in the preview renderer)
        const anySolo = app.tracks.some((t: any) => t.isSolo);

        // --- 1. Offline Audio Mixdown ---
        overlay.innerHTML = `<div><i class="fa-solid fa-music"></i> Mixing Audio...</div>`;
        const sampleRate = 44100;
        const renderedAudio = await mixdownAudio(app, options);
        const hasAudio = renderedAudio !== null;

        const { resolution = 1080, compressionMult = 0.6, codec = 'avc' } = options || {};
        const h = resolution;
        const w = Math.round((h * 16) / 9);

        let bitrate = 4_000_000;
        if (h >= 2160) bitrate = 40_000_000;
        else if (h >= 1440) bitrate = 16_000_000;
        else if (h >= 1080) bitrate = 8_000_000;
        else if (h === 540) bitrate = 3_000_000;
        else if (h === 480) bitrate = 2_500_000;
        else if (h === 360) bitrate = 1_000_000;
        else if (h === 240) bitrate = 700_000;
        else if (h === 144) bitrate = 400_000;

        bitrate = Math.round(bitrate * compressionMult);

        let muxerCodec = 'avc';
        let encoderCodecString = 'avc1.42001f';
        if (h >= 2160) {
            encoderCodecString = 'avc1.640033'; // 4K
        } else if (h >= 1080) {
            encoderCodecString = 'avc1.42002a'; // 1080p
        }
        
        if (codec === 'hevc') {
            muxerCodec = 'hevc';
            encoderCodecString = 'hev1.1.6.L150.90';
        }

        // Validate codec support before starting the whole process
        const support = await VideoEncoder.isConfigSupported({ codec: encoderCodecString, width: w, height: h, bitrate });
        if (!support.supported) {
            alert(`Your GPU does not support hardware encoding for ${codec.toUpperCase()} at ${w}x${h}. Try H.264 or a lower resolution.`);
            overlay.style.display = 'none';
            return;
        }

        // Create a completely isolated OffscreenCanvas for rendering.
        // This prevents the visible UI canvas from updating, eliminating DOM reflows and lag!
        const origCanvas = app.canvas;
        const origCtx = app.ctx;
        app.canvas = new OffscreenCanvas(w, h);
        app.ctx = app.canvas.getContext('2d');

        // --- 2. WebCodecs Muxer Setup ---
        const muxerTarget = new Mp4Muxer.ArrayBufferTarget();
        let muxer = new Mp4Muxer.Muxer({
            target: muxerTarget,
            video: {
                codec: muxerCodec as any,
                width: w,
                height: h
            },
            audio: hasAudio ? {
                codec: 'aac',
                sampleRate: sampleRate,
                numberOfChannels: 2
            } : undefined,
            fastStart: 'in-memory',
            firstTimestampBehavior: 'offset'
        });

        let videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                if (meta && meta.decoderConfig === null) {
                    delete meta.decoderConfig;
                }
                muxer.addVideoChunk(chunk, meta as any);
            },
            error: e => console.error(e)
        });
        
        const encWidth = w % 2 === 0 ? w : w - 1;
        const encHeight = h % 2 === 0 ? h : h - 1;

        videoEncoder.configure({
            codec: encoderCodecString,
            width: encWidth,
            height: encHeight,
            bitrate: bitrate,
            bitrateMode: "variable",
            framerate: fps,
            hardwareAcceleration: "prefer-hardware"
        });

        let audioEncoder: AudioEncoder | null = null;
        if (hasAudio) {
            audioEncoder = new AudioEncoder({
                output: (chunk, meta) => muxer.addAudioChunk(chunk, meta as any),
                error: e => console.error(e)
            });
            audioEncoder.configure({
                codec: 'mp4a.40.2',
                sampleRate: sampleRate,
                numberOfChannels: 2,
                bitrate: 128_000
            });
        }

        // --- 3. Encode Audio (Chunked) ---
        if (hasAudio && renderedAudio && audioEncoder) {
            overlay.innerHTML = `<div><i class="fa-solid fa-wave-square"></i> Encoding Audio...</div>`;
            const frameCount = renderedAudio.length;
            const numChannels = renderedAudio.numberOfChannels;
            const chunkSize = sampleRate; // 1 second chunks

            for (let i = 0; i < frameCount; i += chunkSize) {
                const chunkFrames = Math.min(chunkSize, frameCount - i);
                const data = new Float32Array(chunkFrames * numChannels);
                for (let c = 0; c < numChannels; c++) {
                    const channelData = renderedAudio.getChannelData(c);
                    data.set(channelData.subarray(i, i + chunkFrames), c * chunkFrames);
                }
                const audioData = new (window as any).AudioData({
                    format: 'f32-planar',
                    sampleRate: sampleRate,
                    numberOfFrames: chunkFrames,
                    numberOfChannels: numChannels,
                    timestamp: (i / sampleRate) * 1_000_000,
                    data: data
                });
                audioEncoder.encode(audioData);
                audioData.close();
            }
            await audioEncoder.flush();
        }

        // --- 3.5. Initialize WebCodecs MP4Decoders (Phase 2b: parallel init, concurrency = 4) ---
        overlay.innerHTML = `<div><i class="fa-solid fa-microchip"></i> Initializing Decoders...</div>`;
        decoders = new Map<string, MP4Decoder>();

        // Collect all blob video clips
        const videoClipsToInit: any[] = [];
        for (const track of app.tracks) {
            for (const clip of track.clips) {
                if (clip.type === 'video' && clip.src?.startsWith('blob:')) {
                    videoClipsToInit.push(clip);
                }
            }
        }

        // ⚡ Phase 2b: Parallel decoder init with concurrency limit = 4
        const DECODER_CONCURRENCY = 4;
        const initDecoder = async (clip: any) => {
            try {
                const res = await fetch(clip.src);
                const blob = await res.blob();
                const decoder = new MP4Decoder();
                await decoder.initialize(blob);
                decoders!.set(clip.id, decoder);
                console.log(`[Export] ✅ Decoder ready for ${clip.id}`);
            } catch (e) {
                console.warn(`[Export] ⚠️ Decoder failed for ${clip.id}, will skip frame decode:`, e);
            }
        };
        for (let i = 0; i < videoClipsToInit.length; i += DECODER_CONCURRENCY) {
            await Promise.all(videoClipsToInit.slice(i, i + DECODER_CONCURRENCY).map(initDecoder));
        }

        console.log(`[Export] All decoders initialized (${decoders.size}/${videoClipsToInit.length}). Starting loop.`);
        app.exportVideoFrames = new Map<string, any>();

        // ⚡ Phase 2d: event-driven backpressure — encoder tells us when ready, no polling
        const waitForEncoder = (encoder: VideoEncoder): Promise<void> => {
            if (encoder.encodeQueueSize <= 20) return Promise.resolve();
            return new Promise(resolve => {
                const onDequeue = () => {
                    if (encoder.encodeQueueSize <= 10) {
                        encoder.removeEventListener('dequeue', onDequeue);
                        resolve();
                    }
                };
                encoder.addEventListener('dequeue', onDequeue);
            });
        };

        // --- 4. Offline Video Render Loop (Frame by Frame) ---
        // ⚡ Phase 1: awaitSeek() removed — WebCodecs decoders handle all video seeking directly
        // ⚡ Phase 2a: parallel getFrameAtTime() across all visible clips per frame
        for (let frame = 0; frame < totalFrames; frame++) {
            app.currentTime = frame / fps;

            // Collect all visible video clips that have a decoder
            const visibleDecodeJobs: Array<{ clipId: string; sourceTime: number; decoder: MP4Decoder }> = [];
            for (const track of app.tracks) {
                if (track.isMuted || (anySolo && !track.isSolo)) continue;
                for (const clip of track.getClipsAtTime(app.currentTime)) {
                    if (clip.type === 'video' && decoders!.has(clip.id)) {
                        const timeInClip = app.currentTime - clip.start;
                        const sourceTime = (clip.sourceIn || 0) + timeInClip;
                        visibleDecodeJobs.push({ clipId: clip.id, sourceTime, decoder: decoders!.get(clip.id)! });
                    }
                }
            }

            // ⚡ Phase 2a: decode ALL visible clips simultaneously
            app.exportVideoFrames.clear();
            if (visibleDecodeJobs.length > 0) {
                const decoded = await Promise.allSettled(
                    visibleDecodeJobs.map(({ clipId, sourceTime, decoder }) =>
                        decoder.getFrameAtTime(sourceTime).then(vf => ({ clipId, vf }))
                    )
                );
                decoded.forEach(result => {
                    if (result.status === 'fulfilled') {
                        app.exportVideoFrames.set(result.value.clipId, result.value.vf);
                    } else {
                        console.warn('[Export] Frame decode failed:', result.reason);
                    }
                });
            }

            // ⚡ Phase 2a.5: Synchronous AI Mask Generation for Export (Sandwich Mode)
            for (const track of app.tracks) {
                if (track.isMuted || (anySolo && !track.isSolo)) continue;
                for (const clip of track.getClipsAtTime(app.currentTime)) {
                    if (clip.aiSegmentation && clip.aiSegmentation.enabled && app.exportVideoFrames.has(clip.id)) {
                        const vf = app.exportVideoFrames.get(clip.id);
                        if (vf && typeof app.generateAiMaskForExport === 'function') {
                            try {
                                // Await the AI worker to generate a perfect mask at export resolution (w x h)
                                const mask = await app.generateAiMaskForExport(clip, app.currentTime, vf, w, h);
                                if (mask) {
                                    clip.aiMask = mask;
                                }
                            } catch (e) {
                                console.error("[Export] AI Mask generation failed for", clip.id, e);
                            }
                        }
                    }
                }
            }

            // ⚡ Phase 1: managePlayers() is DISABLED during export to prevent UI playhead updates and DOM reflows!
            // HTML5 elements are not used for video/audio during offline export anyway.
            // app.managePlayers();

            // Composite frame via WebGL
            app.renderFrameToCanvas();

            // ⚡ Phase 2e: guaranteed frame cleanup via try/finally
            const canvasTimestamp = (frame / fps) * 1_000_000;
            let canvasFrame: any = null;
            try {
                canvasFrame = new (window as any).VideoFrame(app.canvas, { timestamp: canvasTimestamp });
                // ⚡ Phase 2d: event-driven backpressure before encoding
                await waitForEncoder(videoEncoder);
                videoEncoder.encode(canvasFrame, { keyFrame: frame % 30 === 0 });
            } finally {
                // Always close decoded frames and canvas frame — even on error
                app.exportVideoFrames.forEach((vf: any) => { try { vf.close(); } catch(e){} });
                app.exportVideoFrames.clear();
                if (canvasFrame) { try { canvasFrame.close(); } catch(e){} }
            }

            if (frame % 5 === 0) {
                const percent = Math.round((frame / totalFrames) * 100);
                overlay.innerHTML = `<div><i class="fa-solid fa-video"></i> Rendering Video: ${percent}%</div>
                <div style="width: 300px; height: 10px; background: #333; border-radius: 5px; margin-top: 15px; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; background: #ef4444; transition: width 0.1s;"></div>
                </div>`;
            }
        }

        // --- 5. Finalize and Download ---
        overlay.innerHTML = `<div><i class="fa-solid fa-box-archive"></i> Muxing MP4...</div>`;
        await videoEncoder.flush();
        muxer.finalize();
        
        // Clean up WebCodecs decoders
        if (decoders) {
            decoders.forEach((d: MP4Decoder) => { try { d.destroy(); } catch(e){} });
            decoders.clear();
        }
        app.exportVideoFrames = undefined;
        
        const buffer = muxerTarget.buffer;
        const blob = new Blob([buffer], { type: 'video/mp4' });
        if (!options?.returnBlob) {
            downloadBlob(blob, 'project_final.mp4');
        }
        
        app.currentTime = 0;
        app.seek(0);
        
        // Restore original UI canvas
        app.canvas = origCanvas;
        app.ctx = origCtx;
        
        app.isExporting = false;
        app.requestRedraw();
        
        savedSelectedIds.forEach(id => app.selectedClipIds.add(id));
        if (btn) btn.innerHTML = '<i class="fa-solid fa-download"></i> MP4 Export';
        overlay.style.display = 'none';

        if (options?.returnBlob) {
            return blob;
        }
    } catch (globalError) {
        alert(`Critical Export Error: ${globalError}`);
        console.error("Export Error:", globalError);
        
        // Clean up decoders on error
        if (typeof decoders !== 'undefined') {
            decoders.forEach((d: MP4Decoder) => { try { d.destroy(); } catch(e){} });
            decoders.clear();
        }
        if (app.exportVideoFrames) {
            app.exportVideoFrames.forEach((vf: any) => { try { vf.close(); } catch(e){} });
            app.exportVideoFrames = undefined;
        }

        const btn = document.getElementById('export-mp4-btn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-download"></i> MP4 Export';
        if (overlay) overlay.style.display = 'none';
        // Ensure UI is somewhat restored
        app.selectedClipIds.clear();
        
        // Try restoring canvas if failed
        if (typeof origCanvas !== 'undefined') {
            app.canvas = origCanvas;
            app.ctx = origCtx;
        }
        app.isExporting = false;
        app.requestRedraw();
    }
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
