# fix-firewall-complete.ps1 — run as Administrator
# Comprehensive firewall rules for Expo / Metro / Spring Boot, TCP + UDP,
# plus a program-level allow for node.exe (covers any port Metro picks).

Write-Host "Fixing Windows Firewall for Expo..." -ForegroundColor Cyan

# Remove old narrow rules (ignore errors if absent)
netsh advfirewall firewall delete rule name="Expo Metro Bundler" | Out-Null
netsh advfirewall firewall delete rule name="Expo Go" | Out-Null

netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="Expo Metro 8081 UDP" dir=in action=allow protocol=UDP localport=8081
netsh advfirewall firewall add rule name="Expo 19000" dir=in action=allow protocol=TCP localport=19000
netsh advfirewall firewall add rule name="Expo 19001" dir=in action=allow protocol=TCP localport=19001
netsh advfirewall firewall add rule name="Expo 19002" dir=in action=allow protocol=TCP localport=19002
netsh advfirewall firewall add rule name="Node Expo" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes
netsh advfirewall firewall add rule name="Spring Boot 8080" dir=in action=allow protocol=TCP localport=8080

Write-Host "`nDone! Tunnel mode needs no inbound rules, but LAN mode is now covered too." -ForegroundColor Green
Write-Host "Start the app with: npm run start:tunnel   (any network)" -ForegroundColor Cyan
Write-Host "               or:  npm start               (same WiFi/hotspot)" -ForegroundColor Cyan
