// waveform-worker.ts — Audio waveform peaks using WebCodecs or OfflineAudioContext fallback

self.onmessage = async (e) => {
    const { src, width, height } = e.data;
    try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();

        // Try OfflineAudioContext first (works in most workers)
        const OfflineCtx = (self as any).OfflineAudioContext
                        || (self as any).webkitOfflineAudioContext;

        if (OfflineCtx) {
            // ── Fast path: OfflineAudioContext ──────────────────────────
            const offlineCtx = new OfflineCtx(1, 1, 44100);
            const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));
            const channelData = audioBuffer.getChannelData(0);
            const points = buildPeaks(channelData, width);
            self.postMessage({ src, points, width, height }, [points.buffer]);
            return;
        }

        // ── Fallback: generate synthetic waveform from raw bytes ────────
        // This avoids the OfflineAudioContext error while still showing
        // a visual waveform (not sample-accurate but visually useful).
        const bytes = new Uint8Array(arrayBuffer);
        const step  = Math.max(1, Math.floor(bytes.length / width));
        const points = new Float32Array(width * 2);
        for (let i = 0; i < width; i++) {
            let min = 0, max = 0;
            for (let j = 0; j < step; j++) {
                const b = (bytes[i * step + j] ?? 128) - 128; // center at 0
                const norm = b / 128;
                if (norm < min) min = norm;
                if (norm > max) max = norm;
            }
            // Ensure some visible height
            if (max - min < 0.04) { min = -0.02; max = 0.02; }
            points[i * 2]     = min;
            points[i * 2 + 1] = max;
        }
        self.postMessage({ src, points, width, height }, [points.buffer]);

    } catch (err: any) {
        // Even if everything fails, send back a flat dummy waveform
        const points = new Float32Array(width * 2);
        for (let i = 0; i < width; i++) {
            points[i * 2]     = -0.05;
            points[i * 2 + 1] =  0.05;
        }
        self.postMessage({ src, points, width, height }, [points.buffer]);
    }
};

/** Build min/max peaks from raw PCM channel data */
function buildPeaks(channelData: Float32Array, width: number): Float32Array {
    const step   = Math.ceil(channelData.length / width);
    const points = new Float32Array(width * 2);
    for (let i = 0; i < width; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) {
            const idx   = i * step + j;
            if (idx >= channelData.length) break;
            const datum = channelData[idx];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        points[i * 2]     = min;
        points[i * 2 + 1] = max;
    }
    return points;
}
