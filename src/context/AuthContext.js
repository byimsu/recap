import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, isFirebaseReady } from '../api/firebase';
import { isLocalGuestActive, setLocalGuestActive } from '../storage/authStorage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async (firebaseUser) => {
    try {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        const isGuest = await isLocalGuestActive();
        if (isGuest) {
          setUser({ uid: 'local_guest_user', isAnonymous: true, displayName: 'Guest' });
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      console.error("Auth is not initialized. Firebase might be missing configuration.");
      checkAuth(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      checkAuth(currentUser);
    });

    return () => unsubscribe();
  }, [checkAuth]);

  const loginAsGuest = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseReady() && auth?.currentUser) {
        await firebaseSignOut(auth);
      }
      await setLocalGuestActive(true);
      setUser({ uid: 'local_guest_user', isAnonymous: true, displayName: 'Guest' });
    } catch (error) {
      console.error("Error signing in as guest:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await setLocalGuestActive(false);
      if (auth && auth.currentUser) {
        await firebaseSignOut(auth);
      }
      setUser(null);
    } catch (error) {
      console.error("Logout Error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginAsGuest, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
