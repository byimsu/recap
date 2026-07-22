import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedKey } from '../storage/userStorage';
import { createId } from '../utils/createId';

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
  return updated;
}

export async function deleteDeadline(deadlineId) {
  const deadlinesKey = await getScopedKey(BASE_DEADLINES_KEY);
  const existing = await getAllDeadlines();
  const updated = existing.filter((d) => d.id !== deadlineId);
  await AsyncStorage.setItem(deadlinesKey, JSON.stringify(updated));
  return updated;
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString + 'T00:00:00');
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  return `in ${diffDays} days`;
}
