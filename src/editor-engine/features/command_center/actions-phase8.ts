// @ts-nocheck
// actions-phase8.ts - Phase 8 Features (Voiceover, Captions, Fonts)

window.EditorApp.prototype.executeVoiceover = function(text: string) {
    this.log(`🎙️ جاري إنشاء تعليق صوتي: "${text}"`);
    
    let audioTrack = this.tracks.find(t => t.type === 'audio');
    if (!audioTrack) {
        audioTrack = { id: 'track_audio_' + Date.now(), type: 'audio', name: 'Audio', clips: [] };
        this.tracks.push(audioTrack);
    }
    
    // Using Google Translate TTS as a free API for demonstration
    // Note: tl=ar for Arabic, tl=en for English. We can auto-detect based on characters, or just pass it to 'ar' mostly.
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const lang = isArabic ? 'ar' : 'en';
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
    
    // Estimate duration: ~100 words per minute -> ~0.6 sec per word, min 2s
    const wordCount = text.split(' ').length;
    const estDuration = Math.max(2, wordCount * 0.6);
    
    const audioClip = {
        id: 'clip_voice_' + Date.now(),
        type: 'audio',
        src: ttsUrl,
        name: 'AI Voiceover',
        start: this.currentTime,
        duration: estDuration, // Estimate, will update when loaded if possible
        sourceIn: 0,
        properties: {
            volume: 100
        }
    };
    
    audioTrack.clips.push(audioClip);
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تم إضافة التعليق الصوتي إلى التايم لاين!");
};

window.EditorApp.prototype.executeAutoCaptions = function() {
    this.log("📝 جاري إنشاء الترجمة التلقائية (Auto Captions)...");
    
    // Find audio or main video track
    const sourceTrack = this.tracks.find(t => t.clips.length > 0 && (t.type === 'audio' || t.type === 'main'));
    if (!sourceTrack) {
        this.log("❌ يجب إضافة فيديو أو ملف صوتي لإنشاء الترجمة.");
        return;
    }
    
    let textTrack = this.tracks.find(t => t.type === 'subtitle');
    if (!textTrack) {
        textTrack = { id: 'track_subtitle_' + Date.now(), type: 'subtitle', name: 'Captions', clips: [] };
        this.tracks.push(textTrack);
    }
    
    this.saveState();
    
    // Generate Mocked Captions across the track duration
    const trackDuration = sourceTrack.clips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);
    const mockSentences = ["مرحباً بك في هذا الفيديو!", "اليوم سنتحدث عن شيء مميز", "لا تنسَ الاشتراك في القناة", "هذه الترجمة تم توليدها بالذكاء الاصطناعي", "شكراً للمشاهدة!"];
    
    const interval = trackDuration / mockSentences.length;
    
    mockSentences.forEach((sentence, index) => {
        const start = index * interval;
        // Keep it slightly shorter than interval for a small gap
        const duration = Math.min(3, interval * 0.8);
        
        if (start < trackDuration) {
            textTrack.clips.push({
                id: 'clip_caption_' + Date.now() + '_' + index,
                type: 'text',
                text: sentence,
                start: start,
                duration: duration,
                sourceIn: 0,
                textStyle: {
                    fontSize: 40,
                    fontFamily: 'Cairo', // default
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 5,
                    bgColor: '#000000',
                    bgOpacity: 50,
                    align: 'center',
                    isCaption: true // a flag we can use to always anchor bottom center
                },
                properties: {
                    x: 0,
                    y: 40, // bottom
                    scale: 100,
                    opacity: 100
                },
                transitions: {
                    in: 'pop', // Quick pop-in like Tiktok
                    duration: 0.1
                }
            });
        }
    });
    
    this.requestRedraw();
    this.commitStateToReact();
    this.log("✅ تمت إضافة شرائح الترجمة التلقائية بنجاح!");
};

window.EditorApp.prototype.executeCustomFont = function(fontName: string) {
    this.log(`🔤 جاري تحميل وتطبيق الخط المخصص: "${fontName}"`);
    
    // Inject the Google Font into document head if not exists
    const fontId = `font_${fontName.replace(/\s+/g, '')}`;
    if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
        document.head.appendChild(link);
    }
    
    // Apply to selected text clips
    const selectedIds = Array.from(this.selectedClipIds);
    let appliedCount = 0;
    
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (clip.type === 'text' && selectedIds.includes(clip.id)) {
                clip.textStyle = clip.textStyle || {};
                clip.textStyle.fontFamily = fontName;
                
                // For Canvas to register the font, it might need a split second to load.
                // We redraw immediately and then again after 500ms
                setTimeout(() => this.requestRedraw(), 500);
                
                appliedCount++;
            }
        });
    });
    
    if (appliedCount > 0) {
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
        this.log(`✅ تم تطبيق الخط على ${appliedCount} نص!`);
    } else {
        this.log("⚠️ يرجى تحديد نص واحد على الأقل لتطبيق الخط عليه.");
    }
};
