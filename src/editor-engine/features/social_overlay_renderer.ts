// @ts-nocheck
// social_overlay_renderer.ts — Canvas rendering: renderSocialOverlays, drawLiveStats, drawComments

/* ─── Default Data ─────────────────────────────────────────────── */
export const DEFAULT_COMMENTS = [
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

export const DEFAULT_LIVE_STATS = {
    viewers: 12500,
    likes:   48200,
    shares:  3100,
};

/* ─── Ensure Properties ─────────────────────────────────────────── */
export const ensureSocialOverlayProps = (clip) => {
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
export const PLATFORM_THEME = {
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

injectSocialOverlayRendering();
