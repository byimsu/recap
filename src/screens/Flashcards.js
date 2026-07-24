import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { getAllDecks, createDeck, deleteDeck } from '../data/flashcardsData';
import { useTheme } from '../context/ThemeContext';

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

  // Create a New Deck Locally
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
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.deckTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.deckStats, { color: colors.subtext }]}>{item.cardCount || 0} Cards</Text>
        </View>
  
        <View style={styles.deckActions}>
          <TouchableOpacity
            style={[styles.addCardBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => navigation.navigate("AddCard", { deckId: item.id })}
          >
            <Feather name="plus" size={18} color={colors.text} />
          </TouchableOpacity>
  
          <TouchableOpacity
            style={[
              styles.studyBtn, 
              { backgroundColor: isEmpty ? colors.border : colors.button },
              isEmpty && { opacity: 0.5 }
            ]}
            disabled={isEmpty}
            onPress={() => {
              navigation.navigate("Review", { deckId: item.id, deckTitle: item.title });
            }}
          >
            <Text style={[styles.studyBtnText, { color: isEmpty ? colors.subtext : colors.buttonText }]}>Study</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ backgroundColor: colors.bg, flex: 1 }}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />
      <View style={{ flex: 1, paddingHorizontal: "6%", paddingTop: "16%", paddingBottom: "10%" }}>

        {/* Header Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconButton, { borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ width: 46 }} />
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Your Decks</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Create, import, and review your custom flashcards locally.</Text>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.button }]}
            onPress={() => setIsModalVisible(true)}
          >
            <Feather name="plus" size={18} color={colors.buttonText} />
            <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>New Deck</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={handleImportDeck}
          >
            <Feather name="download" size={18} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Import</Text>
          </TouchableOpacity>
        </View>

        {/* Decks List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.button} />
          </View>
        ) : (
          <FlatList
            data={decks}
            renderItem={renderDeckItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="albums-outline" size={32} color={colors.subtext} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No flashcards yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                  Create a deck and add cards to start studying with spaced repetition.
                </Text>
              </View>
            }
          />
        )}

        {/* Create Deck Modal */}
        <Modal visible={isModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Local Deck</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g., Biology 101"
                placeholderTextColor={colors.subtext}
                value={newDeckTitle}
                onChangeText={setNewDeckTitle}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalBtn}>
                  <Text style={[styles.modalBtnText, { color: colors.subtext }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateDeck} style={styles.modalBtn}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 28, fontWeight: "700", marginTop: 24, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 100, marginHorizontal: 4 },
  actionButtonText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  deckCard: { borderRadius: 18, padding: 20, borderWidth: 1, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deckTitle: { fontSize: 18, fontWeight: '700' },
  deckStats: { fontSize: 13, marginTop: 4 },
  deckActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  addCardBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  studyBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 100 },
  studyBtnText: { fontWeight: '700' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { marginLeft: 24, paddingVertical: 8 },
  modalBtnText: { fontSize: 16, fontWeight: '700' }
});
