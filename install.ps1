# dsh-routing-suite 一键安装（Windows PowerShell）
# 步骤：1) 装配注入器  2) 安装 router-standard 预设  3) 提示重启
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '=== [1/3] 装配注入器 ===' -ForegroundColor Cyan
$injector = Join-Path $root 'injector'
if (-not (Test-Path (Join-Path $injector 'lib\index.js'))) {
  Write-Host 'injector/lib 缺失——先构建：cd injector; bash scripts/build.sh（需 DSH_CHECKOUT）或从 Release 下载 tgz' -ForegroundColor Yellow
} else {
  & dsh plugin --profile web add $injector 2>&1 | Out-Host
  Write-Host '注入器已装配（重启后由 bundles 接管）' -ForegroundColor Green
}

Write-Host '=== [2/3] 安装 router-standard 预设 ===' -ForegroundColor Cyan
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-standard'
if (Test-Path $target) {
  Write-Host "预设已存在：$target（如需覆盖请先手动删除）" -ForegroundColor Yellow
} else {
  New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
  Copy-Item -Recurse (Join-Path $root 'preset\preset') $target
  Write-Host "预设已安装：$target" -ForegroundColor Green
}

Write-Host '=== [3/3] 完成 ===' -ForegroundColor Cyan
Write-Host '1. 重启 DSH（web 服务）' -ForegroundColor Yellow
Write-Host '2. GUI 新建会话 → 选择 Router Standard (experimental)' -ForegroundColor Yellow
Write-Host '3. 发任务：生成任务自动 react，维护任务自动 spec，模糊任务进 weak 内路由' -ForegroundColor Yellow
Write-Host '4. AI 自优化工具：dev_router_status / dev_router_mode / dev_mode_subagent' -ForegroundColor Yellow
