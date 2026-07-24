import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Pen, Trash2, Layers, Plus } from 'lucide-react-native';
import { getDeckCards, deleteCardFromDeck, updateCardInDeck } from '../data/flashcardsData';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeckDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();

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
      {
        text: "Delete",
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedCards = await deleteCardFromDeck(deckId, cardId);
            setCards(updatedCards);
          } catch (error) {
            console.error("Failed to delete card", error);
          }
        }
      }
    ]);
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
        <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.iconBtn, { backgroundColor: colors.accentSoft }]}>
          <Pen size={16} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteCard(item.id)} style={[styles.iconBtn, { backgroundColor: 'rgba(217,45,32,0.08)' }]}>
          <Trash2 size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("AddCard", { deckId })}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Card</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.header, { color: colors.text }]}>{deckName}</Text>
      <Text style={[styles.subtext, { color: colors.subtext }]}>{cards.length} Card{cards.length !== 1 ? 's' : ''}</Text>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={cards}
          renderItem={renderCardItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Layers size={30} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>Add your first flashcard to this deck.</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("AddCard", { deckId })}
                style={[styles.emptyCta, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.emptyCtaText}>Add Card</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeader, { color: colors.text }]}>Edit Flashcard</Text>

            <Text style={[styles.label, { color: colors.subtext }]}>Front (Question)</Text>
            <TextInput
              value={editFront}
              onChangeText={setEditFront}
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: colors.subtext }]}>Back (Answer)</Text>
            <TextInput
              value={editBack}
              onChangeText={setEditBack}
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: colors.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: "6%", paddingTop: 16 },
  iconButton: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  addBtn: { flexDirection: 'row', paddingHorizontal: 18, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontWeight: '700', fontSize: 14, marginLeft: 8, color: '#FFFFFF' },
  header: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  subtext: { fontSize: 13.5, marginBottom: 24, marginTop: 6 },
  scrollContent: { paddingBottom: 40 },
  cardItem: { flexDirection: 'row', padding: 18, borderRadius: 12, borderWidth: 1, marginBottom: 10, alignItems: 'center' },
  cardTextContainer: { flex: 1, paddingRight: 12 },
  questionText: { fontWeight: '700', fontSize: 15, marginBottom: 6 },
  answerText: { fontSize: 14 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
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
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 20 },
  modalContent: { padding: 24, borderRadius: 12, borderWidth: 1 },
  modalHeader: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, padding: 13, marginBottom: 18, borderRadius: 10, fontSize: 15, minHeight: 60 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 18, marginRight: 8 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { paddingVertical: 11, paddingHorizontal: 22, borderRadius: 10 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' }
});
