import { Platform } from 'react-native';

// Switch this one line to change environment
const ENV: 'local' | 'staging' | 'prod' = 'local';

const ANDROID_EMULATOR_HOST = '10.0.2.2';
const LOCAL_HOST = 'localhost';

function getBaseUrl(): string {
  if (ENV === 'prod') return 'https://api.klink.app/api/v1';
  if (ENV === 'staging') return 'https://staging.klink.app/api/v1';
  const host = Platform.OS === 'android' ? ANDROID_EMULATOR_HOST : LOCAL_HOST;
  return `http://${host}:8080/api/v1`;
}

export const API_BASE_URL = getBaseUrl();

export const TIMEOUT_MS = 30_000;
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
export const MAX_PAGE_SIZE = 20;

// Secure store keys
export const SECURE_KEYS = {
  accessToken: 'klink_access_token',
  refreshToken: 'klink_refresh_token',
  tokenExpiry: 'klink_token_expiry',
} as const;

// Async storage keys (non-sensitive)
export const STORAGE_KEYS = {
  colorScheme: 'klink_color_scheme',
  onboardingComplete: 'klink_onboarding_done',
  fcmToken: 'klink_fcm_token',
} as const;

// Pagination
export const PAGE_SIZE = 20;
export const ATTENDANCE_PAGE_SIZE = 50;

// Animation
export const PARALLAX_RATIO_BG = 0.3;
export const PARALLAX_RATIO_MID = 0.6;
export const HEADER_COLLAPSE_AT = 80;
