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
Write-Host "Your laptop IP: " -NoNewline
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' } | Select-Object -First 1).IPAddress
Write-Host "Restart Expo with: npx expo start" -ForegroundColor Cyan
