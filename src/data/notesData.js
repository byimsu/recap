import { open } from 'react-native-file-viewer-turbo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getScopedKey } from '../storage/userStorage';
import { getAllSubjects } from './subjectsData';

const BASE_NOTES_KEY = '@study_notes';
const BASE_TRASH_KEY = '@study_trash';

export async function openNote(uri) {
  if (!uri) {
    Alert.alert("Error", "File path is missing.");
    return;
  }
  try {
    await open(uri);
  } catch (error) {
    console.error("Error opening file:", error);
    Alert.alert("Error", "Could not open the file. Make sure you have a PDF viewer installed.");
  }
}

export async function getAllNotes() {
  try {
    const notesKey = await getScopedKey(BASE_NOTES_KEY);
    const storedNotes = await AsyncStorage.getItem(notesKey);
    const parsed = storedNotes ? JSON.parse(storedNotes) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error getting all notes:", error);
    return [];
  }
}

export async function saveNote(note) {
  try {
    const notesKey = await getScopedKey(BASE_NOTES_KEY);
    const existingNotes = await getAllNotes();
    const updatedNotes = [note, ...existingNotes];
    await AsyncStorage.setItem(notesKey, JSON.stringify(updatedNotes));
    return updatedNotes;
  } catch (error) {
    console.error("Error saving note:", error);
    throw error;
  }
}

export async function renameNote(noteId, newName) {
  try {
    const notesKey = await getScopedKey(BASE_NOTES_KEY);
    const allNotes = await getAllNotes();
    const updatedNotes = allNotes.map((n) =>
      n.id === noteId ? { ...n, name: newName } : n
    );
    await AsyncStorage.setItem(notesKey, JSON.stringify(updatedNotes));
    return updatedNotes;
  } catch (error) {
    console.error("Error renaming note:", error);
    throw error;
  }
}

export async function deleteNote(noteId) {
  try {
    const notesKey = await getScopedKey(BASE_NOTES_KEY);
    const trashKey = await getScopedKey(BASE_TRASH_KEY);

    const allNotes = await getAllNotes();
    const noteToTrash = allNotes.find((n) => n.id === noteId);
    const updatedNotes = allNotes.filter((n) => n.id !== noteId);

    if (noteToTrash) {
      noteToTrash.deletedAt = new Date().toISOString();
      const trashNotes = await getTrashNotes();
      await AsyncStorage.setItem(trashKey, JSON.stringify([noteToTrash, ...trashNotes]));
    }

    await AsyncStorage.setItem(notesKey, JSON.stringify(updatedNotes));
    return updatedNotes;
  } catch (error) {
    console.error("Error moving note to trash:", error);
    Alert.alert("Error", "Could not move the note to trash.");
    return null;
  }
}

export function confirmDeleteNote(noteId, onDeleted) {
  Alert.alert(
    "Move to Trash",
    "This note will be moved to the trash. You can restore it within 30 days.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Move to Trash",
        style: "destructive",
        onPress: async () => {
          const updatedNotes = await deleteNote(noteId);
          if (updatedNotes && onDeleted) {
            onDeleted(updatedNotes);
          }
        },
      },
    ]
  );
}

export async function getTrashNotes() {
  try {
    const trashKey = await getScopedKey(BASE_TRASH_KEY);
    const storedTrash = await AsyncStorage.getItem(trashKey);
    const parsed = storedTrash ? JSON.parse(storedTrash) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error getting trash notes:", error);
    return [];
  }
}

export async function loadAndCleanTrash() {
  try {
    const trashKey = await getScopedKey(BASE_TRASH_KEY);
    const parsedTrash = await getTrashNotes();
    const now = new Date();
    const validTrash = [];
    let hasExpiredItems = false;

    for (let note of parsedTrash) {
      const daysInTrash = Math.floor((now - new Date(note.deletedAt)) / (1000 * 60 * 60 * 24));
      if (daysInTrash >= 30) {
        hasExpiredItems = true;
        try {
          await FileSystem.deleteAsync(note.uri, { idempotent: true });
        } catch (fileErr) {
          console.log("File already removed from device:", note.uri);
        }
      } else {
        validTrash.push(note);
      }
    }

    if (hasExpiredItems) {
      await AsyncStorage.setItem(trashKey, JSON.stringify(validTrash));
    }
    return validTrash;
  } catch (error) {
    console.error("Error loading trash:", error);
    return [];
  }
}

export async function restoreNote(noteToRestore, currentTrashedNotes = []) {
  try {
    const notesKey = await getScopedKey(BASE_NOTES_KEY);
    const trashKey = await getScopedKey(BASE_TRASH_KEY);
    const allSubjects = await getAllSubjects();

    const subjectStillExists = allSubjects.some((s) => s.id === noteToRestore.subjectId);
    const restoredNote = { ...noteToRestore };
    delete restoredNote.deletedAt;

    if (!subjectStillExists) {
      restoredNote.subjectId = null;
    }

    const allNotes = await getAllNotes();
    await AsyncStorage.setItem(notesKey, JSON.stringify([restoredNote, ...allNotes]));

    const updatedTrash = currentTrashedNotes.filter((n) => n.id !== noteToRestore.id);
    await AsyncStorage.setItem(trashKey, JSON.stringify(updatedTrash));
    return { restoredNote, updatedTrash };
  } catch (error) {
    console.error("Error restoring note:", error);
    throw error;
  }
}

export async function deleteNotePermanently(noteId, noteUri, currentTrashedNotes = []) {
  try {
    try {
      await FileSystem.deleteAsync(noteUri, { idempotent: true });
    } catch (fileErr) {
      console.log("File already gone:", fileErr);
    }
    const trashKey = await getScopedKey(BASE_TRASH_KEY);
    const updatedTrash = currentTrashedNotes.filter((n) => n.id !== noteId);
    await AsyncStorage.setItem(trashKey, JSON.stringify(updatedTrash));
    return updatedTrash;
  } catch (error) {
    console.error("Error deleting permanently:", error);
    throw error;
  }
}

export async function emptyTrash(trashedNotes = []) {
  try {
    for (let note of trashedNotes) {
      try {
        await FileSystem.deleteAsync(note.uri, { idempotent: true });
      } catch (e) {
        console.log("Skipped missing file");
      }
    }
    const trashKey = await getScopedKey(BASE_TRASH_KEY);
    await AsyncStorage.setItem(trashKey, JSON.stringify([]));
    return [];
  } catch (error) {
    console.error("Error emptying trash:", error);
    throw error;
  }
}

export async function clearAllNotesToTrash() {
  try {
    const notesKey = await getScopedKey(BASE_NOTES_KEY);
    const trashKey = await getScopedKey(BASE_TRASH_KEY);
    const notes = await getAllNotes();
    if (notes.length > 0) {
      const existingTrash = await getTrashNotes();
      const trashedNotes = notes.map((note) => ({
        ...note,
        deletedAt: new Date().toISOString(),
      }));
      await AsyncStorage.setItem(trashKey, JSON.stringify([...trashedNotes, ...existingTrash]));
    }
    await AsyncStorage.setItem(notesKey, JSON.stringify([]));
    return notes.length;
  } catch (error) {
    console.error("Error clearing all notes to trash:", error);
    throw error;
  }
}

export async function clearAllNotesAndTrash() {
  try {
    const notesKey = await getScopedKey(BASE_NOTES_KEY);
    const trashKey = await getScopedKey(BASE_TRASH_KEY);
    const storedNotes = await getAllNotes();
    const storedTrash = await getTrashNotes();

    for (let note of [...storedNotes, ...storedTrash]) {
      if (note.uri) {
        try {
          await FileSystem.deleteAsync(note.uri, { idempotent: true });
        } catch (e) {
          console.log("File already deleted or unreadable");
        }
      }
    }

    await AsyncStorage.setItem(notesKey, JSON.stringify([]));
    await AsyncStorage.setItem(trashKey, JSON.stringify([]));
  } catch (error) {
    console.error("Error clearing all notes:", error);
    throw error;
  }
}
