#!/usr/bin/env bash
# dsh-routing-suite 一键安装（Linux / macOS）
# 步骤：1) 装配注入器  2) 安装 router-standard 预设  3) 提示重启
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo_cyan()   { printf '\033[0;36m%s\033[0m\n' "$1"; }
echo_yellow() { printf '\033[0;33m%s\033[0m\n' "$1"; }
echo_green()  { printf '\033[0;32m%s\033[0m\n' "$1"; }

echo_cyan '=== [1/3] 装配注入器 ==='
INJECTOR="$ROOT/injector"
if [ ! -f "$INJECTOR/lib/index.js" ]; then
  echo_yellow 'injector/lib 缺失——先构建：cd injector; bash scripts/build.sh（需 DSH_CHECKOUT）或从 Release 下载 tgz'
else
  dsh plugin --profile web add "$INJECTOR"
  echo_green '注入器已装配（重启后由 bundles 接管）'
fi

echo_cyan '=== [2/3] 安装 router-standard 预设 ==='
TARGET="$HOME/.dsh/.agent-presets/router-standard"
if [ -d "$TARGET" ]; then
  echo_yellow "预设已存在：$TARGET（如需覆盖请先手动删除）"
else
  mkdir -p "$(dirname "$TARGET")"
  cp -r "$ROOT/preset/preset" "$TARGET"
  echo_green "预设已安装：$TARGET"
fi

echo_cyan '=== [3/3] 完成 ==='
echo_yellow '1. 重启 DSH（web 服务）'
echo_yellow '2. GUI 新建会话 → 选择 Router Standard (experimental)'
echo_yellow '3. 发任务：生成任务自动 react，维护任务自动 spec，模糊任务进 weak 内路由'
echo_yellow '4. AI 自优化工具：dev_router_status / dev_router_mode / dev_mode_subagent'
