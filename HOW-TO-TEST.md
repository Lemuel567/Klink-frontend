# How to Test the Klink App

This is a **mobile-only** app (iOS/Android). There is no web target — do not
run `--web` or add react-native-web. The complete, current runbook is in
**HOW-TO-TEST-IPHONE.md**; this file is the quick version.

Project paths (repos moved off the Desktop 2026-06-15):
- Frontend: `C:\Users\lemue\IdeaProjects\klinkApp\Klink-frontend`
- Backend:  `C:\Users\lemue\IdeaProjects\klinkApp\Klink-backend`

---

## Start the backend
```powershell
cd C:\Users\lemue\IdeaProjects\klinkApp\Klink-backend
.\mvnw.cmd spring-boot:run
```
Wait for the "Started Demo5Application" log line (~90 s). Then check that
`GET http://localhost:8080/api/v1/health` returns `{status:UP}`.

---

## Method 1 — Laptop Windows Mobile Hotspot (LAN, fast) ✅ preferred
Campus Wi-Fi isolates devices from each other, so plain "same Wi-Fi" LAN
doesn't work. The phone instead joins a network the laptop broadcasts.

1. `ENV = 'wifi'` in `src/utils/constants.ts` (`LAPTOP_WIFI_IP = '192.168.137.1'`).
2. Turn on Windows Mobile Hotspot; join it from the iPhone.
3. Open the firewall once (elevated): allow inbound TCP 8080 and 8081
   (`New-NetFirewallRule -Profile Any …`), or run `fix-firewall.ps1` as Admin.
4. `npm start` (pins Metro to the hotspot IP).
5. iPhone → Expo Go → "Enter URL manually" → `exp://192.168.137.1:8081`.

## Method 2 — Cloudflare tunnel (any network, slower first load)
ngrok and localtunnel are blocked on this network, so use Cloudflare quick
tunnels instead.
1. `ENV = 'tunnel'` in `constants.ts`.
2. `npm run tunnel:backend` → paste the `trycloudflare` URL into `TUNNEL_API_URL` (keep `/api/v1`).
3. `npm run tunnel:metro` → note that URL.
4. `EXPO_PACKAGER_PROXY_URL=<metro-tunnel-url> npx expo start`.
5. iPhone → Expo Go → paste the Metro tunnel URL.

## Method 3 — Android emulator
`ENV = 'emulator'` (10.0.2.2), then `npx expo start --android`.

---

## Common errors & fixes
| Error | Fix |
|-------|-----|
| Request timed out | Use the hotspot (Method 1) or a tunnel — campus Wi-Fi blocks LAN |
| Unable to connect | Run `fix-firewall-complete.ps1` as Administrator |
| HTML instead of JSON from API | Keep the `Bypass-Tunnel-Reminder` header in `src/api/client.ts` |
| Unmatched Route / stale bundle | `npx expo start --clear`; fully quit + reopen Expo Go |
| Unable to resolve module | `npm install` |
| Push notifications never arrive | Expected in Expo Go — needs a native dev build (`eas build --profile development`) |

## Finding your laptop IP
PowerShell: `ipconfig` → "Wireless LAN adapter Wi-Fi" → IPv4 Address.
⚠ Ignore `192.168.56.1` (VirtualBox) and, when the hotspot is on, prefer `192.168.137.1`.
