# dsh-routing-suite 一键安装（Windows PowerShell）
# 步骤：1) 检查依赖并装配注入器  2) 安装路由预设  3) 提示重启
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '=== [1/3] 装配注入器 ===' -ForegroundColor Cyan
$injector = Join-Path $root 'injector'
if (-not (Test-Path (Join-Path $injector 'lib\index.js'))) {
  throw 'injector/lib/index.js 缺失。请先构建 injector（需 DSH_CHECKOUT），或使用包含 lib 的 Release 包。'
}

$dsh = Get-Command dsh -ErrorAction SilentlyContinue
if (-not $dsh) {
  throw '找不到 dsh 命令。请先安装 DSH，并将 dsh 加入 PATH。'
}

& $dsh.Source plugin --profile web add $injector 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "dsh plugin add 失败，退出代码：$LASTEXITCODE"
}
Write-Host '注入器已装配（重启后由 bundles 接管）' -ForegroundColor Green

Write-Host '=== [2/3] 安装路由预设 ===' -ForegroundColor Cyan
$presetRoot = Join-Path $root 'preset\preset'
$targetRoot = Join-Path $env:USERPROFILE '.dsh\.agent-presets'

foreach ($name in @('router-standard', 'router-spec')) {
  $source = Join-Path $presetRoot $name
  $target = Join-Path $targetRoot $name

  if (-not (Test-Path (Join-Path $source 'preset.yml'))) {
    throw "预设源目录无效：$source"
  }

  if (Test-Path $target) {
    if (Test-Path (Join-Path $target 'preset.yml')) {
      Write-Host "预设已存在，跳过：$target" -ForegroundColor Yellow
      continue
    }
    throw "目标目录已存在但不是有效预设：$target。请检查或移走该目录后重试。"
  }

  New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
  Copy-Item -Recurse $source $target
  Write-Host "预设已安装：$target" -ForegroundColor Green
}

Write-Host '=== [3/3] 完成 ===' -ForegroundColor Cyan
Write-Host '1. 重启 DSH（web 服务）' -ForegroundColor Yellow
Write-Host '2. GUI 新建会话 → 选择 Router Standard / Router Spec' -ForegroundColor Yellow
Write-Host '3. 发任务：生成任务自动 react，维护任务自动 spec，模糊任务进 weak 内路由' -ForegroundColor Yellow
Write-Host '4. AI 自优化工具：dev_router_status / dev_router_mode / dev_mode_subagent' -ForegroundColor Yellow
