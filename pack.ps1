# Builds a clean Chrome Web Store zip containing ONLY runtime files —
# never .git/, .claude/, editor configs, or other repo metadata.
# Usage:  powershell -ExecutionPolicy Bypass -File .\pack.ps1
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifest = Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json

# Everything the extension needs at runtime — and nothing else.
$include = @(
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "responsive.html",
  "responsive.js",
  "icons"
)

$dist = Join-Path $root "dist"
New-Item -ItemType Directory -Force $dist | Out-Null
$zip = Join-Path $dist ("web-dev-tools-v" + $manifest.version + ".zip")
if (Test-Path $zip) { Remove-Item $zip -Force }

$paths = $include | ForEach-Object { Join-Path $root $_ }
foreach ($p in $paths) {
  if (-not (Test-Path $p)) { throw "Missing expected file: $p" }
}
Compress-Archive -Path $paths -DestinationPath $zip

Write-Host "Packed $zip"
