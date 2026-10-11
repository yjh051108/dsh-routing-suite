# dsh-routing-suite — 注入器 × 思维模式路由 × 分级模式 套装

一个仓库装齐三件套：**运行时注入器**（免重启运行时管理层）+
**思维模式路由预设**（任务感知推理模式，P1-P23 实测）+
**分级任务协议**（脑暴出题 → 规格化计划 → 打卡制 → 组收官 → 终验，含红队门与审计端点）。

[中文](README.md) | [English](README.en.md)

## 组件入口（快速跳转）

| 组件 | 说明 | 入口 |
|---|---|---|
| **injector** | 运行时注入器：`dev_*` 工具全家桶（注入/热重载/卸载/侧挂转正/路由自愈） | [injector/README.md](injector/README.md) · [文档](injector/docs/SPEC.md) |
| **preset** | 思维模式路由预设（router-standard / router-spec，按模型 persona 路由） | [preset/README.md](preset/README.md) · [实验报告](preset/docs/experiments.md) |
| **graded** | 分级模式：会话级两级任务协议（6 工具+三模式+小类模式粒度+红队门+审计端点+超级面板） | [graded/README.md](graded/README.md) · [架构](graded/docs/ARCHITECTURE.md) · [理论](graded/docs/THEORY.md) · [实测数据](graded/docs/DATA.md) |

## 研究与数据（graded）

**"模型也会偷懒——我们测到了，还做了对抗"** —— 分级模式插件的公开研究位：
- [🔬 模型注意力懈怠：观测笔记](graded/docs/STUDY.md)——长程任务里验证勤勉度衰减的真实分段数据（无协议链晚段"1 工具/0 读图" vs 协议链全程在线）+对抗机制对照
- [📊 协议 vs 无协议：实测对比](graded/docs/COMPARE.md)——同型 3D 任务三会话对比表+ASCI I 图
- [🧪 测量工具](graded/scripts/measure.mjs)——`node scripts/measure.mjs 你的会话.jsonl`：任何人可对自己会话复算上述指标（脱敏：只输出数字）
- [📁 实测数据](graded/docs/DATA.md)——三会话脱敏指标表+懈怠强度表+审计口径

## 安装（DSH 0.2.x：profile bundle）

```powershell
# 1. 拉套装（单仓库：injector/preset 内容已直接入库）
git clone https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. 装进 profile（注入器 + 三个 router preset 一次装好）
#    web/headless 等 profile 用 CLI；desktop profile 由 Electron 独占，用 GUI「插件」页
dsh plugin --profile web add .
# dsh 不在 PATH 时：npx '@deepseek-ai/dsh' plugin --profile web add .
```

> DSH 0.2.x 起 agent preset 不再从 `$DSH_HOME/.agent-presets/` 目录扫描加载——
> preset 由包的 `cordis.patch.yml`（`dsh.bundle.patch`）以 `preset-<id>` 声明，
> 随 profile bundle 一起装载。装包即装预设，**不要再复制到 `.agent-presets`**。
> desktop profile 的 `dsh plugin` 被 Electron 独占，请在 GUI「插件」页安装本仓库目录/tgz，
> 或用注入器工具 `dev_install_package`。

**DSH Target**：`>=0.1.0-rc.6 <0.3.0`（0.2.x 已实测：bundle 装载 + preset 注册通过）

## 组件

| 路径 | 仓库 | 版本 | 作用 |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | 运行时注入器：dev_* 工具全家桶（注入/热重载/侧挂转正/卸载/路由自愈） |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.3.0 … 主线 v1.19.1/v34](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.3.0) | 思维模式路由预设：router-standard（分类 persona + 完整 sections）/ router-spec（深度思考优先）/ router-react（think-act） |
| `graded/` | [dsh-graded-mode](https://github.com/yjh051108/dsh-routing-suite/tree/main/graded) | [v0.0.1-rc1](https://github.com/yjh051108/dsh-routing-suite/releases/tag/v0.0.1-rc1) | graded 模式：会话级两级任务协议（脑暴选择题对齐 → 北极星定稿 → 规格化计划 → 按规格注入 → 打卡制 → 组收官 → 终验）；6 工具 + 三模式 + 小类模式粒度 + 红队门 + 审计端点；`graded/dsh-graded-mode-3.2.0.tgz` 可直接 `dsh plugin --profile web add` |

> 版本号以各组件仓库的 git tag 为准（列内链接直达对应 Release）。

三个组件随本仓库统一演进（`injector/`、`preset/` 与 `graded/` 已是仓库内普通目录，内容直接入库）；上游独立仓库保留用于独立发布，后续可转镜像/归档。预设随包安装在 `preset/router-*`，由 `cordis.patch.yml` 声明。


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
