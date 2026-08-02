import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Plus, NotebookPen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import AnimatedPressable from '../components/common/AnimatedPressable';
import { getAllTextNotes, syncTextNotesFromFirebase, deleteTextNote } from '../data/textNotesData';

export default function TextNotesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const localNotes = await getAllTextNotes();
      setNotes(localNotes);
      
      const mergedNotes = await syncTextNotesFromFirebase();
      if (mergedNotes) {
        setNotes(mergedNotes);
      }
    } catch (error) {
      console.error("Error loading text notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (note) => {
    Alert.alert(
      "Delete Note",
      `Are you sure you want to delete "${note.title || 'Untitled Note'}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await deleteTextNote(note.id);
              setNotes(updated);
            } catch (error) {
              console.error("Error deleting note:", error);
            }
          }
        }
      ]
    );
  };

  const renderNoteCard = ({ item }) => {
    const preview = item.body ? item.body.replace(/\n/g, ' ').substring(0, 100) : 'No content';
    const dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '';

    return (
      <AnimatedPressable
        style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate("TextNoteEditor", { noteId: item.id })}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          handleDelete(item);
        }}
      >
        <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title || "Untitled Note"}
        </Text>
        <Text style={[styles.notePreview, { color: colors.subtext }]} numberOfLines={2}>
          {preview}
        </Text>
        <Text style={[styles.noteDate, { color: colors.mutedText || colors.subtext }]}>
          {dateStr}
        </Text>
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Text Notes</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Jot down your thoughts.</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate("TextNoteEditor", { noteId: null })}
          >
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={notes}
            renderItem={renderNoteCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { backgroundColor: colors.emptyStateSurface || colors.card, borderColor: colors.border }]}>
                <NotebookPen size={32} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No notes yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                  Create your first text note.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("TextNoteEditor", { noteId: null })}
                  style={[styles.emptyCta, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.emptyCtaText}>Create Note</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: '6%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  noteCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  noteDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  emptyCta: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
