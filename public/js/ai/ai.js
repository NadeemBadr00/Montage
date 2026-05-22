/**
 * 🧠 AI Engine (ai.js) - v4.1 (Subtitle Import Fix)
 * محرك الذكاء الاصطناعي المسؤول عن استخراج الترجمة (Subtitles).
 * الإصدار الاحترافي (Pro): يدعم الفيديوهات الطويلة جداً.
 * 🔥 FIX: إصلاح دالة applySubtitlesToTimeline لتقرأ SRT وتضعه في T1 فعلياً.
 */

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const GEMINI_KEYS_POOL = [
    "AIzaSyDn6aa1RS2gHDwi0tPZZsi4AsJVd3vEW-Y",
    "AIzaSyBtjJO4hWnA-YCmQdaUuqiqLkt18YAL7_I",
    "AIzaSyA6W2S0e5uJI3Uw5rHQoWjr2i_Qy6YQVzg",
    "AIzaSyDl51ZgJjb5K1kzorMkzDu3PLjWMTMR_co",
    "AIzaSyDinruhBeVGIy_giyRtfyNnZ8fPxdRqpcE",
    "AIzaSyC1YC5FFYe16W0QpfAA1PCDmwSlULPYwQw"
];

// إعدادات التقطيع (بالثواني)
const CHUNK_DURATION = 60; // طول المقطع الصافي
const OVERLAP_DURATION = 10; // فترة التداخل للأمان
const TOTAL_CHUNK_LEN = CHUNK_DURATION + OVERLAP_DURATION; // 70 ثانية

class AIManager {
    constructor() {
        this.lastGeneratedSRT = ""; // 🔥 ذاكرة لتخزين النص للخطة
    }

    /**
     * نقطة الدخول: استخراج الترجمة من كليب في التايم لاين
     */
    async generateSubtitlesForClip(clip) {
        if (!clip.src) {
            window.app.log("❌ الكليب لا يحتوي على مصدر (src).");
            return;
        }
        window.app.log(`🎬 جاري معالجة الكليب: ${clip.name}...`);
        try {
            const response = await fetch(clip.src);
            const blob = await response.blob();
            const file = new File([blob], clip.name || "video.mp4", { type: blob.type });
            await this.generateSubtitles(file);
        } catch (e) {
            console.error(e);
            window.app.log(`❌ فشل في جلب ملف الكليب: ${e.message}`);
        }
    }

    /**
     * الحصول على جميع المفاتيح المتاحة (بما في ذلك مفتاح المستخدم)
     */
    getAvailableKeys() {
        const userKey = document.getElementById('gemini-api-key')?.value?.trim();
        let keys = [...GEMINI_KEYS_POOL];
        if (userKey) keys.push(userKey); 
        return keys;
    }

    /**
     * دالة لمعالجة ملف SRT خارجي (تم رفعه يدوياً)
     * 🔥 تم التعديل لحفظ النص في الذاكرة
     */
    async processExternalSRT(file) {
        window.app.log(`📂 جاري قراءة ملف الترجمة المرفوع: ${file.name}...`);
        try {
            const text = await file.text();
            
            // 🔥 Save to memory for GeminiPlan (هذا هو الحل)
            this.lastGeneratedSRT = text;
            console.log("💾 SRT Saved to Memory for Plan (Size: " + text.length + ")");

            this.applySubtitlesToTimeline(text);
            
            if (window.geminiAssistant && window.geminiAssistant.enabled) {
                window.app.log("🤖 إرسال النص (من الملف) إلى المساعد لبناء الخطة...");
                window.geminiAssistant.onTranscriptReady(text);
            }
        } catch (e) {
            window.app.log(`❌ فشل قراءة ملف SRT: ${e.message}`);
        }
    }

    /**
     * تحميل ملف SRT للمستخدم
     */
    downloadSRTFile(content, filename = "transcript.srt") {
        const blob = new Blob([content], { type: 'text/srt;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.app.log("📥 تم تحميل ملف الترجمة على جهازك.");
    }

    /**
     * الوظيفة الرئيسية: إدارة عملية التقسيم والمعالجة المتوازية
     */
    async generateSubtitles(videoFile) {
        window.app.log("📝 [المرحلة 1] تحليل الصوت وتقسيمه...");
        
        try {
            // 1. فك تشفير الملف بالكامل للحصول على AudioBuffer
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await videoFile.arrayBuffer();
            const fullAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            const duration = fullAudioBuffer.duration;
            window.app.log(`⏱️ مدة الفيديو: ${duration.toFixed(1)} ثانية`);

            // 2. تحضير الوعود (Promises) للمعالجة المتوازية
            const promises = [];
            let chunkIndex = 0;

            for (let startTime = 0; startTime < duration; startTime += CHUNK_DURATION) {
                // تحديد نهاية المقطع (مع التداخل)
                const endTime = Math.min(startTime + TOTAL_CHUNK_LEN, duration);
                
                window.app.log(`🔹 تجهيز المقطع ${chunkIndex + 1}: من ${startTime}s إلى ${endTime}s`);

                // قص جزء من الصوت
                const chunkBuffer = this.sliceAudioBuffer(fullAudioBuffer, startTime, endTime, audioCtx);
                const chunkWavBlob = this.bufferToWave(chunkBuffer, chunkBuffer.length);

                // إطلاق عملية المعالجة لهذا المقطع (بدون await لتعمل بالتوازي)
                promises.push(this.processChunk(chunkWavBlob, startTime, chunkIndex));
                
                chunkIndex++;
            }

            window.app.log(`🚀 جاري معالجة ${promises.length} مقطع بالتوازي باستخدام Gemini...`);

            // 3. انتظار جميع العمال (Workers)
            const results = await Promise.all(promises);

            // 4. خياطة النتائج (Stitching)
            window.app.log("🧵 دمج النتائج وحل التداخلات...");
            const finalSRT = this.stitchSubtitles(results);

            if (finalSRT) {
                window.app.log(`✅ تمت الترجمة بنجاح!`);
                
                // 🔥 Save to memory (للترجمة التلقائية أيضاً)
                this.lastGeneratedSRT = finalSRT;

                this.applySubtitlesToTimeline(finalSRT);
                this.downloadSRTFile(finalSRT, `transcript_${Date.now()}.srt`);
                
                if (window.geminiAssistant && window.geminiAssistant.enabled) {
                    window.app.log("🤖 إرسال النص الكامل إلى المساعد...");
                    window.geminiAssistant.onTranscriptReady(finalSRT);
                }
            } else {
                window.app.log("❌ لم يتم استخراج أي نصوص.");
            }

        } catch (err) {
            console.error(err);
            window.app.log(`❌ خطأ فادح: ${err.message}`);
        }
    }

    /**
     * عامل المعالجة: يرسل مقطعاً واحداً لـ Gemini ويصحح التوقيت
     */
    async processChunk(chunkBlob, timeOffset, index) {
        // تحويل Blob إلى Base64
        const chunkArrayBuffer = await chunkBlob.arrayBuffer();
        const chunkBase64 = this.arrayBufferToBase64(chunkArrayBuffer);

        // محاولة التنفيذ مع إعادة المحاولة وتغيير المفاتيح
        let availableKeys = this.getAvailableKeys();
        let srtPart = null;

        // خلط المفاتيح عشوائياً لكل مقطع لتوزيع الحمل
        availableKeys.sort(() => Math.random() - 0.5);

        for (const key of availableKeys) {
            try {
                srtPart = await this.callGeminiTranscription(key, chunkBase64);
                if (srtPart) break; // نجح
            } catch (e) {
                console.warn(`Chunk ${index} failed with key ending in ...${key.slice(-4)}. Trying next.`);
            }
        }

        if (!srtPart) {
            window.app.log(`⚠️ المقطع ${index + 1} فشل تماماً. قد تكون هناك فجوة في الترجمة.`);
            return []; // إرجاع مصفوفة فارغة في حالة الفشل التام
        }

        // تحليل النص الخام وتحويله لكائنات مع تصحيح الوقت
        return this.parseAndOffsetSRT(srtPart, timeOffset);
    }

    /**
     * تحويل رد Gemini الخام إلى مصفوفة كائنات وتصحيح التوقيت
     */
    parseAndOffsetSRT(rawText, offsetSeconds) {
        const parsed = [];
        const lines = rawText.replace(/```/g, "").trim().split('\n');

        for (let line of lines) {
            line = line.trim();
            if (!line || !line.includes('|')) continue;
            
            const parts = line.split('|');
            if (parts.length >= 3) {
                try {
                    let startStr = parts[0].trim(); // 00:01,500
                    let endStr = parts[1].trim();   // 00:05,000
                    const text = parts[2].trim();

                    // تحويل التوقيت إلى ثواني
                    const startSec = this.timeStringToSeconds(startStr);
                    const endSec = this.timeStringToSeconds(endStr);

                    // إضافة الإزاحة الزمنية (Offset)
                    // هذا هو السحر: نضيف توقيت بداية المقطع ليصبح التوقيت عالمياً
                    const globalStart = startSec + offsetSeconds;
                    const globalEnd = endSec + offsetSeconds;

                    parsed.push({
                        start: globalStart,
                        end: globalEnd,
                        text: text
                    });
                } catch (e) {
                    console.warn("Error parsing line:", line);
                }
            }
        }
        return parsed;
    }

    /**
     * خياطة المقاطع: دمج المصفوفات وحذف التكرار في مناطق التداخل
     */
    stitchSubtitles(chunkResults) {
        let allSubtitles = [];

        for (let i = 0; i < chunkResults.length; i++) {
            const chunkItems = chunkResults[i];
            
            // حساب نقطة القطع (Cut-off point)
            const chunkStartTime = i * CHUNK_DURATION;
            const overlapMidPoint = chunkStartTime + CHUNK_DURATION + (OVERLAP_DURATION / 2);

            // تصفية هذا المقطع
            const filteredItems = chunkItems.filter(item => {
                // إذا كان هذا هو المقطع الأخير، خذ كل شيء
                if (i === chunkResults.length - 1) return true;
                // وإلا، خذ فقط العناصر التي تبدأ قبل نقطة المنتصف
                return item.start < overlapMidPoint;
            });

            allSubtitles = allSubtitles.concat(filteredItems);
        }

        // ترتيب نهائي حسب الوقت (للأمان)
        allSubtitles.sort((a, b) => a.start - b.start);

        // تحويل المصفوفة المدمجة إلى نص SRT نهائي
        let finalOutput = "";
        allSubtitles.forEach((sub, index) => {
            const sStart = this.secondsToSRTTime(sub.start);
            const sEnd = this.secondsToSRTTime(sub.end);
            finalOutput += `${index + 1}\n${sStart} --> ${sEnd}\n${sub.text}\n\n`;
        });

        return finalOutput;
    }

    // --- دوال مساعدة للصوت ---

    /**
     * قص جزء محدد من AudioBuffer
     */
    sliceAudioBuffer(fullBuffer, startSec, endSec, ctx) {
        const rate = fullBuffer.sampleRate;
        const startOffset = Math.floor(startSec * rate);
        const endOffset = Math.floor(endSec * rate);
        const frameCount = endOffset - startOffset;

        if (frameCount <= 0) return ctx.createBuffer(1, 1, rate);

        const newBuffer = ctx.createBuffer(fullBuffer.numberOfChannels, frameCount, rate);

        for (let i = 0; i < fullBuffer.numberOfChannels; i++) {
            const channelData = fullBuffer.getChannelData(i);
            const newChannelData = newBuffer.getChannelData(i);
            // نسخ البيانات الخام (Fast copy)
            newChannelData.set(channelData.subarray(startOffset, endOffset));
        }
        return newBuffer;
    }

    async callGeminiTranscription(key, audioBase64) {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
                    const prompt = `            
            Task: Transcribe audio to TikTok-style subtitles.
            
            **RULES:**
            1. Minimum 4 words per line. Avoid short lines (1-3 words) by merging phrases.
            2. Split long sentences.
            3. Time Format: MM:SS,ms (NO Hours).
            **OUTPUT FORMAT (Raw Data):**
            MM:SS,ms|MM:SS,ms|Text
            
            **SEPARATOR:** Use "|" ONLY.
            
            **EXAMPLE INPUT (Audio):**
            (Audio file provided)
            
            **EXAMPLE OUTPUT (Target Format):**
            00:00,539|00:01,239|استوديو جيبلي
            00:01,239|00:02,309|استوديو جيبلي هو ايه الحوار؟
            00:02,309|00:04,119|اللي مجنن الناس على الفيسبوك؟
            00:04,389|00:05,379|استوديو جيبلي ده اصلا؟
            00:05,629|00:07,179|استوديو جيبلي هو استوديو انمي ياباني.
            00:07,599|00:11,359|اتاسس 1985 على ايد العبقري هيومييا زكي.
            00:11,549|00:14,299|وكان معاه المخرج يساو تاكاهاتا والمنتج توشيو سوزوكي.
            00:14,639|00:16,119|من اول يوم هدفهم
            00:16,369|00:18,099|ما كانش الشهره كان انهم يعملوا
            00:18,099|00:20,319|فن حقيقي يعيش للابد.
            00:20,319|00:21,439|ومن اهم افلامهم
            00:21,439|00:22,179|جارتوتورو.
            00:22,179|00:23,549|وقلعه هاول المتحركه
            00:23,549|00:26,179|والمخطوفه واللي كسب اسكار كافضل فيلم رسوم متحركه.
            00:26,359|00:27,779|بس تعرف ايه اللي يخليك
            00:27,779|00:29,499|فعلا تحترمهم انهم بيدوا فنهم
            00:29,499|00:30,289|حقه بجد.
            00:30,289|00:31,439|بيكدوا بايديهم
            00:31,439|00:33,189|من غير ما يستخدموا اي خاصيه
            00:33,189|00:35,939|هتساعدهم عشان يطلعوا افضل مشاهد تعبر عن المشاعر البشريه.
            00:36,449|00:39,729|يعني تخيل ان في مشهد من فيلم ذا ويندرايسز 2013
            00:40,790|00:41,749|مدته اربع ثواني بس.
            00:41,929|00:42,919|في حركه ناس كتير
            00:42,919|00:44,799|في الخلفيه يعني ناس بتتحرك في زحمه في مكان واحد.
            00:45,209|00:49,709|استوديو جيبلي اشتغل على المشهد ده سنه وثلاث شهور.
            00:49,859|00:51,579|كمان فيلم ذا تيل اوف ذا برنسس كوجويا
            00:51,899|00:53,499|ده اطول فيلم اشتغلت عليه جيبلي.
            00:53,749|00:55,309|خد منهم وقت ثمان سنين كاملين.
            00:55,599|00:57,590|وده بسبب الرسومات اللي كانت كلها باسلوب يدوي.
            00:57,590|00:59,389|شبه اللوحات اليابانيه القديمه.
            01:00,279|01:01,219|كل خط وكل ظل
            01:01,219|01:03,590|كل تعبير مرسوم بايد فنان حقيقي.
            01:03,979|01:05,439|طب ايه السبب بقى اللي يخلي
            01:05,439|01:06,969|استوديو جيبلي ترند دلوقتي؟
            01:06,969|01:08,929|في 2025 طلع ترند بيستخدم
            01:08,929|01:12,129|الذكاء الاصطناعي عشان يحول صور الناس لستايل جيبلي.
            01:12,449|01:13,509|والناس اتبسطت قوي بيه.
            01:13,729|01:15,390|بس في ناس ثانيه قالت لك لا.
            01:15,390|01:16,329|ده مش احترام للفن.
            01:16,519|01:17,499|دي سرقه روح فنان.
            01:17,749|01:21,289|ومؤسس استوديو جيبلي ميا زاكي قال لك ان ده اهانه للحياه.
            01:21,559|01:23,490|انا مش برسم عشان اجرب.
            01:23,379|01:25,290|انا برسم علشان اعبر عن البشر.
            01:25,290|01:26,389|وهو ده الفرق ببساطه.
            01:26,679|01:28,390|استوديو جيبلي مش مجرد ستايل رسم.
            01:28,449|01:29,439|دي روح بتتحرك
            01:29,859|01:32,399|فيها حب وتعب وسنين من الشغل اليدوي.
            01:32,649|01:33,389|وانتم رايكم ايه؟
            01:33,639|01:36,209|هل ترند رسومات جيبلي ترند لذيذ والمفروض ننبسط بيه؟
            01:36,519|01:38,409|ولا سرقه للفن وجهد وتعب سنين؟
            01:38,709|01:40,990|سيبوا لنا رايكم في التعليقات.
            
                    `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType: "audio/wav", data: audioBase64 } }
        ]);
        return result.response.text();
    }

    // --- دوال مساعدة للوقت والتنسيق ---

    timeStringToSeconds(timeStr) {
        // format: 00:01,500
        const [p1, p2] = timeStr.split(',');
        const ms = p2 ? parseInt(p2) : 0;
        const parts = p1.split(':');
        const min = parseInt(parts[0]);
        const sec = parseInt(parts[1]);
        return (min * 60) + sec + (ms / 1000);
    }

    secondsToSRTTime(seconds) {
        const date = new Date(0);
        date.setMilliseconds(seconds * 1000);
        const iso = date.toISOString().substr(11, 12); // HH:MM:SS.mmm
        return iso.replace('.', ',');
    }

    bufferToWave(abuffer, len) {
        var numOfChan = abuffer.numberOfChannels,
            length = len * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [], i, sample,
            offset = 0,
            pos = 0;

        function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
        function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }

        setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
        setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
        setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);

        for(i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

        while(pos < length) {
            for(i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset])); 
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
                view.setInt16(pos, sample, true); 
                pos += 2;
            }
            offset++;
        }
        return new Blob([buffer], {type: "audio/wav"});
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
        return window.btoa(binary);
    }

    // 🔥 FIX: الإصلاح الجوهري هنا
    // هذه الدالة كانت فارغة سابقاً، الآن هي تستخدم parseSRTToClips من assets.js
    applySubtitlesToTimeline(srtContent) {
        if (!window.app) return;

        window.app.log("📜 معالجة ملف الترجمة وإضافته للتايم لاين...");

        // 1. البحث عن تراك الترجمة (Subtitle Track)
        let textTrack = window.app.tracks.find(t => t.type === 'subtitle');

        // إذا لم يوجد، نقوم بإنشائه في الأعلى (Index 0)
        if (!textTrack) {
            window.app.addNewTrack('subtitle', 0);
            textTrack = window.app.tracks.find(t => t.type === 'subtitle');
        }

        if (!textTrack) {
            window.app.log("❌ تعذر إنشاء تراك الترجمة.");
            return;
        }

        // 2. استخدام دالة التحليل الموجودة في assets.js
        if (typeof window.parseSRTToClips === 'function') {
            const clips = window.parseSRTToClips(srtContent);

            if (clips.length > 0) {
                // ضبط معرف التراك لكل كليب
                clips.forEach(clip => {
                    clip.trackId = textTrack.id;
                    // تأكد من أن الستايل الافتراضي للنص موجود
                    if (!clip.textStyle) {
                        clip.textStyle = {
                            fontFamily: 'Cairo', fontWeight: 'bold',
                            color: '#ffffff', strokeColor: '#000000', strokeWidth: 4,
                            shadowBlur: 0, backgroundColor: '#000000', backgroundOpacity: 0,
                            padding: 10
                        };
                    }
                });

                // إضافة الكليبات للتراك
                textTrack.clips = clips;
                textTrack.rebuildTree(); // مهم جداً للمحرك لتحديث الشجرة

                // تحديث الواجهة
                window.app.refreshProjectTopology();
                window.app.renderTracks();
                window.app.requestRedraw();
                
                window.app.log(`✅ تمت إضافة ${clips.length} تتر للتايم لاين.`);
            } else {
                window.app.log("⚠️ ملف SRT يبدو فارغاً أو بتنسيق غير صحيح.");
            }
        } else {
            // Fallback: تحليل بسيط إذا لم تكن الدالة موجودة
            window.app.log("⚠️ دالة parseSRTToClips غير موجودة، جاري استخدام محلل الطوارئ.");
            // ... (يمكن إضافة منطق بسيط هنا لكن assets.js يجب أن يكون محملاً)
        }
    }
}

window.aiManager = new AIManager();