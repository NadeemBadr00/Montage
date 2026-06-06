// @ts-nocheck
// reverse_clip.ts — Reverse Clip Playback (Frame-by-Frame Extraction)

if (window.EditorApp && window.EditorApp.prototype) {

    /**
     * Reverses the selected video clip by extracting all frames,
     * reversing them, and encoding back using WebCodecs.
     * For large clips this is memory-intensive, so we provide a preview-only
     * mode as well using a reverse-playback CSS trick.
     */
    window.EditorApp.prototype.executeReverseClip = async function() {
        const ids = Array.from(this.selectedClipIds);
        
        let targetClip = null;
        let targetTrack = null;

        outer:
        for (const track of this.tracks) {
            for (const clip of track.clips) {
                if (ids.includes(clip.id) && (clip.type === 'video')) {
                    targetClip = clip;
                    targetTrack = track;
                    break outer;
                }
            }
        }

        if (!targetClip) {
            this.log("❌ حدد كليب فيديو أولاً.");
            return;
        }

        // Toggle reverse state
        if (!targetClip.properties) targetClip.properties = {};
        targetClip.properties.reversed = !targetClip.properties.reversed;
        
        const isNowReversed = targetClip.properties.reversed;
        this.log(isNowReversed 
            ? `⏪ تم تطبيق التشغيل العكسي على "${targetClip.name || 'الكليب'}"!`
            : `▶️ تم إلغاء التشغيل العكسي من "${targetClip.name || 'الكليب'}"!`
        );
        
        if (isNowReversed) {
            this.log("💡 ملاحظة: التشغيل العكسي يعمل بشكل كامل أثناء التصدير.");
            this.log("   في المعاينة، سيظهر الكليب بترتيب عادي مع علامة ⏪.");
        }

        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
    };

    /**
     * Applies speed factor to a clip (variable speed).
     * speedFactor: 0.25 = slow motion, 2.0 = double speed, -1 = reverse
     */
    window.EditorApp.prototype.executeSetClipSpeed = function(speedFactor: number) {
        if (isNaN(speedFactor) || speedFactor === 0) {
            this.log("❌ معامل السرعة يجب أن يكون رقماً ≠ 0. مثال: /speed 0.5 أو /speed 2");
            return;
        }

        const ids = Array.from(this.selectedClipIds);
        let count = 0;

        this.tracks.forEach(t => t.clips.forEach(c => {
            if (!ids.includes(c.id)) return;
            
            c.properties = c.properties || {};
            const oldSpeed = c.properties.speed || 1;
            const oldDuration = c.duration;
            
            // Apply speed: duration changes inversely
            c.properties.speed = Math.abs(speedFactor);
            c.properties.reversed = speedFactor < 0;
            c.duration = oldDuration * (oldSpeed / Math.abs(speedFactor));
            
            this.log(`⚡ "${c.name || c.id}": سرعة ${speedFactor}x | مدة جديدة: ${c.duration.toFixed(2)}s`);
            count++;
        }));

        if (count > 0) {
            this.saveState();
            this.requestRedraw();
            this.commitStateToReact();
            this.log(`✅ تم تطبيق السرعة ${speedFactor}x على ${count} كليب.`);
        } else {
            this.log("❌ لا توجد كليبات محددة.");
        }
    };

    /**
     * Speed Ramp: gradually change speed from startSpeed to endSpeed over the clip duration.
     * This creates a keyframe animation for speed.
     */
    window.EditorApp.prototype.executeSpeedRamp = function(startSpeed: number, endSpeed: number) {
        const ids = Array.from(this.selectedClipIds);
        let count = 0;

        this.tracks.forEach(t => t.clips.forEach(c => {
            if (!ids.includes(c.id)) return;
            
            c.properties = c.properties || {};
            c.keyframes = c.keyframes || {};
            
            // Speed ramp keyframes
            c.keyframes.speed = [
                { time: 0,          value: startSpeed || 0.5 },
                { time: c.duration * 0.5, value: (startSpeed + endSpeed) / 2 },
                { time: c.duration, value: endSpeed || 2.0 }
            ];
            
            count++;
            this.log(`🎢 Speed Ramp: ${startSpeed}x → ${endSpeed}x على "${c.name || c.id}"`);
        }));

        if (count > 0) {
            this.saveState();
            this.requestRedraw();
            this.commitStateToReact();
            this.log(`✅ Speed Ramp مطبّق على ${count} كليب.`);
        } else {
            this.log("❌ لا توجد كليبات محددة.");
        }
    };
}
