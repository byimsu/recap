import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { getDeckCards, deleteCardFromDeck, updateCardInDeck } from '../data/flashcardsData';
import { useTheme } from '../context/ThemeContext';

export default function DeckDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Safe param access
  const deckId = route.params?.deckId;
  const deckName = route.params?.deckName || "Deck Details";

  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (deckId) loadCards();
      else setIsLoading(false);
    }, [deckId])
  );

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const data = await getDeckCards(deckId);
      setCards(data);
    } catch (error) {
      console.error("Failed to load cards", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCard = (cardId) => {
    Alert.alert("Delete Flashcard", "Are you sure you want to delete this card?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: 'destructive', onPress: async () => {
            try {
              const updatedCards = await deleteCardFromDeck(deckId, cardId);
              setCards(updatedCards);
            } catch (error) {
              console.error("Failed to delete card", error);
            }
          }
        }
      ]
    );
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
    setIsEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editFront.trim() || !editBack.trim()) {
      Alert.alert("Missing Fields", "Please provide both front and back text.");
      return;
    }

    try {
      const updatedCards = await updateCardInDeck(deckId, editingCard.id, {
        front: editFront.trim(),
        back: editBack.trim(),
      });

      setCards(updatedCards);
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Could not save your changes.");
    }
  };

  const renderCardItem = ({ item }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTextContainer}>
        <Text style={[styles.questionText, { color: colors.text }]}>Q: {item.front}</Text>
        <Text style={[styles.answerText, { color: colors.subtext }]}>A: {item.back}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
          <Feather name="edit-2" size={20} color={colors.subtext} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteCard(item.id)} style={styles.iconBtn}>
          <Feather name="trash-2" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
      </View>

      <Text style={[styles.header, { color: colors.text }]}>{deckName}</Text>
      <Text style={[styles.subtext, { color: colors.subtext }]}>{cards.length} Cards</Text>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={cards}
          renderItem={renderCardItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.subtext }]}>No cards in this deck yet.</Text>
          }
        />
      )}

      {/* EDIT MODAL */}
      <Modal visible={isEditModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalHeader, { color: colors.text }]}>Edit Flashcard</Text>

            <Text style={[styles.label, { color: colors.text }]}>Front (Question)</Text>
            <TextInput
              value={editFront}
              onChangeText={setEditFront}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: colors.text }]}>Back (Answer)</Text>
            <TextInput
              value={editBack}
              onChangeText={setEditBack}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: colors.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.saveBtnText, { color: colors.buttonText }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: "6%", paddingTop: "16%" },
  iconButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 28, fontWeight: 'bold' },
  subtext: { fontSize: 14, marginBottom: 20, marginTop: 5 },
  scrollContent: { paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  cardItem: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  cardTextContainer: { flex: 1, paddingRight: 10 },
  questionText: { fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
  answerText: { fontSize: 15 },
  actionButtons: { flexDirection: 'row' },
  iconBtn: { padding: 8, marginLeft: 5 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { padding: 24, borderRadius: 16 },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, padding: 12, marginBottom: 20, borderRadius: 8, fontSize: 16, minHeight: 60 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, marginRight: 10 },
  cancelBtnText: { fontSize: 16, fontWeight: '600' },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { fontSize: 16, fontWeight: 'bold' }
});
