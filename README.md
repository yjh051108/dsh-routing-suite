# dsh-routing-suite — 注入器 × 思维模式路由 套装

一个仓库装齐「运行时手术台 + 思维模式路由预设」：先装注入器（免重启运行时管理层），
再装配路由预设（任务感知思维模式路由，P1-P30 实测；v0.3.0 起三预设并行）。

## 安装链（三步）

```powershell
# 1. 拉套装（含两个 submodule）
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. 一键安装（注入器装配 + 三预设复制 + 提示重启）
.\install.ps1
```

或手动：

```powershell
# 步骤 1：装配注入器（官方装配，重启后由 bundles 接管）
dsh plugin --profile web add .\injector

# 步骤 2：安装路由预设（按需装一个或多个）
$presetRoot = Join-Path (Get-Location) 'preset\preset'
foreach ($p in @('router-standard','router-spec','router-pro')) {
  Copy-Item -Recurse (Join-Path $presetRoot $p) `
    (Join-Path $env:USERPROFILE ('.dsh\.agent-presets\' + $p))
}
# NOTE: 同时安装多个预设时保持各目录独立——loader 按 URL 缓存 ESM 模块，勿原地覆盖

# 步骤 3：重启 DSH → 新会话选择 Router Standard / Router Spec / Router Pro (experimental)
```

## 组件

| 路径 | 仓库 | 版本 | 作用 |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | 运行时注入器：dev_* 工具全家桶（注入/热重载/侧挂转正/卸载/路由自愈） |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.3.0](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.3.0) | 思维模式路由预设 ×3：Router Standard / Router Spec / Router Pro |

> 版本号以各组件仓库的 git tag 为准（列内链接直达对应 Release）。

两个组件独立演进（submodule 指向各自 main），套装聚合安装链与总览。

## 三个路由预设（v0.3.0）

| 预设 | 安装目录 | 形态 |
|---|---|---|
| Router Standard (experimental) | `.agent-presets\router-standard` | RL 接口还原：一句话 persona + shell/editor 工具面，想一段做一段（think-act 反馈环，25 步/24 工具调用） |
| Router Spec (experimental) | `.agent-presets\router-spec` | 深度思考优先：分类 persona + 完整 prompt sections，首轮超长思维链（101K 推理 0 行动是其特征，不是缺陷） |
| Router Pro (v4pro) | `.agent-presets\router-pro` | V4 Pro 测量最优：维护→RL 接口、构建→doer 接口、无证据→router-v2 few-shot；决策闭环节拍器；竞争带永不触碰 |

## 路由能力（P1-P30 实测摘要）

- **三行为带 + weak 内路由**：spec（计划-集体）/ react（执行者）/ mixed（陷阱，回避）/ weak（模型自分类）
- **按模型自动分派**（无需配置）：Pro→router-v2 + 决策闭环（100% 路由，P24）；Flash→w7 + commit 锚（96% 路由，P23）；persona 按模型路线自动选择
- **深度自适应引导（v20）**：简单任务→快速收敛引导（P30：1 步零浪费）；复杂任务→决策闭环节拍器「深度 +12% 且收敛更快」（8.0 vs 8.3 步，3/3 完成）
- **竞争带 [0.03, 0.455] 永不触碰**（E2：9/12 反路由）：数值接口量化到稳定带，过渡带从不自动选中
- **反跑题锚**：环境怀疑/重复确认类反刍压到 0.0-0.3% 推理 token；无预算帽（schema 锚定 256K 有效上下文）
- **plan-mode 保留**：只替换 persona section，plan 边界不失忆
- **AI 自优化工具**：`dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## 文档

- 注入器引导（规范铁律 10 条）：`injector/README.md`
- 路由预设论文与实验：`preset/docs/paper.md`（基础理论）+ `preset/docs/paper-pro.md`（V4 Pro 最优路由）+ `preset/docs/experiments.md`（P1-P23 数据表）+ `preset/docs/pro-test.md`（Pro 实测）

## 许可证

MIT。致谢：xiaobright/modeltest（V4.1b 评测）、xiaobright/dsh-anchored-standard（锚定机制）。
