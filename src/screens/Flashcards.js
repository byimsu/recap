import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Layers, Plus } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { getAllDecks, createDeck, deleteDeck } from '../data/flashcardsData';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Flashcards() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadDecks();
    }, [])
  );

  const loadDecks = async () => {
    try {
      setIsLoading(true);
      const loadedDecks = await getAllDecks();
      setDecks(loadedDecks);
    } catch (error) {
      console.error("Error loading local decks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) return;

    try {
      const updatedDecks = await createDeck(newDeckTitle.trim());
      setDecks(updatedDecks);
      setNewDeckTitle("");
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error saving local deck:", error);
      Alert.alert("Error", "Failed to create deck.");
    }
  };

  const handleDeleteDeck = (deck) => {
    Alert.alert(
      "Delete Deck",
      `Are you sure you want to delete "${deck.title}" and all its cards?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedDecks = await deleteDeck(deck.id);
              setDecks(updatedDecks);
            } catch (error) {
              console.error("Error deleting deck:", error);
            }
          }
        }
      ]
    );
  };

  const handleImportDeck = () => {
    Alert.alert("Coming Soon", "Importing decks is not yet implemented.");
  };

  const renderDeckItem = ({ item }) => {
    const isEmpty = (item.cardCount || 0) === 0;

    return (
      <TouchableOpacity
        style={[styles.deckCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate("DeckDetail", { deckId: item.id, deckName: item.title })}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          handleDeleteDeck(item);
        }}
        accessibilityLabel={item.title}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <View style={[styles.deckIconBadge, { backgroundColor: colors.accentSoft }]} accessible={false}>
          <Layers size={18} color={colors.accent} accessible={false} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.deckTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.deckStats, { color: colors.subtext }]}>{item.cardCount || 0} Cards</Text>
        </View>

        <View style={styles.deckActions}>
          <TouchableOpacity
            style={[styles.addCardBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => navigation.navigate("AddCard", { deckId: item.id })}
            accessibilityLabel={`Add card to ${item.title}`}
            accessibilityRole="button"
          >
            <Plus size={16} color={colors.text} accessible={false} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.studyBtn,
              { backgroundColor: isEmpty ? colors.border : colors.accent },
              isEmpty && { opacity: 0.5 }
            ]}
            disabled={isEmpty}
            accessibilityLabel={`Study ${item.title}`}
            accessibilityRole="button"
            onPress={() => {
              navigation.navigate("Review", { deckId: item.id, deckTitle: item.title });
            }}
          >
            <Text style={[styles.studyBtnText, { color: isEmpty ? colors.subtext : '#FFFFFF' }]}>Study</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg, flex: 1 }}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />
      <View style={{ flex: 1, paddingHorizontal: "6%", paddingTop: 16, paddingBottom: "10%" }}>

        {/* Header Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <ArrowLeft size={20} color={colors.text} accessible={false} />
          </TouchableOpacity>
          {decks.length > 0 && (
            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              accessibilityLabel="Create new deck"
              accessibilityRole="button"
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <Plus size={16} color="#FFFFFF" accessible={false} />
              <Text style={styles.addBtnText}>New Deck</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Your Decks</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Create and review your custom flashcards locally.</Text>

        {/* Decks List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={decks}
            renderItem={renderDeckItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Layers size={30} color={colors.border} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                  Create your first deck to start studying with spaced repetition.
                </Text>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(true)}
                  style={[styles.emptyCta, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.emptyCtaText}>New Deck</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Create Deck Modal */}
        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Deck</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g., Biology 101"
                placeholderTextColor={colors.subtext}
                value={newDeckTitle}
                onChangeText={setNewDeckTitle}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCancelBtn}>
                  <Text style={[styles.modalCancelText, { color: colors.subtext }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateDeck} style={[styles.modalSaveBtn, { backgroundColor: colors.accent }]}>
                  <Text style={styles.modalSaveText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  addBtn: { flexDirection: 'row', paddingHorizontal: 18, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontWeight: '700', fontSize: 14, marginLeft: 8, color: '#FFFFFF' },
  headerTitle: { fontSize: 30, fontWeight: "700", marginTop: 28, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13.5, marginTop: 6, marginBottom: 24 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 10, marginHorizontal: 4 },
  actionButtonText: { fontSize: 14.5, fontWeight: '700', marginLeft: 8 },
  deckCard: { borderRadius: 12, padding: 18, borderWidth: 1, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  deckIconBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deckTitle: { fontSize: 16, fontWeight: '700' },
  deckStats: { fontSize: 12.5, marginTop: 3 },
  deckActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  addCardBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  studyBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 8 },
  studyBtnText: { fontWeight: '700', fontSize: 13.5 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 12, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCancelBtn: { paddingVertical: 11, paddingHorizontal: 18, marginRight: 8 },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalSaveBtn: { paddingVertical: 11, paddingHorizontal: 22, borderRadius: 10 },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
