import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
          await AsyncStorage.setItem('auth_token', data.token);
          await AsyncStorage.setItem('refresh_token', data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return axios(error.config);
        } catch {
          await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user']);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
