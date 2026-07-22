import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedKey } from '../storage/userStorage';
import { createId } from '../utils/createId';

const BASE_SUBJECTS_KEY = '@study_subjects';
const BASE_NOTES_KEY = '@study_notes';

const parseArray = (value) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export async function getAllSubjects() {
  try {
    const subjectsKey = await getScopedKey(BASE_SUBJECTS_KEY);
    const storedSubjects = await AsyncStorage.getItem(subjectsKey);
    return parseArray(storedSubjects);
  } catch (error) {
    console.error("Error getting subjects:", error);
    return [];
  }
}

export async function loadSubjectsWithNoteCounts() {
  const subjectsKey = await getScopedKey(BASE_SUBJECTS_KEY);
  const notesKey = await getScopedKey(BASE_NOTES_KEY);
  const [storedSubjects, storedNotes] = await Promise.all([
    AsyncStorage.getItem(subjectsKey),
    AsyncStorage.getItem(notesKey),
  ]);

  const subjects = parseArray(storedSubjects);
  const notesCount = parseArray(storedNotes).reduce((counts, note) => {
    if (note.subjectId) {
      counts[note.subjectId] = (counts[note.subjectId] || 0) + 1;
    }
    return counts;
  }, {});

  return { subjects, notesCount };
}

export async function createSubject(name) {
  const subjectsKey = await getScopedKey(BASE_SUBJECTS_KEY);
  const existingSubjects = parseArray(await AsyncStorage.getItem(subjectsKey));
  const subject = { id: createId(), name, createdAt: new Date().toISOString() };
  const subjects = [subject, ...existingSubjects];
  await AsyncStorage.setItem(subjectsKey, JSON.stringify(subjects));
  return subjects;
}

export async function renameSubject(subjectId, name) {
  const subjectsKey = await getScopedKey(BASE_SUBJECTS_KEY);
  const subjects = parseArray(await AsyncStorage.getItem(subjectsKey)).map((subject) =>
    subject.id === subjectId ? { ...subject, name } : subject
  );
  await AsyncStorage.setItem(subjectsKey, JSON.stringify(subjects));
  return subjects;
}

export async function deleteSubject(subjectId) {
  const subjectsKey = await getScopedKey(BASE_SUBJECTS_KEY);
  const notesKey = await getScopedKey(BASE_NOTES_KEY);
  const [storedSubjects, storedNotes] = await Promise.all([
    AsyncStorage.getItem(subjectsKey),
    AsyncStorage.getItem(notesKey),
  ]);

  const subjects = parseArray(storedSubjects).filter((subject) => subject.id !== subjectId);
  const notes = parseArray(storedNotes).map((note) =>
    note.subjectId === subjectId ? { ...note, subjectId: null } : note
  );

  await Promise.all([
    AsyncStorage.setItem(subjectsKey, JSON.stringify(subjects)),
    AsyncStorage.setItem(notesKey, JSON.stringify(notes)),
  ]);

  return { subjects, notesCount: notes.reduce((counts, note) => {
    if (note.subjectId) {
      counts[note.subjectId] = (counts[note.subjectId] || 0) + 1;
    }
    return counts;
  }, {}) };
}
