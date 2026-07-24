import * as FileSystem from 'expo-file-system/legacy';
import React, { useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from 'expo-document-picker';
import { saveNote, getAllNotes, openNote } from '../data/notesData';
import { loadSubjectsWithNoteCounts, createSubject } from '../data/subjectsData';
import { getAllDeadlines, upcomingDeadlines, daysUntilLabel, DEADLINE_TYPE_META } from '../data/deadlinesData';
import { useTheme } from '../context/ThemeContext';

const RecentNoteItem = React.memo(({ note, subjectDisplay, colors, onPress }) => (
  <TouchableOpacity
    style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    onPress={() => onPress(note.uri)}
    activeOpacity={0.7}
  >
    <View style={[styles.recentIconBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Ionicons name="document-text" size={18} color={colors.text} />
    </View>

    <View style={styles.recentTextContainer}>
      <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
        {note.name}
      </Text>
      <Text style={[styles.recentMeta, { color: colors.subtext }]}>
        {subjectDisplay} • {new Date(note.createdAt).toLocaleDateString()}
      </Text>
    </View>

    <View style={[styles.recentOpenBadge, { backgroundColor: colors.bg }]}>
      <Feather name="external-link" size={14} color={colors.subtext} />
    </View>
  </TouchableOpacity>
));

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [subjects, setSubjects] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // --- Inline Subject Creation States ---
  const [isCreatingNewSubject, setIsCreatingNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const { subjects: loadedSubjects } = await loadSubjectsWithNoteCounts();
          setSubjects(loadedSubjects);

          const parsedNotes = await getAllNotes();
          const sortedNotes = parsedNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setRecentNotes(sortedNotes.slice(0, 5));

          const allDeadlines = await getAllDeadlines();
          setUpcoming(upcomingDeadlines(allDeadlines, 2));
        } catch (error) {
          console.error("Error loading data:", error);
        }
      };
      loadData();
    }, [])
  );

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
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
          to: permanentUri
        });

        setSelectedFile({ ...pickedFile, uri: permanentUri });
        setIsCreatingNewSubject(false);
        setNewSubjectName("");
        setIsModalVisible(true);
      }
    } catch (error) {
      console.error("Error picking/saving document:", error);
      Alert.alert("Upload Error", "Your device prevented the app from reading this file.");
    }
  };

  const saveNoteToSubject = async (subjectId) => {
    const newNote = {
      id: Date.now().toString(),
      name: selectedFile.name,
      uri: selectedFile.uri,
      mimeType: selectedFile.mimeType,
      subjectId: subjectId,
      createdAt: new Date().toISOString(),
    };

    try {
      const updatedNotes = await saveNote(newNote);
      const sortedNotes = updatedNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentNotes(sortedNotes.slice(0, 5));
      setIsModalVisible(false);
      setSelectedFile(null);
      setIsCreatingNewSubject(false);
      setNewSubjectName("");
    } catch (error) {
      console.error("Error saving note:", error);
      Alert.alert("Error", "Failed to save the note.");
    }
  };

  const handleCreateAndSaveSubject = async () => {
    if (!newSubjectName.trim()) {
      Alert.alert("Missing Name", "Please enter a subject folder name.");
      return;
    }
    try {
      const updatedSubjects = await createSubject(newSubjectName.trim());
      const newSubject = updatedSubjects[0];
      setSubjects(updatedSubjects);
      setNewSubjectName("");
      setIsCreatingNewSubject(false);

      await saveNoteToSubject(newSubject.id);
    } catch (error) {
      console.error("Error creating subject and saving note:", error);
      Alert.alert("Error", "Failed to create subject folder.");
    }
  };

  const handleOpenNote = React.useCallback((uri) => {
    openNote(uri);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Sleek Minimal Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={[styles.headerIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.brandPill}>
            <Text style={[styles.brandText, { color: colors.text }]}>Recap</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("UserProgress")}
            style={[styles.headerIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="stats-chart-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Minimal Greeting Header */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingSubtitle, { color: colors.subtext }]}>Welcome back</Text>
          <Text style={[styles.greetingTitle, { color: colors.text }]}>Ready to Study?</Text>
        </View>

        {/* Immersive Hero Upload Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroHeaderRow}>
            <View style={[styles.heroIconBadge, { backgroundColor: colors.button }]}>
              <Feather name="upload-cloud" size={22} color={colors.buttonText} />
            </View>
            <View style={[styles.formatTag, { borderColor: colors.border }]}>
              <Text style={[styles.formatTagText, { color: colors.subtext }]}>PDF • DOCX • TXT</Text>
            </View>
          </View>

          <Text style={[styles.heroTitle, { color: colors.text }]}>Import Study Notes</Text>
          <Text style={[styles.heroSubtext, { color: colors.subtext }]}>
            Upload documents to organize by subject & generate review cards.
          </Text>

          <TouchableOpacity
            onPress={handleUpload}
            style={[styles.heroPrimaryBtn, { backgroundColor: colors.button }]}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color={colors.buttonText} />
            <Text style={[styles.heroBtnText, { color: colors.buttonText }]}>Upload File</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Deadlines Widget */}
        {upcoming.length > 0 && (
          <TouchableOpacity
            style={[styles.deadlineWidget, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate("Deadlines")}
            activeOpacity={0.8}
          >
            <View style={styles.widgetHeader}>
              <View style={styles.widgetTitleRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
                <Text style={[styles.widgetTitle, { color: colors.text }]}>Upcoming Deadlines</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
            </View>

            {upcoming.map((d, index) => {
              const meta = DEADLINE_TYPE_META[d.type] || { color: colors.customFallback };
              return (
                <View
                  key={d.id}
                  style={[
                    styles.deadlineRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }
                  ]}
                >
                  <View style={[styles.deadlineDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.deadlineTitle, { color: colors.text }]} numberOfLines={1}>{d.title}</Text>
                  <Text style={[styles.deadlineBadge, { color: colors.subtext, backgroundColor: colors.bg }]}>
                    {daysUntilLabel(d.date)}
                  </Text>
                </View>
              );
            })}
          </TouchableOpacity>
        )}

        {/* Minimal Navigation Grid */}
        <View style={styles.gridSectionHeader}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Quick Access</Text>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity
            style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate("Notes")}
            activeOpacity={0.8}
          >
            <View style={styles.navCardTop}>
              <View style={[styles.navIconBadge, { backgroundColor: colors.button }]}>
                <Feather name="book-open" size={18} color={colors.buttonText} />
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.subtext} />
            </View>
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Notes</Text>
            <Text style={[styles.navCardSub, { color: colors.subtext }]}>Organized subjects</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate("Flashcards")}
            activeOpacity={0.8}
          >
            <View style={styles.navCardTop}>
              <View style={[styles.navIconBadge, { backgroundColor: colors.button }]}>
                <MaterialCommunityIcons name="cards-outline" size={20} color={colors.buttonText} />
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.subtext} />
            </View>
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Flashcards</Text>
            <Text style={[styles.navCardSub, { color: colors.subtext }]}>Spaced repetition</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Uploads Section */}
        <View style={styles.recentSectionHeader}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Recent Notes</Text>
          {recentNotes.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("Notes")}>
              <Text style={[styles.seeAllText, { color: colors.subtext }]}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentNotes.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={32} color={colors.subtext} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notes uploaded yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
              Tap the upload button above to add your first study material.
            </Text>
          </View>
        ) : (
          recentNotes.map((note) => {
            const subjectMatch = subjects.find(s => s.id === note.subjectId);
            const subjectDisplay = subjectMatch ? subjectMatch.name : "Uncategorized";

            return (
              <RecentNoteItem
                key={note.id}
                note={note}
                subjectDisplay={subjectDisplay}
                colors={colors}
                onPress={handleOpenNote}
              />
            );
          })
        )}
      </ScrollView>

      {/* Save Note Subject Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.bg }]}>
            {isCreatingNewSubject ? (
              <>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>New Subject Folder</Text>
                <Text style={[styles.modalSubHeader, { color: colors.subtext }]}>
                  Create a folder and save "{selectedFile?.name}" inside it.
                </Text>

                <TextInput
                  value={newSubjectName}
                  onChangeText={setNewSubjectName}
                  placeholder="Subject folder name (e.g. Physics)"
                  placeholderTextColor={colors.subtext}
                  style={[
                    styles.newSubjectInput,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
                  ]}
                  autoFocus
                />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsCreatingNewSubject(false);
                      setNewSubjectName("");
                    }}
                    style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.modalSecondaryBtnText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCreateAndSaveSubject}
                    style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.modalPrimaryBtnText, { color: colors.buttonText }]}>Create & Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Save Note</Text>
                <Text style={[styles.modalSubHeader, { color: colors.subtext }]}>
                  Choose a subject for "{selectedFile?.name}"
                </Text>

                <TouchableOpacity
                  style={[styles.createSubjectItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setIsCreatingNewSubject(true)}
                >
                  <Ionicons name="folder-open" size={18} color={colors.primary} />
                  <Text style={[styles.createSubjectText, { color: colors.primary }]}>+ Create New Subject</Text>
                </TouchableOpacity>

                <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
                  {subjects.map((subject) => (
                    <TouchableOpacity
                      key={subject.id}
                      style={[styles.subjectItem, { borderBottomColor: colors.border }]}
                      onPress={() => saveNoteToSubject(subject.id)}
                    >
                      <Ionicons name="folder-outline" size={18} color={colors.text} />
                      <Text style={[styles.subjectItemText, { color: colors.text }]}>{subject.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.subjectItem, { borderBottomColor: colors.border }]}
                  onPress={() => saveNoteToSubject(null)}
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.subtext} />
                  <Text style={[styles.subjectItemText, { color: colors.subtext }]}>Save without subject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsModalVisible(false);
                    setIsCreatingNewSubject(false);
                    setNewSubjectName("");
                  }}
                  style={[styles.modalCancelBtn, { backgroundColor: colors.button }]}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.buttonText }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingTop: Platform.OS === 'ios' ? "14%" : "12%",
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  brandPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  brandText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  formatTag: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  formatTagText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  heroSubtext: {
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },
  heroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 100,
  },
  heroBtnText: {
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 8,
  },
  deadlineWidget: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  widgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  widgetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  deadlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  deadlineTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  deadlineBadge: {
    fontSize: 11.5,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  gridSectionHeader: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  navCard: {
    width: "48%",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  navCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  navIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  navCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  navCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  recentSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  recentIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  recentTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  recentTitle: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  recentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  recentOpenBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
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
  createSubjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  createSubjectText: {
    fontSize: 14.5,
    fontWeight: '700',
    marginLeft: 10,
  },
  newSubjectInput: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    marginBottom: 16,
    marginTop: 8,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalSecondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 100,
    borderWidth: 1,
    marginRight: 10,
  },
  modalSecondaryBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalPrimaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
  },
  modalPrimaryBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  subjectList: {
    maxHeight: 220,
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