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

const BASE_TEXT_NOTES_KEY = '@text_notes';

const parseArray = (value) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

async function syncTextNoteToFirebase(note) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  
  if (!user || isGuest || !db) {
    return;
  }

  const noteRef = doc(db, 'users', user.uid, 'textNotes', note.id);

  try {
    await setDoc(noteRef, note, { merge: true });
  } catch (err) {
    console.error('Error writing text note to Firebase:', err);
    throw err;
  }
}

async function deleteTextNoteFromFirebase(noteId) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return;

  const noteRef = doc(db, 'users', user.uid, 'textNotes', noteId);
  await deleteDoc(noteRef);
}

const SYNC_THROTTLE_MS = 30000;
let _lastTextNotesSyncAt = 0;

export async function syncTextNotesFromFirebase({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - _lastTextNotesSyncAt < SYNC_THROTTLE_MS) return null;

  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return null;

  _lastTextNotesSyncAt = now;

  try {
    const notesCol = collection(db, 'users', user.uid, 'textNotes');
    const snap = await getDocs(notesCol);
    const remoteNotes = snap.docs.map((d) => d.data());

    const localNotes = await getAllTextNotes();
    const notesById = new Map();

    // Map local notes
    localNotes.forEach(note => notesById.set(note.id, note));

    // Merge remote notes, using updatedAt for conflict resolution
    remoteNotes.forEach(remote => {
      const local = notesById.get(remote.id);
      if (local) {
        const localDate = new Date(local.updatedAt || local.createdAt).getTime();
        const remoteDate = new Date(remote.updatedAt || remote.createdAt).getTime();
        if (remoteDate >= localDate) {
          notesById.set(remote.id, remote);
        }
      } else {
        notesById.set(remote.id, remote);
      }
    });

    const merged = Array.from(notesById.values());
    const notesKey = await getScopedKey(BASE_TEXT_NOTES_KEY);
    await AsyncStorage.setItem(notesKey, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Error syncing text notes from Firebase:', e);
    return null;
  }
}

export async function getAllTextNotes() {
  try {
    const notesKey = await getScopedKey(BASE_TEXT_NOTES_KEY);
    const stored = await AsyncStorage.getItem(notesKey);
    return parseArray(stored);
  } catch (e) {
    console.error("Error reading text notes:", e);
    return [];
  }
}

export async function getTextNoteById(noteId) {
  const allNotes = await getAllTextNotes();
  return allNotes.find((n) => n.id === noteId) || null;
}

export async function createTextNote({ title, body, subjectId = null }) {
  const notesKey = await getScopedKey(BASE_TEXT_NOTES_KEY);
  const existing = await getAllTextNotes();
  
  const now = new Date().toISOString();
  const newNote = {
    id: createId(),
    title: title || '',
    body: body || '',
    subjectId,
    createdAt: now,
    updatedAt: now,
  };
  
  const updated = [newNote, ...existing];
  await AsyncStorage.setItem(notesKey, JSON.stringify(updated));

  syncTextNoteToFirebase(newNote).catch((e) =>
    console.error('Error syncing created text note to Firebase:', e)
  );

  return newNote;
}

export async function updateTextNote(noteId, updates) {
  const notesKey = await getScopedKey(BASE_TEXT_NOTES_KEY);
  const existing = await getAllTextNotes();
  
  let updatedNote = null;
  const updated = existing.map((n) => {
    if (n.id === noteId) {
      updatedNote = { ...n, ...updates, updatedAt: new Date().toISOString() };
      return updatedNote;
    }
    return n;
  });

  if (updatedNote) {
    await AsyncStorage.setItem(notesKey, JSON.stringify(updated));
    syncTextNoteToFirebase(updatedNote).catch((e) =>
      console.error('Error syncing updated text note to Firebase:', e)
    );
  }

  return updatedNote;
}

export async function deleteTextNote(noteId) {
  const notesKey = await getScopedKey(BASE_TEXT_NOTES_KEY);
  const existing = await getAllTextNotes();
  const updated = existing.filter((n) => n.id !== noteId);
  await AsyncStorage.setItem(notesKey, JSON.stringify(updated));

  deleteTextNoteFromFirebase(noteId).catch((e) =>
    console.error('Error deleting text note from Firebase:', e)
  );

  return updated;
}
