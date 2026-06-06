// @ts-nocheck
import { detectBeats } from './beat-detector';

window.EditorApp.prototype.executeBeatDetection = async function() {
    this.log("🎵 جاري تحليل الإيقاع (Beat Detection)...");
    
    // Find the primary audio track or the main video track's audio
    const audioTrack = this.tracks.find(t => t.type === 'audio' && t.clips.length > 0);
    const videoTrack = this.tracks.find(t => t.type === 'main' && t.clips.length > 0);
    
    const targetClip = audioTrack ? audioTrack.clips[0] : (videoTrack ? videoTrack.clips[0] : null);
    
    if (!targetClip || !targetClip.src) {
        this.log("❌ لم يتم العثور على مقطع صوتي لتحليله.");
        return;
    }

    try {
        const response = await fetch(targetClip.src);
        const arrayBuffer = await response.arrayBuffer();
        
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        const peaks = await detectBeats(arrayBuffer, this.audioCtx);
        
        if (peaks && peaks.length > 0) {
            this.log(`✅ تم رصد ${peaks.length} ضربة إيقاع.`);
            
            // Add markers
            this.markers = this.markers || [];
            // Clear old beat markers
            this.markers = this.markers.filter(m => m.label !== 'beat');
            
            // Calculate absolute times based on clip start
            peaks.forEach(time => {
                const absoluteTime = targetClip.start + time;
                if (absoluteTime <= this.duration) {
                    this.markers.push({ time: absoluteTime, label: 'beat' });
                }
            });
            
            // Make markers unique and sorted
            this.markers = this.markers.sort((a, b) => a.time - b.time);
            
            this.requestRedraw();
            this.commitStateToReact();
        } else {
            this.log("⚠️ لم يتم العثور على إيقاع واضح في هذا المقطع.");
        }
        
    } catch (e) {
        console.error("Beat detection error:", e);
        this.log("❌ حدث خطأ أثناء تحليل الصوت.");
    }
};

window.EditorApp.prototype.executeAutoDucking = function() {
    this.log("🔈 جاري تطبيق ميزة Auto Ducking (خفض الموسيقى مع الكلام)...");
    
    // Find the music track
    const audioTrack = this.tracks.find(t => t.type === 'audio');
    const mainTrack = this.tracks.find(t => t.type === 'main');
    
    if (!audioTrack || audioTrack.clips.length === 0) {
        this.log("❌ يجب إضافة مقطع موسيقي في الـ Audio Track لتطبيق الخاصية.");
        return;
    }
    
    if (!mainTrack || mainTrack.clips.length === 0) {
        this.log("❌ لم يتم العثور على فيديوهات تحتوي على كلام (في الـ Main Track).");
        return;
    }
    
    this.saveState();
    
    let duckCount = 0;
    const fadeTime = 0.5; // half a second fade
    
    // Apply keyframes to all clips in the audio track
    audioTrack.clips.forEach(musicClip => {
        musicClip.keyframes = musicClip.keyframes || {};
        musicClip.keyframes.volume = []; // Reset existing volume keyframes
        
        let currentVol = 100;
        musicClip.keyframes.volume.push({ time: 0, value: 100, easing: 'linear' });
        
        // Find overlapping speech clips
        mainTrack.clips.forEach(speechClip => {
            // Is speech clip overlapping with music clip?
            const speechStart = speechClip.start;
            const speechEnd = speechClip.start + speechClip.duration;
            const musicStart = musicClip.start;
            const musicEnd = musicClip.start + musicClip.duration;
            
            if (speechEnd > musicStart && speechStart < musicEnd) {
                // Determine ducking window relative to the music clip's local time (0 to duration)
                const duckStartLocal = Math.max(0, speechStart - musicStart);
                const duckEndLocal = Math.min(musicClip.duration, speechEnd - musicStart);
                
                // Add keyframes
                // Fade out right before speech starts
                const fadeOutStart = Math.max(0, duckStartLocal - fadeTime);
                musicClip.keyframes.volume.push({ time: fadeOutStart, value: 100, easing: 'easeOut' });
                musicClip.keyframes.volume.push({ time: duckStartLocal, value: 20, easing: 'easeIn' }); // Ducked to 20%
                
                // Fade in right after speech ends
                musicClip.keyframes.volume.push({ time: duckEndLocal, value: 20, easing: 'easeOut' });
                const fadeInEnd = Math.min(musicClip.duration, duckEndLocal + fadeTime);
                musicClip.keyframes.volume.push({ time: fadeInEnd, value: 100, easing: 'easeIn' });
                
                duckCount++;
            }
        });
        
        // Ensure volume returns to 100 at the end if not ducked
        // Sort keyframes by time
        musicClip.keyframes.volume.sort((a, b) => a.time - b.time);
    });
    
    if (duckCount > 0) {
        this.log(`✅ تم خفض الموسيقى بنجاح في ${duckCount} موضع.`);
    } else {
        this.log("⚠️ لم يكن هناك تداخل بين الفيديو الأساسي والموسيقى.");
    }
    
    this.requestRedraw();
    this.commitStateToReact();
};
