import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Background from './Background';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../hooks/useAuth';

interface AppLayoutProps {
  children: React.ReactNode;
  showTopbar?: boolean;
}

export default function AppLayout({ children, showTopbar = true }: AppLayoutProps) {
  const { userData, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !userData) {
      navigate('/login');
    }
  }, [loading, userData, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--tx2)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--p2)', marginBottom: '1rem', display: 'block' }} />
          جارٍ التحميل...
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <>
      <Background />
      <div className="shell">
        <Sidebar userData={userData} onSignOut={signOut} />
        <main className="main">
          {showTopbar && <Topbar userData={userData} />}
          {children}
        </main>
      </div>
    </>
  );
}
