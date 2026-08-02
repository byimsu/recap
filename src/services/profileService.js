import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import {
  updateProfile as updateFirebaseAuthProfile,
  deleteUser as deleteFirebaseAuthUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { db, auth } from '../api/firebase';

const GUEST_PROFILE_KEY = '@profile_guest';

const GUEST_UID = 'local_guest_user';

/**
 * Returns true if the user object represents a local guest session.
 */
function isGuestUser(user) {
  return !user || user.uid === GUEST_UID || user.isAnonymous === true;
}

/**
 * Normalizes a Firestore document into a consistent profile shape.
 */
function normalizeFirestoreProfile(data, uid) {
  return {
    uid,
    email: data.email || '',
    displayName: data.displayName || data.name || '',
    photoURL: data.photoURL || null,
    createdAt: data.createdAt || data.date_created || null,
    isGuest: false,
    emailVerified: auth?.currentUser?.emailVerified ?? false,
  };
}

/**
 * Fetches the profile for the given user.
 * - Guest: reads from AsyncStorage.
 * - Firebase user: reads from Firestore, creating the document if absent.
 *
 * @returns {Promise<{uid, email, displayName, photoURL, isGuest, emailVerified}|null>}
 */
export async function getProfile(user) {
  if (!user) return null;

  if (isGuestUser(user)) {
    try {
      const raw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      return {
        uid: GUEST_UID,
        email: null,
        displayName: stored.displayName || 'Guest',
        photoURL: stored.photoURL || null,
        isGuest: true,
        emailVerified: false,
      };
    } catch (error) {
      console.error('Error reading guest profile:', error);
      return { uid: GUEST_UID, email: null, displayName: 'Guest', photoURL: null, isGuest: true, emailVerified: false };
    }
  }

  if (!db) throw new Error('Firestore is not initialized.');

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    return createProfileFromAuth(user);
  }

  return normalizeFirestoreProfile(snap.data(), user.uid);
}

/**
 * Creates a Firestore profile document seeded from Firebase Auth data.
 * Used for accounts that registered before this feature was added.
 */
export async function createProfileFromAuth(firebaseUser) {
  if (!db) throw new Error('Firestore is not initialized.');

  const now = new Date().toISOString();
  const profile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    photoURL: firebaseUser.photoURL || null,
    createdAt: now,
    updatedAt: now,
    is_active: true,
  };

  const userRef = doc(db, 'users', firebaseUser.uid);
  await setDoc(userRef, profile, { merge: true });

  return normalizeFirestoreProfile(profile, firebaseUser.uid);
}

/**
 * Updates a user's profile (name and/or photoURL).
 * - Guest: persists to AsyncStorage.
 * - Firebase user: writes to Firestore and syncs to Firebase Auth.
 *
 * @param {object} user - The current user object from AuthContext.
 * @param {{ displayName?: string, photoURL?: string }} updates
 */
export async function updateProfile(user, updates) {
  if (!user) throw new Error('No user provided.');

  const payload = {};
  if (updates.displayName !== undefined) {
    payload.displayName = updates.displayName.trim();
  }
  if (updates.photoURL !== undefined) {
    payload.photoURL = updates.photoURL;
  }

  if (isGuestUser(user)) {
    const raw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    const updated = { ...existing, ...payload, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(updated));
    return;
  }

  if (!db) throw new Error('Firestore is not initialized.');

  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });

  // Keep Firebase Auth profile in sync
  const currentUser = auth?.currentUser;
  if (currentUser) {
    const authUpdates = {};
    if (payload.displayName !== undefined) authUpdates.displayName = payload.displayName;
    if (payload.photoURL !== undefined) authUpdates.photoURL = payload.photoURL;
    if (Object.keys(authUpdates).length > 0) {
      await updateFirebaseAuthProfile(currentUser, authUpdates);
    }
  }
}

/**
 * Completely deletes a user's account and all associated data.
 * - For registered users: re-authenticates with password if provided, deletes Auth account & Firestore document.
 * - For all users: Clears AsyncStorage and local profile files.
 *
 * @param {object} user - The current user object.
 * @param {string} [password] - Account password for registered users to re-authenticate.
 */
export async function deleteAccount(user, password = '') {
  if (!user) throw new Error('No user provided for deletion.');

  const isGuest = isGuestUser(user);
  let currentUser = null;

  // 1. Re-authenticate first if registered user
  if (!isGuest) {
    currentUser = auth?.currentUser;
    if (currentUser && password && currentUser.email) {
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
      } catch (reauthErr) {
        if (reauthErr.code === 'auth/wrong-password' || reauthErr.code === 'auth/invalid-credential') {
          const customError = new Error('Incorrect password. Please enter your correct password to confirm deletion.');
          customError.code = reauthErr.code;
          throw customError;
        }
        throw reauthErr;
      }
    }
  }

  // 2. Delete Firestore data (documents & subcollections) BEFORE deleting Auth user
  if (!isGuest && db && user.uid) {
    try {
      // Helper to delete all docs in a collection
      const deleteCollection = async (collectionRef) => {
        const snap = await getDocs(collectionRef);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        return snap.docs;
      };

      // 2a. Delete 'deadlines' subcollection
      await deleteCollection(collection(db, 'users', user.uid, 'deadlines'));

      // 2b. Delete 'textNotes' subcollection
      await deleteCollection(collection(db, 'users', user.uid, 'textNotes'));

      // 2c. Delete 'decks' and their 'cards' subcollections
      const decksCol = collection(db, 'users', user.uid, 'decks');
      const decksSnap = await getDocs(decksCol);
      for (const deckDoc of decksSnap.docs) {
        const cardsCol = collection(db, 'users', user.uid, 'decks', deckDoc.id, 'cards');
        await deleteCollection(cardsCol);
        await deleteDoc(deckDoc.ref);
      }

      // 2d. Finally, delete the parent user document
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);
    } catch (e) {
      console.error('Error deleting Firestore data during account deletion:', e);
      // We log but don't strictly throw, to ensure we at least try to delete the Auth user
    }
  }

  // 3. Delete local profile image file
  try {
    const safeUid = user.uid ? user.uid.replace(/[^a-zA-Z0-9_-]/g, '_') : 'guest';
    const dest = `${FileSystem.documentDirectory}profile_${safeUid}.jpg`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    }
  } catch (e) {
    console.error('Error deleting local profile image:', e);
  }

  // 4. Delete Firebase Auth user LAST
  if (!isGuest && currentUser) {
    try {
      await deleteFirebaseAuthUser(currentUser);
    } catch (authError) {
      if (authError?.code === 'auth/requires-recent-login') {
        const customError = new Error('Re-authentication required. Please enter your password to confirm account deletion.');
        customError.code = 'auth/requires-recent-login';
        throw customError;
      }
      throw authError;
    }
  }

  // 5. Clear local AsyncStorage
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.error('Error clearing AsyncStorage on account deletion:', e);
  }
}


