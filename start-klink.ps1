# start-klink.ps1 — starts EVERYTHING for phone testing in one go (TUNNEL mode).
# Opens 4 windows: backend, backend tunnel, metro tunnel, metro.
# Auto-wires the random backend tunnel URL into constants.ts (TUNNEL_API_URL)
# and prints the URL/QR to scan. Tunnels are OUTBOUND connections, so this works
# on any network with no firewall rules and no IP pinning. The app detects
# tunnel-vs-LAN by itself from the Metro host — ENV stays 'wifi' either way.
#
# BEFORE RUNNING: close any old terminal windows running the backend or "npm start".
# Run with:  powershell -ExecutionPolicy Bypass -File C:\Users\lemue\IdeaProjects\klinkApp\Klink-frontend\start-klink.ps1

# Repos moved off the Desktop on 2026-07-16 — these are the current locations.
$app = 'C:\Users\lemue\IdeaProjects\klinkApp\Klink-frontend'
$backendDir = 'C:\Users\lemue\IdeaProjects\klinkApp\Klink-backend'
$logDir = Join-Path $app '.tunnel-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# ── Guard: Metro port must be free (close old npm start windows first) ─────────
if (Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "Port 8081 is already in use." -ForegroundColor Red
    Write-Host "Close the terminal window running 'npm start' / 'expo start', then run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# ── 1. Backend (skip if already running) ───────────────────────────────────────
if (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "[1/4] Backend already running on 8080 - keeping it." -ForegroundColor Green
} else {
    Write-Host "[1/4] Starting backend (takes ~2 min)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$backendDir'; .\mvnw.cmd spring-boot:run"
}

# ── 2. Tunnels ──────────────────────────────────────────────────────────────────
# The npm `npx cloudflared` wrapper FAILS on this laptop ("Unsupported
# architecture: arm64") — run the real binary; download it once if missing
# (the x64 exe runs fine on ARM64 Windows via built-in emulation).
$cf = Join-Path $app 'node_modules\cloudflared\bin\cloudflared.exe'
if (-not (Test-Path $cf)) {
    Write-Host "[2/4] Downloading cloudflared binary (one-time, ~54 MB)..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path (Split-Path $cf) | Out-Null
    curl.exe -L --silent --show-error -o $cf https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if (-not (Test-Path $cf)) {
        Write-Host "Download failed - check the internet connection." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

$btLog = Join-Path $logDir 'backend-tunnel.log'
$mtLog = Join-Path $logDir 'metro-tunnel.log'
Remove-Item $btLog, $mtLog -ErrorAction SilentlyContinue

Write-Host "[2/4] Starting Cloudflare tunnels..." -ForegroundColor Cyan
# cloudflared logs to stderr; PS 5.1 Tee-Object mangles that, so redirect ALL
# streams to the log file (*>). The tunnel windows stay blank by design —
# this launcher window prints the URLs.
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$app'; Write-Host 'Backend tunnel running - see launcher window for URL. Do not close.'; & '$cf' tunnel --url http://localhost:8080 *> '$btLog'"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$app'; Write-Host 'Metro tunnel running - see launcher window for URL. Do not close.'; & '$cf' tunnel --url http://localhost:8081 *> '$mtLog'"

function Get-TunnelUrl([string]$log) {
    for ($i = 0; $i -lt 60; $i++) {
        if (Test-Path $log) {
            $hit = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($hit) { return $hit.Matches[0].Value }
        }
        Start-Sleep -Seconds 2
    }
    return $null
}

$backendUrl = Get-TunnelUrl $btLog
$metroUrl   = Get-TunnelUrl $mtLog
if (-not $backendUrl -or -not $metroUrl) {
    Write-Host "Tunnels did not come up (no internet?). Check the two tunnel windows." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "      backend tunnel: $backendUrl" -ForegroundColor Green
Write-Host "      metro tunnel:   $metroUrl" -ForegroundColor Green

# ── 3. Wire the backend tunnel URL into the app config ─────────────────────────
# ENV stays 'wifi' — getBaseUrl() switches to TUNNEL_API_URL automatically when
# the app was loaded from a trycloudflare host, so no mode flip is needed and
# plain `npx expo start` keeps working next session without editing anything.
Write-Host "[3/4] Updating constants.ts (TUNNEL_API_URL)..." -ForegroundColor Cyan
$constants = Join-Path $app 'src\utils\constants.ts'
$content = [IO.File]::ReadAllText($constants)
$content = $content -replace "const TUNNEL_API_URL = '[^']*';", "const TUNNEL_API_URL = '$backendUrl/api/v1';"
[IO.File]::WriteAllText($constants, $content)

# ── 4. Metro, advertising the tunnel URL ────────────────────────────────────────
Write-Host "[4/4] Starting Metro (Expo)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$app'; `$env:EXPO_PACKAGER_PROXY_URL='$metroUrl'; npx expo start"

# ── Done — print the URL + QR ───────────────────────────────────────────────────
$expUrl = 'exp://' + ($metroUrl -replace '^https://', '')
Write-Host ""
Write-Host "================= CONNECT THE iPHONE =================" -ForegroundColor Yellow
if (Test-Path (Join-Path $app 'node_modules\qrcode-terminal')) {
    node -e "require('qrcode-terminal').generate('$expUrl', {small: true})"
} else {
    Write-Host "(QR skipped - qrcode-terminal not installed; use the URL below)" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "Type in Safari on the iPhone (or Expo Go > Enter URL manually):" -ForegroundColor Yellow
Write-Host "  $expUrl" -ForegroundColor Green
Write-Host ""
Write-Host "First bundle over a free tunnel is SLOW (~45-90s) - be patient; it caches after." -ForegroundColor DarkGray
Write-Host "(Wait for the backend window to say 'Started Demo5Application' before logging in.)"
Write-Host ""
Read-Host "Keep all windows open while testing. Press Enter to close this launcher (servers keep running)"
