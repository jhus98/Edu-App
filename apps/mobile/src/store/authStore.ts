import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'EDITOR' | 'ADMIN';
  streakCount: number;
  preferences: { categories: string[]; notificationsEnabled: boolean };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    await AsyncStorage.setItem('auth_token', data.token);
    await AsyncStorage.setItem('refresh_token', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  register: async (email, username, password) => {
    const { data } = await api.post('/api/auth/register', { email, username, password });
    await AsyncStorage.setItem('auth_token', data.token);
    await AsyncStorage.setItem('refresh_token', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user']);
    set({ user: null, token: null });
  },

  loadStoredAuth: async () => {
    try {
      const [token, userStr] = await AsyncStorage.multiGet(['auth_token', 'user']);
      if (token[1] && userStr[1]) {
        set({ token: token[1], user: JSON.parse(userStr[1]) });
      }
    } catch {
      // Storage read failed
    } finally {
      set({ isLoading: false });
    }
  },
}));
