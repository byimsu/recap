import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedKey } from '../storage/userStorage';
import { createId } from '../utils/createId';

const BASE_DECKS_KEY = '@study_decks';

const parseArray = (value) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export async function getAllDecks() {
  try {
    const decksKey = await getScopedKey(BASE_DECKS_KEY);
    const storedDecks = await AsyncStorage.getItem(decksKey);
    return parseArray(storedDecks);
  } catch (error) {
    console.error("Error loading decks:", error);
    return [];
  }
}

export async function createDeck(title) {
  try {
    const decksKey = await getScopedKey(BASE_DECKS_KEY);
    const existingDecks = await getAllDecks();
    const newDeck = {
      id: createId(),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      cardCount: 0,
    };
    const updatedDecks = [newDeck, ...existingDecks];
    await AsyncStorage.setItem(decksKey, JSON.stringify(updatedDecks));
    return updatedDecks;
  } catch (error) {
    console.error("Error creating deck:", error);
    throw error;
  }
}

export async function deleteDeck(deckId) {
  try {
    const decksKey = await getScopedKey(BASE_DECKS_KEY);
    const existingDecks = await getAllDecks();
    const updatedDecks = existingDecks.filter((d) => d.id !== deckId);
    await AsyncStorage.setItem(decksKey, JSON.stringify(updatedDecks));

    const deckCardsKey = await getScopedKey(`deck_cards_${deckId}`);
    await AsyncStorage.removeItem(deckCardsKey);
    return updatedDecks;
  } catch (error) {
    console.error("Error deleting deck:", error);
    throw error;
  }
}

export async function getDeckCards(deckId) {
  try {
    const deckKey = await getScopedKey(`deck_cards_${deckId}`);
    const data = await AsyncStorage.getItem(deckKey);
    return parseArray(data);
  } catch (error) {
    console.error("Error loading deck cards:", error);
    return [];
  }
}

export async function addCardToDeck(deckId, card) {
  try {
    const deckKey = await getScopedKey(`deck_cards_${deckId}`);
    const existingCards = await getDeckCards(deckId);
    const updatedCards = [...existingCards, card];
    await AsyncStorage.setItem(deckKey, JSON.stringify(updatedCards));

    const decksKey = await getScopedKey(BASE_DECKS_KEY);
    const existingDecks = await getAllDecks();
    const updatedDecks = existingDecks.map((deck) =>
      deck.id === deckId ? { ...deck, cardCount: (deck.cardCount || 0) + 1 } : deck
    );
    await AsyncStorage.setItem(decksKey, JSON.stringify(updatedDecks));
    return updatedCards;
  } catch (error) {
    console.error("Error adding card to deck:", error);
    throw error;
  }
}

export async function deleteCardFromDeck(deckId, cardId) {
  try {
    const deckKey = await getScopedKey(`deck_cards_${deckId}`);
    const existingCards = await getDeckCards(deckId);
    const updatedCards = existingCards.filter((c) => c.id !== cardId);
    await AsyncStorage.setItem(deckKey, JSON.stringify(updatedCards));

    const decksKey = await getScopedKey(BASE_DECKS_KEY);
    const existingDecks = await getAllDecks();
    const updatedDecks = existingDecks.map((deck) =>
      deck.id === deckId ? { ...deck, cardCount: Math.max(0, (deck.cardCount || 1) - 1) } : deck
    );
    await AsyncStorage.setItem(decksKey, JSON.stringify(updatedDecks));
    return updatedCards;
  } catch (error) {
    console.error("Error deleting card from deck:", error);
    throw error;
  }
}

export async function updateCardInDeck(deckId, cardId, updatedFields) {
  try {
    const deckKey = await getScopedKey(`deck_cards_${deckId}`);
    const existingCards = await getDeckCards(deckId);
    const updatedCards = existingCards.map((c) =>
      c.id === cardId ? { ...c, ...updatedFields } : c
    );
    await AsyncStorage.setItem(deckKey, JSON.stringify(updatedCards));
    return updatedCards;
  } catch (error) {
    console.error("Error updating card in deck:", error);
    throw error;
  }
}
