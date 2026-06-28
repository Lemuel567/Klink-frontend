// ─── ENVIRONMENT SWITCH ───────────────────────────────────────────────────────
// Change this ONE line to switch environments:
//   'emulator' → Android emulator (10.0.2.2)
//   'wifi'     → iPhone / real device on same WiFi as laptop
//   'staging'  → staging server
//   'prod'     → production server
const ENV: 'emulator' | 'wifi' | 'staging' | 'prod' = 'wifi';

// ─── YOUR LAPTOP'S WIFI IP ───────────────────────────────────────────────────
// Run `ipconfig` (Windows) or `ifconfig` (Mac) and paste your IPv4 address here
const LAPTOP_WIFI_IP = '172.20.10.3';

// ─── BASE URL LOGIC ──────────────────────────────────────────────────────────
function getBaseUrl(): string {
  switch (ENV) {
    case 'emulator':
      return 'http://10.0.2.2:8080/api/v1';
    case 'wifi':
      return `http://${LAPTOP_WIFI_IP}:8080/api/v1`;
    case 'staging':
      return 'https://staging.klink.app/api/v1';
    case 'prod':
      return 'https://api.klink.app/api/v1';
  }
}

export const API_BASE_URL = getBaseUrl();

// ─── HTTP CLIENT ─────────────────────────────────────────────────────────────
export const TIMEOUT_MS = 30_000;
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

// ─── SECURE STORE KEYS ───────────────────────────────────────────────────────
export const SECURE_KEYS = {
  accessToken: 'klink_access_token',
  refreshToken: 'klink_refresh_token',
  tokenExpiry: 'klink_token_expiry',
  user: 'klink_user',
} as const;

// ─── ASYNC STORAGE KEYS (non-sensitive) ──────────────────────────────────────
export const STORAGE_KEYS = {
  colorScheme: 'klink_color_scheme',
  onboardingComplete: 'klink_onboarding_done',
  fcmToken: 'klink_fcm_token',
  musicEnabled: 'music_enabled',
} as const;

// ─── PAGINATION ──────────────────────────────────────────────────────────────
export const PAGE_SIZE = 20;
export const ATTENDANCE_PAGE_SIZE = 50;

// ─── ANIMATION ───────────────────────────────────────────────────────────────
export const PARALLAX_RATIO_BG = 0.3;
export const PARALLAX_RATIO_MID = 0.6;
export const HEADER_COLLAPSE_AT = 80;
