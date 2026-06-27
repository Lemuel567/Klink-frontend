# How to Test the Klink App

## Your Laptop's WiFi IP
```
10.132.199.238
```
Run `ipconfig` in terminal and look for **IPv4 Address** under Wi-Fi if this changes.

---

## Method 1 — iPhone with Expo Go (Same WiFi) ✅ RECOMMENDED

**Requirements:** iPhone and laptop must be on the **same WiFi network**.

### Steps
1. Make sure `constants.ts` has `ENV = 'wifi'`
2. Open terminal in `C:\Users\lemue\Desktop\KlinkApp`
3. Run: `npx expo start`
4. Wait for the QR code to appear in the terminal
5. Open **Camera app** on iPhone → point at the QR code
6. Tap the banner that appears → opens in Expo Go
7. App should load in 10–30 seconds

### If it times out
- Run `fix-firewall.ps1` as Administrator (right-click → Run with PowerShell)
- Make sure iPhone and laptop are on the **same WiFi** (not one on 5GHz, one on 2.4GHz)
- Try restarting Expo: `npx expo start --clear`

---

## Method 2 — iPhone with Expo Go (Tunnel) 🌐

Use this when you can't get the same-WiFi method to work (corporate network, hotspot, etc.)

### Steps
1. Make sure `constants.ts` has `ENV = 'tunnel'`
2. Run: `npm run tunnel`  (or `npx expo start --tunnel`)
3. Wait — it takes 30–60 seconds to connect through ngrok
4. A URL like `exp://xxxx.ngrok.io` will appear in the terminal
5. Open **Expo Go** on iPhone → tap **Enter URL manually**
6. Paste the `exp://xxxx.ngrok.io` URL → tap Go

> **Note:** In tunnel mode the Metro bundler goes through ngrok, but your
> Spring Boot backend at port 8080 is still only accessible on your local
> network. The app will load but API calls will fail unless you also expose
> port 8080 via ngrok:
> `ngrok http 8080` → copy the https URL → paste into `constants.ts` as the base URL.

---

## Method 3 — Android Emulator

### Steps
1. Open Android Studio → start an emulator
2. Make sure `constants.ts` has `ENV = 'emulator'`
3. Run: `npx expo start --android`
4. The app opens automatically in the emulator

---

## Method 4 — Web Browser

### Steps
1. Run: `npx expo start --web`
2. Press `w` or open `http://localhost:8081` in Chrome
3. Note: some React Native features don't work on web

---

## Starting the Backend

The Spring Boot backend must be running for API calls to work:

```bash
cd C:\Users\lemue\Desktop\demo5
.\mvnw.cmd spring-boot:run
```

Backend runs on `http://localhost:8080` (or `http://10.132.199.238:8080` from phone).

---

## Switching Environments

Edit **one line** in `src/utils/constants.ts`:

```ts
const ENV = 'wifi';      // iPhone on same WiFi
const ENV = 'emulator';  // Android emulator
const ENV = 'tunnel';    // Expo tunnel mode
const ENV = 'prod';      // Production server
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `The request timed out` | Firewall blocking port 8081 | Run `fix-firewall.ps1` as Admin |
| `Network request failed` | Wrong backend IP in constants | Check `LAPTOP_WIFI_IP` in `constants.ts` |
| `Unknown error` in Expo Go | Phone not on same WiFi | Switch to tunnel mode |
| `Unable to resolve module` | Missing npm package | Run `npm install` in KlinkApp/ |
| `exp://...` URL doesn't load | Metro not started | Run `npx expo start` first |
| Blank white screen | JS error at startup | Check Metro terminal for red error |
| `EADDRINUSE: port 8081` | Another Metro already running | Kill node: `taskkill /F /IM node.exe` |
| Slow first load | Cold start, Expo caching | Normal — wait 30s, then fast |

---

## Finding Your IP Address

**Windows:**
```
ipconfig
```
Look for **IPv4 Address** under the **Wi-Fi** adapter. Example: `10.132.199.238`

**After IP changes** (e.g. different network):
1. Run `ipconfig` to get new IP
2. Update `LAPTOP_WIFI_IP` in `src/utils/constants.ts`
3. Restart Expo: `npx expo start --clear`

---

## Quick Command Reference

```bash
# Start normally (LAN / same WiFi)
npx expo start

# Start with tunnel (ngrok — works across networks)
npm run tunnel

# Start with cache cleared (fixes weird bundler errors)
npx expo start --clear

# Start specifically for Android emulator
npx expo start --android

# Check what's running on port 8081
netstat -ano | findstr :8081

# Kill Metro bundler if stuck
taskkill /F /IM node.exe
```
