import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const PROFILE_MAX_DIMENSION = 512;
const PROFILE_COMPRESS_QUALITY = 0.8;

/**
 * Compresses and resizes an image to a square-friendly size.
 * @param {string} uri - Local image URI from image picker.
 * @returns {Promise<string>} Compressed local URI.
 */
export async function compressImage(uri) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: PROFILE_MAX_DIMENSION, height: PROFILE_MAX_DIMENSION } }],
    { compress: PROFILE_COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

/**
 * Saves a profile image locally in the app's persistent document directory.
 * Overwrites any existing profile image for the user.
 *
 * @param {string} uid - User identifier.
 * @param {string} localUri - Local image URI from image picker.
 * @param {(progress: number) => void} [onProgress] - Optional progress callback.
 * @returns {Promise<string>} Persistent local file URI.
 */
export async function saveProfileImageLocally(uid, localUri, onProgress) {
  if (onProgress) onProgress(20);

  const compressedUri = await compressImage(localUri);
  if (onProgress) onProgress(60);

  const safeUid = uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '_') : 'guest';
  const dest = `${FileSystem.documentDirectory}profile_${safeUid}.jpg`;

  // Clean up existing file if present
  const fileInfo = await FileSystem.getInfoAsync(dest);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  await FileSystem.copyAsync({ from: compressedUri, to: dest });
  if (onProgress) onProgress(100);

  return dest;
}

/**
 * Uploads/saves a profile image locally.
 * Maintained as uploadProfileImage for backward compatibility.
 */
export async function uploadProfileImage(uid, localUri, onProgress) {
  return saveProfileImageLocally(uid, localUri, onProgress);
}

/**
 * Saves a guest profile image locally.
 */
export async function saveGuestProfileImage(localUri) {
  return saveProfileImageLocally('guest', localUri);
}
