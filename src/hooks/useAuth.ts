import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as fbSignOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
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
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Read initially from storage for immediate UI render
        const stored = getUserFromStorage();
        let data: UserData = {
          name:           firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email:          firebaseUser.email || '',
          photo:          firebaseUser.photoURL || '',
          uid:            firebaseUser.uid,
          plan:           stored?.plan           ?? 'free',
          planExpiresAt:  stored?.planExpiresAt  ?? null,
          billing:        stored?.billing        ?? null,  // ← restored from cache
        };
        setData(data);

        // Listen to Firestore for real-time subscription updates
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubFirestore = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const fsData = docSnap.data();
            data = {
              ...data,
              plan:          fsData.plan          || data.plan,
              planExpiresAt: fsData.planExpiresAt  || data.planExpiresAt,
              billing:       fsData.billing        || null,   // ← "monthly" | "yearly" | null
            };
          } else {
            // Fallback: If Firestore doc is missing (e.g. cloud function hasn't finished),
            // safely calculate the 30-day trial from Auth creation time.
            const creationTimeMs = new Date(firebaseUser.metadata.creationTime || Date.now()).getTime();
            const trialExpiresAt = creationTimeMs + 30 * 24 * 60 * 60 * 1000;
            if (trialExpiresAt > Date.now()) {
              data = { ...data, plan: 'ultra', planExpiresAt: trialExpiresAt, billing: null };
            } else {
              data = { ...data, plan: 'free', planExpiresAt: null, billing: null };
            }
          }
          setData(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        });

      } else {
        setData(null);
        if (unsubFirestore) {
          unsubFirestore();
          unsubFirestore = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const signOut = async () => {
    try { await fbSignOut(auth); } catch {}
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
    setUser(null);
  };

  return { user, userData, loading, signOut };
}
