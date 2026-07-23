import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseReady } from '../api/firebase';

/**
 * Validates that Firebase is initialized before performing auth operations.
 * Throws a descriptive error if not ready.
 */
function requireFirebase() {
  if (!isFirebaseReady()) {
    const error = new Error('Firebase is not initialized. Check your environment configuration.');
    error.code = 'auth/configuration-error';
    throw error;
  }
}

/**
 * Signs in a user with email and password.
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function login(email, password) {
  requireFirebase();
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }
  return signInWithEmailAndPassword(auth, email.trim(), password.trim());
}

/**
 * Creates a new user account, stores a profile document in Firestore,
 * and sends a verification email.
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function register(email, password, name) {
  requireFirebase();
  if (!email || !password || !name) {
    throw new Error('Name, email, and password are required.');
  }

  const result = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());

  // Create user profile document in Firestore
  if (db) {
    const userData = {
      date_created: new Date().toISOString(),
      email: email.trim(),
      uid: result.user.uid,
      name: name.trim(),
      is_active: true,
    };
    const userRef = doc(db, 'users', result.user.uid);
    await setDoc(userRef, userData);
  }

  // Send verification email (best-effort, do not block on failure)
  try {
    await sendEmailVerification(result.user);
  } catch (verifyError) {
    console.warn('Verification email could not be sent:', verifyError.message);
  }

  return result;
}

/**
 * Signs out the current Firebase user.
 */
export async function logout() {
  if (auth?.currentUser) {
    await signOut(auth);
  }
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordReset(email) {
  requireFirebase();
  if (!email) {
    throw new Error('Email is required.');
  }
  return sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sends a verification email to the currently signed-in user.
 */
export async function sendVerificationEmail() {
  requireFirebase();
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in.');
  }
  return sendEmailVerification(user);
}

/**
 * Returns the currently signed-in Firebase user, or null.
 */
export function getCurrentUser() {
  return auth?.currentUser || null;
}
