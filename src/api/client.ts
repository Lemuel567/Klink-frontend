import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, SECURE_KEYS, TIMEOUT_MS } from '../utils/constants';

// Lazy import to avoid circular dependency at module init time
let _setOffline: ((v: boolean) => void) | null = null;
function getSetOffline() {
  if (!_setOffline) {
    _setOffline = require('../store/networkStore').useNetworkStore.getState().setOffline;
  }
  return _setOffline!;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// Translate raw network / server errors into user-facing messages
function friendlyNetworkMessage(error: AxiosError): string {
  if (!error.response) {
    // No response at all — network level failure
    const code = error.code ?? '';
    if (code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (code === 'ERR_NETWORK' || code === 'NETWORK_ERROR')
      return 'No internet connection. Please check your network.';
    return 'Could not reach the server. Please try again.';
  }

  const status = error.response.status;
  const data = error.response.data as { message?: string; error?: string } | null;
  const backendMsg = data?.message ?? data?.error;

  if (backendMsg) return backendMsg;

  // Generic fallbacks by status
  if (status === 400) return 'Invalid request. Please check your input.';
  if (status === 401) return 'Session expired. Please log in again.';
  if (status === 403) return 'You do not have permission for this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) return 'A conflict occurred. Please refresh and try again.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'Server error. Please try again in a moment.';
  return 'An unexpected error occurred. Please try again.';
}

// Retry logic: only on network-level errors and 5xx, not on 4xx
async function withRetry(
  fn: () => Promise<any>,
  maxRetries = 2,
  delayMs = 1000,
): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const shouldRetry =
        attempt < maxRetries &&
        (!err.response || err.response.status >= 500) &&
        err.code !== 'ECONNABORTED';
      if (!shouldRetry) break;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(SECURE_KEYS.accessToken).catch(() => null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // Successful response — we're online
    getSetOffline()(false);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // Detect offline state
    if (!error.response) {
      getSetOffline()(true);
    } else {
      getSetOffline()(false);
    }

    // ── 401 → try token refresh ────────────────────────────────────────────
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
        const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken).catch(() => null);
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const newAccessToken: string = data.token;
        const newRefreshToken: string = data.refreshToken;

        await Promise.all([
          SecureStore.setItemAsync(SECURE_KEYS.accessToken, newAccessToken),
          SecureStore.setItemAsync(SECURE_KEYS.refreshToken, newRefreshToken),
        ]);

        onRefreshed(newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        await Promise.all([
          SecureStore.deleteItemAsync(SECURE_KEYS.accessToken).catch(() => {}),
          SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken).catch(() => {}),
        ]);
        throw Object.assign(error, { isAuthExpired: true, friendlyMessage: 'Session expired. Please log in again.' });
      }
    }

    // ── Retry on transient network errors ──────────────────────────────────
    if (!originalRequest._retry) {
      const retryCount = originalRequest._retryCount ?? 0;
      const isTransient =
        !error.response || error.response.status >= 500;
      const isTimeout = error.code === 'ECONNABORTED';

      if (isTransient && !isTimeout && retryCount < 2) {
        originalRequest._retryCount = retryCount + 1;
        const delay = 1000 * (retryCount + 1);
        await new Promise((r) => setTimeout(r, delay));
        return apiClient(originalRequest);
      }
    }

    // ── Attach friendly message to every error ─────────────────────────────
    const msg = friendlyNetworkMessage(error);
    throw Object.assign(error, { friendlyMessage: msg });
  },
);
