# HCP Charts - uninstaller
$AddinId    = "2bf33f10-92d1-48a3-b3ac-49c904918edc"
$InstallDir = Join-Path $env:LOCALAPPDATA "HCPCharts"
$RegKey     = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"
Remove-ItemProperty -Path $RegKey -Name $AddinId -ErrorAction SilentlyContinue
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
Write-Host ""
Write-Host "  HCP Charts removed. Restart PowerPoint." -ForegroundColor Green
Write-Host ""
