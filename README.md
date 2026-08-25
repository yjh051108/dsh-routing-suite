# dsh-routing-suite — 注入器 × 思维模式路由 套装

一个仓库装齐「运行时手术台 + 思维模式路由预设」：先装注入器（免重启运行时管理层），
再用它装配 router-standard 预设（任务感知思维模式路由，P1-P23 实测）。

[中文](README.md) | [English](README.en.md)

## 安装链（三步）

```powershell
# 1. 拉套装（单仓库：injector/preset 内容已直接入库，无需 submodule）
git clone https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. 一键安装（注入器装配 + 预设复制 + 布局自检 + 提示重启）
.\install.ps1
```

或手动：

```powershell
# 步骤 1：装配注入器（官方装配，重启后由 bundles 接管）
dsh plugin --profile web add .\injector
# dsh 不在 PATH 时：npx '@deepseek-ai/dsh' plugin --profile web add .\injector

# 步骤 2：安装 router 预设（每个预设目录平铺复制到 .agent-presets 下，DSH 只扫一级子目录）
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-standard'
Copy-Item -Recurse .\preset\router-standard $target

$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-spec'
Copy-Item -Recurse .\preset\router-spec $target

# 步骤 3：重启 DSH → 新会话选择 Router Standard / Router Spec (experimental)
```

> 注意：不要复制 `preset` 整目录（会多套一层，DSH 发现不了预设）。

## 组件

| 路径 | 仓库 | 版本 | 作用 |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | 运行时注入器：dev_* 工具全家桶（注入/热重载/侧挂转正/卸载/路由自愈）；`github:` 装配由 prepare 钩子自动构建 |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.3.0 … 主线 v1.19.1/v34](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.3.0) | 思维模式路由预设：router-standard（分类 persona + 完整 sections）/ router-spec（深度思考优先）。router-pro 为规划中（planned），未随 v0.3.0 发布 |

> 版本号以各组件仓库的 git tag 为准（列内链接直达对应 Release）。

两个组件随本仓库统一演进（`injector/` 与 `preset/` 已是仓库内普通目录，内容直接入库）；上游独立仓库 `dsh-super-injector` / `dsh-router-standard` 保留用于独立发布，后续可转镜像/归档。预设安装目录为 `preset/router-standard`（已平铺，无额外嵌套）。

## router-standard 预设能力（P1-P23 实测摘要）

- **三行为带 + weak 内路由**：spec（计划-集体）/ react（执行者）/ mixed（陷阱，回避）/ weak（模型自分类）
- **按模型选 persona**：Pro=spec 句+few-shot（区分度 +5.0）；Flash=neutral+classify（+5.7）
- **近距离引导**：每轮用户消息后注入固定引导（缓存 92-94% 命中），路由 96% + 收敛 100% + 反稀释
- **单任务三锚**（persona 静态）：回顾 + 收敛 + 反跑题 —— 开放任务完成率 0% → 100%
- **plan-mode 保留**：只替换 persona section，plan 边界不失忆
- **AI 自优化工具**：`dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## v0.3.0 变更（真实装配链路修复）

- **首轮路由真实生效**（[#13](https://github.com/yjh051108/dsh-routing-suite/issues/13)）：经 `agent/inbox/claimed` 在装配前捕获首条真实用户消息，首个请求即按任务分类（此前所有会话首轮无条件 weak）
- **近距离引导改走 `agent/pre-step`**（[#34](https://github.com/yjh051108/dsh-routing-suite/issues/34)/[#36](https://github.com/yjh051108/dsh-routing-suite/issues/36)/[#55](https://github.com/yjh051108/dsh-routing-suite/issues/55)）：引导与用户消息同请求注入，真实链路上可达，且不再产生额外的第二次 API 调用（此前每轮多 1 次调用 = 费用 2×）
- **缺导入修复**（[#11](https://github.com/yjh051108/dsh-routing-suite/issues/11)）、preset.yml YAML 引号（[#53](https://github.com/yjh051108/dsh-routing-suite/issues/53)）、promoted 后完整回归（[#44](https://github.com/yjh051108/dsh-routing-suite/issues/44)）、安装脚本与文档修正（[#35](https://github.com/yjh051108/dsh-routing-suite/issues/35)/[#42](https://github.com/yjh051108/dsh-routing-suite/issues/42)/[#41](https://github.com/yjh051108/dsh-routing-suite/issues/41)）、injector git 装配自动构建（[#40](https://github.com/yjh051108/dsh-routing-suite/issues/40)）

## 文档

- 注入器引导（规范铁律 10 条）：`injector/README.md`
- 路由预设论文与实验：`preset/docs/paper.md` + `preset/docs/experiments.md`（P1-P23）
- 仓库结构迁移（submodule → 直接文件）：[docs/FLATTEN-MIGRATION.md](docs/FLATTEN-MIGRATION.md)

## 许可证

MIT。致谢：xiaobright/modeltest（V4.1b 评测）、xiaobright/dsh-anchored-standard（锚定机制）。
