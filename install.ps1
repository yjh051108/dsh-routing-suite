# dsh-routing-suite one-click installer (Windows PowerShell / pwsh).
# Steps: 1) attach the injector  2) install router-standard + router-spec presets
#        3) hint to restart DSH.
#
# NOTE: this file is pure ASCII on purpose. PowerShell 5.1 reads BOM-less
# scripts as ANSI/GBK, and non-ASCII bytes previously broke the parser
# ("string missing terminator" on line 29) - see issue #16.
#
# Usage:
#   .\install.ps1            install (skips existing presets)
#   .\install.ps1 -Update    force-overwrite presets (upgrade path)
#   .\install.ps1 -SkipInjector   preset-only install
[CmdletBinding()]
param(
  [switch]$Update,
  [switch]$SkipInjector
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '=== [1/3] injector ===' -ForegroundColor Cyan
if (-not $SkipInjector) {
  $injector = Join-Path $root 'injector'
  if (Test-Path (Join-Path $injector 'lib\index.js')) {
    & dsh plugin --profile web add $injector 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "dsh plugin add failed (exit $LASTEXITCODE)" }
    Write-Host 'injector attached (bundles take over after restart)' -ForegroundColor Green
  } else {
    Write-Host 'injector/lib missing - downloading prebuilt tgz from GitHub Releases...' -ForegroundColor Yellow
    try {
      $api = Invoke-RestMethod -Uri 'https://api.github.com/repos/yjh051108/dsh-super-injector/releases/latest' -Headers @{ 'User-Agent' = 'dsh-routing-suite-installer' }
      $asset = $api.assets | Where-Object { $_.name -like '*.tgz' } | Select-Object -First 1
      if (-not $asset) { throw 'no tgz asset in latest release' }
      $dl = Join-Path $env:TEMP 'dsh-injector-download'
      if (Test-Path $dl) { Remove-Item -Recurse -Force $dl }
      New-Item -ItemType Directory -Force $dl | Out-Null
      $tgz = Join-Path $dl $asset.name
      Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tgz
      if (Get-Command tar -ErrorAction SilentlyContinue) {
        tar -xzf $tgz -C $dl
        $pkg = Get-ChildItem $dl -Directory | Where-Object { $_.Name -eq 'package' } | Select-Object -First 1
        if (-not $pkg) { $pkg = Get-ChildItem $dl -Directory | Select-Object -First 1 }
        if (-not $pkg) { throw 'tgz extraction produced no package dir' }
        if (-not (Test-Path (Join-Path $pkg.FullName 'lib\index.js'))) { throw 'extracted package has no lib/index.js' }
        & dsh plugin --profile web add $pkg.FullName 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "dsh plugin add failed (exit $LASTEXITCODE)" }
        Write-Host "injector v$($api.tag_name) attached from release" -ForegroundColor Green
      } else {
        throw 'tar.exe not found - build injector locally (cd injector; bash scripts/build.sh) or extract the tgz manually'
      }
    } catch {
      Write-Host "auto-download failed: $($_.Exception.Message)" -ForegroundColor Red
      Write-Host 'Fallback: build injector first - cd injector; bash scripts/build.sh (needs DSH_CHECKOUT), then re-run this script.' -ForegroundColor Yellow
    }
  }
} else {
  Write-Host 'injector skipped (-SkipInjector)' -ForegroundColor DarkGray
}

Write-Host '=== [2/3] router presets (v0.2.0: router-standard + router-spec) ===' -ForegroundColor Cyan
$dst = Join-Path $env:USERPROFILE '.dsh\.agent-presets'
New-Item -ItemType Directory -Force $dst | Out-Null
foreach ($name in @('router-standard', 'router-spec')) {
  $target = Join-Path $dst $name
  $src = Join-Path $root ("preset\preset\" + $name)
  if (-not (Test-Path (Join-Path $src 'preset.yml'))) {
    Write-Host "missing source: $src (submodule not checked out? run: git submodule update --init --recursive)" -ForegroundColor Red
    continue
  }
  if (Test-Path $target) {
    if ($Update) {
      $bak = "$target.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
      Move-Item $target $bak
      Copy-Item -Recurse $src $target
      Write-Host "$name updated (backup: $bak)" -ForegroundColor Green
    } else {
      Write-Host "$name already installed at $target (use -Update to overwrite)" -ForegroundColor Yellow
    }
  } else {
    Copy-Item -Recurse $src $target
    Write-Host "$name installed at $target" -ForegroundColor Green
  }
}

Write-Host '=== [3/3] done ===' -ForegroundColor Cyan
Write-Host '1. Restart DSH (web service)' -ForegroundColor Yellow
Write-Host '2. New session -> pick "Router Standard (experimental)" or "Router Spec (experimental)"' -ForegroundColor Yellow
Write-Host '3. Send a task: build tasks route react, fix tasks route spec, fuzzy tasks route weak' -ForegroundColor Yellow
Write-Host '4. AI self-tuning: dev_router_status / dev_router_mode / dev_mode_subagent' -ForegroundColor Yellow
