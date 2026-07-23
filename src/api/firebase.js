import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app, auth, db;

const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);

try {
  if (missingKeys.length > 0) {
    console.error(
      `Firebase configuration incomplete. Missing: ${missingKeys.join(', ')}. ` +
      'Ensure all EXPO_PUBLIC_FIREBASE_* variables are set in your environment.'
    );
  } else {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export const isFirebaseReady = () => !!auth;

export { app, auth, db };