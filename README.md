# dsh-routing-suite — 注入器 × 思维模式路由 套装

一个仓库装齐「运行时手术台 + 思维模式路由预设」：先装注入器（免重启运行时管理层），
再用它装配 router-standard 预设（任务感知思维模式路由，P1-P23 实测）。

## 安装链（三步）

**Windows（PowerShell）：**

```powershell
# 1. 拉套装（含两个 submodule）
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. 一键安装（注入器装配 + 预设复制 + 提示重启）
.\install.ps1
```

**macOS / Linux：**

```bash
# 1. 拉套装（含两个 submodule）
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. 一键安装（注入器装配 + 预设复制 + 提示重启）
bash install.sh
```

或手动：

**Windows（PowerShell）：**

```powershell
# 步骤 1：装配注入器（官方装配，重启后由 bundles 接管）
dsh plugin --profile web add .\injector

# 步骤 2：安装 router-standard 预设
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-standard'
Copy-Item -Recurse .\preset\preset $target

# 步骤 3：重启 DSH → 新会话选择 Router Standard (experimental)
```

**macOS / Linux：**

```bash
# 步骤 1：装配注入器（官方装配，重启后由 bundles 接管）
dsh plugin --profile web add ./injector

# 步骤 2：安装 router-standard 预设
cp -r ./preset/preset ~/.dsh/.agent-presets/router-standard

# 步骤 3：重启 DSH → 新会话选择 Router Standard (experimental)
```

## 组件

| 路径 | 仓库 | 版本 | 作用 |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | 0.3.1 | 运行时注入器：dev_* 工具全家桶（注入/热重载/侧挂转正/卸载/路由自愈） |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | 0.1.0 | 思维模式路由预设：spec/react/weak 三模式 + 近距离引导 + 单任务三锚 |

两个组件独立演进（submodule 指向各自 main），套装聚合安装链与总览。

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

## 许可证

MIT。致谢：xiaobright/modeltest（V4.1b 评测）、xiaobright/dsh-anchored-standard（锚定机制）。
