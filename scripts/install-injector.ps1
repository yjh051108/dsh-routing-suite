# install-injector.ps1 — dsh-super-injector 一次性安装脚本（装完即生效，无需手动重启）
#
# 用法：
#   .\install-injector.ps1                     # 装配 + 自动重启 DSH（默认）
#   .\install-injector.ps1 -NoRestart          # 只装配，不重启（手动重启后生效）
#   .\install-injector.ps1 -PackageDir F:\x\super-injector   # 指定包目录
#
# 做什么：
#   1. 建 junction：profile node_modules/@dsh-external/dsh-super-injector -> 包目录
#   2. 写 profile package.json（dependencies 加 link + bundles 加包名，幂等）
#   3. 自动重启 DSH web（找到运行中的 dsh web 进程 -> 优雅停止 -> 重启后台进程）
#   装完即用：dev_* 工具全家桶（注入/热重载/预设热更新/自举卸载）全部可用。
#
# 幂等：重复运行安全（已存在的 junction/依赖自动跳过）。

param(
  [string]$PackageDir = '',
  [string]$Profile = 'web',
  [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'
$pkgName = '@dsh-external/dsh-super-injector'

# ── 0. 定位 ──────────────────────────────────────────────────────────────
if (-not $PackageDir) {
  # 从脚本位置推导（套件: scripts/../injector；独立: 同目录）
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
  foreach ($cand in @(
    (Join-Path (Split-Path -Parent $here) 'injector'),   # 套件布局: suite/scripts -> suite/injector
    (Join-Path $here 'injector'),                        # 独立布局
    $here                                            # 包目录即脚本目录
  )) {
    if (Test-Path (Join-Path $cand 'package.json')) { $PackageDir = $cand; break }
  }
}
if (-not $PackageDir -or -not (Test-Path (Join-Path $PackageDir 'package.json'))) {
  Write-Host 'ERROR: 找不到注入器包目录（请用 -PackageDir 指定，需含 package.json）' -ForegroundColor Red
  exit 1
}
$PackageDir = (Resolve-Path $PackageDir).Path

# DSH 安装根（npm 全局）与 profile
$npmRoot = $null
$appDataCands = @($env:APPDATA, (Join-Path $env:USERPROFILE 'AppData\Roaming'), 'C:\Users\Eldwen\AppData\Roaming', 'C:\Users\Administrator\AppData\Roaming') | Select-Object -Unique
foreach ($ad in $appDataCands) {
  $cand = Join-Path $ad 'npm\node_modules'
  if (Test-Path (Join-Path $cand '@deepseek-ai\dsh')) { $npmRoot = $cand; break }
}
if (-not $npmRoot) {
  $dshBin = Get-Command dsh -ErrorAction SilentlyContinue
  if ($dshBin) { $npmRoot = Split-Path -Parent (Split-Path -Parent $dshBin.Source) }
}
$dshRoot = Join-Path $npmRoot '@deepseek-ai\dsh'
if (-not $npmRoot -or -not (Test-Path $dshRoot)) { Write-Host "ERROR: 未找到 DSH 安装（尝试过: $($appDataCands -join '; ')）" -ForegroundColor Red; exit 1 }

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $dshHome "profiles\$Profile"
$profilePkg = Join-Path $profileDir 'package.json'
if (-not (Test-Path $profilePkg)) { Write-Host "ERROR: profile 不存在: $profilePkg" -ForegroundColor Red; exit 1 }
$linkDir = Join-Path $profileDir "node_modules\$($pkgName -replace '/', '\')"

Write-Host "== dsh-super-injector 安装 =="
Write-Host "  包: $PackageDir"
Write-Host "  profile: $Profile ($profileDir)"

# ── 1. junction ──────────────────────────────────────────────────────────
$existing = Get-Item $linkDir -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.LinkType -eq 'Junction' -and $existing.Target -eq $PackageDir) {
    Write-Host '  [1/3] junction 已存在且指向正确（跳过）' -ForegroundColor Green
  } else {
    Write-Host "  [1/3] junction 已存在但指向 $($existing.Target)（重建）" -ForegroundColor Yellow
    Remove-Item $linkDir -Recurse -Force
    New-Item -ItemType Junction -Path $linkDir -Target $PackageDir | Out-Null
  }
} else {
  New-Item -ItemType Directory -Path (Split-Path -Parent $linkDir) -Force | Out-Null
  New-Item -ItemType Junction -Path $linkDir -Target $PackageDir | Out-Null
  Write-Host '  [1/3] junction 已创建' -ForegroundColor Green
}

# ── 2. profile package.json（幂等）──────────────────────────────────────
$pkg = Get-Content $profilePkg -Raw | ConvertFrom-Json
$changed = $false
if (-not $pkg.dependencies."$pkgName") {
  $pkg.dependencies | Add-Member -NotePropertyName $pkgName -NotePropertyValue "link:$PackageDir" -Force
  $changed = $true
}
if (-not ($pkg.dsh.profile.bundles -contains $pkgName)) {
  $pkg.dsh.profile.bundles += $pkgName
  $changed = $true
}
if ($changed) {
  $pkg | ConvertTo-Json -Depth 10 | Set-Content $profilePkg -Encoding UTF8
  Write-Host '  [2/3] profile package.json 已更新（link + bundles）' -ForegroundColor Green
} else {
  Write-Host '  [2/3] profile package.json 已配置（幂等跳过）' -ForegroundColor Green
}

# ── 3. 重启 DSH（装完即生效）────────────────────────────────────────────
if ($NoRestart) {
  Write-Host ''
  Write-Host '装配完成（-NoRestart）。重启 DSH 后 dev_* 工具全家桶生效。' -ForegroundColor Cyan
  exit 0
}

Write-Host '  [3/3] 重启 DSH web（装完即生效）...' -ForegroundColor Yellow
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe) { $nodeExe = 'node' }
$dshBin = Join-Path $dshRoot 'lib\bin.js'

# 找运行中的 dsh web 进程（node 进程命令行含 lib/bin.js + web/profile）
$targets = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'dsh[\\/]lib[\\/]bin\.js' -and $_.CommandLine -match '(web|--profile)' }
foreach ($t in $targets) {
  Write-Host "    停止旧进程 PID $($t.ProcessId)"
  Stop-Process -Id $t.ProcessId -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 800
}

# 后台启动（工作目录 = profile 目录，日志到 dshHome）
$logFile = Join-Path $dshHome 'injector-install-restart.log'
$args = @($dshBin, '--profile', $Profile)
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $nodeExe
$psi.Arguments = ($args -join ' ')
$psi.WorkingDirectory = $profileDir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$proc = [System.Diagnostics.Process]::Start($psi)
Start-Sleep -Seconds 4
Write-Host ''
Write-Host '✅ 安装完成：dsh-super-injector 已装配并重启 DSH（新进程 PID ' + $proc.Id + '）' -ForegroundColor Green
Write-Host '  dev_* 工具全家桶可用（注入/热重载/dev_reload_preset/自举卸载）'
Write-Host '  日志: ' + $logFile
