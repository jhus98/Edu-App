import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../src/store/feedStore');
jest.mock('../src/store/authStore');
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const { useFeedStore } = require('../src/store/feedStore');
const { useAuthStore } = require('../src/store/authStore');

const mockCard = {
  id: 'card-1',
  title: 'Octopuses have three hearts',
  body: 'Octopuses have three hearts: two pump blood to the gills, while the third pumps it to the rest of the body.',
  sourceTitle: 'National Geographic',
  sourceUrl: 'https://www.nationalgeographic.com',
  category: 'SCIENCE',
  confidenceScore: 92,
  version: 1,
  createdAt: new Date().toISOString(),
  liked: false,
  saved: false,
};

const mockFeedStore = {
  cards: [mockCard],
  currentIndex: 0,
  isLoading: false,
  isGenerating: false,
  selectedCategory: null,
  hasMore: true,
  nextCursor: null,
  setCategory: jest.fn(),
  loadFeed: jest.fn(),
  loadMore: jest.fn(),
  goNext: jest.fn(),
  goPrev: jest.fn(),
  likeCard: jest.fn(),
  saveCard: jest.fn(),
  flagCard: jest.fn(),
  markSeen: jest.fn(),
  generateCard: jest.fn(),
};

const mockAuthStore = {
  user: { id: 'user-1', username: 'testuser', role: 'USER', streakCount: 5, preferences: {} },
  token: 'mock-token',
  isLoading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  loadStoredAuth: jest.fn(),
};

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFeedStore.mockImplementation((selector: any) =>
      selector ? selector(mockFeedStore) : mockFeedStore
    );
    useAuthStore.mockImplementation((selector: any) =>
      selector ? selector(mockAuthStore) : mockAuthStore
    );
  });

  it('renders card title', async () => {
    const { FeedScreen } = require('../src/screens/FeedScreen');
    const { getByText } = render(<FeedScreen />);

    await waitFor(() => {
      expect(getByText('Octopuses have three hearts')).toBeTruthy();
    });
  });

  it('renders card body text', async () => {
    const { FeedScreen } = require('../src/screens/FeedScreen');
    const { getByText } = render(<FeedScreen />);

    await waitFor(() => {
      expect(getByText(/Octopuses have three hearts/)).toBeTruthy();
    });
  });

  it('calls loadFeed on mount', async () => {
    const { FeedScreen } = require('../src/screens/FeedScreen');
    render(<FeedScreen />);

    await waitFor(() => {
      expect(mockFeedStore.loadFeed).toHaveBeenCalledWith(true);
    });
  });

  it('shows loading state when no cards and loading', () => {
    useFeedStore.mockImplementation((selector: any) => {
      const store = { ...mockFeedStore, cards: [], isLoading: true };
      return selector ? selector(store) : store;
    });

    const { FeedScreen } = require('../src/screens/FeedScreen');
    const { getByText } = render(<FeedScreen />);

    expect(getByText('Loading Luminary...')).toBeTruthy();
  });

  it('shows empty state when no cards and not loading', () => {
    useFeedStore.mockImplementation((selector: any) => {
      const store = { ...mockFeedStore, cards: [], isLoading: false };
      return selector ? selector(store) : store;
    });

    const { FeedScreen } = require('../src/screens/FeedScreen');
    const { getByText } = render(<FeedScreen />);

    expect(getByText('All caught up!')).toBeTruthy();
  });

  it('renders streak badge for authenticated user', async () => {
    const { FeedScreen } = require('../src/screens/FeedScreen');
    const { getByText } = render(<FeedScreen />);

    await waitFor(() => {
      expect(getByText('🔥 5')).toBeTruthy();
    });
  });
});
