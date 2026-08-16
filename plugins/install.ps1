# dsh-routing-suite 高星插件精选安装器
# 用法：
#   .\plugins\install.ps1                     # 安装 popular.json 中全部精选插件
#   .\plugins\install.ps1 -Name dsh-web-ui    # 只安装指定插件（支持子串匹配）
#   .\plugins\install.ps1 -Name dsh-web-ui,modlens
#   .\plugins\install.ps1 -List               # 只列出可选插件
#   .\plugins\install.ps1 -DryRun             # 演练，不实际执行 dsh plugin add
param(
  [string[]]$Name = @(),
  [string]$Profile = 'web',
  [switch]$List,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$jsonPath = Join-Path $root 'popular.json'
if (-not (Test-Path $jsonPath)) {
  Write-Host "找不到插件清单：$jsonPath" -ForegroundColor Red
  exit 1
}

$plugins = Get-Content -Raw -Encoding UTF8 $jsonPath | ConvertFrom-Json

if ($List) {
  Write-Host ('{0,-22} {1,7}  {2,-12} {3}' -f 'Name', 'Stars', 'Category', 'Repo / Description') -ForegroundColor Cyan
  foreach ($p in ($plugins | Sort-Object Stars -Descending)) {
    Write-Host ('{0,-22} {1,7}  {2,-12} {3} — {4}' -f $p.name, $p.stars, $p.category, $p.repo, $p.desc)
  }
  return
}

if ($Name.Count -gt 0) {
  $selected = $plugins | Where-Object {
    $hit = $_.name -match ($Name -join '|') -or $_.repo -match ($Name -join '|')
    $hit
  }
  if (-not $selected) {
    Write-Host "没有匹配的插件：$($Name -join ', ')。用 -List 查看全部。" -ForegroundColor Yellow
    exit 1
  }
} else {
  $selected = $plugins
}

Write-Host "=== 将安装 $($selected.Count) 个精选插件到 profile '$Profile' ===" -ForegroundColor Cyan
$ok = 0; $fail = 0
foreach ($p in ($selected | Sort-Object Stars -Descending)) {
  $target = if ($p.install) { $p.install } else { "github:$($p.repo)" }
  Write-Host "==> $($p.name) [$($p.stars)★] $target" -ForegroundColor Green
  if ($DryRun) { continue }
  & dsh plugin --profile $Profile add $target 2>&1 | Out-Host
  if ($LASTEXITCODE -eq 0) { $ok++ } else { $fail++; Write-Host "安装失败：$($p.repo)" -ForegroundColor Red }
}

Write-Host "=== 完成：成功 $ok，失败 $fail ===" -ForegroundColor Cyan
if ($fail -gt 0) {
  Write-Host '失败项请检查其 README：部分插件可能需要先构建，或使用 dsh plugin add <本地克隆目录>。' -ForegroundColor Yellow
}
