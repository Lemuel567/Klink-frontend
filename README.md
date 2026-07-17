# Klink Frontend

React Native mobile app (iOS/Android only — no web) for the Klink church
management platform. Built with Expo, featuring a dark-glass worship visual
identity: full-bleed rotating worship photos, translucent glass surfaces,
parallax, and reanimated motion.

## Tech Stack
- Expo SDK 54
- React 19.1 · React Native 0.81
- TypeScript 5.9
- Expo Router 6 (typed routes)
- React Native Reanimated 4 (worklets)
- TanStack Query 5 (+ AsyncStorage persistence)
- Zustand
- Axios

## Features
- Worship-themed dark UI (dark mode only by design)
- Parallax scroll, glassmorphism, particle/dove/thermometer animations
- Global background worship music with crossfades
- Push notifications (needs a native dev build — see below)
- SMS / email verification
- Full church management: members, giving (Paystack), projects, groups,
  attendance, sermons, announcements, prayer wall, store, and more

## How to Run
```
npm install
npx expo start
```
`.npmrc` sets `legacy-peer-deps=true` — required (React 19 vs older peer ranges).

## Testing on a device
The full dev runbook lives in **the dev runbook** and **HOW-TO-TEST-IPHONE.md**.
Two paths work on campus Wi-Fi (which isolates devices):

- **Preferred — laptop Windows Mobile Hotspot (LAN, fast):** phone joins the
  hotspot (`192.168.137.1`); `ENV='wifi'` in `src/utils/constants.ts`; open the
  firewall for TCP 8080 + 8081; run `npm start`.
- **Fallback — Cloudflare tunnel (any network, slower):** `ENV='tunnel'`; paste
  the per-session `trycloudflare` backend URL into `TUNNEL_API_URL`.

> Push notifications only deliver in a native **dev build**
> (`eas build --profile development`) — they silently no-op in Expo Go.

## Backend
The Spring Boot REST API lives beside this repo at `../Klink-backend`
(github.com/Lemuel567/Klink-backend). This repo is the mobile app only.
