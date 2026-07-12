# How to Test Klink on iPhone

## Method 1 — Cloudflare Tunnel (works everywhere: LTE, school WiFi, hotspot)

⚠ On this network ngrok (`expo start --tunnel`) and localtunnel are BLOCKED —
Cloudflare quick tunnels ride on outbound HTTPS/443 and get through.
Two tunnels are needed — one for the app bundle, one for the API:

```
# Terminal 1 — backend
cd C:\Users\lemue\Desktop\demo5
.\mvnw.cmd spring-boot:run

# Terminal 2 — backend tunnel
cd C:\Users\lemue\Desktop\KlinkApp
npm run tunnel:backend
# prints a random https://xxxx.trycloudflare.com URL
# → paste it into TUNNEL_API_URL in src/utils/constants.ts (keep /api/v1 suffix)

# Terminal 3 — Metro tunnel (start BEFORE Metro so you know the URL)
npm run tunnel:metro
# prints another https://yyyy.trycloudflare.com URL

# Terminal 4 — Metro, advertising the tunnel URL
# CRITICAL: without EXPO_PACKAGER_PROXY_URL the manifest points Expo Go at
# port :8081 on the tunnel host, which Cloudflare doesn't serve → app never loads.
$env:EXPO_PACKAGER_PROXY_URL = 'https://yyyy.trycloudflare.com'   # ← Metro tunnel URL
npx expo start
```

Make sure `ENV = 'tunnel'` in `src/utils/constants.ts`.
On the iPhone: open **Expo Go → Enter URL manually** → type the METRO tunnel URL
(`https://yyyy.trycloudflare.com`) → Connect. Works on any network, including LTE.
NOTE: trycloudflare URLs change every run — update TUNNEL_API_URL each session.

## Method 2 — Same WiFi / Hotspot Network

1. Both devices on the SAME network (e.g. laptop joined to iPhone hotspot)
2. Set `ENV = 'wifi'` in `src/utils/constants.ts`
3. Run: `npm start` (pins Metro to the hotspot IP)
4. Expo Go → Enter URL manually → `exp://172.20.10.3:8081`

In wifi mode the API URL auto-derives from the Metro host, so a changed
laptop IP only needs the `start` script + `LAPTOP_WIFI_IP` updated.

## Finding Your Laptop IP

PowerShell: `ipconfig` → "Wireless LAN adapter Wi-Fi" → IPv4 Address.
⚠ Ignore `192.168.56.1` — that is the VirtualBox adapter, not a real network.

## Common Errors and Fixes

| Error | Fix |
|---|---|
| Request timed out | Use tunnel mode (`npm run start:tunnel`) — school WiFi and LTE block LAN access |
| Unable to connect | Run `fix-firewall-complete.ps1` as Administrator |
| API calls fail in tunnel mode | Is `npm run tunnel:backend` running? Does its URL match `TUNNEL_API_URL`? |
| HTML instead of JSON from API | The `Bypass-Tunnel-Reminder` header is set in `src/api/client.ts` — don't remove it |
| Unmatched Route | `npx expo start --clear` |
| Tunnel URL never appears | First run downloads ngrok — wait ~1 min; check internet |

## Note on web

This project is mobile-only by design (no react-native-web). Use tunnel mode
instead of a web fallback.
