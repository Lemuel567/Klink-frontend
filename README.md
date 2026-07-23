# Klink — Frontend

Klink is a church management platform. This repository contains the mobile
app: a React Native app (iOS/Android only, no web) built with Expo, using a
dark-glass worship visual identity — full-bleed rotating worship photos,
translucent glass surfaces, parallax scrolling, and smooth animated motion.

## What Klink Does

Klink helps churches manage their day-to-day ministry in one app:

- **Members** — profiles and directory
- **Giving** — online giving via Paystack
- **Projects** — church projects and fundraising
- **Groups** — small groups / ministries
- **Attendance** — service and event attendance tracking
- **Sermons** — sermon archive
- **Announcements** — church-wide announcements
- **Prayer Wall** — submit and view prayer requests
- **Store** — church store / merchandise
- **Account Security** — SMS / email verification

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 54 |
| Core | React 19.1 · React Native 0.81 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router 6 (typed routes) |
| Animation | React Native Reanimated 4 (worklets) |
| Data fetching | TanStack Query 5 (+ AsyncStorage persistence) |
| State | Zustand |
| HTTP client | Axios |

## Design Notes

- Dark mode only, by design — there is no light theme
- Parallax scrolling, glassmorphism surfaces, particle/dove/thermometer
  animations throughout
- Global background worship music with crossfades between tracks
- Push notifications require a **native dev build** — they silently do
  nothing in Expo Go (see Testing section below)

## Getting Started

```bash
npm install
npx expo start
```

> `.npmrc` sets `legacy-peer-deps=true`. This is required because some
> packages haven't updated their peer dependency ranges for React 19 yet.
> Don't remove it.

## Testing on a Physical Device

Campus Wi-Fi isolates devices from each other, so a direct connection won't
work out of the box. Two options — full step-by-step instructions are in
**HOW-TO-TEST-IPHONE.md**.

**Option A — Laptop hotspot (preferred, faster, LAN)**
1. Turn on Windows Mobile Hotspot on your laptop
2. Connect your phone to it (laptop will be `192.168.137.1`)
3. Set `ENV = 'wifi'` in `src/utils/constants.ts`
4. Open your firewall for TCP ports `8080` and `8081`
5. Run `npm start`

**Option B — Cloudflare tunnel (fallback, works on any network, slower)**
1. Set `ENV = 'tunnel'` in `src/utils/constants.ts`
2. Paste the session's `trycloudflare` backend URL into `TUNNEL_API_URL`

## Related Repository

This repo is the mobile app **only**. The backend is a separate Spring Boot
REST API:

- Klink-backend (github.com/Lemuel567/Klink-backend) — lives alongside this
  repo at `../Klink-backend`  nothing in Expo Go (see Testing section below)

## Getting Started
npm install
npx expo start

> `.npmrc` sets `legacy-peer-deps=true` — this is required because some
> packages haven't updated their peer dependency ranges for React 19 yet.
> Don't remove it.

## Testing on a Physical Device

Campus Wi-Fi isolates devices from each other, so a direct connection won't
work out of the box. Two options — full step-by-step instructions are in
**HOW-TO-TEST-IPHONE.md**.

**Option A — Laptop hotspot (preferred, faster, LAN)**
1. Turn on Windows Mobile Hotspot on your laptop
2. Connect your phone to it (laptop will be `192.168.137.1`)
3. Set `ENV = 'wifi'` in `src/utils/constants.ts`
4. Open your firewall for TCP ports `8080` and `8081`
5. Run `npm start`

**Option B — Cloudflare tunnel (fallback, works on any network, slower)**
1. Set `ENV = 'tunnel'` in `src/utils/constants.ts`
2. Paste the session's `trycloudflare` backend URL into `TUNNEL_API_URL`

## Related Repository

This repo is the mobile app **only**. The backend is a separate Spring Boot
REST API:

- Klink-backend (github.com/Lemuel567/Klink-backend) — lives alongside this
  repo at `../Klink-backend`
