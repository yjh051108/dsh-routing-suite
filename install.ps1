# dsh-routing-suite 一键安装（Windows PowerShell）
# 步骤：1) 装配注入器  2) 安装 router-standard 预设  3) 安装 Pro 实验插件  4) 提示重启
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

Write-Host '=== [3/4] 安装 Pro 实验插件 ===' -ForegroundColor Cyan
$lab = Join-Path $root 'pro-lab'
if (-not (Test-Path (Join-Path $lab 'package.json'))) {
  Write-Host 'pro-lab 缺失，跳过（套装根目录应包含 pro-lab）' -ForegroundColor Yellow
} elseif (-not (Get-Command dsh -ErrorAction SilentlyContinue)) {
  Write-Host '未找到 dsh 命令，跳过 Pro 实验插件；可在 DSH 环境内执行 dsh plugin --profile web add pro-lab' -ForegroundColor Yellow
} else {
  & dsh plugin --profile web add $lab 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'Pro 实验插件装配失败；不影响 injector/router-standard，见上方错误后可单独重试' -ForegroundColor Yellow
  } else {
    Write-Host 'Pro 实验插件已装配（默认 standard，只观测）' -ForegroundColor Green
  }
}

Write-Host '=== [4/4] 完成 ===' -ForegroundColor Cyan
Write-Host '1. 重启 DSH（web 服务）' -ForegroundColor Yellow
Write-Host '2. GUI 新建会话 → 选择 Router Standard (experimental)' -ForegroundColor Yellow
Write-Host '3. 发任务：生成任务自动 react，维护任务自动 spec，模糊任务进 weak 内路由' -ForegroundColor Yellow
Write-Host '4. Pro 实验：首条消息使用 /v4 lab anchored（或启动前设置 DSH_PRO_LAB_ARM），再用 dev_pro_lab_status / dev_pro_lab_export 导出脱敏证据' -ForegroundColor Yellow
Write-Host '5. AI 自优化工具：dev_router_status / dev_router_mode / dev_mode_subagent' -ForegroundColor Yellow
