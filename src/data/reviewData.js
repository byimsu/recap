import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateSM2 } from '../utils/sm2';
import { getScopedKey } from '../storage/userStorage';

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
