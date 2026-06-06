// @ts-nocheck
// social_overlay_feature.ts — UI controls + action methods (imports renderer)

import { ensureSocialOverlayProps, DEFAULT_COMMENTS } from './social_overlay_renderer';

/* ─── Effect Controls UI ────────────────────────────────────────── */
const injectSocialOverlayUI = () => {
    const prevUI = window.EditorApp.prototype.updateEffectControls;

    window.EditorApp.prototype.updateEffectControls = function() {
        if (prevUI) prevUI.call(this);

        // Smart group selection
        let clipId = null;
        if (this.selectedClipIds.size === 1) {
            clipId = Array.from(this.selectedClipIds)[0];
        } else if (this.selectedClipIds.size > 1) {
            const all = Array.from(this.selectedClipIds).map(id => this.findClipById(id)).filter(Boolean);
            const grps = [...new Set(all.map(c => c.groupId).filter(Boolean))];
            if (grps.length === 1) {
                const p = all.find(c => c.type === 'video') || all.find(c => c.type !== 'audio');
                if (p) clipId = p.id;
            }
        }
        if (!clipId) return;

        const clip = this.findClipById(clipId);
        if (!clip || clip.type === 'audio' || clip.type === 'text') return;

        ensureSocialOverlayProps(clip);
        const ov = clip.socialOverlay;

        // Avoid duplicate injection
        if (document.getElementById('social-overlay-group')) return;

        const panel = document.getElementById('effect-controls-content');
        if (!panel) return;

        const platform = ov.platform || 'tiktok';
        const PLATS = ['tiktok', 'instagram', 'youtube'];

        const html = `
<div id="social-overlay-group" class="mb-4 bg-[#0a0f1d] rounded-lg border border-gray-800">
    <div class="flex items-center justify-between p-2 bg-[#1e293b]/50 rounded-t-lg border-b border-gray-800">
        <div class="flex items-center gap-2">
            <i class="fa-solid fa-comments text-[9px] text-pink-500"></i>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-200">Social Media Overlay</span>
        </div>
        <button
            onclick="window.app.toggleSocialOverlay('${clipId}')"
            class="text-[9px] px-2 py-1 rounded font-bold transition-all ${ov.enabled ? 'bg-pink-600 text-white shadow-[0_0_8px_rgba(255,64,129,0.5)]' : 'bg-gray-700 text-gray-400'}">
            ${ov.enabled ? 'ON' : 'OFF'}
        </button>
    </div>

    ${ov.enabled ? `
    <div class="p-2 space-y-3">

        <!-- Platform -->
        <div>
            <div class="text-[9px] text-gray-500 mb-1 uppercase tracking-wider">Platform</div>
            <div class="flex gap-1">
                ${PLATS.map(pl => `
                <button onclick="window.app.updateSocialOverlay('${clipId}','platform','${pl}')"
                    class="flex-1 py-1.5 rounded text-[9px] font-bold transition-all ${platform === pl
                        ? (pl === 'tiktok' ? 'bg-[#fe2c55] text-white' : pl === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' : 'bg-[#ff0000] text-white')
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}">
                    ${pl === 'tiktok' ? '🎵 TikTok' : pl === 'instagram' ? '📸 Insta' : '▶️ YouTube'}
                </button>`).join('')}
            </div>
        </div>

        <!-- Live Stats toggle -->
        <div class="flex items-center justify-between">
            <span class="text-[10px] text-gray-400">📺 Live Stats</span>
            <button onclick="window.app.updateSocialOverlay('${clipId}','showLive',${!ov.showLive})"
                class="text-[9px] px-2 py-0.5 rounded font-bold transition-all ${ov.showLive ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-500'}">
                ${ov.showLive ? 'ON' : 'OFF'}
            </button>
        </div>

        ${ov.showLive ? `
        <!-- Stats Numbers -->
        <div class="bg-gray-900/50 rounded-lg p-2 space-y-2 border border-gray-800">
            <div class="text-[9px] text-gray-500 uppercase tracking-wider">Live Stats Numbers</div>
            <div class="flex items-center gap-2">
                <span class="text-[9px] text-gray-400 w-14">👁 مشاهد</span>
                <input type="number" value="${ov.liveStats.viewers}" min="0" lang="en" dir="ltr"
                    onchange="window.app.updateSocialStat('${clipId}','viewers',this.value)"
                    class="flex-1 bg-[#050811] border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 text-center focus:border-pink-500 outline-none font-mono">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[9px] text-gray-400 w-14">❤️ لايك</span>
                <input type="number" value="${ov.liveStats.likes}" min="0" lang="en" dir="ltr"
                    onchange="window.app.updateSocialStat('${clipId}','likes',this.value)"
                    class="flex-1 bg-[#050811] border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 text-center focus:border-pink-500 outline-none font-mono">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[9px] text-gray-400 w-14">↗ مشاركة</span>
                <input type="number" value="${ov.liveStats.shares}" min="0" lang="en" dir="ltr"
                    onchange="window.app.updateSocialStat('${clipId}','shares',this.value)"
                    class="flex-1 bg-[#050811] border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 text-center focus:border-pink-500 outline-none font-mono">
            </div>
        </div>
        ` : ''}

        <!-- Comment Speed -->
        <div>
            <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>💬 سرعة الكومنتات</span>
                <span class="text-white">${parseFloat(ov.commentSpeed || 1).toFixed(1)}x</span>
            </div>
            <input type="range" min="0.2" max="3" step="0.1" value="${ov.commentSpeed || 1}"
                class="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-pink-500"
                oninput="window.app.updateSocialOverlay('${clipId}','commentSpeed',parseFloat(this.value))">
        </div>

        <!-- Opacity -->
        <div>
            <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>🌫️ الشفافية</span>
                <span class="text-white">${Math.round(ov.opacity || 100)}%</span>
            </div>
            <input type="range" min="10" max="100" step="1" value="${ov.opacity || 100}"
                class="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-pink-500"
                oninput="window.app.updateSocialOverlay('${clipId}','opacity',parseFloat(this.value))">
        </div>

        <!-- Comments Editor -->
        <div>
            <div class="flex items-center justify-between mb-1">
                <span class="text-[9px] text-gray-500 uppercase tracking-wider">💬 الكومنتات</span>
                <button onclick="window.app.addSocialComment('${clipId}')"
                    class="text-[9px] bg-pink-600 hover:bg-pink-500 text-white px-2 py-0.5 rounded transition-colors">
                    + إضافة
                </button>
            </div>
            <div class="space-y-1.5 max-h-40 overflow-y-auto">
                ${(ov.comments || []).slice(0, 8).map((c, i) => `
                <div class="flex items-center gap-1.5 bg-gray-900/50 rounded-lg px-2 py-1.5 border border-gray-800 group">
                    <input type="color" value="${c.color || '#ff4757'}"
                        onchange="window.app.updateSocialComment('${clipId}',${i},'color',this.value)"
                        class="w-5 h-5 rounded cursor-pointer border-0 bg-transparent flex-shrink-0">
                    <input type="text" value="${c.username || ''}" placeholder="اسم المستخدم"
                        onchange="window.app.updateSocialComment('${clipId}',${i},'username',this.value)"
                        class="bg-transparent text-[9px] text-gray-300 focus:outline-none w-16 min-w-0 placeholder-gray-600" dir="auto">
                    <input type="text" value="${c.text || ''}" placeholder="الكومنت..."
                        onchange="window.app.updateSocialComment('${clipId}',${i},'text',this.value)"
                        class="flex-1 bg-transparent text-[9px] text-gray-300 focus:outline-none min-w-0 placeholder-gray-600" dir="auto">
                    <input type="number" value="${c.time || 0}" min="0" step="0.5" lang="en" dir="ltr"
                        onchange="window.app.updateSocialComment('${clipId}',${i},'time',parseFloat(this.value))"
                        title="وقت الظهور (ثانية)"
                        class="w-8 bg-[#050811] border border-gray-700 rounded text-[8px] text-gray-400 text-center focus:outline-none">
                    <button onclick="window.app.removeSocialComment('${clipId}',${i})"
                        class="text-gray-700 hover:text-red-500 transition-colors text-[9px] opacity-0 group-hover:opacity-100">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                `).join('')}
                ${(ov.comments || []).length > 8 ? `<div class="text-[9px] text-gray-600 text-center">... و ${(ov.comments||[]).length - 8} كومنتات أخرى</div>` : ''}
            </div>
        </div>

        <!-- Reset button -->
        <button onclick="window.app.resetSocialComments('${clipId}')"
            class="w-full py-1 text-[9px] text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded-lg transition-colors">
            <i class="fa-solid fa-rotate-left mr-1"></i>إعادة تعيين الكومنتات
        </button>
    </div>
    ` : ''}
</div>`;

        panel.insertAdjacentHTML('beforeend', html);
    };
};

/* ─── Actions ───────────────────────────────────────────────────── */
const injectSocialOverlayActions = () => {

    window.EditorApp.prototype.toggleSocialOverlay = function(clipId) {
        const clip = this.findClipById(clipId);
        if (!clip) return;
        ensureSocialOverlayProps(clip);
        clip.socialOverlay.enabled = !clip.socialOverlay.enabled;
        this.requestRedraw();
        this.updateEffectControls();
    };

    window.EditorApp.prototype.updateSocialOverlay = function(clipId, key, value) {
        const clip = this.findClipById(clipId);
        if (!clip) return;
        ensureSocialOverlayProps(clip);
        clip.socialOverlay[key] = value;
        this.requestRedraw();
        if (key === 'platform' || key === 'showLive') this.updateEffectControls();
    };

    window.EditorApp.prototype.updateSocialStat = function(clipId, stat, value) {
        const clip = this.findClipById(clipId);
        if (!clip) return;
        ensureSocialOverlayProps(clip);
        clip.socialOverlay.liveStats[stat] = parseInt(value) || 0;
        this.requestRedraw();
    };

    window.EditorApp.prototype.addSocialComment = function(clipId) {
        const clip = this.findClipById(clipId);
        if (!clip) return;
        ensureSocialOverlayProps(clip);
        const existingTimes = clip.socialOverlay.comments.map(c => c.time);
        const nextTime = existingTimes.length > 0 ? Math.max(...existingTimes) + 1.5 : 1.0;
        const colors = ['#ff4757','#ffa502','#2ed573','#1e90ff','#eccc68','#a29bfe','#fd79a8'];
        clip.socialOverlay.comments.push({
            username: 'user_new',
            text: 'تعليق جديد 🔥',
            time: parseFloat(nextTime.toFixed(1)),
            color: colors[Math.floor(Math.random() * colors.length)],
        });
        this.requestRedraw();
        this.updateEffectControls();
    };

    window.EditorApp.prototype.updateSocialComment = function(clipId, idx, key, value) {
        const clip = this.findClipById(clipId);
        if (!clip) return;
        ensureSocialOverlayProps(clip);
        if (clip.socialOverlay.comments[idx]) {
            clip.socialOverlay.comments[idx][key] = value;
            this.requestRedraw();
        }
    };

    window.EditorApp.prototype.removeSocialComment = function(clipId, idx) {
        const clip = this.findClipById(clipId);
        if (!clip) return;
        ensureSocialOverlayProps(clip);
        clip.socialOverlay.comments.splice(idx, 1);
        this.requestRedraw();
        this.updateEffectControls();
    };

    window.EditorApp.prototype.resetSocialComments = function(clipId) {
        const clip = this.findClipById(clipId);
        if (!clip) return;
        ensureSocialOverlayProps(clip);
        clip.socialOverlay.comments = JSON.parse(JSON.stringify(DEFAULT_COMMENTS));
        this.requestRedraw();
        this.updateEffectControls();
    };

    // Quick-enable from template drop: call app.enableSocialOverlay(clipId, platform)
    window.EditorApp.prototype.enableSocialOverlay = function(clipId, platform = 'tiktok') {
        const clip = this.findClipById(clipId);
        if (!clip) return;
        ensureSocialOverlayProps(clip);
        clip.socialOverlay.enabled  = true;
        clip.socialOverlay.platform = platform;
        this.requestRedraw();
        this.updateEffectControls();
        this.selectClip(clipId);
    };
};

injectSocialOverlayUI(); injectSocialOverlayActions();
