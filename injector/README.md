# dsh-super-injector — 超级模组注入器

> ## 🎉 v0.3.0 重大声明（2026-08-14）
>
> **从经验补丁到源码契约——注入器完成规范重构。**
>
> 本版本按 [docs/SPEC.md](./docs/SPEC.md)（基于 DSH 0.1.0-rc.6 源码语义推导的
> 设计契约）重构自重载为**官方 REPLACE 结构**：工具只排程、绝不亲自自杀；
> reboot 走 `entry._dispose`（官方 `_disposing` 豁免）+ 失败自动 rollback。
> 从此注入器的一切行为都有源码依据，不再依赖经验补丁。
>
> **里程碑回顾**：
> - 三轮零上下文 subagent 评测：9/10 → 9.5/10 → **10/10**
> - 作死压力测试：连环自杀/坏语法/悬空 junction/循环注入卸载——**零崩溃零残留**
> - **云源自举**：下载 release 副本 → 装配 → 注入器从云端副本运行（自检 8/8）
> - **免杀进程恢复**：失败 → touch patch（include.refresh 进程内重装配）→ 6 秒复活
> - **DSH 正式版兼容**：0.1.0-rc.6 一行不改直接运行（peerDeps 范围声明实证）
>
> 哲学不变：**一切皆插件**——注入器是 DSH 生态的运行时注入标准层，
> 让"插件想长成什么样就长成什么样"。

DSH 生态的 **BepInEx 式模组注入入口**：运行时把任意本地插件包注入运行中的 web，
不碰 patch / package.json / bundles 列表、不重启进程。**注入即完整生效（host 工具 + client UI）。**

> 灵感：官方装配机制（profile bundle / repository-plugin）是唯一的"官方入口"，就像游戏
> 只有启动器能装模组。本插件打破这一点——引导器走官方入口装一次，之后**万物皆可运行时注入**。

## 安装（三选一）

### 方式 A：Release 包（推荐，免构建）

从 [Releases](https://github.com/yjh051108/dsh-super-injector/releases) 下载
`dsh-external-dsh-super-injector-0.0.1.tgz`，解压得到插件目录（含 `lib/` 与 `cordis.patch.yml`），然后：

```bash
# 官方装配（重启后由 bundles 接管，生产态）
dsh plugin --profile web add <解压目录>

# 或运行时注入（免重启，开发态；需任一环境已常驻注入器）
# 对 AI 说：dev_inject_plugin <解压目录>
```

### 方式 B：git 装配

```bash
dsh plugin --profile web add github:yjh051108/dsh-super-injector
```

> git 依赖拉取的是源码仓库（不含 `lib/`）；包内 `prepare` 钩子会在安装时自动
> 用 tsdown 构建自包含 `lib/`（首次需要网络拉取 tsdown，之后走本地缓存）。
> 若构建失败，请改用方式 A 的 Release tgz（预构建产物）。

### 方式 C：引导装配（源码方式，只需一次）

> ⚠️ 仅限未走 bundles 装配时使用：注入器自带 bundle 层会自注册
> `dsh-super-injector`，与下方手动 `insert` 撞同一个 loader entry id，会报
> `duplicate loader entry id`。走方式 A/B 装配后请勿再加这一条。

在 `~/.dsh/profiles/web/cordis.patch.yml` 添加：

```yaml
- insert:
    - id: dsh-super-injector
      name: '@yjh051108/dsh-super-injector'
      config: {}
```

引导器常驻后，任意超级模组随取随用，无需再碰官方配置。

## 兼容性

- **不硬编码 DSH 版本**：peerDependencies 全部为范围声明
  （`@deepseek-ai/dsh-tools: >=0.0.1-rc <2`、`cordis: >=4.0.0-rc <5`）——DSH 升级不报废。
- 已适配服务改名：`webServer`（原 httpServer）、`compaction`（原 compact）。

## 特性

- 🔥 **热重载 + 自重载**：`dev_reload_package` 整包重载（清缓存 → 重新 import → 重建 fiber，失败回滚保留旧代）；注入器自身也支持自重载（自杀 → 全局定时器重建）
- 🤖 **自动 watch**：注入即自动监听插件目录，改代码 build 后约 1.5 秒自动重载（无需手动触发）
- 🖥️ **注入插件 UI 完整生效**：清除 loader 幽灵 entry 隔离（normalizeEntry），client 模块补扫/联动/卸载清理——注入的插件 host 工具 + 图谱/面板等 UI 全部可用
- 🧪 **开发侧挂区（staging）+ 持久化**：测试工具挂"后侧"不进 tools schema、缓存零污染；`dev_stage_promote` 一键转正；staging 落盘，**自重载/重启后转正工具自动恢复**
- 🧹 **一键卸载**：`dev_uninject_plugin` fiber 全清理（工具/监听/路由/client 表）→ 清注入清单 → 删 junction，免重启
- 🛠️ **路由自愈**：`dev_clear_routes` 直捣 webserver 内部路由表，热重载残留的孤儿路由免重启清除
- 🔁 **重启自动恢复**：注入清单持久化（`~/.dsh/super-injector/registry.json`），web 重启后自动归位
- 📊 **操作自检**：每次注入/重载/安装返回 `host ✓ / client ✓` 双验证；`dev_plugin_status` 含操作成功率统计
- 🛡️ **失败可重试**：`hasActiveEntry` 权威防重 + 失败残留缓存自动清理 + 残留 entry 自动清理

## 与 dsh-evolve 的定位差异（生态互补）

| | dsh-evolve | dsh-super-injector |
|---|---|---|
| 形态 | **创造模式**：agent 现场写单文件插件源码（`~/.dsh/evolve/<name>.mjs`）热挂载 | **手术台**：注入开发者预构建的**完整插件包**（package.json + lib/） |
| 适用 | agent 随对话长出小工具（记账/天气/周报） | 装/换成品模组、自主开发闭环（写 → build → 注入 → 热重载） |
| 联动 | evolve 长出的源码可升级为完整包，再走注入器上膛 | 注入后可被 `dev_reload_package` 热重载 |

## 生态定位：官方之下的运行时标准层

官方对插件体系的方向（2026-07 agent notes）：

1. **否决安装命令 + 安装数据库 + marketplace**——持久化插件只有一种状态：**配置**（cordis.patch.yml / profile bundles / repositories），事务性 HMR 对账；
2. **agent 自己管理运行时**——自指 cordis 工具集，运行时归 agent 管。

翻译：官方钦定"**装什么**"（bundle / repository + 配置），但"**装完之后怎么改**"——热重载、侧挂测试、一键转正、卸载、失败自愈——是官方留白。**这一整块运行时管理面，由本插件吃下。**

| 生态入口 | 层 | 一句话分工 |
|---|---|---|
| 官方 bundle / repository | 装配层 | 唯一官方入口，配置即状态 |
| plugin-registry | 官方薄控制台 | 官方格式插件管理与开发引导 |
| marisa | agent 面工具链 | 临时插件 → 持久化插件的固化桥 |
| mygo | 受管对象层 | 插件生命周期对象化（锁定/启停/依赖图） |
| dsh-evolve | 创造模式 | agent 现场长出单文件能力 |
| **dsh-super-injector** | **运行时手术台** | **开发闭环全家桶：注入 / 热重载 / 侧挂转正 / 卸载 / 路由自愈 / UI 联动** |

**设计原则**：

1. **不发明协议**：注入的是标准插件包（package.json + lib/），格式就是官方包格式，装上即官方语义；
2. **双路径，尊重"配置唯一"**：运行时注入（免重启，开发态）↔ `dev_install_package` 落 profile bundles（重启后由官方接管，生产态）——注入清单只是**运行时恢复缓存**，不是第二安装数据库；
3. **模型可驱动**：dev_* 全是工具，agent 自己注入/卸载/转正——正踩在官方"agent 自己管理运行时"的方向上；
4. **可逆且自愈**：注入可回滚（失败保旧代）、卸载即净（fiber 全清理）、残留可自愈（路由/缓存/entry 自动清理）。

**目标**：成为官方装配机制之下、生态事实标准的**运行时管理层**——"启动器装模组"只是起点，注入器让 DSH 拥有"**万物可注入、注入可回滚、改完即生效**"的 Mod 级体验。

## 工具全家桶（全部免重启）

| 工具 | 说明 |
|---|---|
| `dev_inject_plugin` | 运行时注入本地插件包（junction 链接 + loader.create，`hasActiveEntry` 防重） |
| `dev_uninject_plugin` | 一键卸载注入模组（fiber dispose 全清理；bundle 插件自动写 disabled 阻断自装配） |
| `dev_injected_list` | 列出注入清单 |
| `dev_install_package` | 热装配本地 bundle 插件（profile package.json + junction + loader.create，重启后由 bundles 列表正常装配） |
| `dev_reload_package` | 整包热重载（清缓存 → 重新 import → 重建 fiber，失败回滚保留旧代；含自重载） |
| `dev_plugin_status` | 已装配插件清单、fiber 状态与操作成功率统计 |
| `dev_clear_routes` | webserver 路由残留自愈（按 path 前缀删除孤儿路由） |
| `dev_stage_add` | 开发侧挂：测试工具挂后侧（不进 tools schema，缓存零污染） |
| `dev_stage_call` | 调用侧挂工具测试 |
| `dev_stage_list` | 列出侧挂工具（含转正状态） |
| `dev_stage_promote` | 一键转正：侧挂工具挂前侧正式注册（唯一一次缓存刷新） |
| `dev_stage_demote` | 撤回/注销侧挂或已转正工具 |

## 插件开发指南（生产线）

**哲学**：插件想长成什么样就能长成什么样——工具包 / 守护循环（timer+LLM 自主 agent loop）/ UI 面板 / 混合形态，同一注入通道；注入即完整生效（host+UI）、可热重载与自重载、卸载即净；**插件自身的提示词/工具/循环皆可自我优化**（改 → build → 重载闭环）。建新插件**优先克隆/借鉴/重构生态已有资源**（dsh-external 仓库、已注入插件、官方 packages 模式），不重复造轮子。

### 一分钟起步（生产线三件套）

```bash
# 1. 生成骨架（toolkit / daemon-loop / ui-panel / hybrid）
#    对 AI 说：dev_scaffold_plugin {"dir": "D:/dev/my-plugin", "name": "my-plugin", "form": "daemon-loop", "description": "..."}

# 2. 构建打包（探测 DSH_CHECKOUT → tsc host → tsdown client（如声明）→ npm pack → tgz）
#    对 AI 说：dev_build_plugin {"dir": "D:/dev/my-plugin"}

# 3. 发布（gh release create v<version> + tgz）
#    对 AI 说：dev_release_plugin {"dir": "D:/dev/my-plugin", "version": "0.1.0"}

# 注入即活：dev_inject_plugin {"dir": "D:/dev/my-plugin"}
# 改代码 → build → 自动 watch ~1.5s 重载（或 dev_reload_package）
```

### 30 行写一个"会思考的插件"（守护循环最小示例）

```ts
import type { Context } from 'cordis'
import type LlmService from '@deepseek-ai/dsh-llm'
import { createUserMessage, ReasoningEffortId } from '@deepseek-ai/dsh-llm'

type AppContext = Context & { llm: LlmService; setInterval(fn: () => void, ms: number): any }

export const name = 'my-daemon'
export const inject = ['timer', 'llm']

export function apply(ctx: AppContext): void {
  let route: { provider: string; model: string } | null = null
  ctx.on('llm/stream', (options, next) => { route = { provider: options.provider, model: options.model }; return next() })
  ctx.setInterval(() => {
    void (async () => {
      if (!route) return
      const stream = ctx.llm.stream({
        provider: route.provider, model: route.model,
        system: '判断是否需要人工介入，直接输出结论',
        messages: [createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: '检查事项...' }] })],
        reasoningEffort: ReasoningEffortId('off'), maxTokens: 200,
      })
      for await (const chunk of stream) { /* 决策 → 行动 */ }
    })().catch(() => {})
  }, 60_000)
}
```

**规范铁律**（注入器实测沉淀）：
1. **资源注册必须挂 `ctx.effect`**（工具/路由/监听）——热重载/卸载才能自动清理，否则僵尸残留（注入器自己踩过）
2. **peerDependencies 用范围声明**（`>=0.0.1-rc <2`、`>=4.0.0-rc <5`）——不硬编码版本，DSH 升级不报废
3. **client bundle 需单独构建**（tsdown → lib/client.js）——UI 形态两步构建
4. **提示词注入遵守缓存原则**：静态文本 + order 靠前（静态到头）；动态内容走消息尾（动态到尾）；严禁动态拼接进 system——**system 前缀任何动态变化 = 整个会话缓存全量 miss**（命中便宜 10 倍）
5. **自检**：改完代码跑一次 `dev_self_test`，确保注入/重载/自重载/预检/卸载全链路不退化
6. **首轮锚定**（V4 Pro 实测，参考 [dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)，Project2 98/99）：工具面大（≥5 个）时，首轮请求只暴露最核心的 1-2 个工具，首个 `tool/call` 后恢复全部——首轮请求结构决定整条会话的策略轨迹，锚定训练对齐的窄工具面再放开，能力不损。实现：`system-prompt/assemble` Waterfall 过滤器（骨架已自带，见 dev_scaffold_plugin）
7. **工具 schema 精简**：description 用短句点明用途，详解放 tool result / 静态引导文本，不要写进 schema——工具目录按字符计费进首轮 prefill，实测 6 插件可膨胀到 17.6 万字符，稀释首轮注意力且无缓存 prefill 最贵（缓存命中便宜 10 倍）
8. **近距离信号原则（最强机制，P14/P16/P20 实测）**：所有行为引导（分类/深度思考/收敛）必须注入在**用户消息之后**（近距离），同一指令放 system（远距离）会衰减甚至反向（P13 协议加速衰减、P20 深度段进 persona 路由崩到 67%）；固定文本保持缓存命中（92-94%）
9. **弱域内路由（P8/P11）**：任务类型模糊时不要武断选模式——用弱 persona（模型自己分类），**按模型选 persona**（Pro=spec句+few-shot，Flash=neutral+classify，同一 persona 两模型行为可相反）
10. **单任务长链路三锚（P22/P23）**：开放任务探索失控是主病（完成率 0%）——persona 静态锚「回顾已完成 + 信息足够就产出 + 禁止环境检查/穷举 grep」把完成率拉到 100%

### 高性能插件（首轮锚定 · 为什么 & 怎么做）

**为什么**：DeepSeek V4 Pro 的行为策略在首轮请求处被「完整 system prompt + 工具 schema 分布」强条件化。同题同环境：minimal（2 工具）99/96，standard（25 工具）91，两阶段锚定 98/99——先窄后宽，能力与完整工具面兼得。微探针证明起作用的是**可调用的 schema 面**（action space），不是看见工具名文本；工具目录只变化一次（首↔次请求之间有一次前缀缓存变化，首轮无缓存 prefill 最贵）。

**怎么做（骨架自带，三步启用）**：
1. `dev_scaffold_plugin` 生成的 toolkit 骨架 apply() 末尾有注释好的锚定块；
2. `inject` 数组加 `'systemPrompt'`，把 `MINE` 换成你的工具名集合、`CORE` 换成首轮要保留的核心工具；
3. 首次工具调用后自动恢复全部工具，resume/reload 不丢状态（阶段从持久 session events 推导）。

**验证**：导出 session JSONL 看 `request/header`——第一份只含核心工具，首次工具调用后的下一份变更 header 含完整目录，此后保持。

### 高性能引导的完整认知（v0.3.3 更新，基于 dsh-router-standard P1-P23 实测）

| 机制 | 实测 | 落地 |
|---|---|---|
| 首轮锚定（窄工具面） | Project2 98/99 | tool-bootstrap 过滤器（骨架自带） |
| **近距离引导**（用户消息后注入） | 零衰减（远距离同指令加速衰减） | 插件监听 session/event → inbox.append 固定引导 |
| **弱域内路由**（模糊任务交模型自分类） | 区分度 +5~5.7，按模型选 persona | weak 模式（dev_router_mode weak） |
| **deep-guide**（分类+深度思考+commit） | 路由 96% + 收敛 100% + 反稀释 | 近距离固定引导文本 |
| **单任务三锚**（回顾+收敛+反跑题） | 完成率 0%→100% | persona 静态锚 |
| plan-mode section 保留 | 失忆修复（v6） | applyPersona 只换 persona section |

完整实现与复现探针：[dsh-router-standard](https://github.com/yjh051108/dsh-router-standard)（v0.1.0，含论文与 P1-P23 全数据）。

**参考与致谢**：本引导中的「首轮锚定」机制与统计证据，参考了 **xiaobright** 的开源工作——
[`dsh-anchored-standard`](https://github.com/xiaobright/dsh-anchored-standard)（MIT，
两阶段锚定 preset 与 `tool-bootstrap.mjs` 实现，Project2 实测 98/99，首轮 2 工具 → 首次
工具调用后恢复 25 项完整 Standard 工具）与
[`modeltest`](https://github.com/xiaobright/modeltest)（V4.1b 评测套件：同环境对照
minimal 99/96 vs standard 91 vs 两阶段 98/99、触发机制微探针、轨迹统计）。骨架中的锚定
实现即该 preset 过滤器的插件级移植（只裁剪本插件工具）。

## 典型工作流

**装模组**：拿到插件包（package.json + lib/ 产物）→ 对 AI 说 `dev_inject_plugin`（参数 = 插件包绝对路径）→ 当场生效（下一 step 工具可见）。

**开发迭代**：改代码 → build → 自动 watch 约 1.5 秒自动重载（或 `dev_reload_package`）→ 验证 → 稳定后 `dev_stage_promote` 一键转正。

**卸载**：`dev_uninject_plugin`（参数 = 包名子串）→ 工具/监听/路由/client 表全清，免重启。

## 机制

1. **junction 链接**插件包到 `~/.dsh/profiles/web/node_modules`（loader 标准解析路径）；
2. **`ctx.loader.create({ name, config })`** 运行时装配（完整 ctx）；
3. **清单持久化**（`~/.dsh/super-injector/registry.json`），重启后自动恢复注入；
4. **client 联动**：注入/重载后清除 entry disabled 标记并补扫 client 模块表（`client-modules.processOne`），浏览器端 bundle rev 联动更新。

## 踩坑记录

- **插件包必须自带依赖链接**：`lib/` 里 `import '@deepseek-ai/dsh-tools'` 等从包自身 `node_modules` 解析——照 build.sh 建 junction 到 checkout 包（如 `node_modules/@deepseek-ai/dsh-tools → <checkout>/packages/core/tools`）；
- **client bundle 需单独构建**：host 侧 `bash scripts/build.sh`（tsc），client 侧 `npm run build:client`（tsdown，产物 `lib/client.js`）——注入插件要出 UI 必须两步都构建；
- **失败 import 会毒化重试**：loadCache 残留残缺 job 导致同名重载复用失败态——注入前 `purgeCache` 清理；
- **资源注册必须挂 `ctx.effect`**：`reloadPackage` 重建失败若报 `duplicate / already registered`，说明资源是裸注册——挂 `ctx.effect` 后热重载才能正确清理重建；
- **client 操作必须用完整包名**：`client-modules.processOne` 对 `entry.options.name` 精确匹配，传短名会静默注册失败；
- 注入的插件不进 loader 配置持久化——重启后由注入器自动恢复（引导器常驻）。

---

**仓库**：https://github.com/yjh051108/dsh-super-injector
**Release**：https://github.com/yjh051108/dsh-super-injector/releases
