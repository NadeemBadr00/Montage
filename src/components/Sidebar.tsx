import { Link, useLocation } from 'react-router-dom';
import type { UserData } from '../types';

interface SidebarProps {
  userData: UserData | null;
  onSignOut: () => void;
}

export default function Sidebar({ userData, onSignOut }: SidebarProps) {
  const { pathname } = useLocation();
  const active = (path: string) => pathname === path ? 'nav-a active' : 'nav-a';

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-icon"><i className="fa-solid fa-brain" /></div>
        <div>
          <div className="sb-title">AI4Montage</div>
          <div className="sb-sub">v4.3 · AI ULTRA</div>
        </div>
      </div>

      <div className="sb-user">
        <div className="sb-av" id="sb-avatar">
          {userData?.photo
            ? <img src={userData.photo} alt={userData.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <i className="fa-solid fa-user" />
          }
        </div>
        <div className="sb-uinfo">
          <div className="sb-uname">{userData?.name || 'جارٍ التحميل...'}</div>
          <div className="sb-uemail">{userData?.email || '...'}</div>
        </div>
        <div className="sb-dot" />
      </div>

      <nav className="sb-nav">
        <div className="nav-lbl">الرئيسية</div>
        <Link className={active('/')} to="/">
          <i className="fa-solid fa-house ni" style={{ color: '#6366f1' }} />
          لوحة التحكم
        </Link>

        <div className="nav-lbl">الاستوديو</div>
        <Link className={active('/startup')} to="/startup">
          <i className="fa-solid fa-film ni" style={{ color: '#818cf8' }} />
          مشروع جديد
          <span className="nav-badge nb-new">NEW</span>
        </Link>
        <Link className={active('/editor')} to="/editor">
          <i className="fa-solid fa-scissors ni" style={{ color: '#a78bfa' }} />
          المحرر
        </Link>

        <div className="nav-lbl">أدوات AI</div>
        <Link className={active('/analysis')} to="/analysis">
          <i className="fa-solid fa-microchip ni" style={{ color: '#3b82f6' }} />
          محلل الفيديو
          <span className="nav-badge nb-ai">AI</span>
        </Link>
        <Link className={active('/style-transfer')} to="/style-transfer">
          <i className="fa-solid fa-wand-magic-sparkles ni" style={{ color: '#f43f5e' }} />
          نقل الستايل
          <span className="nav-badge nb-ai">AI</span>
        </Link>

        <div className="nav-lbl">أدوات إضافية</div>
        <Link className={active('/srt')} to="/srt">
          <i className="fa-solid fa-closed-captioning ni" style={{ color: '#14b8a6' }} />
          SRT Splitter
        </Link>
        <Link className={active('/remove-bg')} to="/remove-bg">
          <i className="fa-solid fa-eraser ni" style={{ color: '#f59e0b' }} />
          إزالة الخلفية
        </Link>
      </nav>

      <div className="sb-footer">
        <button className="signout-btn" onClick={onSignOut}>
          <i className="fa-solid fa-arrow-right-from-bracket" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
