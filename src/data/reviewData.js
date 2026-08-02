import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateSM2 } from '../utils/sm2';
import { getScopedKey } from '../storage/userStorage';
import { syncCardsToFirebaseBatch } from './flashcardsData';

// Debounce state
const syncTimers = new Map();
const pendingSyncs = new Map();

export function flushPendingReviewSync() {
  for (const [deckId, timerId] of syncTimers.entries()) {
    clearTimeout(timerId);
    const cards = pendingSyncs.get(deckId);
    if (cards) {
      syncCardsToFirebaseBatch(deckId, cards).catch((e) => console.error(e));
    }
  }
  syncTimers.clear();
  pendingSyncs.clear();
}

const parseCards = (value) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const shuffleCards = (cards) => [...cards].sort(() => Math.random() - 0.5);

export const getDueCards = (cards, now = new Date()) =>
  cards.filter((card) => !card.nextReviewDate || new Date(card.nextReviewDate) <= now);

export async function loadDeckCards(deckId) {
  const deckKey = await getScopedKey(`deck_cards_${deckId}`);
  return parseCards(await AsyncStorage.getItem(deckKey));
}

export async function saveDeckCards(deckId, cards) {
  const deckKey = await getScopedKey(`deck_cards_${deckId}`);
  await AsyncStorage.setItem(deckKey, JSON.stringify(cards));

  // Store the latest cards for the pending sync
  pendingSyncs.set(deckId, cards);

  // Clear existing timer for this deck
  if (syncTimers.has(deckId)) {
    clearTimeout(syncTimers.get(deckId));
  }

  // Set new debounce timer
  const timerId = setTimeout(() => {
    syncTimers.delete(deckId);
    const pendingCards = pendingSyncs.get(deckId);
    if (pendingCards) {
      pendingSyncs.delete(deckId);
      syncCardsToFirebaseBatch(deckId, pendingCards).catch((e) => console.error(e));
    }
  }, 3000); // 3-second debounce

  syncTimers.set(deckId, timerId);
}

export function rateCard(cards, card, quality) {
  const { interval, repetition, efactor } = calculateSM2(
    quality,
    card.repetition || 0,
    card.efactor || 2.5,
    card.interval || 0
  );
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  const updatedCard = { ...card, interval, repetition, efactor, nextReviewDate: nextReviewDate.toISOString() };
  return cards.map((existingCard) => existingCard.id === card.id ? updatedCard : existingCard);
}
