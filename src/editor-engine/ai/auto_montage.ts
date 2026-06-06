// @ts-nocheck
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { BrainInstance, AI4MONTAGE_MODELS } from "./ai4montage_brain";
import { EXCLUDED_FILES, MAX_INLINE_VIDEO_BYTES, KEYS_RESERVED_FOR_PLAN, AVAILABLE_SFX } from './auto-montage-types';

// ─── Core Engine ─────────────────────────────────────────────────────────────

class AutoMontageEngine {
    private assets: MediaAsset[] = [];
    private plan: MontagePlan | null = null;
    private isRunning = false;
    private progressCb: ((msg: string, pct: number) => void) | null = null;

    // ═══════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════

    async run(style: string = 'cinematic', onProgress?: (msg: string, pct: number) => void) {
        if (this.isRunning) {
            this.log('⚠️ AutoMontage يعمل بالفعل، انتظر اكتماله.');
            return;
        }
        this.isRunning = true;
        this.progressCb = onProgress || null;

        try {
            // 1. جمع الميديا
            this.progress('🔍 جمع الميديا المرفوعة...', 0);
            this.assets = await this.collectMediaAssets();

            if (this.assets.length === 0) {
                this.log('⚠️ لا توجد ميديا مرفوعة. ارفع صور أو فيديوهات أولاً.');
                return;
            }
            this.log(`📦 تم جمع ${this.assets.length} أصل ميديا (تم استثناء bg.webp / graph.webp).`);

            // 2. تحليل بالتوازي — كل أصل بـ API key مختلف
            this.progress('🧠 تحليل المحتوى المرئي بالتوازي...', 8);
            await this.analyzeAllAssetsParallel();
            this.progress('✅ اكتمل التحليل البصري لجميع الأصول!', 40);

            // 3. بناء الخطة الشاملة
            this.progress('📋 بناء خطة المونتاج الكاملة مع Gemini...', 45);
            this.plan = await this.buildComprehensivePlan(style);
            this.progress('⚙️ تطبيق المونتاج على التايم لاين...', 62);

            // 4. تنفيذ الخطة
            await this.executePlan();
            this.progress('🎨 تطبيق التأثيرات...', 88);

            // 5. نهائيات
            await this.finalizeMontage();
            this.progress('✅ اكتمل المونتاج التلقائي!', 100);
            this.log('🎬 AutoMontage اكتمل! راجع التايم لاين وعدّل حسب رغبتك.');

        } catch (err) {
            console.error('[AutoMontage]', err);
            this.log(`❌ خطأ: ${err.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 1: COLLECT — يستثني bg.webp / graph.webp / Chill_Beat
    // ═══════════════════════════════════════════════════════════

    private async collectMediaAssets(): Promise<MediaAsset[]> {
        const allClips: any[] = [];

        // من التايم لاين
        if (window.app?.tracks) {
            window.app.tracks.forEach((track: any) => {
                track.clips.forEach((clip: any) => {
                    if (clip.type === 'video' || clip.type === 'image') {
                        allClips.push(clip);
                    }
                });
            });
        }

        // من مكتبة الميديا (Zustand)
        const mediaLibrary: any[] = (window as any).mediaLibraryItems || [];
        mediaLibrary.forEach((item: any) => {
            if (!allClips.find(c => c.src === item.src)) {
                allClips.push({ id: `lib_${Date.now()}_${Math.random()}`, ...item });
            }
        });

        // فلترة الملفات المستثناة + deduplication
        const seen = new Set<string>();
        const assets: MediaAsset[] = [];

        for (const clip of allClips) {
            if (!clip.src || seen.has(clip.src)) continue;

            // استثناء bg.webp / graph.webp / Chill_Beat
            // نتحقق من الاسم (name) لأن src قد يكون blob URL
            const clipName = (clip.name || '').toLowerCase();
            const clipSrcTail = (clip.src || '').split('/').pop()?.toLowerCase() || '';
            const isExcluded = EXCLUDED_FILES.some(ex =>
                clipName.includes(ex.toLowerCase()) || clipSrcTail.includes(ex.toLowerCase())
            );
            if (isExcluded) {
                this.log(`⏭️ تم استثناء: ${clip.name || clipSrcTail}`);
                continue;
            }

            seen.add(clip.src);

            // الاسم من clip.name أو من آخر الـ src
            const displayName = clip.name ||
                (clip.src || '').split('/').pop() ||
                `ميديا_${assets.length + 1}`;

            const asset: MediaAsset = {
                id: clip.id || `asset_${Date.now()}_${Math.random()}`,
                name: displayName,
                src: clip.src,
                type: clip.type as 'video' | 'image',
                duration: clip.duration,
                fileRef: clip.fileRef || null, // مرجع الملف الأصلي إن توفر
            };

            // محاولة استرجاع الملف الأصلي من __pendingExtraFiles
            if (!asset.fileRef && asset.type === 'video') {
                const pending: File[] = (window as any).__pendingExtraFiles || [];
                const match = pending.find(f => f.name === displayName);
                if (match) asset.fileRef = match;
                // أيضاً: الفيديو الرئيسي
                const mainVideo = (window as any).__pendingVideoFile;
                if (!asset.fileRef && mainVideo && mainVideo.name === displayName) {
                    asset.fileRef = mainVideo;
                }
            }

            assets.push(asset);
        }

        // استخراج thumbnails بالتوازي
        this.progress('🖼️ استخراج صور مصغرة...', 4);
        await Promise.all(assets.map(async (asset) => {
            try {
                if (asset.type === 'video') {
                    asset.thumbnailBase64 = await this.extractVideoThumbnail(asset.src, 0.5);
                    if (!asset.duration) {
                        asset.duration = await this.getVideoDuration(asset.src);
                    }
                } else if (asset.type === 'image') {
                    asset.thumbnailBase64 = await this.imageToBase64(asset.src);
                }
            } catch (e) {
                console.warn(`[AutoMontage] Thumbnail failed: ${asset.name}`, e);
            }
        }));

        return assets;
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: PARALLEL VISION ANALYSIS — كل أصل بـ API key مختلف
    // ═══════════════════════════════════════════════════════════

    private getVisionKeys(): string[] {
        return BrainInstance.getShuffledKeys();
    }

    private async analyzeAllAssetsParallel() {
        const keys = this.getVisionKeys();
        if (keys.length === 0) {
            this.log('⚠️ لا توجد vision keys متاحة — سيتم استخدام التحليل البديل.');
            this.assets.forEach(a => { a.analysis = this.getFallbackAnalysis(a); });
            return;
        }

        for (let i = 0; i < this.assets.length; i++) {
            const asset = this.assets[i];
            await this.analyzeAsset(asset);
            this.progress(
                `🧠 تحليل ${i + 1}/${this.assets.length}: ${asset.name}`,
                10 + Math.round(((i + 1) / this.assets.length) * 30)
            );
            if (i < this.assets.length - 1) await this.sleep(400); // تأخير بين كل طلب
        }

        const analyzed = this.assets.filter(a => a.analysis).length;
        this.log(`🧠 تم تحليل ${analyzed}/${this.assets.length} أصل بصرياً`);
    }

    private async analyzeAsset(asset: MediaAsset) {
        if (!asset.thumbnailBase64) {
            asset.analysis = this.getFallbackAnalysis(asset);
            return;
        }

        const prompt = `You are an expert video editor analyzing media for automatic montage production.
Analyze this media file and provide structured metadata. 
If it's an audio file, infer the mood. If it's an image/video, describe the content.

OUTPUT FORMAT:
{
  "contentType": "person|landscape|product|abstract|broll",
  "mood": "energetic|calm|dramatic|happy|corporate",
  "tags": ["keyword1", "keyword2", "keyword3"],
  "suggestedDuration": <number in seconds, max 10>,
  "suggestedTrack": "main|broll|overlay",
  "hasFace": <boolean>,
  "quality": <1-10>,
  "description": "<short Arabic description, max 8 words>"
}

Rules:
- Person/speaker talking → contentType:"speaker", suggestedTrack:"main", suggestedDuration: full video duration
- Wide shot / scenery → contentType:"landscape", suggestedTrack:"broll"
- Small logo/graphic → suggestedTrack:"overlay", suggestedDuration: 3-5
- High quality footage (quality 7+): prefer V1 main track
Return ONLY the JSON. No markdown, no explanation.`;

        const MODELS = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-3.5-flash", 
            "gemini-3-flash-preview", 
            "gemini-3.1-flash-lite"
        ];
        let keys = [...this.getVisionKeys()].sort(() => Math.random() - 0.5);
        let lastErr;

        for (const key of keys) {
            const shortKey = key.slice(-4);
            for (const modelName of MODELS) {
                try {
                    const genAI = new GoogleGenerativeAI(key);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        safetySettings: [
                            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                        ],
                    });

                    let mimeType = 'image/jpeg';
                    let imgData = asset.thumbnailBase64;
                    if (imgData.startsWith('data:')) {
                        mimeType = imgData.split(';')[0].split(':')[1];
                        imgData = imgData.split(',')[1];
                    }

                    const result = await model.generateContent([
                        prompt,
                        { inlineData: { mimeType, data: imgData } }
                    ]);

                    const candidate = result.response?.candidates?.[0];
                    const finishReason = candidate?.finishReason;

                    if (!candidate || finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'BLOCKED_REASON_UNSPECIFIED') {
                        throw new Error(`BLOCKED:${finishReason || 'SAFETY'}`);
                    }

                    const parts = candidate.content?.parts;
                    if (!parts || parts.length === 0) {
                        throw new Error('BLOCKED:EMPTY_PARTS');
                    }

                    const text = result.response.text();
                    const s = text.indexOf('{');
                    const e = text.lastIndexOf('}') + 1;
                    if (s === -1) {
                        throw new Error('No JSON found in response');
                    }

                    asset.analysis = JSON.parse(text.substring(s, e));
                    this.log(`✅ [تحليل الفيديو] نجح ${asset.name} | مفتاح: ...${shortKey} | موديل: ${modelName}`);
                    return;

                } catch (err) {
                    const errMsg = String(err?.message || err).slice(0, 150);
                    const is403 = errMsg.includes('403');
                    const is429 = errMsg.includes('429');
                    const isEmptyOutput = errMsg.includes('model output') || errMsg.includes('empty');
                    
                    if (errMsg.startsWith('BLOCKED:') || isEmptyOutput) {
                        this.log(`🚫 [تحليل الفيديو] تم حجب ${asset.name} أمنياً، جاري التخطي للبديل.`);
                        asset.analysis = this.getFallbackAnalysis(asset);
                        return; // Safety blocks apply across all models and keys
                    }

                    if (is429) {
                        this.log(`⏳ [تحليل الفيديو] تراجع Rate Limit | مفتاح: ...${shortKey} | موديل: ${modelName}`);
                        await this.sleep(1000);
                    } else {
                        this.log(`⚠️ [تحليل الفيديو] فشل | مفتاح: ...${shortKey} | موديل: ${modelName} | السبب: ${errMsg}`);
                    }

                    console.warn(`[AutoMontage Vision] ${modelName} with key ...${shortKey} failed for ${asset.name}: ${errMsg}`);
                    lastErr = err;
                }
            }
        }

        this.log(`❌ [تحليل الفيديو] فشل ${asset.name} بجميع المفاتيح والموديلات!`);
        asset.analysis = this.getFallbackAnalysis(asset);
    }

    // نسخة واحدة بدون retry - مع نفس safety settings
    private async tryVisionOnce(asset: MediaAsset, key: string) {
        const MODELS = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-3.5-flash", 
            "gemini-3-flash-preview", 
            "gemini-3.1-flash-lite"
        ];
        for (const modelName of MODELS) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                    ],
                });
                let imgData = asset.thumbnailBase64!;
                let mimeType = 'image/jpeg';
                if (imgData.startsWith('data:')) {
                    mimeType = imgData.split(';')[0].split(':')[1];
                    imgData = imgData.split(',')[1];
                }
                const prompt = `Analyze this media file for video editing. Return ONLY JSON: {"contentType":"person|landscape|product|abstract|broll","mood":"energetic|calm|dramatic|happy","tags":["video"],"suggestedDuration":6,"suggestedTrack":"main","hasFace":false,"quality":7,"description":"media clip"}`;
                const result = await model.generateContent([prompt, { inlineData: { mimeType, data: imgData } }]);
                const candidate = result.response?.candidates?.[0];
                if (!candidate || candidate.finishReason === 'SAFETY') {
                    throw new Error('blocked by safety');
                }
                const text = result.response.text();
                const s = text.indexOf('{'); const e = text.lastIndexOf('}') + 1;
                if (s === -1) throw new Error('no JSON');
                asset.analysis = JSON.parse(text.substring(s, e));
                this.log(`✅ [Vision] ${modelName} -> ${asset.name} → ${asset.analysis.contentType}`);
                return;
            } catch (err) {
                console.warn(`tryVisionOnce: ${modelName} failed:`, String(err).slice(0, 50));
            }
        }
        throw new Error('All models failed in tryVisionOnce');
    }

    private getFallbackAnalysis(asset: MediaAsset): AssetAnalysis {
        return {
            contentType: asset.type === 'image' ? 'abstract' : 'broll',
            mood: 'calm',
            tags: [asset.type],
            suggestedDuration: asset.duration ? Math.min(asset.duration, 8) : 5,
            suggestedTrack: 'main',
            hasFace: false,
            quality: 5,
            description: asset.name,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: COMPREHENSIVE PLAN — Gemini يبني الخطة كاملة
    // ═══════════════════════════════════════════════════════════

    private async buildComprehensivePlan(style: string): Promise<MontagePlan> {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const W = canvas?.width || 1920;
        const H = canvas?.height || 1080;

        // ملخص مُضغَّط وآمن للـ assets (بدون أسماء مثيرة للحجب)
        const assetSummary = this.assets.map((a, i) => ({
            idx: i + 1,
            id: a.id,
            // اسم آمن: بدون underscores، max 20 حرف، Latin only
            name: `asset_${i + 1}_${a.type}`,
            type: a.type,
            durationSec: a.duration ? +a.duration.toFixed(1) : null,
            contentType: a.analysis?.contentType || 'broll',
            mood: a.analysis?.mood || 'calm',
            suggestedDuration: a.analysis?.suggestedDuration || 5,
            suggestedTrack: a.analysis?.suggestedTrack || 'main',
            hasFace: a.analysis?.hasFace || false,
            quality: a.analysis?.quality || 5,
            tags: (a.analysis?.tags || []).slice(0, 3),
            description: (a.analysis?.description || a.type).slice(0, 30),
        }));

        // قائمة SFX المتاحة للـ AI
        const sfxList = AVAILABLE_SFX.map(s => ({
            id: s.id, name: s.name, src: s.src, duration: s.duration
        }));

        const buildPrompt = (detailed: boolean) => `You are a professional video editor AI. Build a COMPLETE automatic montage plan.

**Project:** ${W}x${H}, Style: ${style}

**Media Assets:**
${JSON.stringify(assetSummary, null, 2)}

**Available SFX:**
${JSON.stringify(sfxList, null, 2)}

**Track Layout:**
- V1: Main video track (primary content, full screen)
- V2: B-Roll (secondary video/image behind or beside main)
- V3: Overlay (logos, small images, top-right corner 30% size)
- A1: Original audio from videos (MUST preserve audio for every video clip)
- A2: SFX track (sound effects, whooshes, impacts at cut points)
- T1: Text/subtitles track

**STRICT RULES:**
1. Place EVERY asset from the list — do NOT skip any
2. For EVERY video on V1/V2, ALSO add its audio on A1 at the SAME start time and duration
3. Persons/speakers → V1 (use their full video duration as-is)
4. Landscape/abstract/product → V2 as B-roll
5. Small images/logos → V3 overlay (3-6s)
6. Add SFX (from the sfx list) at every major cut point on A2 (whoosh/impact between cuts)
7. Add at least 2-3 text overlays on T1 with short descriptive Arabic/English text
8. Apply Ken Burns (kb) to ALL static images on V1/V2
9. Apply color filter matching the mood (cinematic for dramatic, warm for happy, etc.)
10. Add fade_in to first clip, fade_out to last clip
11. Add transitions at every cut point

Return ONLY this JSON (no markdown):
{
  "style": "${style}",
  "totalDuration": <number>,
  "items": [
    {
      "type": "video|image|sfx|text|freeze",
      "assetId": "<id from list, for video/image>",
      "src": "<sfx src, for sfx type>",
      "text": "<text content, for text type>",
      "track": "V1|V2|V3|A1|A2|T1",
      "start": <number>,
      "duration": <number>,
      "effects": ["fade_in", "filter:cinematic", "kb:0,0,1.0:80,40,1.3"],
      "transition": "dissolve|wipe|zoom|fade",
      "style": "bold_white|subtitle|caption"
    }
  ]
}

For text items use style: "bold_white" for titles, "subtitle" for lower-thirds.
Return ONLY the JSON. No markdown blocks. No explanation.`;

        try {
            const responseText = await window.geminiChat.queryGemini(prompt);
            const s = responseText.indexOf('{');
            const e = responseText.lastIndexOf('}') + 1;
            if (s === -1) throw new Error('No JSON in response');

            let json = responseText.substring(s, e);
            json = json.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

            const plan = JSON.parse(json) as MontagePlan;
            this.log(`📋 خطة AI4Montage: ${plan.items?.length || 0} عنصر، ${plan.totalDuration?.toFixed(1)}s`);
            return plan;

        } catch (err) {
            this.log(`⚠️ فشل AI في بناء الخطة، جاري استخدام الخطة البديلة: ${err.message}`);
            return this.buildFallbackPlan(style);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: EXECUTE PLAN
    // ═══════════════════════════════════════════════════════════

    private async executePlan() {
        if (!this.plan?.items?.length) return;

        this.clearVideoTracks();
        await this.sleep(200);

        const items = this.plan.items;
        let processed = 0;

        for (const item of items) {
            try {
                await this.executeItem(item);
                processed++;
                this.progress(
                    `⚙️ تجميع: ${processed}/${items.length}...`,
                    62 + Math.round((processed / items.length) * 26)
                );
                await this.sleep(80);
            } catch (err) {
                console.warn('[AutoMontage] Item failed:', item, err);
            }
        }
    }

    private clearVideoTracks() {
        if (!window.app?.tracks) return;
        window.app.tracks.forEach((track: any) => {
            if (['V1', 'V2', 'V3', 'A2', 'T1'].includes(track.name)) {
                track.clips = [];
                track.rebuildTree?.();
            }
        });
        // احفظ A1 (original audio) - سيُضاف من الخطة
        const a1 = window.app.tracks.find((t: any) => t.name === 'A1');
        if (a1) { a1.clips = []; a1.rebuildTree?.(); }

        window.app.refreshProjectTopology?.();
        this.log('🗑️ تم مسح التايم لاين استعداداً للتجميع');
    }

    private async executeItem(item: PlanItem) {
        if (item.type === 'text') {
            await this.placeTextClip(item);
        } else if (item.type === 'sfx') {
            await this.placeSFXClip(item);
        } else if (item.type === 'video' || item.type === 'image') {
            await this.placeMediaClip(item);
        }
    }

    private async placeMediaClip(item: PlanItem) {
        const asset = this.assets.find(a => a.id === item.assetId);
        if (!asset) {
            console.warn('[AutoMontage] Asset not found:', item.assetId);
            return;
        }

        const track = this.findOrCreateTrack(item.track, 'video');
        if (!track) return;

        const ClipClass = (window as any).Clip;
        if (!ClipClass) return;

        const clipId = `am_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const newClip = new ClipClass(
            clipId,
            asset.name,
            item.start,
            item.duration,
            asset.type,
            asset.src
        );

        track.addClip(newClip);
        window.app.resolveCollisions?.(track.id, newClip);

        // ✅ إضافة الصوت الأصلي لكل فيديو على A1 بنفس الوقت والمدة
        if (asset.type === 'video') {
            await this.sleep(50);
            const a1Track = this.findOrCreateTrack('A1', 'audio');
            if (a1Track) {
                const audioClip = new ClipClass(
                    `am_audio_${Date.now()}`,
                    `${asset.name} (Audio)`,
                    item.start,
                    item.duration,
                    'audio',
                    asset.src
                );
                audioClip.groupId = clipId; // ربط الصوت بالفيديو
                newClip.groupId = clipId;
                a1Track.addClip(audioClip);
                window.app.resolveCollisions?.(a1Track.id, audioClip);
            }
        }

        window.app.renderTracks?.();
        await this.sleep(200);

        // تطبيق التأثيرات
        const sortedClips = [...track.clips].sort((a: any, b: any) => a.start - b.start);
        const idx = sortedClips.findIndex((c: any) => c.id === newClip.id) + 1;
        if (idx > 0 && item.effects?.length) {
            this.applyEffects(item.effects, idx, item.track);
        }
    }

    private async placeSFXClip(item: PlanItem) {
        if (!item.src) return;
        const track = this.findOrCreateTrack(item.track || 'A2', 'audio');
        if (!track) return;

        const ClipClass = (window as any).Clip;
        if (!ClipClass) return;

        const sfxName = AVAILABLE_SFX.find(s => s.src === item.src)?.name || 'SFX';
        const sfxClip = new ClipClass(
            `am_sfx_${Date.now()}`,
            sfxName,
            item.start,
            item.duration,
            'audio',
            item.src
        );
        track.addClip(sfxClip);
        window.app.resolveCollisions?.(track.id, sfxClip);
        window.app.renderTracks?.();
    }

    private async placeTextClip(item: PlanItem) {
        if (!item.text) return;
        const track = this.findOrCreateTrack(item.track || 'T1', 'subtitle');
        if (!track) return;

        const ClipClass = (window as any).Clip;
        if (!ClipClass) return;

        const textClip = new ClipClass(
            `am_txt_${Date.now()}`,
            item.text,
            item.start,
            item.duration,
            'text',
            item.text
        );

        // تطبيق ستايل النص
        if (item.style === 'bold_white') {
            textClip.textStyle = {
                fontFamily: 'Cairo', fontWeight: 'bold', fontSize: 72,
                color: '#FFFFFF', strokeWidth: 3, strokeColor: '#000000',
                shadowBlur: 8, shadowColor: '#000000',
                backgroundOpacity: 0, padding: 20,
            };
            textClip.properties = { positionX: 0, positionY: 200, scale: 100 };
        } else if (item.style === 'subtitle') {
            textClip.textStyle = {
                fontFamily: 'Cairo', fontWeight: 'bold', fontSize: 52,
                color: '#FFFFFF', strokeWidth: 2, strokeColor: '#000000',
                backgroundColor: '#00000088', backgroundOpacity: 80, padding: 16,
            };
            textClip.properties = { positionX: 0, positionY: 380, scale: 100 };
        } else {
            textClip.textStyle = {
                fontFamily: 'Cairo', fontWeight: 'bold', fontSize: 60,
                color: '#FFFFFF', strokeWidth: 2, strokeColor: '#111111',
                backgroundOpacity: 0, padding: 12,
            };
        }

        track.addClip(textClip);
        window.app.resolveCollisions?.(track.id, textClip);
        window.app.renderTracks?.();
    }

    private findOrCreateTrack(name: string, type: string): any {
        if (!window.app?.tracks) return null;
        let track = window.app.tracks.find((t: any) => t.name === name);
        if (!track) {
            // إنشاء track جديد إذا لم يكن موجوداً
            const audioTypes = ['audio', 'A1', 'A2'];
            const trackType = audioTypes.includes(type) || name.startsWith('A') ? 'audio'
                : name === 'T1' ? 'subtitle' : 'video';
            window.app.addNewTrack?.(trackType);
            track = window.app.tracks[window.app.tracks.length - 1];
            if (track) {
                track.name = name;
                window.app.commitStateToReact?.();
            }
        }
        return track || null;
    }

    private applyEffects(effects: string[], clipIdx: number, trackName: string) {
        const cli = window.geminiChat?.runCLI?.bind(window.geminiChat);
        if (!cli) return;

        for (const effect of effects) {
            try {
                if (effect.startsWith('fade_in')) {
                    const dur = effect.includes(':') ? effect.split(':')[1] : '1';
                    cli(`fi${dur}c${clipIdx}${trackName}`);
                } else if (effect.startsWith('fade_out')) {
                    const dur = effect.includes(':') ? effect.split(':')[1] : '1';
                    cli(`fo${dur}c${clipIdx}${trackName}`);
                } else if (effect.startsWith('filter:')) {
                    cli(`filter:${effect.split(':')[1]} c${clipIdx}${trackName}`);
                } else if (effect.startsWith('kb:')) {
                    cli(`kb:${effect.slice(3)} c${clipIdx}${trackName}`);
                } else if (effect.startsWith('br:')) {
                    cli(`br${effect.split(':')[1]}c${clipIdx}${trackName}`);
                } else if (effect.startsWith('sat:')) {
                    cli(`sat${effect.split(':')[1]}c${clipIdx}${trackName}`);
                } else if (effect.startsWith('sp:')) {
                    cli(`sp${effect.split(':')[1]}c${clipIdx}${trackName}`);
                }
            } catch (e) {
                console.warn(`[AutoMontage] Effect ${effect} failed:`, e);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: FINALIZE
    // ═══════════════════════════════════════════════════════════

    private async finalizeMontage() {
        // Markers للـ V1
        this.addMarkersForV1();
        await this.sleep(100);

        window.app.refreshProjectTopology?.();
        window.app.renderTracks?.();
        window.app.requestRedraw?.();
        window.app.commitStateToReact?.();
    }

    private addMarkersForV1() {
        if (!this.plan?.items) return;
        const v1Items = this.plan.items.filter(i => i.track === 'V1');
        v1Items.forEach((item, i) => {
            const asset = this.assets.find(a => a.id === item.assetId);
            const label = (asset?.name || `scene_${i + 1}`).split('.')[0].slice(0, 12).replace(/\s+/g, '_');
            window.geminiChat?.runCLI?.(`mark:${label} @${item.start}`);
        });
    }

    // ═══════════════════════════════════════════════════════════
    // FALLBACK PLAN (rule-based if AI fails)
    // ═══════════════════════════════════════════════════════════

    private buildFallbackPlan(style: string): MontagePlan {
        const items: PlanItem[] = [];
        let cursor = 0;

        const moodFilter: Record<string, string> = {
            energetic: 'filter:warm', dramatic: 'filter:cinematic',
            calm: 'filter:cool', mysterious: 'filter:cinematic',
            happy: 'filter:warm', sad: 'filter:cool', inspiring: 'filter:warm',
            professional: 'filter:cool',
        };

        // ترتيب: main أولاً ثم broll ثم overlay
        const sorted = [...this.assets].sort((a, b) => {
            const order = { main: 0, broll: 1, background: 2, overlay: 3 };
            return (order[a.analysis?.suggestedTrack || 'main'] || 0)
                 - (order[b.analysis?.suggestedTrack || 'main'] || 0);
        });

        for (const asset of sorted) {
            const dur = asset.analysis?.suggestedDuration || Math.min(asset.duration || 6, 8);
            const trackMap: Record<string, string> = { main: 'V1', broll: 'V2', background: 'V2', overlay: 'V3' };
            const track = trackMap[asset.analysis?.suggestedTrack || 'main'] || 'V1';
            const mood = asset.analysis?.mood || 'calm';

            const effects: string[] = ['fade_in:1'];
            if (asset.type === 'image') effects.push('kb:0,0,1.0:60,30,1.25');
            if (moodFilter[mood]) effects.push(moodFilter[mood]);

            items.push({
                type: asset.type,
                assetId: asset.id,
                track,
                start: cursor,
                duration: dur,
                effects,
                transition: 'dissolve',
            });

            // A1 audio for every video
            if (asset.type === 'video') {
                items.push({
                    type: 'video',
                    assetId: asset.id,
                    track: 'A1',
                    start: cursor,
                    duration: dur,
                    effects: [],
                });
            }

            // SFX at cut point
            if (cursor > 0) {
                items.push({
                    type: 'sfx',
                    src: '/sfx/whoosh_fast.wav',
                    track: 'A2',
                    start: cursor - 0.1,
                    duration: 0.4,
                    effects: [],
                });
            }

            if (track === 'V1') cursor += dur;
        }

        // تمت إزالة النص الترحيبي بناءً على طلب المستخدم

        return { style, totalDuration: cursor, items };
    }

    // ═══════════════════════════════════════════════════════════
    // MEDIA UTILITIES
    // ═══════════════════════════════════════════════════════════

    private extractVideoThumbnail(src: string, atTime: number = 0.5): Promise<string> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.preload = 'metadata';
            video.src = src;
            const cleanup = () => { try { video.remove(); } catch (_) {} };

            video.onloadedmetadata = () => {
                video.currentTime = Math.min(atTime, video.duration * 0.1 || 0.5);
            };
            video.onseeked = () => {
                try {
                    const c = document.createElement('canvas');
                    const scale = Math.min(1, 512 / (video.videoWidth || 512));
                    c.width = Math.round((video.videoWidth || 640) * scale);
                    c.height = Math.round((video.videoHeight || 360) * scale);
                    c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height);
                    cleanup();
                    resolve(c.toDataURL('image/jpeg', 0.75));
                } catch (e) { cleanup(); reject(e); }
            };
            video.onerror = () => { cleanup(); reject(new Error('video load failed')); };
            setTimeout(() => { cleanup(); reject(new Error('thumbnail timeout')); }, 10000);
        });
    }

    private imageToBase64(src: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const c = document.createElement('canvas');
                const scale = Math.min(1, 512 / Math.max(img.naturalWidth, 1));
                c.width = Math.round(img.naturalWidth * scale);
                c.height = Math.round(img.naturalHeight * scale);
                c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = () => reject(new Error('image load failed'));
            img.src = src;
            setTimeout(() => reject(new Error('image timeout')), 8000);
        });
    }

    private getVideoDuration(src: string): Promise<number> {
        return new Promise(resolve => {
            const v = document.createElement('video');
            v.preload = 'metadata';
            v.src = src;
            v.onloadedmetadata = () => { resolve(v.duration || 10); v.remove(); };
            v.onerror = () => { resolve(10); v.remove(); };
            setTimeout(() => { resolve(10); try { v.remove(); } catch (_) {} }, 6000);
        });
    }

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════

    private log(msg: string) {
        window.geminiChat?.pushMessage?.('ai', msg);
        window.app?.log?.(msg);
    }

    private progress(msg: string, pct: number) {
        this.log(msg);
        this.progressCb?.(msg, pct);
        const bar = document.getElementById('auto-montage-progress-bar');
        const txt = document.getElementById('auto-montage-progress-text');
        if (bar) bar.style.width = `${pct}%`;
        if (txt) txt.textContent = msg;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(r => setTimeout(r, ms));
    }

    getAnalysisReport(): string {
        if (!this.assets.length) return '⚠️ لم يتم تحليل أي أصول بعد.';
        return '📊 تقرير:\n' + this.assets.map(a =>
            `- ${a.name}: ${a.analysis?.contentType || '?'} / ${a.analysis?.mood || '?'} (جودة: ${a.analysis?.quality || '?'}/10)`
        ).join('\n');
    }
}

// ─── Global Instance ─────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
    (window as any).autoMontage = new AutoMontageEngine();
}
