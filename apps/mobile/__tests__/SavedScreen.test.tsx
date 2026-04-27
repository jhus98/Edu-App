import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('../src/utils/api');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const api = require('../src/utils/api');

const mockSavedCards = [
  {
    id: 'card-1',
    title: 'The Great Wall is not visible from space',
    body: 'Despite the popular myth, the Great Wall of China is not visible from space with the naked eye.',
    category: 'GEOGRAPHY',
    sourceTitle: 'NASA',
    sourceUrl: 'https://www.nasa.gov',
    confidenceScore: 95,
    version: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'card-2',
    title: 'Honey never spoils',
    body: 'Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.',
    category: 'HISTORY',
    sourceTitle: 'Smithsonian',
    sourceUrl: 'https://www.smithsonianmag.com',
    confidenceScore: 98,
    version: 1,
    createdAt: new Date().toISOString(),
  },
];

describe('SavedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders saved cards', async () => {
    api.default = { get: jest.fn().mockResolvedValue({ data: mockSavedCards }) };

    const { SavedScreen } = require('../src/screens/SavedScreen');
    const { getByText } = render(<SavedScreen />);

    await waitFor(() => {
      expect(getByText('The Great Wall is not visible from space')).toBeTruthy();
      expect(getByText('Honey never spoils')).toBeTruthy();
    });
  });

  it('shows count of saved cards', async () => {
    api.default = { get: jest.fn().mockResolvedValue({ data: mockSavedCards }) };

    const { SavedScreen } = require('../src/screens/SavedScreen');
    const { getByText } = render(<SavedScreen />);

    await waitFor(() => {
      expect(getByText('2 facts saved')).toBeTruthy();
    });
  });

  it('shows empty state when no cards saved', async () => {
    api.default = { get: jest.fn().mockResolvedValue({ data: [] }) };

    const { SavedScreen } = require('../src/screens/SavedScreen');
    const { getByText } = render(<SavedScreen />);

    await waitFor(() => {
      expect(getByText('Nothing saved yet')).toBeTruthy();
      expect(getByText('Save facts to build your collection')).toBeTruthy();
    });
  });

  it('shows singular "fact" for one saved card', async () => {
    api.default = { get: jest.fn().mockResolvedValue({ data: [mockSavedCards[0]] }) };

    const { SavedScreen } = require('../src/screens/SavedScreen');
    const { getByText } = render(<SavedScreen />);

    await waitFor(() => {
      expect(getByText('1 fact saved')).toBeTruthy();
    });
  });
});
