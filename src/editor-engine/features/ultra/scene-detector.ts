// @ts-nocheck
// scene-detector.ts - HTMLVideoElement & Canvas based Scene Cut Detection

export async function detectScenes(videoUrl: string, duration: number, appInstance: any): Promise<number[]> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.preload = "auto";
        video.muted = true;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Low resolution for faster processing
        const W = 64;
        const H = 64;
        canvas.width = W;
        canvas.height = H;
        
        const cuts: number[] = [];
        let previousData: Uint8ClampedArray | null = null;
        
        const fps = 5; // Sample 5 times per second for speed. (Usually scene cuts are distinct)
        const step = 1.0 / fps; 
        let currentTime = 0;
        
        const threshold = 30; // Difference percentage (0-100)
        
        video.onloadeddata = () => {
            // Start seeking
            video.currentTime = currentTime;
        };
        
        video.onseeked = () => {
            ctx.drawImage(video, 0, 0, W, H);
            const imageData = ctx.getImageData(0, 0, W, H).data;
            
            if (previousData) {
                // Calculate difference
                let diffCount = 0;
                let totalPixels = W * H;
                
                // Compare pixel by pixel (ignoring alpha)
                for (let i = 0; i < imageData.length; i += 4) {
                    const rDiff = Math.abs(imageData[i] - previousData[i]);
                    const gDiff = Math.abs(imageData[i+1] - previousData[i+1]);
                    const bDiff = Math.abs(imageData[i+2] - previousData[i+2]);
                    
                    // If pixel color changed significantly
                    if ((rDiff + gDiff + bDiff) / 3 > 40) {
                        diffCount++;
                    }
                }
                
                const percentDiff = (diffCount / totalPixels) * 100;
                
                if (percentDiff > threshold) {
                    cuts.push(currentTime);
                }
            }
            
            // Store current frame
            previousData = new Uint8ClampedArray(imageData);
            
            currentTime += step;
            if (currentTime <= duration && currentTime <= video.duration) {
                // Keep seeking
                video.currentTime = currentTime;
            } else {
                // Done
                resolve(cuts);
            }
        };
        
        video.onerror = (e) => {
            reject(e);
        };
    });
}

// Inject into Engine
window.EditorApp.prototype.executeSceneDetection = async function() {
    this.log("🔍 جاري تحليل الفيديو لاكتشاف المشاهد (Scene Detection)...");
    
    // Find the selected video clip
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد فيديو أولاً لتقطيعه.");
        return;
    }
    
    const clip = this.findClipById(selectedIds[0]);
    if (!clip || clip.type !== 'video' || !clip.src) {
        this.log("❌ العنصر المحدد ليس فيديو صالحاً.");
        return;
    }

    try {
        const cuts = await detectScenes(clip.src, clip.duration, this);
        
        if (cuts && cuts.length > 0) {
            this.log(`✅ تم اكتشاف ${cuts.length} مشهد جديد.`);
            
            // Split the clip at these cuts!
            this.saveState(); // For undo
            
            // Note: splitting modifies the timeline, so we must sort cuts descending to avoid shifting issues
            const validCuts = cuts.filter(c => c > 0.5 && c < clip.duration - 0.5).sort((a,b) => b - a);
            
            let currentClipId = clip.id;
            for (const cutTime of validCuts) {
                // The 'cutTime' here is relative to the clip's local start (sourceIn).
                // But the app.splitClip expects a global timeline absolute time.
                const absoluteCutTime = clip.start + cutTime;
                
                // We need to re-find the clip because it might have been split already,
                // but since we iterate backwards (descending), the start time of the earlier parts doesn't change.
                const clipToSplit = this.findClipById(currentClipId);
                if(clipToSplit) {
                    const newClip = this.splitClip(clipToSplit, absoluteCutTime);
                    if(newClip) {
                        currentClipId = clipToSplit.id; // Keep splitting the original left-half
                    }
                }
            }
            
            this.requestRedraw();
            this.commitStateToReact();
            this.log("✂️ تم تقطيع الفيديو بنجاح!");
        } else {
            this.log("⚠️ لم يتم العثور على مشاهد مختلفة (الفيديو مشهد واحد).");
        }
        
    } catch (e) {
        console.error("Scene detection error:", e);
        this.log("❌ حدث خطأ أثناء تحليل المشاهد.");
    }
};
