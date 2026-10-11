#!/usr/bin/env bash
# dsh-routing-suite 一键安装（Linux/macOS；镜像 install.ps1）
#
# DSH 0.2.x：注入器与三个 router preset 都通过「profile bundle」装载——
# 装一个包即可（dsh.bundle.patch 声明 preset 行），preset 不再需要复制到
# $DSH_HOME/.agent-presets/（该目录在 0.2.x 已不再被扫描）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INJECTOR_DIR="$ROOT/injector"
# desktop profile 由 Electron 独占，只能用 GUI「插件」页或注入器 dev_install_package。
PROFILE_NAME="${DSH_PROFILE:-web}"

if [ -t 1 ]; then
  C_CYAN=$'\e[36m'; C_GREEN=$'\e[32m'; C_YELLOW=$'\e[33m'; C_RED=$'\e[31m'; C_RESET=$'\e[0m'
else
  C_CYAN=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_RESET=''
fi

info() { printf '%s=== %s ===%s\n' "$C_CYAN" "$1" "$C_RESET"; }
ok()   { printf '%s\u2713 %s%s\n' "$C_GREEN" "$1" "$C_RESET"; }
warn() { printf '%s! %s%s\n' "$C_YELLOW" "$1" "$C_RESET"; }
err()  { printf '%s\u2717 %s%s\n' "$C_RED" "$1" "$C_RESET"; }

info '[0/3] 环境预检'
if ! command -v node >/dev/null 2>&1; then
  err '未找到 node（构建 injector/lib 需要 Node.js）'
fi
if ! command -v dsh >/dev/null 2>&1; then
  warn 'dsh 不在 PATH——装配时回退到 npx @deepseek-ai/dsh'
fi
echo "仓库目录 : $ROOT"
echo "profile   : $PROFILE_NAME"

info '[1/3] 准备注入器构建产物'
if [ ! -f "$INJECTOR_DIR/lib/index.js" ]; then
  warn 'injector/lib 缺失——尝试本地构建（tsdown 需 Node ^22.18 || >=24.11）...'
  ( cd "$INJECTOR_DIR" && { [ -f node_modules/tsdown/dist/run.mjs ] && node node_modules/tsdown/dist/run.mjs || npm install --no-audit --no-fund; } ) \
    || warn '本地构建失败（可忽略）'
fi
if [ -f "$INJECTOR_DIR/lib/index.js" ]; then
  ok 'injector/lib 就位'
else
  err '构建不可行——请改用 Release tgz（预构建）：https://github.com/yjh051108/dsh-routing-suite/releases'
fi

info '[2/3] 装配到 profile（bundle 模式）'
if [ -f "$INJECTOR_DIR/lib/index.js" ]; then
  if command -v dsh >/dev/null 2>&1; then
    dsh plugin --profile "$PROFILE_NAME" add "$INJECTOR_DIR" || err 'dsh plugin add 失败（见上方输出）'
  else
    npx '@deepseek-ai/dsh' plugin --profile "$PROFILE_NAME" add "$INJECTOR_DIR" || err 'npx 装配失败（见上方输出）'
  fi
  ok "注入器与三个 router preset 已装配到 profile $PROFILE_NAME（重启后由 bundles 接管）"
  warn 'desktop profile：改用 GUI「插件」页安装，或用注入器工具 dev_install_package。'
fi

info '[3/3] 完成'
echo '1. 重启 DSH'
echo '2. GUI 新建会话 → 预设选择器里选 Router Standard / Router Spec / Router React'
echo '3. 发任务：生成任务自动 react，维护任务自动 spec，模糊任务进 weak 内路由'
echo '4. AI 自优化工具：dev_router_status / dev_router_mode / dev_reload_preset / dev_reload_preset_live'
