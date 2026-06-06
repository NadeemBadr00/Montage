// Web Worker to decode audio and compute waveform peaks without blocking the main thread

self.onmessage = async (e) => {
    const { src, width, height } = e.data;
    try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        
        // Use OfflineAudioContext which is available in modern Web Workers
        const OfflineCtx = (self as any).OfflineAudioContext || (self as any).webkitOfflineAudioContext;
        if (!OfflineCtx) {
            throw new Error("OfflineAudioContext not supported in this worker");
        }
        
        const offlineCtx = new OfflineCtx(1, 1, 44100);
        const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        
        // Generate min/max points for each pixel column
        const step = Math.ceil(channelData.length / width);
        const points = new Float32Array(width * 2); // Store [min, max] pairs
        
        for (let i = 0; i < width; i++) {
             let min = 1.0;
             let max = -1.0;
             for (let j = 0; j < step; j++) {
                 const idx = (i * step) + j;
                 if (idx < channelData.length) {
                     const datum = channelData[idx];
                     if (datum < min) min = datum;
                     if (datum > max) max = datum;
                 }
             }
             points[i*2] = min;
             points[i*2 + 1] = max;
        }
        
        // Transfer the buffer back to main thread
        self.postMessage({ src, points, width, height }, [points.buffer]);
    } catch(err: any) {
        self.postMessage({ src, error: err.message });
    }
};
