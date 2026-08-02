import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedKey } from '../storage/userStorage';
import { createId } from '../utils/createId';
import { auth, db } from '../api/firebase';
import { isLocalGuestActive } from '../storage/authStorage';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

const BASE_DECKS_KEY = '@study_decks';

const parseArray = (value) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

async function syncDeckToFirebase(deck) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return;

  const deckRef = doc(db, 'users', user.uid, 'decks', deck.id);
  await setDoc(deckRef, deck, { merge: true });
}

async function deleteDeckFromFirebase(deckId) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return;

  // Delete cards subcollection first — Firestore does not cascade-delete
  const cardsCol = collection(db, 'users', user.uid, 'decks', deckId, 'cards');
  const cardsSnap = await getDocs(cardsCol);
  const deletePromises = cardsSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);

  const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
  await deleteDoc(deckRef);
}

async function syncCardToFirebase(deckId, card) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return;

  const cardRef = doc(db, 'users', user.uid, 'decks', deckId, 'cards', card.id);
  await setDoc(cardRef, card, { merge: true });
}

async function deleteCardFromFirebase(deckId, cardId) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return;

  const cardRef = doc(db, 'users', user.uid, 'decks', deckId, 'cards', cardId);
  await deleteDoc(cardRef);
}

export async function syncCardsToFirebaseBatch(deckId, cards) {
  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db || !cards || cards.length === 0) return;

  try {
    // Firestore batch limit is 500, use 450 to be safe
    const chunkSize = 450;
    for (let i = 0; i < cards.length; i += chunkSize) {
      const chunk = cards.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const card of chunk) {
        const cardRef = doc(db, 'users', user.uid, 'decks', deckId, 'cards', card.id);
        batch.set(cardRef, card, { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    console.error('Error in batch sync to Firebase:', error);
  }
}

const SYNC_THROTTLE_MS = 30000;
let _lastDecksSyncAt = 0;

export async function syncDecksFromFirebase({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - _lastDecksSyncAt < SYNC_THROTTLE_MS) return null;

  const user = auth?.currentUser;
  const isGuest = await isLocalGuestActive();
  if (!user || isGuest || !db) return null;

  _lastDecksSyncAt = now;

  try {
    const decksCol = collection(db, 'users', user.uid, 'decks');
    const decksSnap = await getDocs(decksCol);
    const remoteDecks = decksSnap.docs.map((d) => d.data());

    const localDecks = await getAllDecks();
    const decksById = new Map(localDecks.map((d) => [d.id, d]));
    remoteDecks.forEach((remote) => {
      const local = decksById.get(remote.id);
      if (local) {
        const localDate = new Date(local.updatedAt || local.createdAt || 0).getTime();
        const remoteDate = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
        if (remoteDate >= localDate) {
          decksById.set(remote.id, remote);
        }
      } else {
        decksById.set(remote.id, remote);
      }
    });
    const mergedDecks = Array.from(decksById.values());
    
    const decksKey = await getScopedKey(BASE_DECKS_KEY);
    await AsyncStorage.setItem(decksKey, JSON.stringify(mergedDecks));

    for (const deck of mergedDecks) {
      const cardsCol = collection(db, 'users', user.uid, 'decks', deck.id, 'cards');
      const cardsSnap = await getDocs(cardsCol);
      if (!cardsSnap.empty) {
        const remoteCards = cardsSnap.docs.map(c => c.data());
        const localCards = await getDeckCards(deck.id);
        const cardsById = new Map(localCards.map(c => [c.id, c]));
        remoteCards.forEach((remote) => {
          const local = cardsById.get(remote.id);
          if (local) {
            // Use nextReviewDate as proxy for most-recently-reviewed
            const localDate = new Date(local.nextReviewDate || local.createdAt || 0).getTime();
            const remoteDate = new Date(remote.nextReviewDate || remote.createdAt || 0).getTime();
            if (remoteDate >= localDate) {
              cardsById.set(remote.id, remote);
            }
          } else {
            cardsById.set(remote.id, remote);
          }
        });
        const mergedCards = Array.from(cardsById.values());
        
        const deckKey = await getScopedKey(`deck_cards_${deck.id}`);
        await AsyncStorage.setItem(deckKey, JSON.stringify(mergedCards));
      }
    }

    return mergedDecks;
  } catch (e) {
    console.error('Error syncing decks from Firebase:', e);
    return null;
  }
}

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
    
    syncDeckToFirebase(newDeck).catch((e) =>
      console.error('Error syncing deck to Firebase:', e)
    );
    
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
    
    deleteDeckFromFirebase(deckId).catch((e) =>
      console.error('Error deleting synced deck from Firebase:', e)
    );
    
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
    
    syncCardToFirebase(deckId, card).catch((e) =>
      console.error('Error syncing card to Firebase:', e)
    );
    const deckToSync = updatedDecks.find(d => d.id === deckId);
    if (deckToSync) {
      syncDeckToFirebase(deckToSync).catch((e) =>
        console.error('Error syncing deck to Firebase:', e)
      );
    }
    
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
    
    deleteCardFromFirebase(deckId, cardId).catch((e) =>
      console.error('Error deleting synced card from Firebase:', e)
    );
    const deckToSync = updatedDecks.find(d => d.id === deckId);
    if (deckToSync) {
      syncDeckToFirebase(deckToSync).catch((e) =>
        console.error('Error syncing deck to Firebase:', e)
      );
    }
    
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
    
    const updatedCard = updatedCards.find((c) => c.id === cardId);
    if (updatedCard) {
      syncCardToFirebase(deckId, updatedCard).catch((e) =>
        console.error('Error syncing card to Firebase:', e)
      );
    }
    
    return updatedCards;
  } catch (error) {
    console.error("Error updating card in deck:", error);
    throw error;
  }
}
