# dsh-routing-suite 一键安装（Windows PowerShell）
# DSH 0.2.x：注入器与三个 router preset 都通过「profile bundle」装载——
# 装一个 tgz/目录即可，preset 不再需要复制到 $DSH_HOME/.agent-presets/。
# 步骤：1) 确保 injector/lib 存在（或本地构建） 2) 装进 profile 3) 提示重启
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# desktop profile 由 Electron 独占，只能用 GUI「插件」页或注入器的 dev_install_package；
# CLI 仅对 web/headless 等 profile 有效。
$profileName = if ($env:DSH_PROFILE) { $env:DSH_PROFILE } else { 'web' }

Write-Host '=== [1/3] 准备注入器构建产物 ===' -ForegroundColor Cyan
$injector = Join-Path $root 'injector'
if (-not (Test-Path (Join-Path $injector 'libindex.js'))) {
  # 全新 clone 没有 lib/（构建产物不入库）。优先用 Release tgz（预构建），
  # 否则用 DSH 自带 node 24 跑 tsdown（本机 node 需 ^22.18.0 || >=24.11.0）。
  Write-Host 'injector/lib 缺失——尝试本地构建...' -ForegroundColor Yellow
  Push-Location $injector
  try {
    if (Test-Path '.
ode_modules	sdowndistun.mjs') {
      & node '.
ode_modules	sdowndistun.mjs' 2>&1 | Out-Host
    } else {
      & npm install --no-audit --no-fund 2>&1 | Out-Host
    }
  } catch {
    Write-Host '本地构建失败（可忽略）' -ForegroundColor DarkGray
  } finally {
    Pop-Location
  }
  if (-not (Test-Path (Join-Path $injector 'libindex.js'))) {
    Write-Host '构建不可行——请改用 Release tgz（预构建，推荐）：' -ForegroundColor Yellow
    Write-Host '  https://github.com/yjh051108/dsh-routing-suite/releases' -ForegroundColor Yellow
  } else {
    Write-Host 'injector/lib 构建完成' -ForegroundColor Green
  }
}

Write-Host '=== [2/3] 装配到 profile（bundle 模式） ===' -ForegroundColor Cyan
if (Test-Path (Join-Path $injector 'libindex.js')) {
  $dshCmd = Get-Command dsh -ErrorAction SilentlyContinue
  $addArgs = @('plugin', '--profile', $profileName, 'add', $injector)
  if ($dshCmd) {
    & dsh @addArgs 2>&1 | Out-Host
  } else {
    & npx '@deepseek-ai/dsh' @addArgs 2>&1 | Out-Host
  }
  Write-Host ('注入器与三个 router preset 已装配到 profile ' + $profileName + '（重启后由 bundles 接管）') -ForegroundColor Green
  Write-Host 'desktop profile：改用 GUI「插件」页安装，或用注入器工具 dev_install_package。' -ForegroundColor DarkGray
}

Write-Host '=== [3/3] 完成 ===' -ForegroundColor Cyan
Write-Host '1. 重启 DSH' -ForegroundColor Yellow
Write-Host '2. GUI 新建会话 → 预设选择器里选 Router Standard / Router Spec / Router React' -ForegroundColor Yellow
Write-Host '3. 发任务：生成任务自动 react，维护任务自动 spec，模糊任务进 weak 内路由' -ForegroundColor Yellow
Write-Host '4. AI 自优化工具：dev_router_status / dev_router_mode / dev_reload_preset / dev_reload_preset_live' -ForegroundColor Yellow
