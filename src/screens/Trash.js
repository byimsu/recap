import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { ArrowLeft, Trash2, RefreshCcw } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  loadAndCleanTrash as dataLoadAndCleanTrash,
  restoreNote as dataRestoreNote,
  deleteNotePermanently as dataDeleteNotePermanently,
  emptyTrash as dataEmptyTrash
} from '../data/notesData';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TrashScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [trashedNotes, setTrashedNotes] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadAndCleanTrash();
    }, [])
  );

  const loadAndCleanTrash = async () => {
    try {
      const validTrash = await dataLoadAndCleanTrash();
      setTrashedNotes(validTrash);
    } catch (error) {
      console.error("Error loading trash:", error);
    }
  };

  const handleRestore = async (noteToRestore) => {
    try {
      const { restoredNote, updatedTrash } = await dataRestoreNote(noteToRestore, trashedNotes);
      setTrashedNotes(updatedTrash);
      Alert.alert("Restored", `"${restoredNote.name}" has been restored to your notes.`);
    } catch (error) {
      console.error("Error restoring note:", error);
      Alert.alert("Error", "Could not restore the note.");
    }
  };

  const handlePermanentDelete = (noteId, noteUri) => {
    Alert.alert(
      "Delete Permanently",
      "Are you sure? This document will be completely removed from your device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedTrash = await dataDeleteNotePermanently(noteId, noteUri, trashedNotes);
              setTrashedNotes(updatedTrash);
            } catch (error) {
              console.error("Error deleting permanently:", error);
            }
          }
        }
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (trashedNotes.length === 0) return;

    Alert.alert(
      "Empty Trash",
      "All items in the trash will be permanently deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Empty",
          style: "destructive",
          onPress: async () => {
            try {
              const emptyList = await dataEmptyTrash(trashedNotes);
              setTrashedNotes(emptyList);
            } catch (error) {
              console.error("Error emptying trash:", error);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <ArrowLeft size={20} color={colors.text} accessible={false} />
          </TouchableOpacity>

          {trashedNotes.length > 0 && (
            <TouchableOpacity
              onPress={handleEmptyTrash}
              accessibilityLabel="Empty trash"
              accessibilityRole="button"
              style={[styles.emptyBtn, { borderColor: colors.danger }]}
            >
              <Text style={[styles.emptyBtnText, { color: colors.danger }]}>Empty Trash</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.mainTitle, { color: colors.text }]}>Trash</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Deleted items are permanently removed after 30 days.</Text>

        {/* Trashed Items List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
          {trashedNotes.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Trash2 size={30} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing in the trash</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                Deleted items will appear here for 30 days before being permanently removed.
              </Text>
            </View>
          ) : (
            trashedNotes.map((note) => {
              const daysInTrash = Math.floor((new Date() - new Date(note.deletedAt)) / (1000 * 60 * 60 * 24));
              const daysLeft = 30 - daysInTrash;

              return (
                <View key={note.id} style={[styles.trashCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{note.name}</Text>
                    <Text style={{ color: colors.danger, fontSize: 12, marginTop: 3, fontWeight: '500' }}>
                      {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                    </Text>
                  </View>

                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: 'rgba(18,121,79,0.08)' }]}
                      onPress={() => handleRestore(note)}
                    >
                      <RefreshCcw size={16} color={colors.success} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: 'rgba(217,45,32,0.08)' }]}
                      onPress={() => handlePermanentDelete(note.id, note.uri)}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: "6%", paddingTop: 16 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBtn: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },

  emptyBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  emptyBtnText: { fontWeight: '700', fontSize: 13.5 },

  mainTitle: { fontSize: 30, fontWeight: "700", marginTop: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, marginTop: 6, marginBottom: 24 },

  scrollArea: { flex: 1 },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
    marginTop: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 14 },
  emptySubtitle: { fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 },

  trashCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  cardInfo: { flex: 1, paddingRight: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600' },

  actionsContainer: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }
});
