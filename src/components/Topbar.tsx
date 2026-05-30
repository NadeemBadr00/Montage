import { Link } from 'react-router-dom';
import type { UserData } from '../types';
import { AnimatedLogo } from './ui/AnimatedLogo';

interface TopbarProps {
  userData: UserData | null;
}

export default function Topbar({ userData }: TopbarProps) {
  const firstName = userData?.name?.split(' ')[0] || '...';

  return (
    <div className="topbar fade-in">
      {/* Brand */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px', textDecoration: 'none' }}>
        <AnimatedLogo src="/ai4montage_logo.png" size="sm" />
        <span style={{ textShadow: '0 2px 10px rgba(34,211,238,0.2)' }}>AI4Montage</span>
      </Link>
      <div className="tb-greeting">
        مرحباً، <strong>{firstName}</strong> 👋
      </div>
      <div className="tb-actions">
        <Link to="/srt" className="tb-btn tb-btn-ghost">
          <i className="fa-solid fa-scissors" /> SRT Splitter
        </Link>
        <Link to="/startup" className="tb-btn tb-btn-primary">
          <i className="fa-solid fa-plus" />
          مشروع جديد
        </Link>
      </div>
    </div>
  );
}
