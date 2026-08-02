import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedKey } from '../storage/userStorage';
import { createId } from '../utils/createId';
import { auth, db } from '../api/firebase';
import { isLocalGuestActive } from '../storage/authStorage';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

const BASE_DEADLINES_KEY = '@study_deadlines';

export const DEADLINE_TYPES = {
  TEST: 'test',
  ASSIGNMENT: 'assignment',
  EXAM: 'exam',
};

export const DEADLINE_TYPE_META = {
  test: { label: 'Test', color: '#f29900' },
  assignment: { label: 'Assignment', color: '#1a73e8' },
  exam: { label: 'Exam', color: '#d93025' },
};

export async function getAllDeadlines() {
  try {
    const deadlinesKey = await getScopedKey(BASE_DEADLINES_KEY);
    const stored = await AsyncStorage.getItem(deadlinesKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (e) {
    console.error("Error reading deadlines:", e);
    return [];
  }
}

/**
 * deadline: { title, date: 'YYYY-MM-DD', type: 'test'|'assignment'|'exam', subjectId: string|null }
 */
export async function addDeadline(deadline) {
  const deadlinesKey = await getScopedKey(BASE_DEADLINES_KEY);
  const existing = await getAllDeadlines();
  const newDeadline = {
    id: createId(),
    createdAt: new Date().toISOString(),
    ...deadline,
  };
  const updated = [newDeadline, ...existing];
  await AsyncStorage.setItem(deadlinesKey, JSON.stringify(updated));

  // Sync to Firestore if logged in (not guest)
  syncDeadlineToFirebase(newDeadline).catch((e) =>
    console.error('Error syncing deadline to Firebase:', e)
  );

  return updated;
}

export async function deleteDeadline(deadlineId) {
  const deadlinesKey = await getScopedKey(BASE_DEADLINES_KEY);
  const existing = await getAllDeadlines();
  const updated = existing.filter((d) => d.id !== deadlineId);
  await AsyncStorage.setItem(deadlinesKey, JSON.stringify(updated));

  deleteDeadlineFromFirebase(deadlineId).catch((e) =>
    console.error('Error deleting synced deadline from Firebase:', e)
  );

  return updated;
}

/**
 * Writes a single deadline to Firestore at users/{uid}/deadlines/{id}.
 * No-ops silently for guests or when Firebase isn't configured.
 */
async function syncDeadlineToFirebase(deadline) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return;

  const deadlineRef = doc(db, 'users', user.uid, 'deadlines', deadline.id);
  await setDoc(deadlineRef, deadline, { merge: true });
}

async function deleteDeadlineFromFirebase(deadlineId) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return;

  const deadlineRef = doc(db, 'users', user.uid, 'deadlines', deadlineId);
  await deleteDoc(deadlineRef);
}

/**
 * One-time pull from Firestore into local storage, e.g. on login.
 * Merges by id — remote deadlines are added to whatever exists locally.
 */
const SYNC_THROTTLE_MS = 30000;
let _lastDeadlinesSyncAt = 0;

export async function syncDeadlinesFromFirebase({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - _lastDeadlinesSyncAt < SYNC_THROTTLE_MS) return null;

  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return null;

  _lastDeadlinesSyncAt = now;

  try {
    const deadlinesCol = collection(db, 'users', user.uid, 'deadlines');
    const snap = await getDocs(deadlinesCol);
    const remoteDeadlines = snap.docs.map((d) => d.data());

    const local = await getAllDeadlines();
    const byId = new Map(local.map((d) => [d.id, d]));
    remoteDeadlines.forEach((remote) => {
      const existing = byId.get(remote.id);
      if (existing) {
        const localDate = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const remoteDate = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
        if (remoteDate >= localDate) {
          byId.set(remote.id, remote);
        }
      } else {
        byId.set(remote.id, remote);
      }
    });

    const merged = Array.from(byId.values());
    const deadlinesKey = await getScopedKey(BASE_DEADLINES_KEY);
    await AsyncStorage.setItem(deadlinesKey, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Error syncing deadlines from Firebase:', e);
    return null;
  }
}

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deadlines from today onward, sorted soonest first. Used by both the
 * calendar screen's "upcoming" list and HomeScreen's summary card.
 */
export function upcomingDeadlines(deadlines, limit) {
  const today = todayDateString();
  const upcoming = deadlines
    .filter((d) => d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return typeof limit === 'number' ? upcoming.slice(0, limit) : upcoming;
}

export function deadlinesOnDate(deadlines, dateString) {
  return deadlines.filter((d) => d.date === dateString);
}

/**
 * Days-until label used in the HomeScreen summary card and the calendar's
 * upcoming list, e.g. "Today", "Tomorrow", "in 4 days".
 */
export function daysUntilLabel(dateString) {
  if (!dateString) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateString;

  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  return `in ${diffDays} days`;
}