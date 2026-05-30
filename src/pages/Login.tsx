import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');

const ERROR_MSGS: Record<string, string> = {
  'auth/popup-closed-by-user':    'أغلقت نافذة تسجيل الدخول. حاول مجدداً.',
  'auth/popup-blocked':           'تم حجب النافذة المنبثقة. السماح لها من المتصفح.',
  'auth/cancelled-popup-request': 'طلب ملغي. حاول مجدداً.',
  'auth/network-request-failed':  'مشكلة في الاتصال. تحقق من الإنترنت.',
  'auth/unauthorized-domain':     'النطاق غير مصرح به في Firebase Console.',
};

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If this is a brand new user, the backend `onUserCreated` trigger will 
        // initialize their 30-day Ultra trial in Firestore automatically.
        // We just redirect them to the home page.
        navigate('/', { replace: true });
      }
    });
    return unsub;
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      setLoading(false);
      const code = (err as { code?: string }).code ?? '';
      setStatus({ msg: ERROR_MSGS[code] || 'حدث خطأ غير متوقع.', type: 'err' });
    }
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page{display:flex;width:100vw;height:100vh;background:#04060f;color:#f1f5f9;font-family:'Cairo',sans-serif}
        .lp-left{flex:1 1 60%;position:relative;overflow:hidden;background:#04060f;display:flex;flex-direction:column;justify-content:space-between;padding:3rem}
        .lp-left::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 30% 20%,rgba(99,102,241,.22),transparent 60%),radial-gradient(ellipse 60% 50% at 80% 80%,rgba(16,185,129,.14),transparent 60%),radial-gradient(ellipse 50% 40% at 10% 80%,rgba(139,92,246,.18),transparent 60%);z-index:0}
        .lp-left::after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(99,102,241,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.06) 1px,transparent 1px);background-size:55px 55px;z-index:0}
        .scanline{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,.6) 30%,rgba(16,185,129,.6) 70%,transparent);animation:scan 5s linear infinite;z-index:1;opacity:.5}
        @keyframes scan{0%{top:0}100%{top:100%}}
        .left-inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%;justify-content:space-between}
        .brand{display:flex;align-items:center;gap:.9rem}
        .brand-logo{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#fff;box-shadow:0 0 30px rgba(99,102,241,.5)}
        .brand-name{font-size:1.3rem;font-weight:700;color:#fff}
        .brand-sub{font-size:.72rem;font-weight:700;letter-spacing:.1em;background:linear-gradient(90deg,#6366f1,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .hero-center{text-align:center}
        .hero-icon-wrap{width:140px;height:140px;margin:0 auto 2rem;position:relative}
        .ring{position:absolute;inset:0;border-radius:50%;border:1px solid rgba(99,102,241,.25);animation:ring 3s ease-in-out infinite}
        .ring:nth-child(2){inset:-12px;border-color:rgba(99,102,241,.15);animation-delay:.75s}
        .ring:nth-child(3){inset:-26px;border-color:rgba(99,102,241,.08);animation-delay:1.5s}
        @keyframes ring{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.04);opacity:.7}}
        .hero-icon{width:140px;height:140px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6 50%,#10b981);display:flex;align-items:center;justify-content:center;font-size:3.5rem;color:#fff;box-shadow:0 0 40px rgba(99,102,241,.5),0 0 80px rgba(99,102,241,.25);animation:pulse 3s ease-in-out infinite}
        @keyframes pulse{0%,100%{box-shadow:0 0 40px rgba(99,102,241,.5),0 0 80px rgba(99,102,241,.25)}50%{box-shadow:0 0 60px rgba(99,102,241,.7),0 0 100px rgba(99,102,241,.35)}}
        .lhero-title{font-size:3.5rem;font-weight:900;line-height:1.1;margin-bottom:1rem;background:linear-gradient(135deg,#fff,#a5b4fc 60%,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .lhero-sub{font-size:1.1rem;color:#94a3b8;max-width:460px;margin:0 auto 2.5rem;line-height:1.7}
        .pills{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center}
        .pill{display:flex;align-items:center;gap:.55rem;padding:.55rem 1.1rem;border-radius:999px;font-size:.83rem;color:#94a3b8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(10px);transition:all .3s}
        .pill:hover{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.3);color:#fff;transform:translateY(-2px)}
        .stats-bar{display:flex;gap:2rem}
        .s-num{font-size:1.6rem;font-weight:700;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .s-lbl{font-size:.75rem;color:#64748b}
        .lp-right{flex:0 0 420px;background:#080c1a;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 2.5rem;position:relative;overflow:hidden}
        .lp-right::before{content:'';position:absolute;top:-200px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(99,102,241,.08),transparent 70%);pointer-events:none}
        .lp-right::after{content:'';position:absolute;bottom:-200px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(16,185,129,.06),transparent 70%);pointer-events:none}
        .sign-box{position:relative;z-index:1;width:100%;max-width:340px}
        .sign-welcome{text-align:center;margin-bottom:2.5rem}
        .sign-tag{display:inline-flex;align-items:center;gap:.4rem;font-size:.75rem;color:#10b981;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);padding:.3rem .85rem;border-radius:999px;margin-bottom:1.2rem}
        .sign-welcome h1{font-size:1.9rem;font-weight:700;margin-bottom:.6rem;background:linear-gradient(135deg,#fff,#a5b4fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .sign-welcome p{font-size:.9rem;color:#64748b;line-height:1.6}
        .divider{display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.07)}
        .divider span{font-size:.78rem;color:#64748b;white-space:nowrap}
        .g-btn{width:100%;display:flex;align-items:center;gap:1rem;padding:1.1rem 1.5rem;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#fff;font-family:'Cairo',sans-serif;font-size:1rem;font-weight:600;cursor:pointer;transition:all .3s;position:relative;overflow:hidden}
        .g-btn:hover:not(:disabled){background:rgba(255,255,255,.09);border-color:rgba(99,102,241,.4);transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.35)}
        .g-btn:disabled{opacity:.6;cursor:not-allowed}
        .g-logo{width:24px;height:24px;flex-shrink:0}
        .g-label{flex:1;text-align:right}
        .g-arrow{width:30px;height:30px;border-radius:8px;background:rgba(99,102,241,.15);display:flex;align-items:center;justify-content:center;font-size:.8rem;color:#818cf8;transition:all .3s;flex-shrink:0}
        .g-btn:hover:not(:disabled) .g-arrow{background:rgba(99,102,241,.3);transform:translateX(-3px)}
        .st-ok{margin-top:1rem;padding:.75rem 1rem;border-radius:12px;font-size:.85rem;text-align:center;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);color:#6ee7b7}
        .st-err{margin-top:1rem;padding:.75rem 1rem;border-radius:12px;font-size:.85rem;text-align:center;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#fca5a5}
        .mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:2rem}
        .mini-feat{display:flex;align-items:center;gap:.5rem;padding:.6rem .75rem;border-radius:10px;font-size:.78rem;color:#64748b;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)}
        .mini-feat i{font-size:.8rem;width:14px;text-align:center}
        .security{display:flex;align-items:center;justify-content:center;gap:.5rem;font-size:.75rem;color:#64748b;margin-top:2rem}
        .security i{color:#10b981}
        @media(max-width:900px){.lp-left{display:none}.lp-right{flex:1;border:none}}
      `}</style>

      {/* LEFT */}
      <div className="lp-left">
        <div className="scanline" />
        <div className="left-inner">
          <div className="brand">
            <div className="brand-logo"><i className="fa-solid fa-brain" /></div>
            <div>
              <div className="brand-name">Project 43</div>
              <div className="brand-sub">AI ULTRA EDITION</div>
            </div>
          </div>

          <div className="hero-center">
            <div className="hero-icon-wrap">
              <div className="ring" /><div className="ring" /><div className="ring" />
              <div className="hero-icon"><i className="fa-solid fa-film" /></div>
            </div>
            <h1 className="lhero-title">منصة مونتاج<br />بالذكاء الاصطناعي</h1>
            <p className="lhero-sub">بيئة مونتاج فيديو احترافية مدعومة بـ Gemini AI — قص، رتّب، ترجمة، وصدّر بجودة عالية</p>
            <div className="pills">
              {[
                { icon: 'fa-layer-group',        c: '#6366f1', t: 'Multi-Track Timeline' },
                { icon: 'fa-sparkles',           c: '#f59e0b', t: 'Gemini AI Assistant' },
                { icon: 'fa-closed-captioning',  c: '#10b981', t: 'Auto SRT Subtitles' },
                { icon: 'fa-wand-magic-sparkles',c: '#ec4899', t: 'Style Transfer' },
                { icon: 'fa-microchip',          c: '#3b82f6', t: 'Video Analysis AI' },
                { icon: 'fa-scissors',           c: '#14b8a6', t: 'SRT Splitter' },
              ].map(p => (
                <div className="pill" key={p.t}>
                  <i className={`fa-solid ${p.icon}`} style={{ color: p.c }} /> {p.t}
                </div>
              ))}
            </div>
          </div>

          <div className="stats-bar">
            <div><div className="s-num">v4.3</div><div className="s-lbl">الإصدار الحالي</div></div>
            <div><div className="s-num">6+</div><div className="s-lbl">أداة متكاملة</div></div>
            <div><div className="s-num">AI</div><div className="s-lbl">مدعوم بـ Gemini</div></div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="lp-right">
        <div className="sign-box">
          <div className="sign-welcome">
            <div className="sign-tag"><i className="fa-solid fa-lock-open" /> وصول آمن</div>
            <h1>أهلاً بك 👋</h1>
            <p>سجّل دخولك بحسابك على Google للبدء في استخدام أدوات المونتاج</p>
          </div>

          <div className="divider"><span>تسجيل الدخول بـ</span></div>

          <button className="g-btn" id="google-sign-in-btn" onClick={signIn} disabled={loading}>
            <svg className="g-logo" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="g-label">{loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول بـ Google'}</span>
            {!loading && <div className="g-arrow"><i className="fa-solid fa-arrow-left" /></div>}
          </button>

          {status && <div className={status.type === 'ok' ? 'st-ok' : 'st-err'}>{status.msg}</div>}

          <div className="mini-grid">
            {[
              { i: 'fa-video',           c: '#6366f1', t: 'مونتاج احترافي' },
              { i: 'fa-robot',           c: '#f59e0b', t: 'Gemini AI' },
              { i: 'fa-closed-captioning',c:'#10b981', t: 'SRT تلقائي' },
              { i: 'fa-shield',          c: '#ec4899', t: 'آمن ومشفر' },
            ].map(f => (
              <div className="mini-feat" key={f.t}>
                <i className={`fa-solid ${f.i}`} style={{ color: f.c }} /> {f.t}
              </div>
            ))}
          </div>

          <div className="security">
            <i className="fa-solid fa-shield-halved" />
            <span>بياناتك محمية عبر Firebase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
}
