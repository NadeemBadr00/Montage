/**
 * 🎧 Audio Worker (audio_worker.js)
 * يقوم بمعالجة بيانات الصوت الخام لاستخراج الـ Peaks (القمم)
 * 🔥 UPDATE: Ultra High Contrast (Zero Silence / Max Volume).
 */

self.onmessage = function(e) {
    const { channelData, samples, jobId } = e.data;

    if (!channelData || !samples) {
        postMessage({ error: "No data provided", debug: "No data received in worker" });
        return;
    }

    // Logging for debugging (will appear in main console via wrapper)
    // postMessage({ debug: `Processing ${channelData.length} samples for job ${jobId.clipId}` });

    const blockSize = Math.floor(channelData.length / samples);
    const peaks = [];

    for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        let maxVal = 0;
        
        const end = Math.min(start + blockSize, channelData.length);
        for (let j = start; j < end; j++) {
            const val = channelData[j];
            const abs = val < 0 ? -val : val;
            if (abs > maxVal) maxVal = abs;
        }
        
        // 🔥 Ultra High Contrast Logic (التباين الأقصى):
        // الهدف: جعل الصمت صفراً تماماً، والصوت يملأ التراك بالكامل.

        // 1. Noise Gate: أي إشارة ضعيفة جداً (تحت 2%) تعتبر صمتاً وتصبح صفراً.
        if (maxVal < 0.02) {
            maxVal = 0;
        } else {
            // 2. Extreme Boost: تضخيم الصوت بقوة (4 أضعاف).
            // هذا يجعل الكلام العادي (الذي عادة يكون 0.3-0.5) يقفز فوراً إلى 1.0 (الحد الأقصى).
            maxVal = maxVal * 4.0;

            // 3. Clamp: منع القيمة من تجاوز الحد الأقصى للرسم (1.0).
            if (maxVal > 1.0) maxVal = 1.0;
        }
        
        peaks.push(maxVal);
    }

    postMessage({ peaks: peaks, jobId: jobId });
};