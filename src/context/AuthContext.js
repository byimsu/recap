import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseReady } from '../api/firebase';
import { isLocalGuestActive, setLocalGuestActive } from '../storage/authStorage';
import * as authService from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrors';
import { syncDecksFromFirebase } from '../data/flashcardsData';
import { syncDeadlinesFromFirebase } from '../data/deadlinesData';
import { syncTextNotesFromFirebase } from '../data/textNotesData';
import { syncFromFirebase as syncStudyFromFirebase } from '../storage/studyStorage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const GUEST_USER = { uid: 'local_guest_user', isAnonymous: true, displayName: 'Guest' };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('initializing');

  // --- Internal sync helpers (separated guest vs Firebase) ---

  const syncFirebaseUser = useCallback((firebaseUser) => {
    setUser(firebaseUser);
  }, []);

  const syncGuestUser = useCallback(async () => {
    const isGuest = await isLocalGuestActive();
    if (isGuest) {
      setUser(GUEST_USER);
    } else {
      setUser(null);
    }
  }, []);

  const checkAuth = useCallback(async (firebaseUser) => {
    try {
      if (firebaseUser) {
        syncFirebaseUser(firebaseUser);
        // Pull all remote data in the background so every screen has fresh data
        Promise.all([
          syncDecksFromFirebase({ force: true }),
          syncDeadlinesFromFirebase({ force: true }),
          syncTextNotesFromFirebase({ force: true }),
          syncStudyFromFirebase(),
        ]).catch((e) => console.error('Initial sync error:', e));
      } else {
        await syncGuestUser();
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setAuthStatus('idle');
    }
  }, [syncFirebaseUser, syncGuestUser]);

  // --- Firebase auth state listener ---

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

  // --- Auth actions ---

  const login = useCallback(async (email, password) => {
    setAuthStatus('loggingIn');
    try {
      const result = await authService.login(email, password);
      return result;
    } catch (error) {
      setAuthStatus('idle');
      throw error;
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    setAuthStatus('registering');
    try {
      const result = await authService.register(email, password, name);
      return result;
    } catch (error) {
      setAuthStatus('idle');
      throw error;
    }
  }, []);

  const loginAsGuest = useCallback(async () => {
    setAuthStatus('loggingIn');
    try {
      if (isFirebaseReady() && auth?.currentUser) {
        await authService.logout();
      }
      await setLocalGuestActive(true);
      setUser(GUEST_USER);
    } catch (error) {
      console.error("Error signing in as guest:", error);
      throw error;
    } finally {
      setAuthStatus('idle');
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthStatus('loggingOut');
    try {
      await setLocalGuestActive(false);
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout Error:", error);
      throw error;
    } finally {
      setAuthStatus('idle');
    }
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    return authService.sendPasswordReset(email);
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    return authService.sendVerificationEmail();
  }, []);

  // --- Derived state ---

  const isGuest = user?.uid === GUEST_USER.uid;
  const isAuthenticated = user !== null;
  const emailVerified = isGuest ? false : (user?.emailVerified ?? false);
  const isLoading = authStatus === 'initializing';

  const contextValue = useMemo(() => ({
    // Existing (preserved for backward compatibility)
    user,
    isLoading,
    loginAsGuest,
    logout,
    checkAuth,

    // New
    authStatus,
    isAuthenticated,
    isGuest,
    emailVerified,
    firebaseUser: isGuest ? null : user,
    login,
    register,
    sendPasswordReset,
    sendVerificationEmail,
    getAuthErrorMessage,
  }), [
    user,
    isLoading,
    loginAsGuest,
    logout,
    checkAuth,
    authStatus,
    isAuthenticated,
    isGuest,
    emailVerified,
    login,
    register,
    sendPasswordReset,
    sendVerificationEmail,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
