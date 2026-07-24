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
import { Archive, FolderOpen, ArrowLeft, ChevronRight, FolderPlus, Pen, Trash2 } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createSubject, deleteSubject, loadSubjectsWithNoteCounts, renameSubject } from '../data/subjectsData';

const SubjectItem = memo(({ item, colors, notesCount, onPress, onLongPress }) => (
  <TouchableOpacity
    style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    onPress={() => onPress(item)}
    onLongPress={() => onLongPress(item)}
    activeOpacity={0.7}
  >
    <View style={[styles.subjectIcon, { backgroundColor: colors.accentSoft }]}>
      {item.isSystem ? (
        <Archive size={20} color={colors.accent} />
      ) : (
        <FolderOpen size={20} color={colors.accent} />
      )}
    </View>
    <View style={styles.subjectTextContainer}>
      <Text style={[styles.subjectTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.subjectStats, { color: colors.subtext }]}>
        {notesCount[item.id] || 0} Document{(notesCount[item.id] !== 1) ? 's' : ''}
      </Text>
    </View>
    <ChevronRight size={17} color={colors.subtext} />
  </TouchableOpacity>
));

export default function NotesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [subjects, setSubjects] = useState([]);
  const [notesCount, setNotesCount] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);

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

  const handleLongPress = useCallback((subject) => {
    if (subject.isSystem) return;
    setSelectedSubject(subject);
    setIsOptionsModalVisible(true);
  }, []);

  const openRenameModal = () => {
    setIsOptionsModalVisible(false);
    setSubjectInputName(selectedSubject.name);
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
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          {subjects.length > 0 && (
            <TouchableOpacity onPress={() => setIsCreateModalVisible(true)} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
              <FolderPlus size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>New Folder</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.mainTitle, { color: colors.text }]}>Your Subjects</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Tap to open. Press and hold to rename or delete.</Text>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={subjects}
            renderItem={renderSubjectItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            getItemLayout={(data, index) => (
              { length: 84, offset: 84 * index, index }
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FolderOpen size={30} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                  Create your first subject folder to start organizing study materials.
                </Text>
                <TouchableOpacity
                  onPress={() => setIsCreateModalVisible(true)}
                  style={[styles.emptyCta, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.emptyCtaText}>New Folder</Text>
                </TouchableOpacity>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Subject Folder</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
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
              <TouchableOpacity onPress={handleCreateSubject} style={[styles.modalSaveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.modalSaveText}>Create</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Rename Folder</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
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
              <TouchableOpacity onPress={handleRenameSubject} style={[styles.modalSaveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Options Menu (Long Press) */}
      <Modal visible={isOptionsModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setIsOptionsModalVisible(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{selectedSubject?.name}</Text>

            <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: colors.border }]} onPress={openRenameModal}>
              <Pen size={18} color={colors.text} />
              <Text style={[styles.sheetBtnText, { color: colors.text }]}>Rename Folder</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetBtn, { borderBottomColor: colors.border }]} onPress={handleDeleteSubject}>
              <Trash2 size={18} color={colors.danger} />
              <Text style={[styles.sheetBtnText, { color: colors.danger }]}>Delete Folder</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: "6%", paddingTop: 16 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBtn: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  addBtn: { flexDirection: 'row', paddingHorizontal: 18, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontWeight: '700', fontSize: 14, marginLeft: 8, color: '#FFFFFF' },

  mainTitle: { fontSize: 30, fontWeight: "700", marginTop: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, marginTop: 6, marginBottom: 24 },

  scrollArea: { flex: 1 },

  subjectCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  subjectIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  subjectTextContainer: { flex: 1, marginLeft: 14 },
  subjectTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  subjectStats: { fontSize: 12.5, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 24, borderRadius: 12, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCancelBtn: { paddingVertical: 11, paddingHorizontal: 18, marginRight: 8 },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalSaveBtn: { paddingVertical: 11, paddingHorizontal: 22, borderRadius: 10 },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  sheetBtnText: { fontSize: 15, fontWeight: '600', marginLeft: 14 },

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
});
