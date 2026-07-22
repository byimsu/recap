import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { openNote, confirmDeleteNote, renameNote, getAllNotes } from '../data/notesData';
import { useTheme } from '../context/ThemeContext';

export default function SubjectNotesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { subjectId, subjectName } = route.params;

  const [notes, setNotes] = useState([]);

  // --- Rename Modal States ---
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNoteName, setNewNoteName] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadSubjectNotes();
    }, [subjectId])
  );

  const loadSubjectNotes = async () => {
    try {
      const allNotes = await getAllNotes();
      setNotes(allNotes.filter(n => n.subjectId === subjectId));
    } catch (error) {
      console.error("Error loading notes for subject:", error);
    }
  };

  const handleDeleteNote = (noteId) => {
    confirmDeleteNote(noteId, (updatedNotes) => {
      setNotes(updatedNotes.filter((n) => n.subjectId === subjectId));
    });
  };

  // --- Rename Logic ---
  const openRenameModal = (note) => {
    setEditingNote(note);
    setNewNoteName(note.name); // Pre-fill with the current name
    setIsRenameModalVisible(true);
  };

  const handleRenameNote = async () => {
    if (!newNoteName.trim()) {
      Alert.alert("Missing Name", "The note name cannot be empty.");
      return;
    }

    try {
      const updatedNotes = await renameNote(editingNote.id, newNoteName.trim());
      setNotes(updatedNotes.filter((n) => n.subjectId === subjectId));
      setIsRenameModalVisible(false);
      setEditingNote(null);
    } catch (error) {
      console.error("Error renaming note:", error);
      Alert.alert("Error", "Could not rename the note.");
    }
  };

  return (
    <View style={{ backgroundColor: colors.bg, flex: 1 }}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />
      <View style={{ flex: 1, paddingHorizontal: "6%", paddingTop: "16%", paddingBottom: "10%" }}>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ width: 46 }} />
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{subjectName}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{notes.length} saved document(s)</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
          {notes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtext }]}>No notes in this subject yet. Upload from the Home screen.</Text>
          ) : (
            notes.map((note) => (
              <View key={note.id} style={[styles.noteRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.noteItem}
                  onPress={() => openNote(note.uri)}
                >
                  <Ionicons name="document-text" size={24} color={colors.subtext} />
                  <View style={styles.noteInfo}>
                    <Text style={[styles.noteName, { color: colors.text }]} numberOfLines={1}>{note.name}</Text>
                    <Text style={[styles.noteDate, { color: colors.subtext }]}>{new Date(note.createdAt).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>

                {/* Actions: Edit & Delete (Move to Trash) */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openRenameModal(note)}
                  >
                    <Feather name="edit-2" size={18} color={colors.subtext} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteNote(note.id)}
                  >
                    <Feather name="trash-2" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* --- RENAME MODAL --- */}
        <Modal visible={isRenameModalVisible} transparent animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
              <Text style={[styles.modalHeader, { color: colors.text }]}>Rename Note</Text>

              <Text style={[styles.label, { color: colors.text }]}>Note Name</Text>
              <TextInput
                value={newNoteName}
                onChangeText={setNewNoteName}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                autoFocus
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setIsRenameModalVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.subtext }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRenameNote} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.saveBtnText, { color: colors.buttonText }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 28, fontWeight: "700", marginTop: 24, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },

  noteRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 12 },
  noteItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  noteInfo: { marginLeft: 16, flex: 1, paddingRight: 10 },
  noteName: { fontSize: 15, fontWeight: '500' },
  noteDate: { fontSize: 12, marginTop: 4 },

  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 8, marginLeft: 4 },

  emptyText: { fontSize: 14 },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { padding: 24, borderRadius: 16 },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, padding: 12, marginBottom: 24, borderRadius: 8, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, marginRight: 10 },
  cancelBtnText: { fontSize: 16, fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { fontSize: 16, fontWeight: 'bold' }
});
