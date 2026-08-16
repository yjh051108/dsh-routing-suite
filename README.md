# dsh-routing-suite — 注入器 × 思维模式路由 套装

一个仓库装齐「运行时手术台 + 任务感知思维模式路由预设」：先装注入器（免重启运行时管理层），
再用它装配 router-standard / router-spec 预设（任务感知思维模式路由，P1-P30 实测）。

[中文](README.md) | [English](README.en.md)

> **v0.2.0 重要变更**：路由预设拆分为两个独立预设——
> `router-standard`（默认，RL 接口还原：一句话人设 + shell/编辑器双工具面，边想边做）与
> `router-spec`（深度思考优先：分类 persona + 完整提示词段，首轮长思维链是其特征）。
> 同时修正了理论叙事（见 [preset 勘误声明](https://github.com/yjh051108/dsh-router-standard/blob/main/docs/apology.md)）。

## 安装链（两步）

```powershell
# 1. 拉套装（含两个 submodule）
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. 一键安装（注入器装配 + 预设复制 + 提示重启）
.\install.ps1
```

升级已装的预设：

```powershell
.\install.ps1 -Update   # 覆盖 preset（自动备份旧版）；注入器缺失 lib 时自动从 Release 下载 tgz
```

手动安装：

```powershell
# 步骤 1：装配注入器（官方装配，重启后由 bundles 接管）
dsh plugin --profile web add .\injector

# 步骤 2：安装预设
$dst = Join-Path $env:USERPROFILE '.dsh\.agent-presets'
Copy-Item -Recurse .\preset\preset\router-standard $dst
Copy-Item -Recurse .\preset\preset\router-spec      $dst

# 步骤 3：重启 DSH → 新会话选择 Router Standard (experimental) 或 Router Spec (experimental)
```

> 若 `injector\lib` 缺失（未构建），`install.ps1` 会自动下载官方 Release 的预构建 tgz；
> 也可自行构建：`cd injector; bash scripts/build.sh`（需 `DSH_CHECKOUT` 指向 DSH 源码）。

## 组件

| 路径 | 仓库 | 版本 | 作用 |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | 运行时注入器：dev_* 工具全家桶（注入/热重载/侧挂转正/卸载/路由自愈） |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.2.0](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.2.0) | 双预设：router-standard（RL 接口还原）/ router-spec（深度思考优先） |
| `mode-boost/` | [dsh-mode-boost](https://github.com/yjh051108/dsh-mode-boost) | [v0.1.0](https://github.com/yjh051108/dsh-mode-boost/releases/tag/v0.1.0) | 模式提升插件：deep-persona 收敛提升 / boost 重分类引导 / 深度自适应分派（宿主平面，装配在官方 preset 之上） |

> 版本号以各组件仓库的 git tag 为准（列内链接直达对应 Release）。

三个组件独立演进（submodule 指向各自 main），套装聚合安装链与总览。

## 预设能力摘要

**Router Standard (experimental)** — RL 接口还原（v0.2.0 默认）
- 首轮 system 只有 RL 训练句 + shell/str_replace_editor 工具面，模型「想一段、做一段」
- 实测：25 步 / 24 工具调用 / 19KB 产物 vs 旧面 101K 推理字符零行动
- 首轮工具调用后自动展开完整 Standard 工具目录

**Router Spec (experimental)** — 深度思考优先（v0.2.0 新增）
- 分类 persona（spec 计划型 / react 执行型）+ 保留全部提示词段
- 首轮超长思维链是特征（101K 推理 0 行动），适合需要先想透再动手的任务

**两个预设共有**
- 三行为带 + weak 内路由：spec（计划）/ react（执行）/ weak（模型自分类，就近引导）
- 首轮路由读取 `agent/inbox/claimed`（assemble 之前必达），并过滤插件注入消息（`source.kind`）
  ——修复了「首轮无条件落 weak」与「user-approval 消息钉死 weak」两类结构性失效（issue #13）
- 近距离引导：每轮真实用户消息后注入固定引导（缓存友好）
- 单任务三锚（persona 静态）：回顾 + 收敛 + 反跑题
- AI 自优化工具：`dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## 平台支持

| 平台 | 状态 | 说明 |
|---|---|---|
| Windows（PowerShell 5.1/7+） | ✅ | install.ps1 纯 ASCII，PS 5.1 解析通过（issue #16 已修） |
| WSL / Linux / macOS | ✅ | 预设与注入器均为跨平台 Node 代码；注入器构建需 `bash scripts/build.sh` + `DSH_CHECKOUT`，或直接用 Release tgz |

## FAQ

**Q：安装后 DSH 启动报 `Cannot find module ... lib/index.js`？**
A：注入器未构建/未下载。用 `install.ps1` 重装（自动下载 Release tgz），或先 `cd injector; bash scripts/build.sh` 再 `dsh plugin --profile web add .\injector`。

**Q：Web UI 设置页「插件」空白？**
A：属注入器侧的 UI 注册问题，v0.3.x 已修复（`slots.register(options, component)` 正确写法）。升级注入器即可。

**Q：能正常使用 skill 和插件吗？**
A：可以。预设只替换首轮 persona 段与工具面，skills/其他插件的注册在 host 平面不受影响；首轮工具调用后完整目录即恢复。

**Q：支持其他 DeepSeek API 厂商（火山、千帆、Opencode 等）吗？**
A：路由逻辑与模型通道无关——任何 `agent.options.provider/model` 都走同一路由；persona 按模型族（Pro/Flash）区分，其余由你的 provider 配置决定。

**Q：有使用教程吗？**
A：装好后新建会话选择对应预设即可；`dev_router_status` 可查看当前路由状态。深度文档见 [preset/docs](https://github.com/yjh051108/dsh-router-standard/tree/main/docs)。

## 文档

- 注入器引导（规范铁律 10 条）：`injector/README.md`
- 路由预设论文与实验：`preset/docs/paper.md` + `preset/docs/experiments.md`（P1-P30）
- 理论勘误：`preset/docs/apology.md`

## 许可证

MIT。致谢：xiaobright/modeltest（V4.1b 评测）、xiaobright/dsh-anchored-standard（锚定机制）。
