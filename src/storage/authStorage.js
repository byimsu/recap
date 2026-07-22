import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_ACTIVE_KEY = '@is_local_guest_active';

/**
 * Sets the local guest status.
 */
export const setLocalGuestActive = async (isActive) => {
  try {
    if (isActive) {
      await AsyncStorage.setItem(GUEST_ACTIVE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(GUEST_ACTIVE_KEY);
    }
  } catch (error) {
    console.error("Error setting guest status:", error);
  }
};

/**
 * Checks if the local guest mode is active.
 */
export const isLocalGuestActive = async () => {
  try {
    const val = await AsyncStorage.getItem(GUEST_ACTIVE_KEY);
    return val === 'true';
  } catch (error) {
    console.error("Error checking guest status:", error);
    return false;
  }
};
