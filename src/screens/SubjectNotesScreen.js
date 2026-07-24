import React, { useState, useCallback, memo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { ArrowLeft, FileText, Folder, Archive, UploadCloud, MoreVertical, Pen, Trash2 } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { openNote, confirmDeleteNote, renameNote, getAllNotes, saveNote, moveNoteToSubject } from '../data/notesData';
import { getAllSubjects } from '../data/subjectsData';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const NoteItem = memo(({ note, colors, onOpen, onLongPress }) => {
  const handleOpen = useCallback(() => onOpen(note.uri), [note.uri, onOpen]);
  const handleLong = useCallback(() => onLongPress(note), [note, onLongPress]);

  return (
    <TouchableOpacity
      style={[styles.noteRow, { borderBottomColor: colors.border }]}
      onPress={handleOpen}
      onLongPress={handleLong}
      activeOpacity={0.7}
    >
      <View style={[styles.noteIconBadge, { backgroundColor: colors.accentSoft }]}>
        <FileText size={16} color={colors.accent} />
      </View>
      <View style={styles.noteInfo}>
        <Text style={[styles.noteName, { color: colors.text }]} numberOfLines={1}>{note.name}</Text>
        <Text style={[styles.noteDate, { color: colors.subtext }]}>{new Date(note.createdAt).toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity
        onPress={handleLong}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ padding: 6 }}
      >
        <MoreVertical size={17} color={colors.subtext} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function SubjectNotesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { subjectId, subjectName } = route.params;

  const [notes, setNotes] = useState([]);

  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNoteName, setNewNoteName] = useState("");

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

  const openRenameModal = (note) => {
    setEditingNote(note);
    setNewNoteName(note.name);
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
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg, flex: 1 }}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />
      <View style={{ flex: 1, paddingHorizontal: "6%", paddingTop: 16, paddingBottom: "10%" }}>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          {notes.length > 0 && (
            <TouchableOpacity
              onPress={handleUploadNote}
              style={[styles.uploadButton, { backgroundColor: colors.accent }]}
              activeOpacity={0.8}
            >
              <UploadCloud size={15} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Upload File</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{subjectName}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{notes.length} document{notes.length !== 1 ? 's' : ''} • Hold to manage</Text>

        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={{ marginTop: 10 }}
          renderItem={({ item }) => (
            <NoteItem
              note={item}
              colors={colors}
              onOpen={openNote}
              onLongPress={handleLongPressNote}
            />
          )}
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FileText size={30} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                Upload your first study material to get started.
              </Text>
              <TouchableOpacity
                onPress={handleUploadNote}
                style={[styles.emptyCta, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.emptyCtaText}>Upload File</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Note Options Modal */}
        <Modal visible={isOptionsModalVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setIsOptionsModalVisible(false)}>
            <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedNote?.name}
              </Text>

              <TouchableOpacity
                style={[styles.sheetBtn, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setIsOptionsModalVisible(false);
                  if (selectedNote) openMoveModal(selectedNote);
                }}
              >
                <Folder size={18} color={colors.text} />
                <Text style={[styles.sheetBtnText, { color: colors.text }]}>Move to Folder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetBtn, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setIsOptionsModalVisible(false);
                  if (selectedNote) openRenameModal(selectedNote);
                }}
              >
                <Pen size={18} color={colors.text} />
                <Text style={[styles.sheetBtnText, { color: colors.text }]}>Rename Document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetBtn, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setIsOptionsModalVisible(false);
                  if (selectedNote) handleDeleteNote(selectedNote.id);
                }}
              >
                <Trash2 size={18} color={colors.danger} />
                <Text style={[styles.sheetBtnText, { color: colors.danger }]}>Move to Trash</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Move Modal */}
        <Modal visible={isMoveModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                    <Folder size={17} color={colors.subtext} />
                    <Text style={[styles.subjectItemText, { color: colors.text }]}>{subject.name}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.subjectItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleMoveNote(null, 'Uncategorized')}
                >
                  <Archive size={17} color={colors.subtext} />
                  <Text style={[styles.subjectItemText, { color: colors.subtext }]}>Uncategorized</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setIsMoveModalVisible(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.subtext }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Rename Modal */}
        <Modal visible={isRenameModalVisible} transparent animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Rename Note</Text>
              <TextInput
                value={newNoteName}
                onChangeText={setNewNoteName}
                style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setIsRenameModalVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.subtext }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRenameNote} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  uploadBtnText: { fontSize: 13.5, fontWeight: '700', marginLeft: 8, color: '#FFFFFF' },
  headerTitle: { fontSize: 30, fontWeight: "700", marginTop: 28, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13.5, marginTop: 6, marginBottom: 20 },

  noteRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 14 },
  noteIconBadge: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  noteInfo: { marginLeft: 14, flex: 1, paddingRight: 10 },
  noteName: { fontSize: 14.5, fontWeight: '500' },
  noteDate: { fontSize: 12, marginTop: 3 },

  emptyContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 14 },
  emptySubtitle: { fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 },
  emptyCta: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  emptyCtaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 20 },
  modalCard: { width: '100%', borderRadius: 12, padding: 22, borderWidth: 1 },
  modalHeaderTitle: { fontSize: 17, fontWeight: '700' },
  modalSubHeader: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  moveSubjectList: { maxHeight: 240, marginBottom: 8 },
  subjectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  subjectItemText: { fontSize: 15, marginLeft: 12, fontWeight: '500' },
  modalCancelBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 14, borderWidth: 1 },
  modalCancelBtnText: { fontWeight: '600', fontSize: 14 },

  input: { borderWidth: 1, padding: 13, marginBottom: 20, borderRadius: 10, fontSize: 15, marginTop: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 18, marginRight: 8 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 10 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  sheetBtnText: { fontSize: 15, fontWeight: '600', marginLeft: 14 },
});
