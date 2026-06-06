// @ts-nocheck
// auto_captions.ts — AI Auto Captions using Gemini Transcription API

if (window.EditorApp && window.EditorApp.prototype) {

    /**
     * Generate automatic captions from video/audio using Gemini's audio understanding.
     * Adds subtitle clips to a text track on the timeline.
     */
    window.EditorApp.prototype.executeAutoCaption = async function(options = {}) {
        const {
            language = 'ar',          // 'ar' = Arabic, 'en' = English, 'auto' = auto-detect
            style = 'tiktok',          // 'tiktok', 'youtube', 'minimal', 'elegant'
            maxWordsPerLine = 5,
            startTime = 0,
            endTime = null,
        } = options;

        this.log("🤖 بدء التعرف التلقائي على الكلام (Auto Captions)...");
        
        // Verify Gemini API key
        const apiKey = this.geminiApiKey || (window as any).GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            this.log("❌ مفتاح Gemini API غير موجود.");
            this.log("   أضف مفتاحك في إعدادات AI أو في Local Storage: gemini_api_key");
            return;
        }

        // Get audio data from video
        let audioBase64 = null;
        const projectId = (window as any).currentProjectId || 'p43';
        
        try {
            // Try to get audio from IndexedDB
            const videoFile = await this._getFileFromDB(`${projectId}_video`).catch(() => null)
                           || window.videoFile;
            
            if (!videoFile) {
                this.log("❌ لم يتم العثور على ملف الفيديو.");
                this.log("   تأكد من رفع ملف فيديو يحتوي على صوت.");
                return;
            }

            this.log("⏳ استخراج الصوت من الفيديو...");
            
            // Extract audio using AudioContext
            const arrayBuffer = await videoFile.arrayBuffer();
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const decodedAudio = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
            audioCtx.close();
            
            // Convert to WAV for Gemini
            const wavBuffer = this._audioBufferToWavBuffer(decodedAudio);
            const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
            
            // Convert to Base64
            const reader = new FileReader();
            audioBase64 = await new Promise((resolve) => {
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(wavBlob);
            });
            
            this.log(`✅ تم استخراج الصوت: ${decodedAudio.duration.toFixed(1)}s`);
            
        } catch (err) {
            this.log(`⚠️ فشل استخراج الصوت: ${err.message}`);
            this.log("   محاولة بديلة: استخدام نص تجريبي للعرض...");
            this._addDemoSubtitles(style, language);
            return;
        }

        this.log("🧠 إرسال الصوت إلى Gemini للتفريغ...");

        try {
            // Call Gemini Multimodal API for audio transcription
            const langPrompt = language === 'ar' 
                ? 'باللغة العربية الفصحى' 
                : language === 'en' 
                    ? 'in English'
                    : 'in the detected language';
            
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                {
                                    inline_data: {
                                        mime_type: 'audio/wav',
                                        data: audioBase64
                                    }
                                },
                                {
                                    text: `Transcribe this audio ${langPrompt}. 
Return ONLY a JSON array of subtitle objects with this exact format:
[
  {"start": 0.0, "end": 2.5, "text": "..."},
  {"start": 2.5, "end": 5.0, "text": "..."}
]

Rules:
- Each segment should be 2-5 seconds max
- Max ${maxWordsPerLine} words per segment  
- start and end are timestamps in seconds
- text is the transcribed speech
- Only include actual speech, ignore music/sounds
- Return ONLY the JSON array, no other text`
                                }
                            ]
                        }],
                        generationConfig: { temperature: 0.1 }
                    })
                }
            );

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            
            // Parse JSON from response
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error("لم يتم الحصول على ترجمة صالحة من Gemini.");
            
            const subtitles = JSON.parse(jsonMatch[0]);
            
            if (!Array.isArray(subtitles) || subtitles.length === 0) {
                this.log("⚠️ لم يتم اكتشاف كلام في هذا المقطع.");
                return;
            }

            this.log(`📝 تم استخراج ${subtitles.length} جملة ترجمة.`);
            this._addSubtitleClipsToTimeline(subtitles, style, language);

        } catch (err) {
            this.log(`❌ خطأ في Gemini API: ${err.message}`);
            this.log("   تأكد من صحة مفتاح API ومن وجود الصوت في الفيديو.");
        }
    };

    /**
     * Add subtitle clips from parsed transcript to the timeline.
     */
    window.EditorApp.prototype._addSubtitleClipsToTimeline = function(subtitles, style, language) {
        // Find or create subtitle track
        let textTrack = this.tracks.find(t => t.type === 'subtitle' || (t.type === 'text' && t.name?.includes('Caption')));
        if (!textTrack) {
            textTrack = {
                id: 'subtitle_track_' + Date.now(),
                type: 'subtitle',
                name: '🔤 Auto Captions',
                clips: [],
                isMuted: false,
                isSolo: false,
            };
            this.tracks.push(textTrack);
        }

        // Clear existing auto-captions
        textTrack.clips = textTrack.clips.filter(c => !c._autoCaption);

        const styleConfig = this._getCaptionStyle(style, language);

        let added = 0;
        for (const sub of subtitles) {
            if (!sub.text || !sub.text.trim()) continue;
            
            textTrack.clips.push({
                id: `caption_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                type: 'text',
                src: sub.text.trim(),
                text: sub.text.trim(),
                name: sub.text.trim().substring(0, 20) + '...',
                start: sub.start || 0,
                duration: (sub.end || sub.start + 2) - (sub.start || 0),
                sourceIn: 0,
                _autoCaption: true,
                textStyle: { ...styleConfig.textStyle },
                properties: { ...styleConfig.properties },
                transitions: { in: 'fade', out: 'fade', duration: 0.1 }
            });
            added++;
        }

        this.log(`✅ تم إضافة ${added} كليب ترجمة بأسلوب "${style}"!`);
        this.log(`💡 يمكنك تعديل الترجمة بالنقر على أي كليب في التايم لاين.`);
        
        this.saveState();
        this.requestRedraw();
        this.commitStateToReact();
    };

    /**
     * Get caption style configuration.
     */
    window.EditorApp.prototype._getCaptionStyle = function(style, language) {
        const isRTL = language === 'ar';
        
        const styles = {
            tiktok: {
                textStyle: {
                    fontFamily: 'Cairo',
                    fontSize: 52,
                    color: '#ffffff',
                    fontWeight: 'bold',
                    strokeColor: '#000000',
                    strokeWidth: 8,
                    shadowBlur: 4,
                    textAlign: 'center',
                    textTransform: 'none',
                },
                properties: { positionX: 0, positionY: 150, scale: 100, opacity: 100 }
            },
            youtube: {
                textStyle: {
                    fontFamily: 'Cairo',
                    fontSize: 40,
                    color: '#ffffff',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    backgroundOpacity: 85,
                    padding: 12,
                    textAlign: 'center',
                },
                properties: { positionX: 0, positionY: 200, scale: 100, opacity: 100 }
            },
            minimal: {
                textStyle: {
                    fontFamily: 'Inter',
                    fontSize: 36,
                    color: '#ffffff',
                    fontWeight: 'normal',
                    shadowBlur: 8,
                    textAlign: 'center',
                },
                properties: { positionX: 0, positionY: 200, scale: 100, opacity: 100 }
            },
            elegant: {
                textStyle: {
                    fontFamily: 'Cairo',
                    fontSize: 42,
                    color: '#ffd700',
                    fontWeight: 'bold',
                    strokeColor: '#000000',
                    strokeWidth: 4,
                    shadowBlur: 12,
                    textAlign: 'center',
                },
                properties: { positionX: 0, positionY: 180, scale: 100, opacity: 100 }
            }
        };

        return styles[style] || styles.tiktok;
    };

    /**
     * Add demo subtitle clips for testing.
     */
    window.EditorApp.prototype._addDemoSubtitles = function(style, language) {
        const demoAr = [
            { start: 0, end: 2.5, text: 'مرحباً بكم في AI4Montage' },
            { start: 2.5, end: 5.0, text: 'أقوى محرر فيديو على الويب' },
            { start: 5.0, end: 7.5, text: 'مدعوم بالذكاء الاصطناعي' },
            { start: 7.5, end: 10.0, text: 'اصنع مقاطعك الآن!' },
        ];
        const demoEn = [
            { start: 0, end: 2.5, text: 'Welcome to AI4Montage' },
            { start: 2.5, end: 5.0, text: 'The most advanced web video editor' },
            { start: 5.0, end: 7.5, text: 'Powered by Artificial Intelligence' },
            { start: 7.5, end: 10.0, text: 'Create your videos now!' },
        ];
        
        const demo = language === 'ar' ? demoAr : demoEn;
        this._addSubtitleClipsToTimeline(demo, style, language);
        this.log("📝 تم إضافة ترجمة تجريبية للعرض (Demo Mode).");
    };

    /**
     * Convert AudioBuffer to WAV ArrayBuffer.
     */
    window.EditorApp.prototype._audioBufferToWavBuffer = function(buffer) {
        const numCh = buffer.numberOfChannels;
        const length = buffer.length * numCh * 2 + 44;
        const ab = new ArrayBuffer(length);
        const view = new DataView(ab);
        const channels = [];
        let offset = 0, pos = 0;

        const writeStr = (str) => { for (let i = 0; i < str.length; i++, pos++) view.setUint8(pos, str.charCodeAt(i)); };
        const setU16 = (d) => { view.setUint16(pos, d, true); pos += 2; };
        const setU32 = (d) => { view.setUint32(pos, d, true); pos += 4; };

        writeStr('RIFF'); setU32(length - 8); writeStr('WAVE');
        writeStr('fmt '); setU32(16); setU16(1); setU16(numCh);
        setU32(buffer.sampleRate); setU32(buffer.sampleRate * 2 * numCh); setU16(numCh * 2); setU16(16);
        writeStr('data'); setU32(length - pos - 4);

        for (let i = 0; i < numCh; i++) channels.push(buffer.getChannelData(i));
        while (pos < length) {
            for (let i = 0; i < numCh; i++) {
                let s = Math.max(-1, Math.min(1, channels[i][offset]));
                s = (s < 0 ? s * 32768 : s * 32767) | 0;
                view.setInt16(pos, s, true); pos += 2;
            }
            offset++;
        }
        return ab;
    };
}
