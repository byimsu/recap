import * as FileSystem from 'expo-file-system/legacy';
import React, { useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { Text, View, ScrollView, TouchableOpacity, Modal, StyleSheet, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from 'expo-document-picker';
import { saveNote, getAllNotes } from '../data/notesData';
import { loadSubjectsWithNoteCounts } from '../data/subjectsData';
import { getAllDeadlines, upcomingDeadlines, daysUntilLabel, DEADLINE_TYPE_META } from '../data/deadlinesData';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [subjects, setSubjects] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
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
      Alert.alert("Success", "Note saved successfully!");
    } catch (error) {
      console.error("Error saving note:", error);
      Alert.alert("Error", "Failed to save the note.");
    }
  };

  return (
    <View style={{ backgroundColor: colors.bg, flex: 1 }}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: "6%", paddingTop: "16%", paddingBottom: "10%" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Ionicons name="menu" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("UserProgress")} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Ionicons name="stats-chart" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.mainTitle, { color: colors.text }]}>Let's Study Smarter</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>A smarter way to organize, review, and retain your study materials.</Text>

        <View style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Upload</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your Notes</Text>
          <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>Upload notes, PDFs, or DOCs.</Text>
          <TouchableOpacity onPress={handleUpload} style={[styles.uploadBtn, { backgroundColor: colors.button }]}>
            <Feather name="upload" size={16} color={colors.buttonText} />
            <Text style={[styles.uploadBtnText, { color: colors.buttonText }]}>Upload File</Text>
          </TouchableOpacity>
        </View>

        {upcoming.length > 0 && (
          <TouchableOpacity
            style={[styles.deadlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate("Deadlines")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.deadlineCardTitle, { color: colors.text }]}>Upcoming</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
            </View>
            {upcoming.map((d) => {
              const meta = DEADLINE_TYPE_META[d.type] || { color: colors.customFallback };
              return (
                <View key={d.id} style={styles.deadlineRow}>
                  <View style={[styles.deadlineDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.deadlineTitle, { color: colors.text }]} numberOfLines={1}>{d.title}</Text>
                  <Text style={[styles.deadlineWhen, { color: colors.subtext }]}>{daysUntilLabel(d.date)}</Text>
                </View>
              );
            })}
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: "row", marginTop: 16, justifyContent: "space-between" }}>
          <TouchableOpacity style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate("Notes")}>
            <View style={[styles.navIconWrapper, { backgroundColor: colors.button }]}>
              <Feather name="edit-3" size={18} color={colors.buttonText} />
            </View>
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Notes</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.subtext }]}>View all saved notes</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text} style={{ marginTop: 10 }} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate("Flashcards")}>
            <View style={[styles.navIconWrapper, { backgroundColor: colors.button }]}>
              <MaterialCommunityIcons name="cards" size={18} color={colors.buttonText} />
            </View>
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Flashcards</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.subtext }]}>Turn notes into flashcards</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text} style={{ marginTop: 10 }} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Uploads</Text>

        {recentNotes.length === 0 ? (
          <Text style={[styles.emptyRecentText, { color: colors.subtext }]}>No notes uploaded yet.</Text>
        ) : (
          recentNotes.map((note) => {
            const subjectMatch = subjects.find(s => s.id === note.subjectId);
            const subjectDisplay = subjectMatch ? subjectMatch.name : "Uncategorized";

            return (
              <TouchableOpacity
                key={note.id}
                style={[styles.recentNoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={async () => {
                  try { await open(note.uri); }
                  catch (err) { Alert.alert("Error", "Could not open the file."); }
                }}
              >
                <View style={[styles.recentNoteIcon, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Ionicons name="document-text" size={20} color={colors.subtext} />
                </View>
                <View style={styles.recentNoteTextContainer}>
                  <Text style={[styles.recentNoteTitle, { color: colors.text }]} numberOfLines={1}>{note.name}</Text>
                  <Text style={[styles.recentNoteDate, { color: colors.subtext }]}>
                    {new Date(note.createdAt).toLocaleDateString()} • {subjectDisplay}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={20} color={colors.subtext} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Save Note</Text>
            <Text style={{ color: colors.subtext, marginBottom: 16 }}>Select a subject for "{selectedFile?.name}"</Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
              {subjects.map((subject) => (
                <TouchableOpacity key={subject.id} style={[styles.subjectListItem, { borderBottomColor: colors.border }]} onPress={() => saveNoteToSubject(subject.id)}>
                  <Ionicons name="folder-outline" size={20} color={colors.text} />
                  <Text style={[styles.subjectListText, { color: colors.text }]}>{subject.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.subjectListItem, { borderBottomColor: colors.border }]} onPress={() => saveNoteToSubject(null)}>
              <Ionicons name="document-text-outline" size={20} color={colors.subtext} />
              <Text style={[styles.subjectListText, { color: colors.subtext }]}>Save without a subject</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[styles.cancelBtn, { backgroundColor: colors.button }]}>
              <Text style={{ color: colors.buttonText, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  mainTitle: { fontSize: 28, fontWeight: "700", marginTop: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 6 },
  uploadCard: { borderWidth: 1, borderRadius: 20, padding: 20, marginTop: 24 },
  cardTitle: { fontSize: 20, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, marginTop: 8 },
  uploadBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 100, marginTop: 16 },
  uploadBtnText: { fontWeight: "700", marginLeft: 8 },
  deadlineCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 16 },
  deadlineCardTitle: { fontSize: 15, fontWeight: "700" },
  deadlineRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  deadlineDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  deadlineTitle: { flex: 1, fontSize: 14, fontWeight: "500" },
  deadlineWhen: { fontSize: 12.5, fontWeight: "600", marginLeft: 8 },
  navCard: { width: "48%", borderRadius: 18, padding: 16, borderWidth: 1 },
  navIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  navCardTitle: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  navCardSubtitle: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 28, marginBottom: 12 },
  emptyRecentText: { fontSize: 14, marginTop: 8 },
  recentNoteCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  recentNoteIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  recentNoteTextContainer: { flex: 1, marginLeft: 12, marginRight: 12 },
  recentNoteTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  recentNoteDate: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subjectListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  subjectListText: { fontSize: 16, marginLeft: 12, fontWeight: '500' },
  cancelBtn: { paddingVertical: 14, borderRadius: 100, alignItems: 'center', marginTop: 16 }
});