import { auth } from '../api/firebase';
import { isLocalGuestActive } from './authStorage';

/**
 * Returns the current user's unique identifier.
 */
export const getUserUID = async () => {
  const isGuest = await isLocalGuestActive();
  if (isGuest) {
    return 'local_guest_user';
  }
  return auth?.currentUser?.uid || 'anonymous';
};

/**
 * Generates a storage key scoped to the current user.
 */
export const getScopedKey = async (baseKey) => {
  const uid = await getUserUID();
  const cleanBase = baseKey.startsWith('@') ? baseKey.substring(1) : baseKey;
  return `@user_${uid}_${cleanBase}`;
};
