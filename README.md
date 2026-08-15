# dsh-routing-suite — 注入器 × 思维模式路由 套装

一个仓库装齐「运行时手术台 + 思维模式路由预设 + Pro 实验台」：先装注入器（免重启运行时管理层），
再装配 router-standard 预设（任务感知思维模式路由，P1-P23 实测），按需打开 Pro 实验臂收集可复现证据。

## 安装链（四步）

```powershell
# 1. 拉套装（含两个 submodule）
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. 一键安装（注入器装配 + 预设复制 + Pro 实验插件 + 提示重启）
.\install.ps1
```

或手动：

```powershell
# 步骤 1：装配注入器（官方装配，重启后由 bundles 接管）
dsh plugin --profile web add .\injector

# 步骤 2：安装 router-standard 预设
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-standard'
Copy-Item -Recurse .\preset\preset $target

# 步骤 3：安装 Pro 实验插件（默认只观测，不改变 Flash 或未知模型）
dsh plugin --profile web add .\pro-lab

# 步骤 4：重启 DSH → 新会话选择 Router Standard (experimental)
```

## 组件

| 路径 | 仓库 | 版本 | 作用 |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | 运行时注入器：dev_* 工具全家桶（注入/热重载/侧挂转正/卸载/路由自愈） |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.1.1](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.1.1) | 思维模式路由预设：spec/react/weak 三模式 + 近距离引导 + 单任务三锚 |
| `pro-lab/` | 本套装插件 | `0.1.0` | Pro 实验臂、首轮 request/header 观测、schema/prompt 指纹、invalid-run 检查、脱敏 JSONL 导出 |

> 版本号以各组件仓库的 git tag 为准（列内链接直达对应 Release）。

两个组件独立演进（submodule 指向各自 main），套装聚合安装链与总览。

## Pro 实验台

`pro-lab` 默认是 `standard`：只记录 provider/model、maxTokens、工具顺序、schema 指纹、阶段、调用/错误/耗时相关计数，不自动改写请求。它只对明确识别为 V4 Pro 的模型自动启用实验观测；Flash 和未知模型保持原有 routing-suite 行为。OpenCode Go Flash 会标记为 `opencode-go-flash-quantized`，必须和官方 Flash 分开统计，不能把量化造成的轻微降智误判为路由或提示词效果。

要做干净的首轮比较，建议在启动 DSH 前设置 `DSH_PRO_LAB_ARM=anchored`（替换为其他实验臂）。也可以让首条用户消息使用 `/v4 lab anchored` 选择实验臂；`dev_pro_lab_mode` 只适用于尚未 assembly 的外部预置 session。首个 assembly 后实验臂锁定，避免同一 session 中途改变变量：

| 实验臂 | 首轮行为 | 晋升条件 |
|---|---|---|
| `standard` | 不改写 | 不适用 |
| `anchored` | 固定 Pro prompt + 一个 shell/一个文件操作工具 | 首个持久 `tool/call` |
| `prompt-only` | 只改 prompt，保留完整工具目录 | 不适用 |
| `schema-only` | 只裁剪首轮工具目录 | 首个 `tool/call` |
| `injection-suppressed` | 清空 assembled contexts | 不适用 |
| `promote-on-tool` | 首轮窄 schema | 首个 `tool/call` |
| `promote-on-assistant` | 首轮窄 schema | 首个 `assistant/message` |
| `zero-tool` | 首轮空工具目录 | 仅用于对照 |
| `whoami` / `warmup` | 身份探针 / 固定 warmup prompt | 不适用 |

使用 `dev_pro_lab_status` 查看当前实验是否有效；如果首轮 schema、header 或 prompt 出现不符合实验臂的变化，会在 `invalid` 中标记。使用 `dev_pro_lab_export` 导出 JSONL。日志不会保存原始 prompt、reasoning、密钥或工具参数，默认写入 `$DSH_HOME/pro-lab/`。

实验建议先做每臂 6-8 次微探针，再用不同结构的工程任务留出复验；不要把同一个 PE998 任务的大量重复运行当作因果证据。

## router-standard 预设能力（P1-P23 实测摘要）

- **三行为带 + weak 内路由**：spec（计划-集体）/ react（执行者）/ mixed（陷阱，回避）/ weak（模型自分类）
- **按模型选 persona**：Pro=spec 句+few-shot（区分度 +5.0）；Flash=neutral+classify（+5.7）
- **近距离引导**：每轮用户消息后注入固定引导（缓存 92-94% 命中），路由 96% + 收敛 100% + 反稀释
- **单任务三锚**（persona 静态）：回顾 + 收敛 + 反跑题 —— 开放任务完成率 0% → 100%
- **plan-mode 保留**：只替换 persona section，plan 边界不失忆
- **AI 自优化工具**：`dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## 文档

- 注入器引导（规范铁律 10 条）：`injector/README.md`
- 路由预设论文与实验：`preset/docs/paper.md` + `preset/docs/experiments.md`（P1-P23）
- Pro 实验台设计与数据格式：`pro-lab/README.md`

## 许可证

MIT。致谢：xiaobright/modeltest（V4.1b 评测）、xiaobright/dsh-anchored-standard（锚定机制）。
