# dsh-routing-suite — 注入器 × 思维模式路由 套装

一个仓库装齐「运行时手术台 + 思维模式路由预设」：先装注入器（免重启运行时管理层），
再用它装配 router-standard 预设（任务感知思维模式路由，P1-P23 实测）。

[中文](README.md) | [English](README.en.md)

## 安装链（三步）

```powershell
# 1. 拉套装（含核心 submodule + Oh-My-DSH 插件目录）
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. 一键安装（注入器装配 + 预设复制 + dsh-market 插件市场 + 提示重启）
.\install.ps1

# 可选：安装精选高星 DSH 插件
.\plugins\install.ps1
```

或手动：

```powershell
# 步骤 1：装配注入器（官方装配，重启后由 bundles 接管）
dsh plugin --profile web add .\injector

# 步骤 2：安装 router-standard 预设
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-standard'
Copy-Item -Recurse .\preset\preset $target

# 步骤 3：重启 DSH → 新会话选择 Router Standard (experimental)
```

## 组件

| 路径 | 仓库 | 版本 | 作用 |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | 运行时注入器：dev_* 工具全家桶（注入/热重载/侧挂转正/卸载/路由自愈） |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [main](https://github.com/yjh051108/dsh-router-standard)（v0.2.0 + 2026-08-16 勘误） | 思维模式路由预设：router-standard（RL 接口还原）/ router-spec（深度思考优先）；最新 main 含重要勘误与 Pro 方向更新 |
| `mode-boost/` | [dsh-mode-boost](https://github.com/yjh051108/dsh-mode-boost) | [v0.1.0](https://github.com/yjh051108/dsh-mode-boost/releases/tag/v0.1.0) | 模式提升插件：deep-persona 收敛提升 / boost 重分类引导 / 深度自适应分派（宿主平面，装配在官方 preset 之上） |
| `catalog/oh-my-dsh/` | [Oh-My-DSH](https://github.com/like-study1/Oh-My-DSH) | main（自动同步） | DSH 插件聚合社区/完整目录：1200+ 精选条目，自动同步 dsh-plugin 生态 |
| `market/dsh-market/` | [dsh-market](https://github.com/dsh-market/dsh-market) | main + 自动更新补丁 | DSH 内置插件市场：设置 → 插件市场，浏览/搜索/一键安装；自动检查并升级已装插件（补丁见 `patches/dsh-market-auto-update.patch`） |
| `plugins/` | 本仓库精选 | — | 高星 DSH 插件精选清单（`popular.json`）+ 一键安装器（`install.ps1`） |

> 版本号以各组件仓库的 git tag / main 为准（列内链接直达对应仓库或 Release）。

核心组件独立演进（submodule 指向各自 main），套装聚合安装链、插件目录与精选清单。

## router-standard 预设能力（P1-P23 实测摘要）

- **三行为带 + weak 内路由**：spec（计划-集体）/ react（执行者）/ mixed（陷阱，回避）/ weak（模型自分类）
- **按模型选 persona**：Pro=spec 句+few-shot（区分度 +5.0）；Flash=neutral+classify（+5.7）
- **近距离引导**：每轮用户消息后注入固定引导（缓存 92-94% 命中），路由 96% + 收敛 100% + 反稀释
- **单任务三锚**（persona 静态）：回顾 + 收敛 + 反跑题 —— 开放任务完成率 0% → 100%
- **plan-mode 保留**：只替换 persona section，plan 边界不失忆
- **AI 自优化工具**：`dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## 生态融合：插件市场 + 高星插件 + 完整聚合目录

- **内置插件市场**：`market/dsh-market/` 是 [dsh-market](https://github.com/dsh-market/dsh-market)
  子模块 + `patches/dsh-market-auto-update.patch` 自动更新补丁。安装后打开 **设置 → 插件市场**，
  即可浏览/搜索/点击直接安装社区插件；并会自动检查已装插件的新版本，按间隔自动升级。
  一键安装（含自动更新）：`.\install.ps1`；官方原版（无自动更新）：`dsh plugin --profile web add dshmarket`。
- **完整目录**：`catalog/oh-my-dsh/` 是 [Oh-My-DSH](https://github.com/like-study1/Oh-My-DSH)
  聚合社区子模块，自动同步 `dsh-plugin` 生态 1200+ 精选条目，入口见
  [`catalog/oh-my-dsh/PLUGINS.md`](catalog/oh-my-dsh/PLUGINS.md)。
- **高星精选**：`plugins/` 收录 GitHub 上 Star 靠前且真正面向 DSH 的插件，
  含机器可读清单 `popular.json` 与一键安装器 `install.ps1`，入口见
  [`plugins/README.md`](plugins/README.md)。


## 文档

- 注入器引导（规范铁律 10 条）：`injector/README.md`
- 路由预设论文与实验：`preset/docs/paper.md` + `preset/docs/experiments.md`（P1-P23）

## 许可证

MIT。致谢：xiaobright/modeltest（V4.1b 评测）、xiaobright/dsh-anchored-standard（锚定机制）。
