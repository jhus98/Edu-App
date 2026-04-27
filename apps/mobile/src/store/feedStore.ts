import { create } from 'zustand';
import api from '../utils/api';

interface Card {
  id: string;
  title: string;
  body: string;
  sourceTitle: string;
  sourceUrl: string;
  category: string;
  confidenceScore: number;
  version: number;
  createdAt: string;
  liked?: boolean;
  saved?: boolean;
}

interface FeedState {
  cards: Card[];
  currentIndex: number;
  isLoading: boolean;
  isGenerating: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  selectedCategory: string | null;
  setCategory: (category: string | null) => void;
  loadFeed: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  goNext: () => void;
  goPrev: () => void;
  likeCard: (cardId: string) => Promise<void>;
  saveCard: (cardId: string) => Promise<void>;
  flagCard: (cardId: string, reason: string) => Promise<void>;
  markSeen: (cardId: string) => Promise<void>;
  generateCard: (category: string) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  cards: [],
  currentIndex: 0,
  isLoading: false,
  isGenerating: false,
  hasMore: true,
  nextCursor: null,
  selectedCategory: null,

  setCategory: (category) => {
    set({ selectedCategory: category, cards: [], currentIndex: 0, nextCursor: null, hasMore: true });
    get().loadFeed(true);
  },

  loadFeed: async (reset = false) => {
    const { selectedCategory, isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true });

    try {
      const params: Record<string, string> = { limit: '10' };
      if (selectedCategory) params.category = selectedCategory;

      const { data } = await api.get('/api/feed', { params });

      set((state) => ({
        cards: reset ? data.cards : [...state.cards, ...data.cards],
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
        currentIndex: reset ? 0 : state.currentIndex,
      }));
    } catch (err) {
      console.error('[FeedStore] Load failed:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { nextCursor, hasMore, isLoading, selectedCategory } = get();
    if (!hasMore || isLoading || !nextCursor) return;

    set({ isLoading: true });

    try {
      const params: Record<string, string> = { limit: '10', cursor: nextCursor };
      if (selectedCategory) params.category = selectedCategory;

      const { data } = await api.get('/api/feed', { params });

      set((state) => ({
        cards: [...state.cards, ...data.cards],
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
      }));
    } catch (err) {
      console.error('[FeedStore] Load more failed:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  goNext: () => {
    const { currentIndex, cards } = get();
    const next = currentIndex + 1;
    if (next < cards.length) {
      set({ currentIndex: next });
      const card = cards[next];
      if (card) get().markSeen(card.id);
      if (next >= cards.length - 3) get().loadMore();
    }
  },

  goPrev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  likeCard: async (cardId) => {
    try {
      const { data } = await api.post(`/api/cards/${cardId}/like`);
      set((state) => ({
        cards: state.cards.map((c) => (c.id === cardId ? { ...c, liked: data.liked } : c)),
      }));
    } catch (err) {
      console.error('[FeedStore] Like failed:', err);
    }
  },

  saveCard: async (cardId) => {
    try {
      const { data } = await api.post(`/api/cards/${cardId}/save`);
      set((state) => ({
        cards: state.cards.map((c) => (c.id === cardId ? { ...c, saved: data.saved } : c)),
      }));
    } catch (err) {
      console.error('[FeedStore] Save failed:', err);
    }
  },

  flagCard: async (cardId, reason) => {
    try {
      await api.post(`/api/cards/${cardId}/flag`, { reason });
    } catch (err) {
      console.error('[FeedStore] Flag failed:', err);
    }
  },

  markSeen: async (cardId) => {
    try {
      await api.post(`/api/cards/${cardId}/seen`);
    } catch {
      // Best-effort
    }
  },

  generateCard: async (category) => {
    set({ isGenerating: true });
    try {
      const { data } = await api.post('/api/admin/generate', { category });
      if (data.card) {
        set((state) => ({ cards: [data.card, ...state.cards] }));
      }
    } catch (err) {
      console.error('[FeedStore] Generate failed:', err);
      throw err;
    } finally {
      set({ isGenerating: false });
    }
  },
}));
