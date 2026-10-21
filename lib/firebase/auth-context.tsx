'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './client';

interface AuthContextType {
  user: User | null | { email: string; displayName: string; isDemo: boolean };
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isDemoUser: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  isDemoUser: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If auth instance is ready, listen to live auth state
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
        } else {
          // Check if user set local session
          const savedMock = typeof window !== 'undefined' ? localStorage.getItem('demo_user_active') : null;
          if (savedMock === 'true') {
            setUser({
              email: 'owner@agentic-client.local',
              displayName: 'Platform Owner (Demo Mode)',
              isDemo: true,
            });
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }

    // Fallback if auth is not ready
    const savedMock = typeof window !== 'undefined' ? localStorage.getItem('demo_user_active') : null;
    if (savedMock !== 'false') {
      setUser({
        email: 'owner@agentic-client.local',
        displayName: 'Platform Owner (Demo Mode)',
        isDemo: true,
      });
    }
    setLoading(false);
  }, []);

  const signInWithGoogle = async () => {
    if (auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
        return;
      } catch (err: any) {
        console.warn('Firebase popup sign-in encountered an issue or was closed:', err.message);
      }
    }
    // Fallback or demo login
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_user_active', 'true');
    }
    setUser({
      email: 'owner@agentic-client.local',
      displayName: 'Platform Owner (Demo Mode)',
      isDemo: true,
    });
  };

  const logout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        // ignore
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_user_active', 'false');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        logout,
        isDemoUser: Boolean(user?.isDemo),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
