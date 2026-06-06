// @ts-nocheck
// actions-phase7.ts - Phase 7 Features (Progress Bar, Thumbnails, Lower Thirds, Emojis)

window.EditorApp.prototype.executeProgressBar = function() {
    this.log("📊 جاري إضافة شريط التقدم (Progress Bar)...");
    
    let overlayTrack = this.tracks.find(t => t.type === 'overlay');
    if (!overlayTrack) {
        overlayTrack = { id: 'track_overlay_' + Date.now(), type: 'overlay', name: 'Overlay', clips: [] };
        this.tracks.push(overlayTrack);
    }
    
    // Add a progress bar clip spanning the whole video
    const pbClip = {
        id: 'clip_progress_' + Date.now(),
        type: 'shape', // Reusing shape, but we will handle it in rendering
        shapeType: 'progress_bar', 
        src: '',
        start: 0,
        duration: this.duration > 0 ? this.duration : 10,
        sourceIn: 0,
        properties: {
            widthPct: 100, // full width
            heightPct: 2,  // 2% height
            x: 0,          // left
            y: 49,         // bottom (canvas center is 0,0, so bottom is roughly ~50, actually we'll do y: 48)
            color: '#ff0055',
            opacity: 100
        }
    };
    
    overlayTrack.clips.push(pbClip);
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة شريط التقدم بنجاح!");
};

window.EditorApp.prototype.executeThumbnailGenerate = function(text: string) {
    this.log("🖼️ جاري إنشاء الصورة المصغرة (Thumbnail)...");
    
    if (!this.canvas) {
        this.log("❌ تعذر العثور على شاشة العرض.");
        return;
    }

    // 1. We draw the current frame onto a new temp canvas so we can add text without affecting the main canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const ctx = tempCanvas.getContext('2d');
    
    // Copy current canvas
    ctx.drawImage(this.canvas, 0, 0);
    
    // 2. If text is provided, draw a massive Youtube-style text
    if (text && text.trim().length > 0) {
        const textStr = text.trim();
        ctx.save();
        ctx.translate(tempCanvas.width / 2, tempCanvas.height / 2); // Center
        
        ctx.font = `900 120px Cairo, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Stroke
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 20;
        ctx.lineJoin = 'round';
        ctx.strokeText(textStr, 0, 0);
        
        // Fill
        ctx.fillStyle = '#ffcc00'; // Youtube yellow/gold
        ctx.fillText(textStr, 0, 0);
        
        ctx.restore();
    }
    
    // 3. Export as JPG
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Thumbnail_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.log("✅ تم تصدير الصورة المصغرة بنجاح!");
};

window.EditorApp.prototype.executeLowerThird = function(name: string, title: string) {
    this.log(`🏷️ جاري إضافة شريط الاسم (Lower Third): ${name}`);
    
    let textTrack = this.tracks.find(t => t.type === 'text' || t.type === 'subtitle');
    if (!textTrack) {
        textTrack = { id: 'track_text_' + Date.now(), type: 'text', name: 'Text', clips: [] };
        this.tracks.push(textTrack);
    }
    
    const duration = 5; // 5 seconds
    
    const ltClip = {
        id: 'clip_lower_' + Date.now(),
        type: 'text',
        src: `${name}\n<size=40>${title}</size>`, // We'll handle this in rendering if we want, or just two lines
        text: `${name}\n${title}`,
        start: this.currentTime,
        duration: duration,
        sourceIn: 0,
        textStyle: {
            fontSize: 60,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            fontFamily: 'Cairo',
            align: 'left',
            isLowerThird: true,
            bgColor: '#ff0055', // Red banner
            bgPadding: 20
        },
        properties: {
            x: -30, // Left side
            y: 35,  // Bottom third
            scale: 100,
            opacity: 100
        },
        transitions: {
            in: 'wipeRight',
            out: 'wipeLeft',
            duration: 0.5
        }
    };
    
    textTrack.clips.push(ltClip);
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة شريط الاسم!");
};

window.EditorApp.prototype.executeEmojiReaction = function(emoji: string) {
    this.log(`😂 جاري إضافة إيموجي: ${emoji}`);
    
    let textTrack = this.tracks.find(t => t.type === 'text' || t.type === 'subtitle');
    if (!textTrack) {
        textTrack = { id: 'track_text_' + Date.now(), type: 'text', name: 'Text', clips: [] };
        this.tracks.push(textTrack);
    }
    
    const duration = 2; // 2 seconds
    
    const emojiClip = {
        id: 'clip_emoji_' + Date.now(),
        type: 'text',
        src: emoji,
        text: emoji,
        start: this.currentTime,
        duration: duration,
        sourceIn: 0,
        textStyle: {
            fontSize: 150,
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        },
        properties: {
            x: 0, 
            y: 0, 
            scale: 100,
            opacity: 100
        },
        keyframes: {
            scale: [
                { time: 0, value: 0, easing: 'easeOutBounce' }, // Fake bounce
                { time: 0.3, value: 120, easing: 'easeOut' },
                { time: 0.5, value: 100, easing: 'linear' },
                { time: duration - 0.2, value: 100, easing: 'easeIn' },
                { time: duration, value: 0, easing: 'linear' }
            ]
        }
    };
    
    textTrack.clips.push(emojiClip);
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة الإيموجي!");
};
