import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Trash2 } from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { getTextNoteById, createTextNote, updateTextNote, deleteTextNote } from '../data/textNotesData';

export default function TextNoteEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  
  const initialNoteId = route.params?.noteId || null;
  
  const [noteId, setNoteId] = useState(initialNoteId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Use refs to track the latest state for the unmount flush
  const titleRef = useRef('');
  const bodyRef = useRef('');
  const noteIdRef = useRef(initialNoteId);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    titleRef.current = title;
    bodyRef.current = body;
    noteIdRef.current = noteId;
  }, [title, body, noteId]);

  useEffect(() => {
    const loadNote = async () => {
      if (initialNoteId) {
        const note = await getTextNoteById(initialNoteId);
        if (note) {
          setTitle(note.title || '');
          setBody(note.body || '');
        }
      }
      setIsReady(true);
    };
    loadNote();
  }, [initialNoteId]);

  const saveNote = useCallback(async (currentTitle, currentBody, currentNoteId) => {
    // Skip saving if entirely empty and it's a new note
    if (!currentTitle.trim() && !currentBody.trim() && !currentNoteId) {
      return;
    }

    try {
      if (currentNoteId) {
        await updateTextNote(currentNoteId, { title: currentTitle, body: currentBody });
      } else {
        const newNote = await createTextNote({ title: currentTitle, body: currentBody });
        setNoteId(newNote.id);
        noteIdRef.current = newNote.id;
      }
    } catch (e) {
      console.error("Error autosaving note:", e);
    }
  }, []);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (isReady) {
        // Use refs to get the final state when unmounting
        saveNote(titleRef.current, bodyRef.current, noteIdRef.current);
      }
    };
  }, [isReady, saveNote]);

  // Handle input changes with debounce
  const handleTitleChange = (text) => {
    setTitle(text);
    debouncedSave(text, body);
  };

  const handleBodyChange = (text) => {
    setBody(text);
    debouncedSave(title, text);
  };

  const debouncedSave = (newTitle, newBody) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newTitle, newBody, noteIdRef.current);
    }, 800);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (noteId) {
              await deleteTextNote(noteId);
            }
            // Clear refs so the unmount flush doesn't resave it
            titleRef.current = '';
            bodyRef.current = '';
            noteIdRef.current = null;
            navigation.goBack();
          }
        }
      ]
    );
  };

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleDelete}
          >
            <Trash2 size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            placeholder="Note Title"
            placeholderTextColor={colors.mutedText || colors.subtext}
            value={title}
            onChangeText={handleTitleChange}
            multiline
          />
          
          <TextInput
            style={[styles.bodyInput, { color: colors.text }]}
            placeholder="Type your notes here..."
            placeholderTextColor={colors.mutedText || colors.subtext}
            value={body}
            onChangeText={handleBodyChange}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '6%',
    paddingTop: 16,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: '6%',
    paddingBottom: 40,
  },
  titleInput: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 16,
  },
  bodyInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 300,
  }
});
