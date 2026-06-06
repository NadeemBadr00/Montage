// @ts-nocheck
// actions-phase11.ts - Phase 11 Features (Grid, Countdown, Filter, Title)

window.EditorApp.prototype.executeGridLayout = function(cols: number, rows: number) {
    this.log(`📐 جاري ترتيب الفيديوهات المحددة في شبكة (${cols}x${rows})...`);
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد الفيديوهات أولاً.");
        return;
    }
    
    // Find all selected clips
    const clipsToGrid = [];
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id)) {
                clipsToGrid.push(clip);
            }
        });
    });
    
    if (clipsToGrid.length === 0) return;
    
    this.saveState();
    
    const cellWidth = 100 / cols;
    const cellHeight = 100 / rows;
    
    clipsToGrid.forEach((clip, index) => {
        if (index >= cols * rows) return; // Ignore extra clips
        
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        // Calculate center of cell
        const centerX = (col * cellWidth) + (cellWidth / 2);
        const centerY = (row * cellHeight) + (cellHeight / 2);
        
        // Convert to engine coordinates (-50 to +50 for X, and similar for Y)
        const posX = centerX - 50;
        const posY = centerY - 50;
        
        // Scale clip to fit cell
        const scaleX = cellWidth;
        const scaleY = cellHeight;
        const minScale = Math.min(scaleX, scaleY);
        
        clip.properties = clip.properties || {};
        clip.properties.x = posX;
        clip.properties.y = posY;
        clip.properties.scale = minScale; // Scale it down uniformly
    });
    
    this.log("✅ تم ترتيب الفيديوهات بنجاح!");
    this.requestRedraw();
    this.commitStateToReact();
};

window.EditorApp.prototype.executeCountdownTimer = function(seconds: number) {
    this.log(`⏱️ جاري إضافة عداد تنازلي (${seconds} ثوانٍ)...`);
    
    let textTrack = this.tracks.find(t => t.type === 'text' || t.type === 'subtitle');
    if (!textTrack) {
        textTrack = { id: 'track_text_' + Date.now(), type: 'text', name: 'Text', clips: [] };
        this.tracks.push(textTrack);
    }
    
    const clipId = 'clip_countdown_' + Date.now();
    const clip = {
        id: clipId,
        type: 'text',
        text: seconds.toString(),
        start: this.currentTime,
        duration: seconds,
        sourceIn: 0,
        textStyle: {
            fontSize: 200,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 10,
            fontFamily: 'Courier New',
            align: 'center',
            isCountdown: true // Special flag for renderer
        },
        properties: { x: 0, y: 0, scale: 100, opacity: 100 },
        // A simple bounce animation every second can be simulated, but we'll let the renderer handle the text update
    };
    
    textTrack.clips.push(clip);
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة العداد التنازلي!");
};

window.EditorApp.prototype.executeQuickFilter = function(filterType: string) {
    this.log(`🎭 جاري تطبيق فلتر السريع: ${filterType}`);
    
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) {
        this.log("❌ يرجى تحديد مقطع أولاً لتطبيق الفلتر.");
        return;
    }
    
    let appliedCount = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id)) {
                clip.properties = clip.properties || {};
                
                // Reset color grading first
                clip.properties.brightness = 100;
                clip.properties.contrast = 100;
                clip.properties.saturation = 100;
                clip.properties.sepia = 0;
                clip.properties.invert = 0;
                
                if (filterType === 'bw' || filterType === 'blackandwhite') {
                    clip.properties.saturation = 0;
                    clip.properties.contrast = 120;
                } else if (filterType === 'cinematic') {
                    clip.properties.contrast = 110;
                    clip.properties.saturation = 80;
                    // Usually implies letterbox too, but we have a separate command for that
                } else if (filterType === 'vintage') {
                    clip.properties.sepia = 80;
                    clip.properties.contrast = 90;
                } else if (filterType === 'vivid') {
                    clip.properties.saturation = 150;
                    clip.properties.contrast = 110;
                } else if (filterType === 'invert') {
                    clip.properties.invert = 100;
                }
                
                appliedCount++;
            }
        });
    });
    
    if (appliedCount > 0) {
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
        this.log(`✅ تم تطبيق الفلتر على ${appliedCount} مقطع!`);
    }
};

window.EditorApp.prototype.executeCinematicTitle = function(text: string) {
    this.log(`🔠 جاري إضافة عنوان سينمائي: "${text}"`);
    
    let textTrack = this.tracks.find(t => t.type === 'text' || t.type === 'subtitle');
    if (!textTrack) {
        textTrack = { id: 'track_text_' + Date.now(), type: 'text', name: 'Text', clips: [] };
        this.tracks.push(textTrack);
    }
    
    const titleClip = {
        id: 'clip_title_' + Date.now(),
        type: 'text',
        text: text.toUpperCase(),
        start: this.currentTime,
        duration: 4,
        sourceIn: 0,
        textStyle: {
            fontSize: 120,
            fill: '#ffffff',
            letterSpacing: 20, // Cinematic wide spacing
            fontFamily: 'Montserrat, sans-serif',
            align: 'center',
            shadowColor: 'rgba(0,0,0,0.8)',
            shadowBlur: 20
        },
        properties: {
            x: 0, 
            y: 0, 
            scale: 100, 
            opacity: 100
        },
        transitions: {
            in: 'zoomIn', // Zoom slowly from 0 to 100
            out: 'zoomOut',
            duration: 1.5
        }
    };
    
    textTrack.clips.push(titleClip);
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة العنوان!");
};
