// @ts-nocheck
// actions-phase9.ts - Phase 9 Features (Audio Mastering, Reverse, Chapters, Snapshots)

window.EditorApp.prototype.executeAudioMaster = function(filter: string) {
    this.log(`🎛️ جاري إضافة فلتر الصوت: ${filter.toUpperCase()}`);
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد مقطع (صوت أو فيديو) أولاً لتطبيق الفلتر.");
        return;
    }
    
    let appliedCount = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && (clip.type === 'audio' || clip.type === 'video')) {
                clip.properties = clip.properties || {};
                clip.properties.audioFilter = filter;
                appliedCount++;
            }
        });
    });
    
    if (appliedCount > 0) {
        this.saveState();
        this.commitStateToReact();
        
        if (filter === 'bass') {
            this.log("✅ تم تضخيم الـ Bass بنجاح للمقاطع المحددة!");
        } else if (filter === 'noise') {
            this.log("✅ تم تفعيل إزالة الضوضاء (Noise Reduction) بنجاح!");
        }
    }
};

window.EditorApp.prototype.executeReverseClip = function() {
    this.log("⏪ جاري عكس المقطع (Reverse)...");
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد مقطع فيديو أولاً لعكسه.");
        return;
    }
    
    let appliedCount = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id) && clip.type === 'video') {
                clip.properties = clip.properties || {};
                clip.properties.reversed = !clip.properties.reversed;
                appliedCount++;
            }
        });
    });
    
    if (appliedCount > 0) {
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
        this.log("✅ تم عكس طريقة تشغيل المقطع بنجاح!");
    }
};

window.EditorApp.prototype.executeExportChapters = function() {
    this.log("📑 جاري توليد فصول اليوتيوب (YouTube Chapters)...");
    
    if (!this.markers || this.markers.length === 0) {
        this.log("❌ لم يتم العثور على أي علامات (Markers). قم بإضافة علامات أولاً.");
        return;
    }
    
    // Sort markers by time
    const sortedMarkers = [...this.markers].sort((a, b) => a.time - b.time);
    
    // Format to MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };
    
    let chaptersText = "";
    
    // Ensure there is a 00:00 chapter (Youtube requirement)
    if (sortedMarkers[0].time > 0) {
        chaptersText += `00:00 Intro\n`;
    }
    
    sortedMarkers.forEach((marker, index) => {
        // label might be just a color or text
        let label = marker.label || `Chapter ${index + 1}`;
        if (label === 'beat') label = `Beat Drop ${index + 1}`;
        if (label === 'red' || label === 'blue') label = `Part ${index + 1}`;
        
        chaptersText += `${formatTime(marker.time)} ${label}\n`;
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(chaptersText).then(() => {
        this.log("✅ تم نسخ فصول اليوتيوب إلى الحافظة (Clipboard) بنجاح!");
        // We can also print it to the log
        const lines = chaptersText.split('\n').filter(l => l);
        lines.forEach(line => this.log(`🕒 ${line}`));
    }).catch(err => {
        this.log("❌ فشل النسخ إلى الحافظة.");
        console.error(err);
    });
};

window.EditorApp.prototype.executeSaveSnapshot = function(snapshotName: string) {
    this.log(`📸 جاري حفظ لقطة المونتاج: "${snapshotName}"...`);
    
    try {
        const state = {
            duration: this.duration,
            tracks: this.tracks,
            markers: this.markers
        };
        
        const snapshotsStr = localStorage.getItem('ai4montage_snapshots') || '{}';
        const snapshots = JSON.parse(snapshotsStr);
        
        snapshots[snapshotName] = state;
        
        localStorage.setItem('ai4montage_snapshots', JSON.stringify(snapshots));
        this.log("✅ تم حفظ النسخة بأمان! يمكنك الرجوع إليها لاحقاً.");
    } catch (e) {
        console.error("Snapshot error:", e);
        this.log("❌ حدث خطأ أثناء الحفظ (ربما حجم المشروع كبير جداً).");
    }
};
