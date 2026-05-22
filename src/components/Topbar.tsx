import { Link } from 'react-router-dom';
import type { UserData } from '../types';

interface TopbarProps {
  userData: UserData | null;
}

export default function Topbar({ userData }: TopbarProps) {
  const firstName = userData?.name?.split(' ')[0] || '...';

  return (
    <div className="topbar fade-in">
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
