# dsh-routing-suite 一键安装（Windows PowerShell）
# 新版 DSH：根包同时装配注入器与声明式 Router Standard Agent 预设。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '=== [1/2] 检查注入器构建产物 ===' -ForegroundColor Cyan
$injector = Join-Path $root 'injector'
if (-not (Test-Path (Join-Path $injector 'lib\index.js'))) {
  Write-Host 'injector/lib 缺失——尝试 npm install 触发 prepare 钩子构建...' -ForegroundColor Yellow
  Push-Location $injector
  try {
    & npm install --no-audit --no-fund 2>&1 | Out-Host
  } catch {
    Write-Host 'npm install 失败（将交由 DSH 安装流程再次处理）' -ForegroundColor DarkGray
  } finally {
    Pop-Location
  }
}

Write-Host '=== [2/2] 安装套件 Bundle ===' -ForegroundColor Cyan
$dshCmd = Get-Command dsh -ErrorAction SilentlyContinue
if ($dshCmd) {
  & dsh plugin --profile web add $root 2>&1 | Out-Host
} else {
  & npx '@deepseek-ai/dsh' plugin --profile web add $root 2>&1 | Out-Host
}

Write-Host '套件已安装：注入器 + Router Standard Agent 预设' -ForegroundColor Green
Write-Host '请重启 DSH，然后在新会话中选择 Router Standard。' -ForegroundColor Yellow
