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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { openNote, confirmDeleteNote, renameNote, getAllNotes, saveNote, moveNoteToSubject } from '../data/notesData';
import { getAllSubjects } from '../data/subjectsData';
import { useTheme } from '../context/ThemeContext';

export default function SubjectNotesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { subjectId, subjectName } = route.params;

  const [notes, setNotes] = useState([]);

  // --- Note Options Modal States ---
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  // --- Rename Modal States ---
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNoteName, setNewNoteName] = useState("");

  // --- Move Modal States ---
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);
  const [movingNote, setMovingNote] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadSubjectNotes();
    }, [subjectId])
  );

  const isUncategorized = !subjectId || subjectId === 'uncategorized';

  const filterNotes = (notesList) => {
    return notesList.filter((n) =>
      isUncategorized ? !n.subjectId || n.subjectId === 'uncategorized' : n.subjectId === subjectId
    );
  };

  const loadSubjectNotes = async () => {
    try {
      const allNotes = await getAllNotes();
      setNotes(filterNotes(allNotes));
    } catch (error) {
      console.error("Error loading notes for subject:", error);
    }
  };

  const handleUploadNote = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedFile = result.assets[0];
        const safeFileName = pickedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const uniqueFileName = `${Date.now()}_${safeFileName}`;
        const permanentUri = FileSystem.documentDirectory + uniqueFileName;

        await FileSystem.copyAsync({
          from: pickedFile.uri,
          to: permanentUri,
        });

        const targetSubjectId = isUncategorized ? null : subjectId;

        const newNote = {
          id: Date.now().toString(),
          name: pickedFile.name,
          uri: permanentUri,
          mimeType: pickedFile.mimeType,
          subjectId: targetSubjectId,
          createdAt: new Date().toISOString(),
        };

        const updatedNotes = await saveNote(newNote);
        setNotes(filterNotes(updatedNotes));
      }
    } catch (error) {
      console.error("Error uploading note in subject:", error);
      Alert.alert("Upload Error", "Could not upload file to this folder.");
    }
  };

  const handleLongPressNote = (note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedNote(note);
    setIsOptionsModalVisible(true);
  };

  const handleDeleteNote = (noteId) => {
    confirmDeleteNote(noteId, (updatedNotes) => {
      setNotes(filterNotes(updatedNotes));
    });
  };

  // --- Move Note Logic ---
  const openMoveModal = async (note) => {
    setMovingNote(note);
    try {
      const subs = await getAllSubjects();
      setAvailableSubjects(subs);
    } catch (e) {
      console.error("Error loading subjects for move:", e);
    }
    setIsMoveModalVisible(true);
  };

  const handleMoveNote = async (targetSubjectId, targetSubjectName) => {
    if (!movingNote) return;

    try {
      const updatedNotes = await moveNoteToSubject(movingNote.id, targetSubjectId);
      setNotes(filterNotes(updatedNotes));
      setIsMoveModalVisible(false);
      setMovingNote(null);
      Alert.alert("Note Moved", `"${movingNote.name}" moved to ${targetSubjectName}!`);
    } catch (error) {
      console.error("Error moving note:", error);
      Alert.alert("Error", "Could not move the note to selected folder.");
    }
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
      setNotes(filterNotes(updatedNotes));
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

          <TouchableOpacity
            onPress={handleUploadNote}
            style={[styles.uploadButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="upload-cloud" size={16} color={colors.buttonText} />
            <Text style={[styles.uploadBtnText, { color: colors.buttonText }]}>Upload File</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{subjectName}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{notes.length} document(s) • Hold to edit/move/delete</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
          {notes.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={32} color={colors.subtext} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                Upload files from the Home screen or tap "Upload File" above to add study materials here.
              </Text>
            </View>
          ) : (
            notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={[styles.noteRow, { borderBottomColor: colors.border }]}
                onPress={() => openNote(note.uri)}
                onLongPress={() => handleLongPressNote(note)}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text" size={24} color={colors.subtext} />
                <View style={styles.noteInfo}>
                  <Text style={[styles.noteName, { color: colors.text }]} numberOfLines={1}>{note.name}</Text>
                  <Text style={[styles.noteDate, { color: colors.subtext }]}>{new Date(note.createdAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleLongPressNote(note)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 6 }}
                >
                  <Feather name="more-vertical" size={18} color={colors.subtext} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* --- NOTE OPTIONS MODAL (HOLD & PRESS) --- */}
        <Modal visible={isOptionsModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedNote?.name}
              </Text>
              <Text style={[styles.modalSubHeader, { color: colors.subtext }]}>
                Choose an action for this document
              </Text>

              <TouchableOpacity
                style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setIsOptionsModalVisible(false);
                  if (selectedNote) openMoveModal(selectedNote);
                }}
              >
                <Ionicons name="folder-outline" size={20} color={colors.text} />
                <Text style={[styles.optionRowText, { color: colors.text }]}>Move to Folder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setIsOptionsModalVisible(false);
                  if (selectedNote) openRenameModal(selectedNote);
                }}
              >
                <Feather name="edit-2" size={20} color={colors.text} />
                <Text style={[styles.optionRowText, { color: colors.text }]}>Rename Document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setIsOptionsModalVisible(false);
                  if (selectedNote) handleDeleteNote(selectedNote.id);
                }}
              >
                <Feather name="trash-2" size={20} color={colors.danger} />
                <Text style={[styles.optionRowText, { color: colors.danger }]}>Move to Trash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsOptionsModalVisible(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.button }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.buttonText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- MOVE MODAL --- */}
        <Modal visible={isMoveModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Move Note</Text>
              <Text style={[styles.modalSubHeader, { color: colors.subtext }]}>
                Select a folder for "{movingNote?.name}"
              </Text>

              <ScrollView style={styles.moveSubjectList} showsVerticalScrollIndicator={false}>
                {availableSubjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={[styles.subjectItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleMoveNote(subject.id, subject.name)}
                  >
                    <Ionicons name="folder-outline" size={18} color={colors.text} />
                    <Text style={[styles.subjectItemText, { color: colors.text }]}>{subject.name}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.subjectItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleMoveNote(null, 'Uncategorized')}
                >
                  <Ionicons name="archive-outline" size={18} color={colors.subtext} />
                  <Text style={[styles.subjectItemText, { color: colors.subtext }]}>Uncategorized</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setIsMoveModalVisible(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.button }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.buttonText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  uploadBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    marginLeft: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: "700", marginTop: 24, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },

  noteRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 12 },
  noteItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  noteInfo: { marginLeft: 16, flex: 1, paddingRight: 10 },
  noteName: { fontSize: 15, fontWeight: '500' },
  noteDate: { fontSize: 12, marginTop: 4 },

  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 8, marginLeft: 4 },

  emptyContainer: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

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
  saveBtnText: { fontSize: 16, fontWeight: 'bold' },

  // Move & Options Modal Styles
  modalCard: {
    width: '100%',
    borderRadius: 22,
    padding: 22,
  },
  modalHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  modalSubHeader: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionRowText: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },
  moveSubjectList: {
    maxHeight: 240,
    marginBottom: 8,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  subjectItemText: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },
  modalCancelBtn: {
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCancelBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
