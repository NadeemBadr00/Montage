// @ts-nocheck
// actions-phase20.ts - Help System, Shortcuts, History, Reset, Info

window.EditorApp.prototype.executeHelp = function() {
    this.log("📖 ═══════════════════════════════════════════");
    this.log("   دليل الأوامر الكامل — AI4Montage Command Center");
    this.log("═══════════════════════════════════════════════");
    this.log("🎬 TIMELINE ───────────────────────────────────");
    this.log("  /cut                — قطع المقطع عند المؤشر");
    this.log("  /split              — تقسيم المقطع");
    this.log("  /delete             — حذف المقطع المحدد");
    this.log("  /loop [n]           — تكرار المقطع n مرات");
    this.log("  /reverse            — عكس تشغيل المقطع");
    this.log("  /freeze             — تجميد اللقطة الحالية");
    this.log("  /beatmatch          — قطع على الإيقاع تلقائياً");
    this.log("  /cleanup            — حذف الفراغات وضغط التايم لاين");
    this.log("");
    this.log("🎨 EFFECTS ────────────────────────────────────");
    this.log("  /filter [type]      — فلتر سريع: bw/cinematic/vintage/vivid");
    this.log("  /mood [type]        — مزاج: happy/sad/epic/horror/romantic/cyberpunk");
    this.log("  /blur [amount]      — ضبابية");
    this.log("  /glitch             — تأثير تشويش رقمي");
    this.log("  /shake              — اهتزاز الكاميرا");
    this.log("  /vignette           — حواف داكنة سينمائية");
    this.log("  /chroma             — تفريغ الخلفية الخضراء");
    this.log("  /colormatch         — مطابقة ألوان كليبين");
    this.log("  /reset              — إزالة كل المؤثرات من المقطع");
    this.log("");
    this.log("🎞️ CINEMATIC ──────────────────────────────────");
    this.log("  /letterbox          — أشرطة سينمائية (2.35:1)");
    this.log("  /zoom [in/out]      — تقريب/إبعاد تدريجي");
    this.log("  /ramp [up/down]     — تلاعب بالسرعة");
    this.log("  /flare              — وميض العدسة");
    this.log("  /lightsweep         — مسح الضوء");
    this.log("  /rain               — مطر");
    this.log("  /sparkle            — بريق");
    this.log("");
    this.log("📝 TEXT ───────────────────────────────────────");
    this.log("  /title [text]       — عنوان سينمائي ضخم");
    this.log("  /lower [text]       — شريط اسم سفلي");
    this.log("  /emoji [😂]          — إيموجي متحرك");
    this.log("  /karaoke            — نصوص كاريوكي متفاعلة");
    this.log("  /outline [color]    — حد خارجي للنص");
    this.log("  /shadow [strength]  — ظل للنص");
    this.log("  /bold               — خط عريض");
    this.log("  /textscale [size]   — حجم النص");
    this.log("  /font [name]        — خط جوجل مخصص");
    this.log("");
    this.log("🎵 AUDIO ──────────────────────────────────────");
    this.log("  /voice [text]       — تعليق صوتي AI");
    this.log("  /bass               — تضخيم الباس");
    this.log("  /noise              — إزالة الضوضاء");
    this.log("  /pitch [+/-n]       — رفع/خفض نبرة الصوت");
    this.log("  /waveform           — موجات صوتية مرئية");
    this.log("  /ducking            — تخفيض موسيقى خلف الكلام");
    this.log("");
    this.log("📱 SOCIAL ─────────────────────────────────────");
    this.log("  /social [platform]  — ضبط للمنصة: tiktok/instagram/youtube/reel/shorts");
    this.log("  /watermark [text]   — علامة مائية");
    this.log("  /brand [color]      — لون البراند على كل النصوص");
    this.log("  /copyright          — شريط حقوق النشر");
    this.log("  /logo               — تثبيت اللوجو");
    this.log("");
    this.log("📤 EXPORT ─────────────────────────────────────");
    this.log("  /thumb [text]       — صورة مصغرة يوتيوب");
    this.log("  /chapters           — فصول يوتيوب (Timestamps)");
    this.log("  /export xml         — تصدير FCPXML للبريمير");
    this.log("  /batchexport        — تصدير شامل (MP4+WAV+GIF)");
    this.log("");
    this.log("🤖 AI ─────────────────────────────────────────");
    this.log("  /captions           — ترجمة تلقائية");
    this.log("  /broll              — اقتراح مقاطع B-Roll");
    this.log("  /storyboard         — لوحة القصة المصورة");
    this.log("  /mood [type]        — مزاج AI للألوان");
    this.log("  /scene              — كشف المشاهد تلقائياً");
    this.log("  /beat               — وضع علامة إيقاع");
    this.log("");
    this.log("💡 UTILITY ────────────────────────────────────");
    this.log("  /snapshot [name]    — حفظ لقطة احتياطية");
    this.log("  /progress           — شريط تقدم الفيديو");
    this.log("  /countdown [n]      — عداد تنازلي");
    this.log("  /grid [2x2]         — ترتيب شبكي تلقائي");
    this.log("  /info               — معلومات المشروع");
    this.log("  /history            — آخر 10 أوامر");
    this.log("  /help               — هذه القائمة");
    this.log("═══════════════════════════════════════════════");
};

window.EditorApp.prototype.executeShowInfo = function() {
    this.log("📊 معلومات المشروع:");
    this.log("═══════════════════════════════════");
    const totalClips = this.tracks.reduce((sum: number, t: any) => sum + t.clips.length, 0);
    const totalTracks = this.tracks.length;
    const videoClips  = this.tracks.reduce((sum: number, t: any) => sum + t.clips.filter((c: any) => c.type === 'video').length, 0);
    const textClips   = this.tracks.reduce((sum: number, t: any) => sum + t.clips.filter((c: any) => c.type === 'text').length, 0);
    const audioClips  = this.tracks.reduce((sum: number, t: any) => sum + t.clips.filter((c: any) => c.type === 'audio').length, 0);
    const durMin = Math.floor((this.duration || 0) / 60);
    const durSec = Math.floor((this.duration || 0) % 60);
    this.log(`⏱️ المدة الكلية: ${durMin}:${String(durSec).padStart(2,'0')}`);
    this.log(`🎞️ إجمالي المقاطع: ${totalClips}`);
    this.log(`🎛️ عدد الـ Tracks: ${totalTracks}`);
    this.log(`📹 مقاطع فيديو: ${videoClips}`);
    this.log(`📝 مقاطع نصية: ${textClips}`);
    this.log(`🎵 مقاطع صوتية: ${audioClips}`);
    this.log(`📐 الأبعاد: ${this.canvasWidth || 1920}×${this.canvasHeight || 1080}`);
    this.log(`🔢 الـ FPS: ${this.fps || 30}`);
    this.log("═══════════════════════════════════");
};

window.EditorApp.prototype.executeShowHistory = function() {
    this.log("📜 آخر الأوامر المنفذة:");
    const history = window.__cmdHistory__ || [];
    if (history.length === 0) { this.log("   (لا يوجد تاريخ بعد)"); return; }
    history.slice(-10).reverse().forEach((cmd: string, i: number) => {
        this.log(`  ${i + 1}. ${cmd}`);
    });
};

window.EditorApp.prototype.executeResetEffects = function() {
    this.log("🔄 جاري إزالة كل المؤثرات من المقاطع المحددة...");
    const selectedIds = Array.from(this.selectedClipIds);
    if (selectedIds.length === 0) { this.log("❌ يرجى تحديد مقطع أولاً."); return; }
    let count = 0;
    this.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (selectedIds.includes(clip.id)) {
                clip.properties = {
                    x: clip.properties?.x || 0,
                    y: clip.properties?.y || 0,
                    scale: 100,
                    opacity: 100,
                    brightness: 100,
                    contrast: 100,
                    saturation: 100
                };
                count++;
            }
        });
    });
    this.saveState();
    this.requestRedraw();
    this.commitStateToReact();
    this.log(`✅ تم إزالة كل المؤثرات من ${count} مقطع!`);
};
