// @ts-nocheck
// ai-utils.ts — Audio manipulation helpers, SRT time format utils

/**
 * قص جزء محدد من AudioBuffer
 */
export function sliceAudioBuffer(fullBuffer, startSec, endSec, ctx) {
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

export function bufferToWave(abuffer, len) {
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

export function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

export function timeStringToSeconds(timeStr) {
    // format: 00:01,500
    const [p1, p2] = timeStr.split(',');
    const ms = p2 ? parseInt(p2) : 0;
    const parts = p1.split(':');
    const min = parseInt(parts[0]);
    const sec = parseInt(parts[1]);
    return (min * 60) + sec + (ms / 1000);
}

export function secondsToSRTTime(seconds) {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    const iso = date.toISOString().substr(11, 12); // HH:MM:SS.mmm
    return iso.replace('.', ',');
}

// 🔥 FIX: الإصلاح الجوهري للترجمة الآلية (SRT) مع React / Zustand
// Note: any `this.lastGeneratedSRT` assignment is handled in AIManager.applySubtitlesToTimeline
export async function applySubtitlesToTimeline(srtContent: string) {
    if (window.app && window.app.log) {
        window.app.log("📜 معالجة ملف الترجمة وإضافته للتايم لاين الحديث...");
    } else {
        console.log("📜 معالجة ملف الترجمة وإضافته للتايم لاين الحديث...");
    }

    let useEditorStore;
    try {
        const module = await import('../../store/useEditorStore');
        useEditorStore = module.useEditorStore;
    } catch (e) {
        console.error("❌ تعذر العثور على useEditorStore:", e);
        return;
    }
    const state = useEditorStore.getState();

    const parseSRTTime = (timeString) => {
        if (!timeString) return 0;
        const parts = timeString.trim().split(':');
        if (parts.length < 3) return 0;
        const secondsParts = parts[2].split(',');
        return (parseInt(parts[0], 10) * 3600) + (parseInt(parts[1], 10) * 60) + parseInt(secondsParts[0], 10) + ((parseInt(secondsParts[1], 10) || 0) / 1000);
    };

    const clips = [];
    const blocks = srtContent.replace(/\r\n/g, '\n').split('\n\n'); 
    blocks.forEach((block, index) => {
        const lines = block.split('\n').filter(line => line.trim() !== '');
        if (lines.length >= 3) {
            const timeLineIndex = lines.findIndex(l => l.includes('-->'));
            if (timeLineIndex !== -1) {
                const times = lines[timeLineIndex].split(' --> ');
                const start = parseSRTTime(times[0]);
                const end = parseSRTTime(times[1]);
                const text = lines.slice(timeLineIndex + 1).join(' ');
                clips.push({
                    id: `sub_${Date.now()}_${index}`,
                    name: text,
                    start,
                    duration: Math.max(0.1, end - start),
                    type: 'text',
                    src: text,
                    textStyle: {
                        fontFamily: 'Cairo', fontWeight: 'bold',
                        color: '#ffffff', strokeColor: '#000000', strokeWidth: 4,
                        shadowBlur: 0, backgroundColor: '#000000', backgroundOpacity: 0,
                        padding: 10
                    }
                });
            }
        }
    });

    if (clips.length === 0) {
        const msg = "⚠️ ملف SRT يبدو فارغاً أو بتنسيق غير صحيح.";
        if (window.app?.log) window.app.log(msg); else console.warn(msg);
        return;
    }

    // حفظ كأصل (Asset)
    const blob = new Blob([srtContent], { type: 'text/srt' });
    const assetUrl = URL.createObjectURL(blob);
    state.addAsset({
        id: `srt_${Date.now()}`,
        name: `Transcript_${new Date().toLocaleTimeString().replace(/:/g, '-')}.srt`,
        type: 'text',
        src: assetUrl
    });

    // إيجاد مسار الترجمة أو إنشائه
    let textTrack = state.tracks.find(t => t.type === 'subtitle');
    let textTrackId = textTrack?.id;
    
    if (!textTrack) {
        textTrackId = Date.now();
        state.addTrack({
            id: textTrackId,
            name: "T1: Transcript",
            type: "subtitle",
            color: "bg-yellow-600",
            clips: []
        });
    }

    // إضافة الكليبات
    clips.forEach(clip => {
        clip.trackId = textTrackId;
        state.addClipToTrack(textTrackId, clip);
    });

    const successMsg = `✅ تمت إضافة ${clips.length} تتر للتايم لاين الحديث على المسار T1.`;
    if (window.app?.log) window.app.log(successMsg); else console.log(successMsg);
}
