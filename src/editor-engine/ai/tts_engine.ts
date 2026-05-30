// @ts-nocheck
/**
 * 🔊 Gemini TTS Engine — v1.0
 * يولد صوت voiceover باستخدام Gemini TTS API
 * gemini-2.5-flash-preview-tts
 */

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { BrainInstance } from "./ai4montage_brain";

// الأصوات المتاحة من Gemini TTS
export const TTS_VOICES = [
    // عربية / أكثر استخداماً
    { id: 'Kore',    name: 'Kore',    lang: 'عربي مناسب',  gender: '♀' },
    { id: 'Aoede',   name: 'Aoede',   lang: 'عربي ناعم',   gender: '♀' },
    { id: 'Leda',    name: 'Leda',    lang: 'عربي واضح',   gender: '♀' },
    { id: 'Zephyr',  name: 'Zephyr',  lang: 'إنجليزي رخيم', gender: '♂' },
    { id: 'Charon',  name: 'Charon',  lang: 'إنجليزي عميق', gender: '♂' },
    { id: 'Fenrir',  name: 'Fenrir',  lang: 'إنجليزي قوي',  gender: '♂' },
    { id: 'Orus',    name: 'Orus',    lang: 'إنجليزي دافئ', gender: '♂' },
    { id: 'Puck',    name: 'Puck',    lang: 'إنجليزي حيوي', gender: '♂' },
    { id: 'Schedar', name: 'Schedar', lang: 'رسمي',          gender: '♂' },
    { id: 'Gacrux',  name: 'Gacrux',  lang: 'دراماتيكي',   gender: '♂' },
];

class TTSEngine {
    constructor() {
        this._log = (msg) => {
            if (window.app?.log) window.app.log(msg);
            else console.log('[TTS]', msg);
        };
    }

    getKeys(): string[] {
        return BrainInstance.getShuffledKeys();
    }

    /**
     * توليد صوت من نص
     * @param text - النص المراد تحويله لصوت
     * @param voiceId - اسم الصوت (Kore, Aoede, Zephyr...)
     * @returns blob URL للملف الصوتي
     */
    async generate(text: string, voiceId: string = 'Kore'): Promise<string> {
        const keys = this.getKeys();
        if (keys.length === 0) {
            throw new Error('لا توجد API keys متاحة');
        }

        this._log(`🔊 جاري توليد الصوت... (صوت: ${voiceId})`);

        let lastError: Error | null = null;

        for (const key of keys) {
            try {
                const url = await this._callTTS(key, text, voiceId);
                this._log(`✅ تم توليد الصوت بنجاح!`);
                return url;
            } catch (err) {
                const msg = String(err?.message || err);
                console.warn(`[TTS] Key failed: ${msg.slice(0, 60)}`);
                lastError = err;
                if (msg.includes('403') || msg.includes('401')) continue;
                if (msg.includes('429')) {
                    await this._sleep(1500);
                    continue;
                }
                break;
            }
        }

        throw lastError || new Error('فشل توليد الصوت');
    }

    private async _callTTS(key: string, text: string, voiceId: string): Promise<string> {
        // Gemini TTS via REST API (الـ SDK لا يدعم TTS بعد)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`;

        const body = {
            contents: [{ parts: [{ text }] }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceId }
                    }
                }
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`${res.status}: ${errText.slice(0, 100)}`);
        }

        const data = await res.json();

        // استخراج البيانات الصوتية
        const audioB64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';

        if (!audioB64) {
            throw new Error('لا توجد بيانات صوتية في الرد');
        }

        // تحويل Base64 → Blob → URL
        const binary = atob(audioB64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });
        return URL.createObjectURL(blob);
    }

    /**
     * توليد صوت وإضافته مباشرة للتايم لاين على تراك A2
     */
    async generateAndAddToTimeline(text: string, voiceId: string, startTime: number = 0) {
        const url = await this.generate(text, voiceId);

        // إضافة للتايم لاين
        const store = (window as any).useEditorStore?.getState?.();
        if (!store) {
            this._log('⚠️ لا يمكن الوصول للـ editor store');
            return url;
        }

        const { addClipToTrack, tracks } = store;
        const audioTrack = tracks?.find((t: any) => t.id === 'A2' || t.type === 'audio');

        if (audioTrack && addClipToTrack) {
            const clip = {
                id: `tts_${Date.now()}`,
                name: `Voiceover_${voiceId}`,
                src: url,
                type: 'audio',
                start: startTime,
                duration: 10, // placeholder — سيُحدّث بعد تحميل الملف
                volume: 1,
            };
            addClipToTrack(audioTrack.id, clip);
            this._log(`🎵 تم إضافة الـ voiceover على التراك: ${audioTrack.id}`);
        }

        return url;
    }

    private _sleep(ms: number) {
        return new Promise(r => setTimeout(r, ms));
    }
}

export const ttsEngine = new TTSEngine();
(window as any).ttsEngine = ttsEngine;
