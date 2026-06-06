// @ts-nocheck
// actions-phase13.ts - Phase 13 Features (FCPXML, Beat Match, Karaoke, Loop)

window.EditorApp.prototype.executeExportXML = function() {
    this.log("🎬 جاري توليد كود FCPXML لبرنامج Premiere Pro / Final Cut...");
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
    <resources>
        <format id="r1" name="FFVideoFormat1080p30" frameDuration="1/30s" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
    </resources>
    <library>
        <event name="AI4Montage Event">
            <project name="AI4Montage Export">
                <sequence format="r1" duration="${this.duration}s">
                    <spine>\n`;
    
    // Simplistic export: just taking the main track clips
    const mainTrack = this.tracks.find(t => t.type === 'main');
    if (mainTrack) {
        mainTrack.clips.forEach(clip => {
            xml += `                        <clip name="${clip.name}" offset="${clip.start}s" duration="${clip.duration}s" start="${clip.sourceIn}s"/>\n`;
        });
    }
    
    xml += `                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>`;

    navigator.clipboard.writeText(xml).then(() => {
        this.log("✅ تم توليد الكود ونسخه إلى الحافظة (Clipboard) بنجاح!");
        this.log("👉 يمكنك الآن فتح هذا الكود في Premiere Pro أو Final Cut Pro.");
    }).catch(err => {
        this.log("❌ فشل النسخ إلى الحافظة.");
    });
};

window.EditorApp.prototype.executeBeatMatch = function() {
    this.log("✂️ جاري تحليل الدقات (Beats) وتقطيع الفيديوهات تلقائياً...");
    
    if (!this.markers || this.markers.length === 0) {
        this.log("❌ لم يتم العثور على أي علامات دقات (Beat Markers). استخدم /beat أولاً عند سماع الإيقاع.");
        return;
    }
    
    const beatMarkers = this.markers.filter(m => m.label === 'beat' || m.color === '#ff0055');
    if (beatMarkers.length === 0) {
        this.log("❌ لا توجد علامات من نوع Beat.");
        return;
    }
    
    // Sort beats
    beatMarkers.sort((a, b) => a.time - b.time);
    
    const mainTrack = this.tracks.find(t => t.type === 'main');
    if (!mainTrack) return;
    
    this.saveState();
    
    let cutsMade = 0;
    
    // Very simplified logic: for each clip that overlaps a beat, we split it.
    // In reality, this requires carefully walking backwards to avoid messing up iteration.
    beatMarkers.forEach(beat => {
        const time = beat.time;
        // Find clip that spans this time
        const clipIndex = mainTrack.clips.findIndex(c => time > c.start && time < c.start + c.duration);
        
        if (clipIndex !== -1) {
            const clip = mainTrack.clips[clipIndex];
            
            const splitTime = time;
            const clip1Duration = splitTime - clip.start;
            const remainingDuration = clip.duration - clip1Duration;
            const sourceSplitTime = clip.sourceIn + clip1Duration;
            
            // Adjust original clip
            clip.duration = clip1Duration;
            
            // Create second half
            const clip2 = {
                ...JSON.parse(JSON.stringify(clip)),
                id: 'clip_beat_split_' + Date.now() + Math.random(),
                start: splitTime,
                duration: remainingDuration,
                sourceIn: sourceSplitTime
            };
            
            // Apply a slight zoom or color flash to clip2 to emphasize the beat!
            clip2.properties = clip2.properties || {};
            clip2.properties.scale = 110; // Bump scale
            setTimeout(() => { 
                // Return to normal scale after 0.2s if we had a real engine loop, 
                // but here we just leave it slightly zoomed, which is a common beat effect.
            }, 200);
            
            mainTrack.clips.splice(clipIndex + 1, 0, clip2);
            cutsMade++;
        }
    });
    
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم عمل ${cutsMade} قطعات إيقاعية (Beat Cuts) بنجاح!`);
};

window.EditorApp.prototype.executeKaraokeSubtitles = function() {
    this.log("🎤 جاري تحويل النصوص المحددة إلى كاريوكي...");
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد مقطع نصي أولاً.");
        return;
    }
    
    let appliedCount = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && (clip.type === 'text' || clip.type === 'subtitle')) {
                clip.textStyle = clip.textStyle || {};
                clip.textStyle.isKaraoke = true;
                clip.textStyle.karaokeHighlightColor = '#FFFF00'; // Yellow highlight
                clip.textStyle.fill = '#FFFFFF';
                appliedCount++;
            }
        });
    });
    
    if (appliedCount > 0) {
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
        this.log(`✅ تم تطبيق ستايل الكاريوكي التفاعلي!`);
    }
};

window.EditorApp.prototype.executeLoopClip = function(times: number) {
    this.log(`🔁 جاري تكرار المقطع ${times} مرات (Loop)...`);
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد مقطع أولاً لتكراره.");
        return;
    }
    
    this.saveState();
    let loopsMade = 0;
    
    // We only duplicate the first selected clip for simplicity
    let targetClip = null;
    let targetTrack = null;
    
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds[0] === clip.id) {
                targetClip = clip;
                targetTrack = track;
            }
        });
    });
    
    if (targetClip && targetTrack) {
        let currentStartTime = targetClip.start + targetClip.duration;
        
        for (let i = 0; i < times; i++) {
            const duplicatedClip = {
                ...JSON.parse(JSON.stringify(targetClip)),
                id: 'clip_loop_' + Date.now() + '_' + i,
                start: currentStartTime,
            };
            targetTrack.clips.push(duplicatedClip);
            currentStartTime += targetClip.duration;
            loopsMade++;
        }
        
        // Shift all other clips after this point
        const totalAddedDuration = targetClip.duration * times;
        targetTrack.clips.forEach(c => {
            if (c.start >= targetClip.start + targetClip.duration && c.id !== targetClip.id && !c.id.includes('clip_loop_')) {
                c.start += totalAddedDuration;
            }
        });
    }
    
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم تكرار المقطع بنجاح!`);
};
