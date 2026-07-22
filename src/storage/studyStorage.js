import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../api/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { isLocalGuestActive } from './authStorage';
import { getScopedKey } from './userStorage';

const BASE_STUDY_DATA_KEY = '@study_minutes_data';

/**
 * Formats a Date object to YYYY-MM-DD in local time.
 */
export const formatLocalDate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Retrieves all study data from local storage.
 * Returns an object like { "2024-07-19": 45, "2024-07-18": 30 }
 */
export const getLocalStudyData = async () => {
  try {
    const studyDataKey = await getScopedKey(BASE_STUDY_DATA_KEY);
    const data = await AsyncStorage.getItem(studyDataKey);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {};
    }
    return {};
  } catch (error) {
    console.error("Error reading local study data:", error);
    return {};
  }
};


/**
 * Saves study minutes for today to local storage.
 * If user is logged in (and not a guest), it also attempts to sync to Firebase.
 */
export const saveStudyMinutes = async (minutes) => {
  const todayStr = formatLocalDate(new Date());

  try {
    const studyDataKey = await getScopedKey(BASE_STUDY_DATA_KEY);
    // 1. Update Local Storage (Always)
    const localData = await getLocalStudyData();
    const currentMinutes = localData[todayStr] || 0;
    const newTotal = currentMinutes + minutes;

    const updatedData = { ...localData, [todayStr]: newTotal };
    await AsyncStorage.setItem(studyDataKey, JSON.stringify(updatedData));

    // 2. Sync to Firebase if user is logged in AND NOT a guest
    const user = auth?.currentUser;
    const isGuest = await isLocalGuestActive();

    if (user && !isGuest && db) {
      const userRef = doc(db, 'users', user.uid);
      // We use the local total as the source of truth for the write
      await setDoc(userRef, {
        dailyStudyMinutes: {
          [todayStr]: newTotal
        }
      }, { merge: true });
      console.log(`Synced ${newTotal} total minutes to Firebase for ${todayStr}`);
    }

    return updatedData;
  } catch (error) {
    console.error("Error saving study minutes:", error);
    throw error;
  }
};

/**
 * One-time sync from Firebase to Local Storage.
 * Useful when a user first logs in on a new device.
 */
export const syncFromFirebase = async () => {
  const user = auth?.currentUser;
  if (!user || user.isAnonymous || !db) return null;

  try {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists() && docSnap.data().dailyStudyMinutes) {
      const firebaseData = docSnap.data().dailyStudyMinutes;
      const localData = await getLocalStudyData();

      // Merge: prefer the higher value for each day to avoid data loss
      const mergedData = { ...localData };
      Object.keys(firebaseData).forEach(date => {
        mergedData[date] = Math.max(localData[date] || 0, firebaseData[date]);
      });

      const studyDataKey = await getScopedKey(BASE_STUDY_DATA_KEY);
      await AsyncStorage.setItem(studyDataKey, JSON.stringify(mergedData));
      return mergedData;
    }
    return null;
  } catch (error) {
    console.error("Error syncing from Firebase:", error);
    return null;
  }
};
