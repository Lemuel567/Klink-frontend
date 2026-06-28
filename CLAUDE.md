# KlinkApp — Frontend (React Native / Expo)

---

## SECTION 1 — What This Project Is

This is the **mobile app frontend** for **Klink** — a fully online church management system. It is a React Native app built with Expo SDK 52, using expo-router for file-based navigation.

The backend REST API lives at `C:\Users\lemue\Desktop\demo5` (Spring Boot). This repo only contains the mobile app.

---

## SECTION 2 — Commands

Start the dev server (local WiFi mode — no tunnel):
```
npx expo start
```

Platform shortcuts:
```
npx expo start --android
npx expo start --ios
```
This is a MOBILE-ONLY app. There is no web target. Do not add `--web`, do not add react-native-web, react-dom, or @expo/metro-runtime.

Install dependencies after changing package.json:
```
npm install
```

---

## SECTION 3 — Tech Stack & Versions

| Package | Version |
|---------|---------|
| expo | ~52.0.0 |
| react | 18.3.1 |
| react-native | 0.76.9 |
| expo-router | ~4.0.17 |
| expo-asset | ~11.0.5 |
| expo-av | ~15.0.1 |
| expo-blur | ~14.0.1 |
| expo-clipboard | ~7.0.0 |
| expo-constants | ~17.0.3 |
| expo-font | ~13.0.1 |
| expo-haptics | ~14.0.0 |
| expo-image | ~2.0.1 |
| expo-linear-gradient | ~14.0.1 |
| expo-linking | ~7.0.3 |
| expo-secure-store | ~14.0.0 |
| expo-sensors | ~14.0.1 |
| expo-splash-screen | ~0.29.13 |
| expo-status-bar | ~2.0.0 |
| @shopify/flash-list | 1.7.3 |
| @tanstack/react-query | ^5.62.7 |
| axios | ^1.7.9 |
| lottie-react-native | 7.1.0 |
| react-native-gesture-handler | ~2.20.2 |
| react-native-reanimated | ~3.16.1 |
| react-native-safe-area-context | 4.12.0 |
| react-native-screens | ~4.4.0 |
| react-native-svg | 15.8.0 |
| zustand | ^5.0.2 |
| @react-navigation/native | ^6.1.18 |
| @react-navigation/bottom-tabs | ^6.6.1 |
| @react-navigation/stack | ^6.4.1 |
| @expo-google-fonts/inter | ^0.4.2 |
| @expo-google-fonts/playfair-display | ^0.4.2 |

---

## SECTION 4 — Package Structure

```
KlinkApp/
├── app/                    — expo-router screens (file-based routing)
│   ├── _layout.tsx         — root layout: QueryClient, GestureHandler, SafeArea, fonts
│   ├── index.tsx           — splash/redirect screen
│   ├── onboarding.tsx
│   ├── (auth)/             — login, register, verify screens
│   └── (tabs)/             — bottom tab screens (home, giving, members, etc.)
├── src/
│   ├── api/
│   │   ├── client.ts       — axios instance with JWT refresh interceptor
│   │   └── endpoints/      — per-feature API functions
│   ├── store/
│   │   ├── authStore.ts    — Zustand: user, tokens, login/logout/initialize
│   │   ├── churchStore.ts  — Zustand: church settings
│   │   └── notificationStore.ts
│   ├── hooks/              — custom React hooks per feature
│   ├── components/         — shared UI components
│   ├── theme/              — colors, typography, spacing
│   └── utils/
│       └── constants.ts    — ENV switch, LAPTOP_WIFI_IP, API_BASE_URL
├── assets/                 — icon, splash, fonts
├── app.json
├── babel.config.js
└── package.json
```

---

## SECTION 5 — Testing on iPhone (Expo Go)

**Current laptop WiFi IP:** `172.20.10.3`
**Backend API:** `http://172.20.10.3:8080/api/v1`
**Metro URL (iPhone):** `exp://172.20.10.3:8081`

Both the laptop and iPhone must be on the **same WiFi network**.

To change the IP (e.g. on a different network), edit `src/utils/constants.ts`:
```ts
const LAPTOP_WIFI_IP = '172.20.10.3'; // ← update this line
```

The `ENV` constant in `constants.ts` controls which backend URL is used:
- `'wifi'` — real device on same WiFi (default)
- `'emulator'` — Android emulator (uses 10.0.2.2)
- `'staging'` / `'prod'` — remote servers

---

## SECTION 6 — Auth & API Contract

### CRITICAL: Backend AuthResponse shape (flat — no nesting)
```typescript
// Backend returns this exact shape from: /auth/login, /auth/verify-email, /auth/refresh
{
  token: string,        // ← field is "token" NOT "accessToken"
  refreshToken: string,
  memberId: string,
  churchId: string,
  churchCode: string,
  role: string,
  fullName: string,
  emailVerified: boolean,
  phoneVerified: boolean
}
```

### CRITICAL: Auth flow (registration)
1. `POST /auth/register` or `POST /auth/register-church` → returns `{ message: string }` only
2. Backend sends verification email automatically
3. Navigate to verify screen with `?email=...` query param
4. `POST /auth/verify-email { email, code }` → returns full `AuthResponse` (tokens issued HERE)
5. Call `authStore.login(authResponse)` to store tokens, then navigate to home

### CRITICAL: registerChurch field names
```typescript
// CORRECT:
{ pastorEmail, pastorPassword, pastorName, churchName, location }
// WRONG (do not use):
{ email, password }
```

### FCM token endpoint
`PUT /members/me/fcm-token` with body `{ token: string }` — NOT `/auth/fcm-token`

### Token storage
- Stored in `expo-secure-store` under `SECURE_KEYS.accessToken` / `.refreshToken`
- Access token TTL: 15 min; refresh token: 30 days
- `client.ts` handles refresh rotation automatically (queues concurrent 401s)
- `authStore.initialize()` is called on app mount to restore tokens from secure store

### Key API mismatches (already fixed)
- `offering`: sends `{ serviceDate, amount }` — no `paymentMonth`
- `welfare`: sends `{ memberId, amountPaid, paymentDate, paymentMonth }` — field is `amountPaid`
- `welfare/defaulters` and `welfare/remind`: require `?month=YYYY-MM` query param
- `GET /members/{id}/qr`: returns raw string, not `{ qrCodeValue }` object
- `Facility.condition`: backend JSON field is `condition` (not `conditionStatus`)

---

## SECTION 7 — Key Notes for Claude Code

- Entry point is `expo-router/entry` (set in `package.json` `main` field)
- `babel.config.js` must include `react-native-reanimated/plugin` — do not remove it
- `app.json`: name=KlinkApp, slug=klink-app, scheme=klinkapp, sdkVersion=52.0.0
- All monetary values use strings or `number` — backend uses `BigDecimal`
- `church_id` never comes from local state; always from the JWT via the backend
- Do NOT add tunnel mode (`--tunnel`) — use WiFi mode only
- `@expo/ngrok` is NOT installed and must not be added
- No Flyway, no backend schema in this repo — this is frontend only
- Use `expo-image` (not `react-native` Image) for all image rendering
- Use `@shopify/flash-list` (not FlatList) for all long lists
- Fonts: PlayfairDisplay (headings) and Inter (body) loaded via expo-google-fonts

---

## SECTION 8 — Audio System

### Overview
Two audio features built with `expo-av ~15.0.1`:
1. **Splash chime** — plays once when the app opens, auto-stops after 3 sec
2. **Global background music** — soft worship song loops at volume 0.25 across **every screen**

### Audio files (committed to repo — both present in `assets/audio/`)
Metro requires both MP3 files at build time. They MUST exist before `npx expo start`.

| File | Size | Purpose | Volume | Notes |
|------|------|---------|--------|-------|
| `app-open.mp3` | ~1.9 MB | Splash chime | 0.8 | Fallback copy of worship-background.mp3 — replace with real 2–3 sec chime when available |
| `worship-background.mp3` | ~1.9 MB | Global background loop | 0.25 | Loops across every screen; pauses on app background |

To upgrade `app-open.mp3`: search **pixabay.com/music** for `"church bell"` or `"worship chime"` (free commercial), drop in `assets/audio/`.

### Key files
| File | Role |
|------|------|
| `src/utils/soundManager.ts` | Singleton: expo-av Audio.Sound, triple-guard for double-play prevention |
| `src/store/soundStore.ts` | Zustand: `musicEnabled` (reactive); persists to SecureStore; syncs soundManager |
| `src/hooks/useSounds.ts` | Hook wrapper: all soundManager methods + `isMusicEnabled`/`setMusicEnabled` |
| `src/components/common/MusicIndicator.tsx` | Floating "♪ Playing" pill; visible on every screen; pulse animation; tap → Profile |
| `src/utils/constants.ts` | `STORAGE_KEYS.musicEnabled = 'music_enabled'` |

### Music is managed globally in `app/_layout.tsx`
- `prepare()` awaits all store initializations, then calls `soundManager.playBackgroundMusic()` if enabled
- Single `AppState` listener at root level pauses on `background`/`inactive`, resumes on `active`
- `<MusicIndicator />` rendered in `_layout.tsx` — floats over every screen

### Music does NOT stop when navigating between screens
Previously managed on the home tab (stopped on unmount). Now managed at the root layout — music never stops due to navigation.

### Behaviour per screen
| Screen | Music behaviour |
|--------|----------------|
| **Splash** | `soundManager.playAppOpen()` fires on mount; auto-stops at 3 sec |
| **Home, Members, Giving, Profile, etc.** | Music plays continuously — no per-screen music code |
| **Profile toggle** | `setMusicEnabled()` + direct `playBackgroundMusic()`/`stopBackgroundMusic()` + KlinkToast |
| **Sermon detail** | Sermon audio PAUSES background music; background music RESUMES when sermon pauses/ends/user leaves |

### Preference sync chain
```
SecureStore ←→ soundStore (Zustand, reactive UI)
                    ↕ setMusicEnabled() syncs both
              soundManager.musicEnabled (in-memory flag)
```

### Triple guard in `playBackgroundMusic()`
```ts
if (!this.musicEnabled) return;
if (this.isMusicPlaying || this.isLoadingMusic || this.backgroundMusic !== null) return;
```
Prevents duplicate audio streams regardless of how many callers fire concurrently.

### Sermon audio player
`app/sermons/[id].tsx` has a real expo-av audio player:
- On PLAY: pauses background music, loads and plays `sermon.audioUrl`
- On PAUSE: resumes background music if enabled
- On FINISH: resumes background music if enabled
- On UNMOUNT: stops sermon audio, resumes background music

### Graceful degradation
All soundManager methods wrapped in try-catch. Corrupt files degrade silently — no crash, no user-visible error.

---

## SECTION 9 — Defensive Coding Patterns (Added 2026-06-28)

### Error Boundary
`src/components/common/ErrorBoundary.tsx` wraps the entire app in `_layout.tsx`.
Any unhandled render error shows a "Try Again" screen instead of a white crash screen.

### Offline Detection
`src/store/networkStore.ts` — Zustand store with `isOffline` boolean.
`src/api/client.ts` interceptor sets `isOffline = true` on network-level failures, `false` on any success.
`src/components/common/OfflineBanner.tsx` slides in from top when offline, slides out when reconnected.
Both are rendered in `app/_layout.tsx` so they appear on every screen.

### Retry Logic
`src/api/client.ts` retries automatically:
- Network errors (ERR_NETWORK): up to 2 retries, 1s / 2s delay
- 5xx server errors: up to 2 retries
- 4xx errors (400, 401, 403, 404, 409, 429): never retried
- Timeout errors: never retried

### Friendly Error Messages
`friendlyNetworkMessage()` in `client.ts` translates all AxiosError into user-facing English.
Never shows "Network Error", "TypeError", or raw exception text to users.

### Session Timeout Warning
`app/_layout.tsx` schedules an Alert 2 minutes before JWT expiry.
`authStore.login()` saves `SECURE_KEYS.tokenExpiry = Date.now() + ACCESS_TOKEN_TTL_MS` to SecureStore.
Alert offers "Stay signed in" (triggers queryClient.invalidateQueries) or "Sign out".

### Music Stops on Logout
`authStore.logout()` calls `soundManager.stopBackgroundMusic()` before clearing auth state.
No music bleeding across logout/login cycles.

### Form Validation (Client-Side)
- **Register**: full name required; at least one of email or phone required; email format validated; password min 8 chars; passwords must match; church code required for join mode; church name required for create mode.
- **Giving**: amount must parse as a number > 0 before submission; inline error shown below field.

### Global Unhandled Error Handler
`app/_layout.tsx` installs `global.ErrorUtils.setGlobalHandler` to log any unhandled JS exception.

### React Query Retry Config
`queryClient` configured with: no retry on 4xx, up to 2 retries on 5xx with exponential backoff.
Mutations have `retry: false` globally — failed mutations do not auto-retry.

### Safe Array Usage
Use optional chaining on all data from API responses:
- `data?.pages?.flatMap(p => p.content) ?? []`
- `announcements?.content?.map(...) ?? []`
Never call `.map()` on a value that could be undefined.

### Safe Navigation After Login
`router.replace('/(tabs)/home')` used after login — back button cannot return to the login screen.

---

## SECTION 10 — babel.config.js (do not modify)

```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```
