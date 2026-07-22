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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  loadAndCleanTrash as dataLoadAndCleanTrash,
  restoreNote as dataRestoreNote,
  deleteNotePermanently as dataDeleteNotePermanently,
  emptyTrash as dataEmptyTrash
} from '../data/notesData';
import { useTheme } from '../context/ThemeContext';

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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          {trashedNotes.length > 0 && (
            <TouchableOpacity onPress={handleEmptyTrash} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Empty</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.mainTitle, { color: colors.text }]}>Trash</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Items are permanently deleted after 30 days.</Text>

        {/* Trashed Items List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
          {trashedNotes.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="trash" size={48} color={colors.border} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Your trash is empty.</Text>
            </View>
          ) : (
            trashedNotes.map((note) => {
              const daysInTrash = Math.floor((new Date() - new Date(note.deletedAt)) / (1000 * 60 * 60 * 24));
              const daysLeft = 30 - daysInTrash;

              return (
                <View key={note.id} style={[styles.trashCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{note.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                    </Text>
                  </View>

                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
                      onPress={() => handleRestore(note)}
                    >
                      <Feather name="refresh-ccw" size={18} color={colors.success} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
                      onPress={() => handlePermanentDelete(note.id, note.uri)}
                    >
                      <Feather name="trash-2" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: "6%", paddingTop: "16%" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: "center", alignItems: "center" },

  emptyBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: 100 },
  emptyBtnText: { color: '#ff3b30', fontWeight: '700', fontSize: 14 },

  mainTitle: { fontSize: 28, fontWeight: "700", marginTop: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },

  scrollArea: { flex: 1 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, fontWeight: '500' },

  trashCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  cardInfo: { flex: 1, paddingRight: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#ff3b30', fontWeight: '500' },

  actionsContainer: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
