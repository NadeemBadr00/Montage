import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';

export default function Home() {
  return (
    <AppLayout>
      <div className="content">

        {/* HERO */}
        <div className="hero fade-in-up d1">
          <div className="hero-inner">
            <div className="hero-text">
              <div className="hero-tag">
                <i className="fa-solid fa-bolt" />
                AI-Powered Video Studio
              </div>
              <h1 className="hero-title">
                محرر المونتاج<br />
                <span>الذكي الاحترافي</span>
              </h1>
              <p className="hero-sub">
                أنشئ محتواك بتقنيات الذكاء الاصطناعي — مونتاج يدوي أو سندوتش، تحليل ستايل، نقل تأثيرات، وترجمة تلقائية.
              </p>
              <div className="hero-cta">
                <Link to="/startup" className="cta-btn cta-primary">
                  <i className="fa-solid fa-play" />
                  ابدأ مشروع جديد
                </Link>
                <Link to="/analysis" className="cta-btn cta-secondary">
                  <i className="fa-solid fa-microchip" />
                  تحليل فيديو
                </Link>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.75rem', flexShrink: 0 }}>
              <div className="hero-badge">
                <div className="hb-num">43</div>
                <div className="hb-lbl">AI Model</div>
              </div>
              <div className="hero-badge">
                <div className="hb-num" style={{ fontSize: '1.6rem' }}>∞</div>
                <div className="hb-lbl">Layers</div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="stats fade-in-up d2">
          {[
            { icon: 'fa-brain',             cls: 'si-p', val: 'Gemini', lbl: 'محرك الذكاء الاصطناعي' },
            { icon: 'fa-layer-group',       cls: 'si-g', val: 'Multi',  lbl: 'طبقات مونتاج متعددة' },
            { icon: 'fa-closed-captioning', cls: 'si-v', val: 'SRT',    lbl: 'دعم الترجمة التلقائي' },
            { icon: 'fa-wand-magic-sparkles',cls:'si-y', val: 'Style',  lbl: 'نقل وتحليل الستايل' },
          ].map(s => (
            <div className="stat-card" key={s.val}>
              <div className={`stat-icon ${s.cls}`}><i className={`fa-solid ${s.icon}`} /></div>
              <div>
                <div className="stat-val">{s.val}</div>
                <div className="stat-lbl">{s.lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK START */}
        <div className="fade-in-up d3">
          <div className="section-head">
            <div className="sec-title">ابدأ الآن</div>
          </div>
          <div className="quick-grid">
            <Link to="/startup" className="quick-card qc-m">
              <div className="qc-icon"><i className="fa-solid fa-sliders" /></div>
              <div className="qc-title">مونتاج يدوي</div>
              <div className="qc-desc">تراك فيديو واحد مع دعم الصوت والترجمة — تحكم كامل في كل مقطع</div>
            </Link>
            <Link to="/startup" className="quick-card qc-s">
              <div className="qc-icon"><i className="fa-solid fa-layer-group" /></div>
              <div className="qc-title">
                مونتاج سندوتش{' '}
                <span style={{ fontSize: '.65rem', background: 'rgba(139,92,246,.2)', color: '#a78bfa', padding: '.15em .5em', borderRadius: '4px', marginRight: '.3rem' }}>AI</span>
              </div>
              <div className="qc-desc">طبقات تلقائية ذكية مع تأثيرات WebGL والأنيميشن — مثالي للكونتنت</div>
            </Link>
          </div>
        </div>

        {/* TOOLS */}
        <div className="fade-in-up d4">
          <div className="section-head">
            <div className="sec-title">أدوات الاستوديو</div>
          </div>
          <div className="tools-grid">
            {[
              { to: '/startup',        cls: 'tc-p', icon: 'fa-film',               badge: 'CORE', bc: 'rgba(99,102,241,.15)',  bt: 'var(--p2)', title: 'محرر المونتاج',      desc: 'قص وترتيب المقاطع، إضافة انتقالات، تحكم في التايم لاين' },
              { to: '/analysis',       cls: 'tc-b', icon: 'fa-microchip',           badge: 'AI',   bc: 'rgba(59,130,246,.15)',  bt: 'var(--b)',  title: 'محلل الفيديو',       desc: 'استخراج قواعد المونتاج والستايل باستخدام Gemini Vision' },
              { to: '/style-transfer', cls: 'tc-r', icon: 'fa-wand-magic-sparkles', badge: 'AI',   bc: 'rgba(244,63,94,.15)',   bt: '#fb7185',   title: 'نقل الستايل',        desc: 'طبّق ستايل مرجعي على فيديو جديد بضغطة واحدة' },
              { to: '/srt',            cls: 'tc-t', icon: 'fa-scissors',            badge: 'TOOL', bc: 'rgba(20,184,166,.15)',  bt: 'var(--t)',  title: 'SRT Splitter',       desc: 'تقسيم ملفات الترجمة الطويلة وتنسيقها تلقائياً' },
              { to: '/remove-bg',      cls: 'tc-v', icon: 'fa-eraser',              badge: 'AI',   bc: 'rgba(139,92,246,.15)', bt: 'var(--v)',  title: 'إزالة الخلفية',     desc: 'أزل خلفية الصور والفيديو بدقة عالية بالذكاء الاصطناعي' },
              { to: '/editor',         cls: 'tc-g', icon: 'fa-gauge-high',          badge: 'PRO',  bc: 'rgba(16,185,129,.15)', bt: 'var(--g)',  title: 'فتح المحرر مباشرة', desc: 'ادخل على المحرر مباشرة إذا كان لديك مشروع محفوظ' },
            ].map(t => (
              <Link to={t.to} className={`tool-card ${t.cls}`} key={t.title}>
                <div className="tc-head">
                  <div className="tc-icon"><i className={`fa-solid ${t.icon}`} /></div>
                  <span className="tc-badge" style={{ background: t.bc, color: t.bt }}>{t.badge}</span>
                </div>
                <div>
                  <div className="tc-title">{t.title}</div>
                  <div className="tc-desc">{t.desc}</div>
                </div>
                <div className="tc-arrow"><i className="fa-solid fa-arrow-left" /></div>
              </Link>
            ))}
          </div>
        </div>

        {/* TWO COL */}
        <div className="two-col fade-in-up d5">
          <div className="info-card">
            <h3><i className="fa-solid fa-lightbulb" /> نصائح الاستخدام</h3>
            <div className="tip-list">
              {[
                { c: '#6366f1', t: 'مفتاح Gemini API',   d: 'أضف مفتاحك الخاص لتجنب القيود ورفع جودة الترجمة والتحليل.' },
                { c: '#10b981', t: 'مونتاج سندوتش',       d: 'الأفضل للكونتنت الاحترافي مع B-Roll وتأثيرات متعددة الطبقات.' },
                { c: '#8b5cf6', t: 'SRT Splitter',        d: 'استخدمها قبل المونتاج لتقسيم الترجمة الطويلة لمقاطع مناسبة.' },
                { c: '#f59e0b', t: 'محلل الفيديو',        d: 'حلّل فيديو مرجعي لاستخراج قواعد مونتاجه وتطبيقها تلقائياً.' },
                { c: '#3b82f6', t: 'تصدير XML',           d: 'صدّر مشروعك كـ FCPX XML للتوافق مع محررات احترافية.' },
              ].map(tip => (
                <div className="tip" key={tip.t}>
                  <div className="tip-dot" style={{ background: tip.c }} />
                  <p><strong>{tip.t}</strong> — {tip.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="info-card">
            <h3><i className="fa-solid fa-circle-info" /> معلومات الإصدار</h3>
            <div className="version-list">
              {[
                { name: 'Project 43 AI ULTRA', badge: 'v4.3',   cls: 'vb-latest' },
                { name: 'Gemini Integration',  badge: 'Pro',    cls: 'vb-stable' },
                { name: 'WebGL Pipeline',      badge: 'Stable', cls: 'vb-stable' },
                { name: 'MediaPipe AI',        badge: 'Active', cls: 'vb-stable' },
                { name: 'Style Transfer',      badge: 'Beta',   cls: 'vb-beta'   },
                { name: 'FCPX XML Export',     badge: 'v1.11',  cls: 'vb-stable' },
              ].map(v => (
                <div className="ver-item" key={v.name}>
                  <span className="ver-name">{v.name}</span>
                  <span className={`ver-badge ${v.cls}`}>{v.badge}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', padding: '.75rem', background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.15)', borderRadius: '10px', fontSize: '.75rem', color: 'var(--tx2)', textAlign: 'center' }}>
              <i className="fa-solid fa-shield-halved" style={{ color: 'var(--p2)', marginLeft: '.3rem' }} />
              مدعوم بـ Firebase Auth · بيانات آمنة ومحمية
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="footer fade-in">
          <span>Project 43 AI ULTRA © 2025 — Nadeem Badr</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <i className="fa-solid fa-circle" style={{ color: 'var(--g)', fontSize: '.5rem' }} />
            جميع الأنظمة تعمل بشكل طبيعي
          </span>
        </div>

      </div>
    </AppLayout>
  );
}
