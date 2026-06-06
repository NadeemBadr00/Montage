// @ts-nocheck
// auto_montage.ts — AutoMontageEngine: execution, finalization, utilities (Steps 4-5). Extends AutoMontageAnalysis.
import { AutoMontageAnalysis } from './auto_montage_analysis';
import { AVAILABLE_SFX } from './auto-montage-types';

// ─── Core Engine ─────────────────────────────────────────────────────────────

class AutoMontageEngine extends AutoMontageAnalysis {

    // ═══════════════════════════════════════════════════════════
    // STEP 4: EXECUTE PLAN
    // ═══════════════════════════════════════════════════════════

    protected async executePlan() {
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

    protected async finalizeMontage() {
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

    protected buildFallbackPlan(style: string): MontagePlan {
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

    // extractVideoThumbnail, imageToBase64, getVideoDuration — inherited from AutoMontageAnalysis

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════

    // log(), progress(), sleep() — inherited from AutoMontageAnalysis

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
