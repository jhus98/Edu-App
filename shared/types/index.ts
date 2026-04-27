import { Category } from '../constants/categories';

export type CardStatus =
  | 'PENDING_AUTO'
  | 'PENDING_HUMAN'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED';

export interface Card {
  id: string;
  title: string;
  body: string;
  sourceTitle: string;
  sourceUrl: string;
  category: Category;
  status: CardStatus;
  confidenceScore: number;
  version: number;
  createdAt: string;
  approvedAt?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'EDITOR' | 'ADMIN';
  streakCount: number;
  lastActiveAt: string;
  preferences: {
    categories: Category[];
    notificationsEnabled: boolean;
  };
}

export interface UserCardInteraction {
  id: string;
  userId: string;
  cardId: string;
  liked: boolean;
  saved: boolean;
  flagged: boolean;
  seenAt: string;
}

export interface FeedResponse {
  cards: Card[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface VerificationResult {
  sourceCheck: { passed: boolean; details: Record<string, unknown> };
  aiFactCheck: { passed: boolean; confidence: number; issues: string };
  claimCrossRef: { passed: boolean; details: Record<string, unknown> };
  confidenceScore: number;
}
