import React, { useState, useCallback, memo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { createSubject, deleteSubject, loadSubjectsWithNoteCounts, renameSubject } from '../data/subjectsData';

const SubjectItem = memo(({ item, colors, notesCount, onPress, onLongPress }) => (
  <TouchableOpacity
    style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    onPress={() => onPress(item)}
    onLongPress={() => onLongPress(item)}
    activeOpacity={0.7}
  >
    <View style={[styles.subjectIcon, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Ionicons name={item.isSystem ? "archive-outline" : "folder-open"} size={24} color={colors.subtext} />
    </View>
    <View style={styles.subjectTextContainer}>
      <Text style={[styles.subjectTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.subjectStats, { color: colors.subtext }]}>
        {notesCount[item.id] || 0} Document{(notesCount[item.id] !== 1) ? 's' : ''}
      </Text>
    </View>
    <Feather name="chevron-right" size={20} color={colors.subtext} />
  </TouchableOpacity>
));

export default function NotesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Data States
  const [subjects, setSubjects] = useState([]);
  const [notesCount, setNotesCount] = useState({}); // To display how many notes are in each folder
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);

  // Interaction States
  const [subjectInputName, setSubjectInputName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      setSubjects([]);
      setNotesCount({});
      const data = await loadSubjectsWithNoteCounts();
      setSubjects(data.subjects);
      setNotesCount(data.notesCount);
    } catch (error) {
      console.error("Error loading notes data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!subjectInputName.trim()) return;

    try {
      const updatedSubjects = await createSubject(subjectInputName.trim());

      setSubjects(updatedSubjects);
      setSubjectInputName("");
      setIsCreateModalVisible(false);
    } catch (error) {
      console.error("Error creating subject:", error);
      Alert.alert("Error", "Could not create folder.");
    }
  };

  const handleLongPress = (subject) => {
    if (subject.isSystem) return;
    setSelectedSubject(subject);
    setIsOptionsModalVisible(true);
  };

  const openRenameModal = () => {
    setIsOptionsModalVisible(false);
    setSubjectInputName(selectedSubject.name); // Pre-fill with existing name
    // Slight delay to allow options modal to close smoothly before opening keyboard
    setTimeout(() => {
      setIsRenameModalVisible(true);
    }, 150);
  };

  const handleRenameSubject = async () => {
    if (!subjectInputName.trim() || !selectedSubject) return;

    try {
      const updatedSubjects = await renameSubject(selectedSubject.id, subjectInputName.trim());
      setSubjects(updatedSubjects);

      setIsRenameModalVisible(false);
      setSelectedSubject(null);
      setSubjectInputName("");
    } catch (error) {
      console.error("Error renaming subject:", error);
      Alert.alert("Error", "Could not rename the folder.");
    }
  };

  const handleDeleteSubject = () => {
    setIsOptionsModalVisible(false);

    Alert.alert(
      "Delete Folder",
      `Are you sure you want to delete "${selectedSubject.name}"? Any notes inside will be safely moved to "Uncategorized".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const data = await deleteSubject(selectedSubject.id);
              setSubjects(data.subjects);
              setNotesCount(data.notesCount);

              setSelectedSubject(null);
            } catch (error) {
              console.error("Error deleting subject:", error);
              Alert.alert("Error", "Could not delete folder.");
            }
          }
        }
      ]
    );
  };

  const handlePressSubject = useCallback((item) => {
    navigation.navigate("SubjectNotes", { subjectId: item.id, subjectName: item.name });
  }, [navigation]);

  const handleLongPressSubject = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    handleLongPress(item);
  }, [handleLongPress]);

  const renderSubjectItem = useCallback(({ item }) => (
    <SubjectItem 
      item={item}
      colors={colors}
      notesCount={notesCount}
      onPress={handlePressSubject}
      onLongPress={handleLongPressSubject}
    />
  ), [colors, notesCount, handlePressSubject, handleLongPressSubject]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsCreateModalVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="folder-plus" size={18} color={colors.buttonText} />
            <Text style={[styles.addBtnText, { color: colors.buttonText }]}>New Folder</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.mainTitle, { color: colors.text }]}>Your Subjects</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Tap to open. Press and hold to edit.</Text>

        {/* Subjects List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={subjects}
            renderItem={renderSubjectItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            getItemLayout={(data, index) => (
              { length: 80, offset: 80 * index, index } // Assuming approx 80px height
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="folder-open-outline" size={32} color={colors.subtext} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No folders yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                  Tap the "New Folder" button above to start organizing your study materials!
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Create Subject Modal */}
      <Modal visible={isCreateModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Subject Folder</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Physics 101"
              placeholderTextColor={colors.subtext}
              value={subjectInputName}
              onChangeText={setSubjectInputName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={[styles.modalCancelText, { color: colors.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateSubject} style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalSaveText, { color: colors.buttonText }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rename Subject Modal */}
      <Modal visible={isRenameModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Rename Folder</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter new name"
              placeholderTextColor={colors.subtext}
              value={subjectInputName}
              onChangeText={setSubjectInputName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => { setIsRenameModalVisible(false); setSubjectInputName(""); }}
                style={styles.modalCancelBtn}
              >
                <Text style={[styles.modalCancelText, { color: colors.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRenameSubject} style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalSaveText, { color: colors.buttonText }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Options Menu (Triggered by Long Press) */}
      <Modal visible={isOptionsModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setIsOptionsModalVisible(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.bg }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{selectedSubject?.name}</Text>

            <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: colors.border }]} onPress={openRenameModal}>
              <Feather name="edit-2" size={20} color={colors.text} />
              <Text style={[styles.sheetBtnText, { color: colors.text }]}>Rename Folder</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: colors.border }]} onPress={handleDeleteSubject}>
              <Feather name="trash-2" size={20} color={colors.danger} />
              <Text style={[styles.sheetBtnText, { color: colors.danger }]}>Delete Folder</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: "6%", paddingTop: "16%" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  addBtn: { flexDirection: 'row', paddingHorizontal: 20, height: 46, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontWeight: '700', fontSize: 15, marginLeft: 8 },

  mainTitle: { fontSize: 28, fontWeight: "700", marginTop: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },

  scrollArea: { flex: 1 },

  subjectCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  subjectIcon: { width: 50, height: 50, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  subjectTextContainer: { flex: 1, marginLeft: 16 },
  subjectTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  subjectStats: { fontSize: 13, fontWeight: '500' },

  // Input Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 24, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCancelBtn: { paddingVertical: 12, paddingHorizontal: 20, marginRight: 8 },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
  modalSaveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100 },
  modalSaveText: { fontSize: 16, fontWeight: '700' },

  // Bottom Sheet Modal
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  sheetBtnText: { fontSize: 16, fontWeight: '600', marginLeft: 16 },
  
  // Empty State
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
});
