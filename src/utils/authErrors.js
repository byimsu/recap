/**
 * Maps Firebase Authentication error codes to user-friendly messages.
 *
 * Usage:
 *   import { getAuthErrorMessage } from '../utils/authErrors';
 *   catch (error) {
 *     const message = getAuthErrorMessage(error.code);
 *   }
 */

const ERROR_MAP = {
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/user-not-found': 'No account found with those details.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/wrong-password': 'Incorrect password. Try again.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Password does not meet minimum requirements.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
};

/**
 * Returns a user-friendly error message for a given Firebase auth error code.
 * Falls back to a generic message for unmapped codes.
 */
export function getAuthErrorMessage(errorCode) {
  return ERROR_MAP[errorCode] || 'Something went wrong. Please try again.';
}
