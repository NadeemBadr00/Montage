import * as MP4Box from 'mp4box';

self.onmessage = async (e) => {
    const { src, thumbCount, width, height } = e.data;
    const generatedThumbs: string[] = [];
    
    try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        
        // Fast path for non-MP4 or if WebCodecs isn't available
        if (!src.toLowerCase().endsWith('.mp4') || !self.VideoDecoder) {
            self.postMessage({ src, fallback: true });
            return;
        }

        const mp4boxfile = MP4Box.createFile();
        let videoTrack: any = null;
        let decoder: VideoDecoder | null = null;
        
        mp4boxfile.onReady = (info: any) => {
            videoTrack = info.videoTracks[0];
            if (!videoTrack) {
                self.postMessage({ src, fallback: true });
                return;
            }
            
            mp4boxfile.setExtractionOptions(videoTrack.id);
            mp4boxfile.start();
        };

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
        
        let framesExtracted = 0;
        let targetFrameIndex = 0;
        let duration = 0;
        let samples: any[] = [];
        
        mp4boxfile.onSamples = (id: number, user: any, rawSamples: any[]) => {
            samples = samples.concat(rawSamples);
            
            if (!decoder && videoTrack) {
                duration = videoTrack.movie_duration / videoTrack.movie_timescale;
                
                decoder = new VideoDecoder({
                    output: (frame) => {
                        if (framesExtracted >= thumbCount) {
                            frame.close();
                            return;
                        }
                        
                        // We only draw frames that are close to our target distribution
                        ctx.drawImage(frame, 0, 0, width, height);
                        
                        // Convert to blob to send back
                        canvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 }).then(blob => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                generatedThumbs.push(reader.result as string);
                                self.postMessage({ src, thumbs: [...generatedThumbs] });
                            };
                            reader.readAsDataURL(blob);
                        });
                        
                        framesExtracted++;
                        frame.close();
                    },
                    error: (e) => {
                        console.error(e);
                        self.postMessage({ src, fallback: true });
                    }
                });
                
                const description = new Uint8Array(videoTrack.codec === 'avc1' ? 
                    mp4boxfile.getTrackById(id).mdia.minf.stbl.stsd.entries[0].avcC.buffer : 
                    mp4boxfile.getTrackById(id).mdia.minf.stbl.stsd.entries[0].hvcC.buffer);
                    
                decoder.configure({
                    codec: videoTrack.codec,
                    description: description
                });
            }
            
            if (decoder && decoder.state === 'configured') {
                // To extract evenly, calculate step
                const step = Math.max(1, Math.floor(samples.length / thumbCount));
                
                for (let i = 0; i < thumbCount; i++) {
                    const sample = samples[Math.min(i * step, samples.length - 1)];
                    if (sample) {
                        const chunk = new EncodedVideoChunk({
                            type: sample.is_sync ? 'key' : 'delta',
                            timestamp: (sample.cts / sample.timescale) * 1e6,
                            duration: (sample.duration / sample.timescale) * 1e6,
                            data: sample.data
                        });
                        try {
                            decoder.decode(chunk);
                        } catch (e) {
                            // Ignored
                        }
                    }
                }
            }
        };

        // Feed buffer to mp4box
        (arrayBuffer as any).fileStart = 0;
        mp4boxfile.appendBuffer(arrayBuffer);
        mp4boxfile.flush();
        
    } catch(err: any) {
        self.postMessage({ src, fallback: true, error: err.message });
    }
};
