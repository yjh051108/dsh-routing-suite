# dsh-routing-suite 一键安装（Windows PowerShell）
# 步骤：1) 装配注入器  2) 安装 router-standard / router-spec 预设  3) 提示重启
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '=== [1/3] 装配注入器 ===' -ForegroundColor Cyan
$injector = Join-Path $root 'injector'
if (-not (Test-Path (Join-Path $injector 'lib\index.js'))) {
  # 全新 clone 没有 lib/（构建产物不入库）。github: 装配（方式 B）会在安装时由
  # prepare 钩子自动构建；本地目录装配若构建不可行，请改用 Release tgz（方式 A）。
  Write-Host 'injector/lib 缺失——尝试 npm install 触发 prepare 钩子构建（若私有 peer 拉取失败会自动跳过）...' -ForegroundColor Yellow
  Push-Location $injector
  try {
    & npm install --no-audit --no-fund 2>&1 | Out-Host
  } catch {
    Write-Host 'npm install 失败（可忽略）' -ForegroundColor DarkGray
  } finally {
    Pop-Location
  }
  if (-not (Test-Path (Join-Path $injector 'lib\index.js'))) {
    Write-Host '自动构建不可行——注入器请改用以下方式装配：' -ForegroundColor Yellow
    Write-Host '  A. Release tgz（预构建，推荐）：https://github.com/yjh051108/dsh-super-injector/releases' -ForegroundColor Yellow
    Write-Host '  B. github: 装配（prepare 钩子自动构建）：dsh plugin --profile web add github:yjh051108/dsh-super-injector' -ForegroundColor Yellow
  } else {
    Write-Host 'injector/lib 构建完成' -ForegroundColor Green
  }
}
if (Test-Path (Join-Path $injector 'lib\index.js')) {
  # dsh CLI 可能不在 PATH（用 npx @deepseek-ai/dsh web 启动的场景）；优先 dsh，fallback 到 npx
  $dshCmd = Get-Command dsh -ErrorAction SilentlyContinue
  if ($dshCmd) {
    & dsh plugin --profile web add $injector 2>&1 | Out-Host
  } else {
    & npx '@deepseek-ai/dsh' plugin --profile web add $injector 2>&1 | Out-Host
  }
  Write-Host '注入器已装配（重启后由 bundles 接管）' -ForegroundColor Green
}

Write-Host '=== [2/3] 安装 router presets ===' -ForegroundColor Cyan
$presetRoot = Join-Path $root 'preset'
$presets = @('router-standard', 'router-spec')
foreach ($name in $presets) {
  $target = Join-Path $env:USERPROFILE (Join-Path '.dsh\.agent-presets' $name)
  if (Test-Path $target) {
    Write-Host "预设已存在：$target（如需覆盖请先手动删除）" -ForegroundColor Yellow
    continue
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
  # 平铺复制：DSH 的 agent-presets 发现只扫一级子目录，每个预设目录必须直接含 agent.cordis.yml
  Copy-Item -Recurse (Join-Path $presetRoot $name) $target
  Write-Host "预设已安装：$target" -ForegroundColor Green
}

# 自检：两个预设一级目录必须直接含 agent.cordis.yml（防嵌套层级错误）
Write-Host '=== 自检预设布局 ===' -ForegroundColor Cyan
foreach ($name in $presets) {
  $check = Join-Path $env:USERPROFILE (Join-Path '.dsh\.agent-presets' (Join-Path $name 'agent.cordis.yml'))
  if (Test-Path $check) {
    Write-Host "OK: $name -> agent.cordis.yml 就位" -ForegroundColor Green
  } else {
    Write-Host "FAIL: $name 缺少 agent.cordis.yml（$check）——预设不会被 DSH 发现" -ForegroundColor Red
  }
}

Write-Host '=== [3/3] 完成 ===' -ForegroundColor Cyan
Write-Host '1. 重启 DSH（web 服务）' -ForegroundColor Yellow
Write-Host '2. GUI 新建会话 → 选择 Router Standard / Router Spec (experimental)' -ForegroundColor Yellow
Write-Host '3. 发任务：生成任务自动 react，维护任务自动 spec，模糊任务进 weak 内路由' -ForegroundColor Yellow
Write-Host '4. AI 自优化工具：dev_router_status / dev_router_mode / dev_mode_subagent' -ForegroundColor Yellow
