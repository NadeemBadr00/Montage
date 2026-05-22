import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as fbSignOut, User } from 'firebase/auth';
import { auth } from '../firebase';
import type { UserData } from '../types';

const STORAGE_KEY = 'p43_user';

function getUserFromStorage(): UserData | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [userData, setData]   = useState<UserData | null>(getUserFromStorage);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const data: UserData = {
          name:  firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'مستخدم',
          email: firebaseUser.email || '',
          photo: firebaseUser.photoURL || '',
          uid:   firebaseUser.uid,
        };
        setData(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signOut = async () => {
    try { await fbSignOut(auth); } catch {}
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
    setUser(null);
  };

  return { user, userData, loading, signOut };
}
