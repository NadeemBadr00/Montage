// @ts-nocheck
// beat-detector.ts - Web Audio API Beat/Kick Drum Detection

export async function detectBeats(arrayBuffer: ArrayBuffer, audioCtx: AudioContext): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
        try {
            // Decode audio
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0)); // copy the buffer
            
            // Create offline context to process faster than real-time
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
            
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            
            // Low-pass filter to isolate kick drums/bass
            const filter = offlineCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 150; // Keep only frequencies below 150Hz
            
            source.connect(filter);
            filter.connect(offlineCtx.destination);
            
            source.start();
            const renderedBuffer = await offlineCtx.startRendering();
            
            // Analyze the low-frequency buffer
            const data = renderedBuffer.getChannelData(0);
            const sampleRate = renderedBuffer.sampleRate;
            
            // Find peaks
            const peaks = [];
            let max = 0;
            
            // First pass: find global max to establish a threshold
            for (let i = 0; i < data.length; i += 1000) {
                if (Math.abs(data[i]) > max) max = Math.abs(data[i]);
            }
            
            const threshold = max * 0.8; // 80% of max amplitude
            let lastPeakTime = 0;
            
            // Second pass: extract peaks
            for (let i = 0; i < data.length; i++) {
                if (data[i] > threshold) {
                    const time = i / sampleRate;
                    // Ensure beats are at least 0.25s apart (max ~240 BPM) to avoid double counting
                    if (time - lastPeakTime > 0.25) {
                        peaks.push(time);
                        lastPeakTime = time;
                    }
                }
            }
            
            resolve(peaks);
        } catch (e) {
            reject(e);
        }
    });
}
