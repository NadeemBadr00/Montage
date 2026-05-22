import { useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../hooks/useAuth';

// Startup page — loads the existing startup.html logic via iframe approach
// The heavy JS is preserved by rendering the page content directly
export default function Startup() {
  const { userData } = useAuth();
  const initialized  = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Pass user data to window for legacy JS compatibility
    if (userData) {
      (window as unknown as Record<string, unknown>)['p43_userData'] = userData;
    }
  }, [userData]);

  return (
    <AppLayout showTopbar={false}>
      <iframe
        src="/startup.html"
        style={{ width: '100%', flex: 1, border: 'none', minHeight: '100vh' }}
        title="مشروع جديد"
      />
    </AppLayout>
  );
}
