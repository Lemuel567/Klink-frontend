# fix-firewall.ps1
# Run this script as Administrator to allow Expo and Metro connections through Windows Firewall
# Right-click this file → "Run with PowerShell" → Allow when prompted for admin

Write-Host "Adding Windows Firewall rules for Expo / React Native..." -ForegroundColor Cyan

$rules = @(
    @{ Name = "Expo Metro Bundler (8081)";   Port = 8081 },
    @{ Name = "Expo Go (19000)";             Port = 19000 },
    @{ Name = "Expo DevTools (19001)";       Port = 19001 },
    @{ Name = "Expo Web (19002)";            Port = 19002 },
    @{ Name = "Spring Boot Backend (8080)";  Port = 8080 }
)

foreach ($rule in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  [SKIP] Rule already exists: $($rule.Name)" -ForegroundColor Yellow
    } else {
        New-NetFirewallRule `
            -DisplayName $rule.Name `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort $rule.Port `
            -Action Allow `
            -Profile Any | Out-Null
        Write-Host "  [OK]   Added rule: $($rule.Name) on port $($rule.Port)" -ForegroundColor Green
    }
}

Write-Host "`nDone! All Expo firewall rules are in place." -ForegroundColor Green
# Prefer the real Wi-Fi adapter — this laptop also has a VirtualBox adapter (192.168.56.x)
# that the iPhone can never reach.
$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue).IPAddress
if (-not $wifiIp) {
    $wifiIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' -and $_.IPAddress -notmatch '^192\.168\.56\.'
    } | Select-Object -First 1).IPAddress
}
Write-Host "Your laptop Wi-Fi IP: $wifiIp"
Write-Host "If this differs from LAPTOP_WIFI_IP in src/utils/constants.ts AND the start script in package.json, update both." -ForegroundColor Yellow
Write-Host "Restart Expo with: npm start   (NOT 'npx expo start' — npm start pins the correct IP)" -ForegroundColor Cyan
