import * as FileSystem from 'expo-file-system/legacy';
import React, { useState, useCallback, useMemo } from "react";
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
import {
  FileText,
  MoreVertical,
  Calendar,
  FolderOpen,
  Folder,
  ArrowRight,
  UploadCloud,
  Plus,
  BookOpen,
  Library,
  Settings as SettingsIcon,
  Trash2,
  LogOut,
  Clock,
  Bell,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from 'expo-document-picker';
import { saveNote, getAllNotes, openNote } from '../data/notesData';
import { loadSubjectsWithNoteCounts, createSubject } from '../data/subjectsData';
import { getAllDeadlines, upcomingDeadlines, daysUntilLabel, DEADLINE_TYPE_META } from '../data/deadlinesData';
import { getLocalStudyData, formatLocalDate } from '../storage/studyStorage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import StaggerView from '../components/common/StaggeredView';
import AnimatedPressable from '../components/common/AnimatedPressable';

function getGreetingText() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { line1: "Good", line2: "morning" };
  } else if (hour >= 12 && hour < 17) {
    return { line1: "Good", line2: "afternoon" };
  } else {
    return { line1: "Good", line2: "evening" };
  }
}

const RecentNoteItem = React.memo(({ note, subjectDisplay, colors, onPress }) => {
  const handlePress = React.useCallback(() => {
    onPress(note.uri);
  }, [note.uri, onPress]);

  return (
    <AnimatedPressable
      type="row"
      sharedTransitionTag={`note-card-${note.id}`}
      style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
    >
      <View style={[styles.recentIconBadge, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}>
        <FileText size={17} color={colors.subtext} />
      </View>

      <View style={styles.recentTextContainer}>
        <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
          {note.name}
        </Text>
        <Text style={[styles.recentMeta, { color: colors.subtext }]}>
          {subjectDisplay} • {new Date(note.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <ArrowRight size={14} color={colors.subtext} />
    </AnimatedPressable>
  );
});

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [subjects, setSubjects] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [isCreatingNewSubject, setIsCreatingNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const { logout } = useAuth();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const greeting = useMemo(() => getGreetingText(), []);

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

          const studyData = await getLocalStudyData();
          const todayStr = formatLocalDate(new Date());
          setTodayMinutes(studyData[todayStr] || 0);
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
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#F5F4F0' || colors.bg === '#F1F2ED' || colors.bg === '#FAFAFA' ? "dark" : "light"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header Area */}
        <StaggerView delay={0} distance={8} style={styles.headerArea}>
          <View style={styles.topBar}>
            <View style={styles.greetingHeaderContainer}>
              <Text style={[styles.greetingLine1, { color: colors.text }]}>{greeting.line1}</Text>
              <Text style={[styles.greetingLine2, { color: colors.subtext }]}>{greeting.line2}</Text>
              <Text style={[styles.greetingSub, { color: colors.subtext }]}>Ready to study?</Text>
            </View>

            <View style={styles.headerActionsRow}>
              <AnimatedPressable
                type="button"
                onPress={() => navigation.navigate("StudySchedule")}
                accessibilityLabel="Reminders"
                accessibilityRole="button"
                style={[styles.headerPillBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Bell size={16} color={colors.text} accessible={false} />
              </AnimatedPressable>

              <AnimatedPressable
                type="button"
                onPress={() => navigation.navigate("Deadlines")}
                accessibilityLabel="Deadlines"
                accessibilityRole="button"
                style={[styles.headerPillBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Calendar size={16} color={colors.text} accessible={false} />
              </AnimatedPressable>

              <AnimatedPressable
                type="button"
                onPress={() => setIsMenuVisible(true)}
                accessibilityLabel="More options"
                accessibilityRole="button"
                style={[styles.headerPillBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <MoreVertical size={16} color={colors.text} accessible={false} />
              </AnimatedPressable>
            </View>
          </View>
        </StaggerView>

        {/* Layered Card Sheet Container */}
        <View style={[styles.layeredSheet, { backgroundColor: colors.card }]}>
          {/* Dashboard Main Overview Section */}
          <StaggerView delay={80} distance={10} style={styles.dashboardSection}>
            <View style={styles.dashboardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dashboardTitle, { color: colors.text }]}>Study Overview</Text>
                <View style={[styles.formatTag, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.formatTagText, { color: colors.subtext }]}>PDF • DOCX • TXT</Text>
                </View>
              </View>

              <AnimatedPressable
                type="import"
                onPress={handleUpload}
                accessibilityLabel="Import note"
                accessibilityRole="button"
                style={[styles.importBtn, { backgroundColor: colors.accent }]}
              >
                <UploadCloud size={12} color="#FFFFFF" accessible={false} />
                <Text style={styles.importBtnText}>Import Note</Text>
              </AnimatedPressable>
            </View>

            {/* Standalone Statistic Cards Grid */}
            <View style={styles.metricCardsGrid}>
              <AnimatedPressable
                type="card"
                style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate("ProgressTab")}
              >
                <View style={styles.metricCardTop}>
                  <Text style={[styles.metricLabel, { color: colors.subtext }]} numberOfLines={2}>
                    Study Time Today
                  </Text>
                  <View style={[styles.metricIconBadge, { backgroundColor: colors.card }]}>
                    <Clock size={14} color={colors.subtext} />
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {todayMinutes > 0 ? `${Math.round(todayMinutes)}m` : '0m'}
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                type="card"
                style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate("Deadlines")}
              >
                <View style={styles.metricCardTop}>
                  <Text style={[styles.metricLabel, { color: colors.subtext }]} numberOfLines={2}>
                    Upcoming Deadlines
                  </Text>
                  <View style={[styles.metricIconBadge, { backgroundColor: colors.card }]}>
                    <Calendar size={14} color={colors.subtext} />
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {upcoming.length > 0 ? `${upcoming.length} Due` : '0 Due'}
                </Text>
              </AnimatedPressable>
            </View>
          </StaggerView>

          {/* Quick Access Action Chips */}
          <StaggerView delay={140} distance={10} style={styles.chipsRow}>
            <AnimatedPressable
              type="card"
              style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate("Notes")}
            >
              <View style={[styles.chipIconBadge, { backgroundColor: colors.card }]}>
                <BookOpen size={16} color={colors.text} />
              </View>
              <Text style={[styles.chipTitle, { color: colors.text }]}>Notes</Text>
            </AnimatedPressable>

            <AnimatedPressable
              type="card"
              style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate("Flashcards")}
            >
              <View style={[styles.chipIconBadge, { backgroundColor: colors.card }]}>
                <Library size={16} color={colors.text} />
              </View>
              <Text style={[styles.chipTitle, { color: colors.text }]}>Flashcards</Text>
            </AnimatedPressable>
          </StaggerView>

          {/* Recent Notes Section */}
          <StaggerView delay={200} distance={10}>
            <View style={styles.recentSectionHeader}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Recent Notes</Text>
              {recentNotes.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate("Notes")}>
                  <Text style={[styles.seeAllText, { color: colors.accent }]}>See All</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentNotes.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <FileText size={26} color={colors.subtext} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No notes yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                  Import your first study material to start building your library.
                </Text>
              </View>
            ) : (
              (() => {
                const subjectMap = {};
                subjects.forEach(s => { subjectMap[s.id] = s.name; });
                return recentNotes.map((note) => {
                  const subjectDisplay = subjectMap[note.subjectId] || "Uncategorized";
                  return (
                    <RecentNoteItem
                      key={note.id}
                      note={note}
                      subjectDisplay={subjectDisplay}
                      colors={colors}
                      onPress={handleOpenNote}
                    />
                  );
                });
              })()
            )}
          </StaggerView>
        </View>
      </ScrollView>

      {/* Save Note Subject Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                    { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }
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
                    style={[styles.modalPrimaryBtn, { backgroundColor: colors.accent }]}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Create & Save</Text>
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
                  style={[styles.createSubjectItem, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}
                  onPress={() => setIsCreatingNewSubject(true)}
                >
                  <FolderOpen size={17} color={colors.accent} />
                  <Text style={[styles.createSubjectText, { color: colors.accent }]}>+ Create New Subject</Text>
                </TouchableOpacity>

                <ScrollView style={styles.subjectList} showsVerticalScrollIndicator={false}>
                  {subjects.map((subject) => (
                    <TouchableOpacity
                      key={subject.id}
                      style={[styles.subjectItem, { borderBottomColor: colors.border }]}
                      onPress={() => saveNoteToSubject(subject.id)}
                    >
                      <Folder size={17} color={colors.subtext} />
                      <Text style={[styles.subjectItemText, { color: colors.text }]}>{subject.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.subjectItem, { borderBottomColor: colors.border }]}
                  onPress={() => saveNoteToSubject(null)}
                >
                  <FileText size={17} color={colors.subtext} />
                  <Text style={[styles.subjectItemText, { color: colors.subtext }]}>Save without subject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsModalVisible(false);
                    setIsCreatingNewSubject(false);
                    setNewSubjectName("");
                  }}
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.subtext }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dropdown Menu Modal */}
      <Modal visible={isMenuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setIsMenuVisible(false);
                navigation.navigate('Settings');
              }}
            >
              <SettingsIcon size={16} color={colors.text} />
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setIsMenuVisible(false);
                navigation.navigate('Trash');
              }}
            >
              <Trash2 size={16} color={colors.text} />
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>Trash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomColor: 'transparent' }]}
              onPress={() => {
                setIsMenuVisible(false);
                Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign Out", style: "destructive", onPress: logout }
                ]);
              }}
            >
              <LogOut size={16} color={colors.danger} />
              <Text style={[styles.dropdownItemText, { color: colors.danger }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  headerArea: {
    paddingHorizontal: "6%",
    paddingTop: 12,
    paddingBottom: 36,
  },
  layeredSheet: {
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    paddingHorizontal: "6%",
    paddingTop: 28,
    paddingBottom: 120,
    minHeight: "100%",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
  },
  greetingHeaderContainer: {
    flex: 1,
  },
  greetingLine1: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  greetingLine2: {
    fontSize: 32,
    fontWeight: "400",
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 6,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerPillBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerDarkPillBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dashboardSection: {
    marginBottom: 24,
  },
  dashboardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  dashboardTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  formatTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  formatTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    height: 28,
    borderRadius: 7,
  },
  importBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  metricCardsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "space-between",
    minHeight: 80,
  },
  metricCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  metricLabel: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
    paddingRight: 4,
  },
  metricIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 12,
  },
  chipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  actionChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  chipTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  recentSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  seeAllText: { fontSize: 13, fontWeight: "600" },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },
  emptyCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 10,
    marginTop: 18,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 6,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  recentIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  recentTextContainer: { flex: 1, marginLeft: 14, marginRight: 10 },
  recentTitle: { fontSize: 15, fontWeight: "700" },
  recentMeta: { fontSize: 12.5, marginTop: 3 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: '700' },
  modalSubHeader: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  createSubjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  createSubjectText: { fontSize: 14, fontWeight: '700', marginLeft: 10 },
  newSubjectInput: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 16,
    marginTop: 8,
  },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  modalSecondaryBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
  },
  modalSecondaryBtnText: { fontWeight: '600', fontSize: 14 },
  modalPrimaryBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalPrimaryBtnText: { fontWeight: '700', fontSize: 14, color: '#FFFFFF' },
  subjectList: { maxHeight: 220, marginBottom: 8 },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  subjectItemText: { fontSize: 15, marginLeft: 12, fontWeight: '500' },
  modalCancelBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
  },
  modalCancelBtnText: { fontWeight: '600', fontSize: 14 },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 80,
    right: '6%',
    width: 180,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
});