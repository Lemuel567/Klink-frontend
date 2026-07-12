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
      // Device may be online while the server/tunnel is unreachable — don't
      // blame the user's internet.
      return 'Cannot reach the server. Please try again.';
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
  headers: {
    'Content-Type': 'application/json',
    // localtunnel serves an HTML interstitial to requests without this header;
    // required in tunnel mode, harmless in wifi/emulator/prod modes.
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// ── Request interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(SECURE_KEYS.accessToken).catch(() => null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Only declare "offline" after several consecutive network-level failures —
// a single slow/tunnelled request must not flash the offline banner.
const OFFLINE_AFTER_FAILURES = 3;
let consecutiveNetworkFailures = 0;

// ── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // Successful response — we're online
    consecutiveNetworkFailures = 0;
    getSetOffline()(false);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // Detect offline state (with grace: 3 strikes before the banner shows)
    if (!error.response) {
      consecutiveNetworkFailures += 1;
      if (consecutiveNetworkFailures >= OFFLINE_AFTER_FAILURES) {
        getSetOffline()(true);
      }
    } else {
      consecutiveNetworkFailures = 0;
      getSetOffline()(false);
    }

    // ── 401 → try token refresh ────────────────────────────────────────────
    // NEVER for public auth endpoints: a 401 from /auth/login means "wrong
    // credentials", not "expired session" — running the refresh dance there
    // masked every login error as "Session expired. Please log in again."
    const reqUrl = originalRequest.url ?? '';
    const isPublicAuthCall = [
      '/auth/login', '/auth/register', '/auth/refresh', '/auth/verify',
      '/auth/resend', '/auth/forgot-password', '/auth/reset-password',
    ].some((p) => reqUrl.includes(p));

    if (error.response?.status === 401 && !originalRequest._retry && !isPublicAuthCall) {
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
