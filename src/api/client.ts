import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, SECURE_KEYS, TIMEOUT_MS } from '../utils/constants';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(SECURE_KEYS.accessToken);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        // Backend AuthResponse uses "token" field, not "accessToken"
        const newAccessToken: string = data.token;
        const newRefreshToken: string = data.refreshToken;

        await SecureStore.setItemAsync(SECURE_KEYS.accessToken, newAccessToken);
        await SecureStore.setItemAsync(SECURE_KEYS.refreshToken, newRefreshToken);

        onRefreshed(newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        await SecureStore.deleteItemAsync(SECURE_KEYS.accessToken);
        await SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken);
        // Signal auth store to log out
        throw Object.assign(error, { isAuthExpired: true });
      }
    }

    // Extract backend error message
    const message =
      (error.response?.data as { message?: string; error?: string })?.message ??
      (error.response?.data as { message?: string; error?: string })?.error ??
      error.message ??
      'An error occurred';

    throw Object.assign(error, { friendlyMessage: message });
  },
);
