// @ts-nocheck
/**
 * 🎬 Social Media Overlay Feature
 * Draws TikTok/Instagram/YouTube style LIVE comments + stats on top of any clip.
 * Comments float up from the bottom-left, Live stats in top-right corner.
 */

/* ─── Default Data ─────────────────────────────────────────────── */
const DEFAULT_COMMENTS = [
    { username: 'Ahmed_Pro',    text: '🔥🔥🔥 جامد اوي',         time: 0.5,  color: '#ff4757' },
    { username: 'Sara_M',      text: '❤️ بحبك يا بطل',          time: 1.2,  color: '#ffa502' },
    { username: 'Xplore_',     text: 'ما شاء الله 👏👏',         time: 2.0,  color: '#2ed573' },
    { username: 'Mohamed22',   text: '🤩 استمر استمر',            time: 2.8,  color: '#1e90ff' },
    { username: 'Nour.TV',     text: 'الله يوفقك دايما 💪',       time: 3.5,  color: '#ff6b81' },
    { username: 'gamer_eg',    text: '😍 wow amazing bro',        time: 4.1,  color: '#eccc68' },
    { username: 'Dina_arts',   text: '💙 الله عليك شكراً',        time: 4.9,  color: '#a29bfe' },
    { username: 'Kareem_x',    text: '🎉 يا سلام يا سلام',        time: 5.6,  color: '#00cec9' },
    { username: 'Yasmin_R',    text: '❤️ تحفة تحفة',             time: 6.3,  color: '#fd79a8' },
    { username: 'Sport_Fan',   text: '🏆 الأفضل على الإطلاق',     time: 7.0,  color: '#fdcb6e' },
    { username: 'Tech_Nerd',   text: '💡 مميز جداً يا باشا',       time: 7.8,  color: '#6c5ce7' },
    { username: 'Laila_gif',   text: '😭 اتبكيت من الحماس',       time: 8.5,  color: '#ff4757' },
];

const DEFAULT_LIVE_STATS = {
    viewers: 12500,
    likes:   48200,
    shares:  3100,
};

/* ─── Ensure Properties ─────────────────────────────────────────── */
const ensureSocialOverlayProps = (clip) => {
    if (!clip.socialOverlay) {
        clip.socialOverlay = {
            enabled:   false,
            platform:  'tiktok',   // 'tiktok' | 'instagram' | 'youtube'
            showLive:  true,
            comments:  JSON.parse(JSON.stringify(DEFAULT_COMMENTS)),
            liveStats: { ...DEFAULT_LIVE_STATS },
            commentSpeed: 1.0,     // multiplier for comment rise speed
            opacity: 100,
        };
    }
    if (!clip.socialOverlay.commentSpeed)  clip.socialOverlay.commentSpeed = 1.0;
    if (clip.socialOverlay.opacity === undefined) clip.socialOverlay.opacity = 100;
};

/* ─── Platform Themes ───────────────────────────────────────────── */
const PLATFORM_THEME = {
    tiktok: {
        bg:           'rgba(0,0,0,0.55)',
        liveBadge:    '#fe2c55',
        liveBadgeTxt: 'LIVE',
        heartColor:   '#fe2c55',
        eyeColor:     '#ffffff',
        shareColor:   '#ffffff',
        commentBg:    'rgba(0,0,0,0.45)',
        font:          'bold {sz}px "Cairo", sans-serif',
        borderRadius:  14,
    },
    instagram: {
        bg:           'rgba(20,20,20,0.60)',
        liveBadge:    null,  // gradient
        liveBadgeTxt: 'LIVE',
        heartColor:   '#ff355e',
        eyeColor:     '#ffffff',
        shareColor:   '#ffffff',
        commentBg:    'rgba(30,30,30,0.50)',
        font:          'bold {sz}px "Cairo", sans-serif',
        borderRadius:  18,
    },
    youtube: {
        bg:           'rgba(0,0,0,0.60)',
        liveBadge:    '#ff0000',
        liveBadgeTxt: '● LIVE',
        heartColor:   '#aaaaaa',
        eyeColor:     '#cccccc',
        shareColor:   '#cccccc',
        commentBg:    'rgba(15,15,15,0.55)',
        font:          'bold {sz}px "Cairo", sans-serif',
        borderRadius:  4,
    },
};

/* ─── Canvas Helpers ─────────────────────────────────────────────── */
function drawRoundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); }
    else { ctx.rect(x, y, w, h); }
}

function ctxFont(ctx, sz, platform) {
    ctx.font = PLATFORM_THEME[platform].font.replace('{sz}', sz);
}

/* ─── Main Rendering ─────────────────────────────────────────────── */
const injectSocialOverlayRendering = () => {

    // video_preview.ts calls this.renderSocialOverlays(ctx, renderJobs, w, h)
    // after the WebGL compositing pass. Draws comments + live stats on top.
    window.EditorApp.prototype.renderSocialOverlays = function(ctx, renderJobs, w, h) {
        const t  = this.currentTime || 0;
        const rj = renderJobs || [];
        let hasActive = false;

        // ── Step 1: Render static frame UI overlays (YouTube/TikTok/Instagram UI buttons) ──
        // This was previously in ultra_features.ts as renderSocialOverlays — now renamed.
        if (typeof this.renderFrameOverlayUI === 'function' && rj.length > 0) {
            this.renderFrameOverlayUI(ctx, rj, w, h);
        }

        // ── Step 2: Render live animated comments + stats ─────────────────────────────
        // Search ALL tracks for any clip that has socialOverlay enabled
        this.tracks.forEach(track => {
            if (track.isMuted) return;
            const anySolo = this.tracks.some(tr => tr.isSolo);
            if (anySolo && !track.isSolo) return;

            const clips = track.getClipsAtTime ? track.getClipsAtTime(t) : [];
            clips.forEach(clip => {
                if (!clip.socialOverlay?.enabled) return;
                ensureSocialOverlayProps(clip);
                hasActive = true;

                const ov        = clip.socialOverlay;
                const platform  = ov.platform || 'tiktok';
                const theme     = PLATFORM_THEME[platform];
                const timeInClip = Math.max(0, t - (clip.start || 0));
                const alpha      = Math.min(1, (ov.opacity ?? 100) / 100);

                ctx.save();
                ctx.globalAlpha = Math.min(1, ctx.globalAlpha * alpha);

                /* ── 1. Live Badge + Stats ────────── */
                if (ov.showLive) drawLiveStats(ctx, ov, theme, w, h, timeInClip);

                /* ── 2. Comments ─────────────────── */
                drawComments(ctx, ov, theme, w, h, timeInClip);

                ctx.restore();
            });
        });

        // Drive the animation loop when paused so comments keep moving
        if (!this.isPlaying && hasActive && !this._overlayAnimRunning) {
            this._overlayAnimRunning = true;
            const loop = () => {
                if (!this.isPlaying && this._overlayAnimRunning) {
                    this.needsRedraw = true;
                    requestAnimationFrame(loop);
                } else {
                    this._overlayAnimRunning = false;
                }
            };
            requestAnimationFrame(loop);
        }
        if (!hasActive) {
            this._overlayAnimRunning = false;
        }
    };
};

/* ── Live Stats ─────────────────────────────────────────────────── */
function drawLiveStats(ctx, ov, theme, w, h, t) {
    const padX  = w * 0.025;
    const padY  = h * 0.025;
    const sz    = Math.max(10, Math.min(20, w * 0.018));
    const panel = { x: w - padX - w * 0.28, y: padY, w: w * 0.27, h: sz * 5.5 };

    // Semi-transparent background pill
    ctx.save();
    ctx.fillStyle = theme.bg;
    ctx.beginPath();
    drawRoundRect(ctx, panel.x, panel.y, panel.w, panel.h, 12);
    ctx.fill();

    // LIVE badge
    const badgeX = panel.x + panel.w * 0.1;
    const badgeY = panel.y + sz * 0.5;
    const badgeW = panel.w * 0.45;
    const badgeH = sz * 1.5;

    if (theme.platform === 'instagram' || !theme.liveBadge) {
        // Instagram gradient badge
        const g = ctx.createLinearGradient(badgeX, 0, badgeX + badgeW, 0);
        g.addColorStop(0, '#8a3ab9');
        g.addColorStop(0.5, '#e95950');
        g.addColorStop(1, '#fccc63');
        ctx.fillStyle = g;
    } else {
        ctx.fillStyle = theme.liveBadge;
    }
    ctx.beginPath();
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 5);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${sz * 0.9}px "Cairo", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(theme.liveBadgeTxt, badgeX + badgeW / 2, badgeY + badgeH * 0.72);

    // Animated viewer count (slowly increasing)
    const viewers = Math.round(ov.liveStats.viewers + t * 3);
    const likes   = Math.round(ov.liveStats.likes   + t * 12);
    const shares  = Math.round(ov.liveStats.shares);

    const statY = panel.y + sz * 2.5;
    ctx.textAlign = 'left';
    ctx.font = `${sz * 0.85}px "Cairo", sans-serif`;

    // 👁 viewers
    ctx.fillStyle = theme.eyeColor;
    ctx.fillText(`👁 ${formatNum(viewers)}`, panel.x + panel.w * 0.08, statY);

    // ❤️ likes
    ctx.fillStyle = theme.heartColor;
    ctx.fillText(`❤️ ${formatNum(likes)}`, panel.x + panel.w * 0.08, statY + sz * 1.4);

    // 🔗 shares
    ctx.fillStyle = theme.shareColor;
    ctx.fillText(`↗ ${formatNum(shares)}`, panel.x + panel.w * 0.08, statY + sz * 2.8);

    ctx.restore();
}

function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

/* ── Comments ───────────────────────────────────────────────────── */
function drawComments(ctx, ov, theme, w, h, t) {
    const comments  = ov.comments || [];
    const speed     = ov.commentSpeed || 1.0;
    const panelW    = w * 0.55;
    const panelStartX = w * 0.015;
    const startY    = h * 0.9;    // comments rise from here
    const sz        = Math.max(9, Math.min(16, w * 0.014));
    const lineH     = sz * 2.4;
    const riseRate  = lineH * 0.5 * speed;  // px per second

    ctx.save();

    // Clip to left 60% of frame height (bottom area)
    ctx.beginPath();
    ctx.rect(0, h * 0.3, panelW + panelStartX * 2, h * 0.7);
    ctx.clip();

    const visibleComments = [];
    comments.forEach((c) => {
        const delay = c.time;
        if (t < delay) return;

        const age = t - delay;
        const riseY = age * riseRate;
        const y = startY - riseY;

        // Only draw if still on screen
        if (y > h * 0.28 && y < h + lineH * 2) {
            visibleComments.push({ ...c, y, alpha: Math.min(1, Math.min(age * 3, (12 - age) * 0.5, 1)) });
        }
    });

    // Also emit looping comments if video is long
    const loopInterval = 10; // repeat comments every 10 seconds
    comments.forEach((c) => {
        [1, 2, 3, 4].forEach((loop) => {
            const delay = c.time + loop * loopInterval;
            if (t < delay) return;
            const age = t - delay;
            const riseY = age * riseRate;
            const y = startY - riseY;
            if (y > h * 0.28 && y < h + lineH * 2) {
                visibleComments.push({ ...c, y, alpha: Math.min(1, Math.min(age * 3, (12 - age) * 0.5, 1)) });
            }
        });
    });

    visibleComments.forEach((c) => {
        if (c.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha *= Math.max(0, Math.min(1, c.alpha));

        const name  = c.username || 'user';
        const text  = c.text || '';
        const full  = `${name}  ${text}`;

        ctx.font = `bold ${sz}px "Cairo", sans-serif`;
        const textW = Math.min(ctx.measureText(full).width + sz * 2, panelW);
        const boxH  = lineH;
        const boxX  = panelStartX;
        const boxY  = c.y - boxH * 0.8;
        const radius = theme.borderRadius;

        // Background pill
        ctx.fillStyle = theme.commentBg;
        ctx.beginPath();
        drawRoundRect(ctx, boxX, boxY, textW, boxH, radius);
        ctx.fill();

        // Username (colored)
        ctx.fillStyle = c.color || '#ffffff';
        ctx.font = `bold ${sz}px "Cairo", sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(name, boxX + sz * 0.6, boxY + boxH * 0.68);

        const nameW = ctx.measureText(name).width;

        // Comment text (white)
        ctx.fillStyle = '#ffffff';
        ctx.font = `${sz}px "Cairo", sans-serif`;
        ctx.fillText('  ' + text, boxX + sz * 0.6 + nameW, boxY + boxH * 0.68);

        ctx.restore();
    });

    ctx.restore();
}

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

/* ─── Bootstrap ─────────────────────────────────────────────────── */
if (window.EditorApp && window.EditorApp.prototype) {
    injectSocialOverlayRendering();
    injectSocialOverlayUI();
    injectSocialOverlayActions();
}
