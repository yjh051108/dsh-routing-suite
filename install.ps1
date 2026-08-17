# dsh-routing-suite 一键安装（Windows PowerShell）
# 步骤：1) 装配注入器（产物缺失时自动构建/下载 Release） 2) 安装 router-standard / router-spec 预设 3) 提示重启
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 0) 依赖自检：dsh CLI 需要 pnpm；缺失时自动装到用户目录并注册 PATH。
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host 'pnpm 缺失——自动安装（npm -g pnpm@10，用户目录，无需管理员）' -ForegroundColor Yellow
  & npm install -g pnpm@10 | Out-Host
  $npmDir = Join-Path $env:APPDATA 'npm'
  if (-not (Test-Path (Join-Path $npmDir 'pnpm.cmd'))) { throw 'pnpm 安装失败：请手动执行 npm install -g pnpm 后重试' }
  $env:PATH = "$npmDir;$env:PATH"
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if ($userPath -notlike "*$npmDir*") {
    [Environment]::SetEnvironmentVariable('Path', ($userPath.TrimEnd(';') + ';' + $npmDir), 'User')
  }
  Write-Host "pnpm 已就绪（$npmDir 已写入用户 PATH，新开终端生效）" -ForegroundColor Green
}

Write-Host '=== [1/3] 装配注入器 ===' -ForegroundColor Cyan
$injector = Join-Path $root 'injector'
$injectorVersion = '0.3.3'   # 与 injector submodule 的 tag / Release 版本保持一致
if (-not (Test-Path (Join-Path $injector 'lib\index.js'))) {
  Write-Host 'injector/lib 缺失——自动获取预编译产物' -ForegroundColor Yellow
  # 有 DSH 源码 checkout（含 packages/ + vendor/ + tsc）时优先从源码构建
  if ($env:DSH_CHECKOUT -and (Test-Path (Join-Path $env:DSH_CHECKOUT 'packages')) -and (Get-Command bash -ErrorAction SilentlyContinue)) {
    Write-Host '检测到 DSH_CHECKOUT，先尝试源码构建……' -ForegroundColor Yellow
    Push-Location $injector
    try {
      bash scripts/build.sh
      if ($LASTEXITCODE -ne 0) { throw "build.sh 退出码 $LASTEXITCODE" }
    } catch {
      Write-Host "源码构建失败（$($_.Exception.Message)），改用 Release tgz" -ForegroundColor Yellow
    } finally {
      Pop-Location
    }
  }
  # 构建不适用/失败时：从 dsh-super-injector 的 GitHub Release 下载预编译 tgz
  if (-not (Test-Path (Join-Path $injector 'lib\index.js'))) {
    $url = "https://github.com/yjh051108/dsh-super-injector/releases/download/v$injectorVersion/dsh-external-dsh-super-injector-$injectorVersion.tgz"
    Write-Host "下载 Release 产物：$url" -ForegroundColor Yellow
    $tgz = Join-Path $env:TEMP "dsh-super-injector-$injectorVersion.tgz"
    Invoke-WebRequest -UseBasicParsing $url -OutFile $tgz
    $tmp = Join-Path $env:TEMP "dsh-super-injector-$injectorVersion-unpack"
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    tar -xzf $tgz -C $tmp
    Copy-Item -Recurse -Force (Join-Path $tmp 'package\*') $injector
    Write-Host '预编译产物已就位' -ForegroundColor Green
  }
}
if (-not (Test-Path (Join-Path $injector 'lib\index.js'))) { throw '注入器产物仍缺失，安装中止' }
& dsh plugin --profile web add $injector 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { throw "dsh plugin add 失败（退出码 $LASTEXITCODE）" }
Write-Host '注入器已装配（重启后由 bundles 接管）' -ForegroundColor Green

Write-Host '=== [2/3] 安装 router-standard / router-spec 预设 ===' -ForegroundColor Cyan
# DSH 的 agent-presets 扫描是单层的：.agent-presets\<preset-id>\agent.cordis.yml。
# 因此每个预设目录必须平级落在 .agent-presets 下（见 preset/README.md）。
$presetRoot = Join-Path $env:USERPROFILE '.dsh\.agent-presets'
$sourceDir = Join-Path $root 'preset\preset'
$presets = @(Get-ChildItem -Directory $sourceDir)
$already = @($presets | Where-Object { Test-Path (Join-Path $presetRoot $_.Name) })
if ($already.Count -gt 0) {
  Write-Host "预设已存在：$($already.Name -join ', ')（如需覆盖请先手动删除对应目录）" -ForegroundColor Yellow
} else {
  New-Item -ItemType Directory -Force -Path $presetRoot | Out-Null
  foreach ($p in $presets) {
    Copy-Item -Recurse $p.FullName (Join-Path $presetRoot $p.Name)
  }
  Write-Host "预设已安装：$presetRoot（$($presets.Name -join ', ')）" -ForegroundColor Green
}

Write-Host '=== [3/3] 完成 ===' -ForegroundColor Cyan
Write-Host '1. 重启 DSH（web 服务）' -ForegroundColor Yellow
Write-Host '2. GUI 新建会话 → 选择 Router Standard (experimental)' -ForegroundColor Yellow
Write-Host '3. 发任务：生成任务自动 react，维护任务自动 spec，模糊任务进 weak 内路由' -ForegroundColor Yellow
Write-Host '4. AI 自优化工具：dev_router_status / dev_router_mode / dev_mode_subagent' -ForegroundColor Yellow
