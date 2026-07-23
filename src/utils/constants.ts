import Constants from 'expo-constants';

// ─── ENVIRONMENT SWITCH ───────────────────────────────────────────────────────
// Change this ONE line to switch environments:
//   'tunnel'   → Expo tunnel + localtunnel backend (works on ANY network / LTE)
//   'wifi'     → iPhone / real device on same WiFi as laptop
//   'emulator' → Android emulator (10.0.2.2)
//   'staging'  → staging server
//   'prod'     → production server
// 'wifi' is the normal dev mode (phone + laptop on the same network; the API
// host is auto-derived from wherever Metro served the bundle — see getBaseUrl).
const ENV: 'emulator' | 'wifi' | 'tunnel' | 'staging' | 'prod' = 'wifi';

// ─── YOUR LAPTOP'S WIFI IP (wifi mode only) ──────────────────────────────────
// Fallback only — wifi mode normally auto-derives the IP from the Metro hostUri.
// Windows Mobile Hotspot = 192.168.137.1; iPhone Personal Hotspot = 172.20.10.2.
const LAPTOP_WIFI_IP = '192.168.137.1';

// ─── BACKEND TUNNEL URL (tunnel mode only) ───────────────────────────────────
// Started with: npm run tunnel:backend (cloudflared). The trycloudflare URL is
// RANDOM per run — paste the new one here each session (keep the /api/v1 suffix).
const TUNNEL_API_URL = 'https://alberta-navy-smithsonian-calculations.trycloudflare.com/api/v1';

// ─── BASE URL LOGIC ──────────────────────────────────────────────────────────
function getBaseUrl(): string {
  // PRODUCTION GUARD: a release build must NEVER ship pointed at a dev target.
  // Without this, forgetting to flip ENV before an EAS build would ship an app
  // that dials the laptop's LAN IP (or a dead tunnel) over cleartext http — a
  // 100% outage for every installed copy. Dev behaviour is unchanged: __DEV__
  // is true in Expo Go / dev builds, so the switch below still applies there.
  if (!__DEV__) {
    return 'https://api.klink.app/api/v1';
  }
  switch (ENV) {
    case 'tunnel':
      return TUNNEL_API_URL;
    case 'emulator':
      return 'http://10.0.2.2:8080/api/v1';
    case 'wifi': {
      // Auto-derive the backend URL from the Metro host the app was loaded from —
      // survives IP AND mode changes without editing this file.
      const hostUri = Constants.expoConfig?.hostUri;
      const host = hostUri?.split(':')[0];
      // Loaded through a Cloudflare tunnel (start-klink.ps1) → the laptop is on a
      // different network; use the tunnel URL the launcher wrote above.
      if (host?.endsWith('.trycloudflare.com')) {
        return TUNNEL_API_URL;
      }
      if (host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
        return `http://${host}:8080/api/v1`;
      }
      return `http://${LAPTOP_WIFI_IP}:8080/api/v1`;
    }
    case 'staging':
      return 'https://staging.klink.app/api/v1';
    case 'prod':
      return 'https://api.klink.app/api/v1';
  }
}

export const API_BASE_URL = getBaseUrl();

// ─── HTTP CLIENT ─────────────────────────────────────────────────────────────
// 60s: tunnel round-trips + first-request cold paths are slow; 30s caused
// false "offline" errors on iPhone over Cloudflare tunnels.
export const TIMEOUT_MS = 60_000;
// Auth requests (login/register/verify) fail fast — a wrong password or an
// unreachable server must show a message in seconds, not spin for a minute.
export const AUTH_TIMEOUT_MS = 15_000;
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
