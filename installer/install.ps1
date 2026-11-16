# HCP Charts - installer for PowerPoint on Windows (current user, no admin rights needed)
# Registers the add-in manifest with Office so the "HCP Charts" button appears on the Insert tab.
$ErrorActionPreference = "Stop"
$AddinId     = "2bf33f10-92d1-48a3-b3ac-49c904918edc"
$ManifestUrl = "https://yahyamassaoudiz-coder.github.io/hcp-charts-addin/manifest.xml"
$InstallDir  = Join-Path $env:LOCALAPPDATA "HCPCharts"
$Target      = Join-Path $InstallDir "manifest.xml"
$RegKey      = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"

Write-Host ""
Write-Host "  HCP Charts - installation" -ForegroundColor Cyan
Write-Host ""

$office = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration" -ErrorAction SilentlyContinue
if (-not $office -and -not (Test-Path "HKCU:\Software\Microsoft\Office\16.0")) {
  Write-Host "  PowerPoint 2016 or later (Microsoft 365) was not found on this computer." -ForegroundColor Yellow
  Write-Host "  The add-in will be registered anyway."
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Latest manifest from the web; the copy shipped in this folder is the fallback.
$downloaded = $false
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $tmp = "$Target.download"
  Invoke-WebRequest -Uri $ManifestUrl -OutFile $tmp -UseBasicParsing -TimeoutSec 20
  [xml]$check = Get-Content $tmp -Raw
  if ($check.OfficeApp.Id -eq $AddinId) { Move-Item -Force $tmp $Target; $downloaded = $true }
  else { Remove-Item $tmp -Force }
} catch { }
if (-not $downloaded) {
  Copy-Item -Force (Join-Path $PSScriptRoot "manifest.xml") $Target
  Write-Host "  (offline: using the manifest included in this folder)"
}

if (-not (Test-Path $RegKey)) { New-Item -Path $RegKey -Force | Out-Null }
New-ItemProperty -Path $RegKey -Name $AddinId -Value $Target -PropertyType String -Force | Out-Null

$running = Get-Process POWERPNT -ErrorAction SilentlyContinue
Write-Host "  Installed." -ForegroundColor Green
Write-Host ""
if ($running) { Write-Host "  PowerPoint is open: close it completely, then open it again." -ForegroundColor Yellow }
else          { Write-Host "  Open PowerPoint." }
Write-Host "  Look for the 'HCP Charts' button on the Insert tab."
Write-Host "  If it is not there: Insert > Add-ins > My Add-ins > Developer Add-ins > HCP Charts."
Write-Host ""
