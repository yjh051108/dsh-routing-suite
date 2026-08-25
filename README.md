# dsh-routing-suite — 注入器 × 思维模式路由 套装

一个仓库装齐「运行时手术台 + 路由预设」：先装注入器（免重启运行时管理层），
再用它装配 router-standard 预设（严格 workflow + 阶段化渐进披露 + 交付证据门禁）。persona 路由实验史（P1-P23）见下文。

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
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.4](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.4) | 运行时注入器：dev_* 工具全家桶（注入/热重载/侧挂转正/卸载/路由自愈）；v0.3.4 稳定能力声明迁 systemPrompt.section 通道 + dev_* 清理作用域收窄；`github:` 装配由 prepare 钩子自动构建 |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.3.0 … 主线 v1.29.0/v34](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.3.0) | 路由预设：router-standard（固定 RL persona + 阶段化渐进披露 + delivery_check 证据门禁）/ router-spec（深度思考优先，实验）。v1.29 对齐 schema=执行一致 + 保留他方 runtime contexts |

> 版本号以各组件仓库的 git tag 为准（列内链接直达对应 Release）。

`injector/` 与 `preset/` 是随本仓库入库的**安装镜像**；预设安装目录为 `preset/router-standard`（已平铺，无额外嵌套）。

## 同步策略（source of truth）

- **上游独立仓库是发布源**：代码在 `dsh-super-injector` / `dsh-router-standard` 以 PR 演进；
  本仓库镜像在发布/对齐时**整体复制**更新——同一文件只在一个仓库手改，禁止双向人工演进。
- **同步动作**：上游 PR 合并后，从两个独立仓库 main 复制对应文件到 `injector/`、`preset/`，提交注明 `sync: <upstream>@<sha>`。
- **当前待同步**：router-standard v1.29.0（`fix/ctxprompt-alignment`）、dsh-super-injector v0.3.4（`fix/ctxprompt-alignment`）——上游 PR 合并后执行本步。
- **版本口径**：以独立仓库 CHANGELOG / git tag 为准；本 README 表格保持与上游对齐。

## router-standard 预设能力（P1-P23 实测摘要 · 历史实验线）

> ⚠️ 本表是 persona 路由实验线（v1.19 之前）的历史记录。**当前主线（v1.20+，见 `preset/CHANGELOG.md`）：固定 RL persona + 阶段化渐进披露（零预解锁）
> + 完成信号晋级 + delivery_check 交付证据门禁**；按任务分类的 persona 路由已退役，此表保留作实验档案。

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
