# dsh-super-injector 设计规范（v1，基于 DSH 源码语义）

> 依据：`vendor/loader/src/{index.ts, config/entry.ts}`、`vendor/include/src/index.ts`、
> `vendor/cordis/src/{registry.ts, fiber.ts}`（DSH 0.1.0-rc.6）。
> 本文是注入器与 DSH 机制的**正确契约**——所有经验补丁都应映射回这里，
> 与源码语义冲突的做法即为 bug 来源。

---

## 1. 装配生命周期（loader/config/entry.ts）

### 1.1 Entry 状态机

```
options 变更 ──┬─ diff 空（且非 force）        → 不动
               ├─ config/inject 热更新          → _patchContext → fiber.update(config)（不重建）
               ├─ disabled=true                 → _dispose(previous)（_disposing 豁免）
               ├─ name/inject/group 变化        → REPLACE：import 新模块 → _dispose(旧) → _start(新)
               │                                 失败 → 自动 rollback：_start(旧模块) + 报 apply 错误
               └─ 无 fiber（failed/未装配）     → init()：import + _start
```

**规范 1.1**：**官方"重载"路径 = entry.update 的 REPLACE 分支**——它内建
`_disposing` 豁免（loader 的 internal/plugin case 6 不标记 disabled）、
`entry.fiber` 挂载、失败自动 rollback。注入器的手写 reboot 是它的平行实现，
必须与它同构：① dispose 前置 `_disposing` ② 新 fiber 必须挂回 `entry.fiber`
③ 失败必须回滚旧模块。

### 1.2 refresh() 的语义（include 装配）

```ts
async refresh() {           // entry.ts L124
  if (this.fiber) return    // ← 有 fiber 一律不重装配！
  if (this.disabled) return
  await this.init()
}
```

**规范 1.2**：**touch patch 只对"entry 无 fiber"生效**（failed/死亡/未装配）。
- 注入器死亡恢复 → touch（include.refresh 重读 → root.update → 无 fiber entry 走 init）✓ 实测 6 秒复活
- 活跃 entry 更新 → touch **无效**（fiber 在，直接 return）——必须走自重载（REPLACE 结构）
- 此语义已实测多次验证，写死为契约：**恢复用 touch，更新用自重载，永不杀进程**

### 1.3 internal/plugin 标记规则（loader/index.ts L117-157）

loader 对"非自己行为的 fiber dispose"标记 `entry.options.disabled = true`（case 7）。
豁免条件（按序）：
- case 1：fiber 创建（`fiber.uid` 有值）
- case 2/3：非 entry root fiber
- case 4：registry 中无此插件（插件已被删）
- case 5：所属 entry tree 正在卸载
- **case 6：`fiber.entry._disposing`**（loader 自己在替换/移除）
- case 7：entry 已 disabled

**规范 1.3**：注入器自重载必须让 loader 认为"loader 行为"（走 entry.update
REPLACE 或手动置 `_disposing`），否则 entry 被标 disabled（早期踩坑根因）。
**这是契约，不是技巧**。

---

## 2. Registry / Fiber 模型（cordis/registry.ts, fiber.ts）

### 2.1 Runtime 与 fiber

```ts
runtime = registry.get(callback)   // 按插件回调身份
runtime.fibers                     // DisposableList<Fiber>——每 fiber 一次 ctx.plugin()
fiber.entry                        // loader 设的 entry 引用（fiber 创建时从 parent 取）
```

**规范 2.1**：**fiber 的 identity 是插件回调（callback）**。同名模块的两次
import（如 cloud-restore vs 本地）产生**不同 callback → 不同 runtime**——
`registry.get(oldPlugin)` 必须用**同一模块引用**才能命中（loadCache 缓存的
job 解出的模块才是"同一个"）。跨副本重载时 registry 语义断裂——这是
"rebuild 找不到 runtime"的根因，**不得依赖 registry 跨副本**。

### 2.2 fiber 生命周期

- `fiber.await()`：等待加载完成（失败 reject）
- `fiber.dispose()`：清理 effect 作用域（tools/context/监听全部注销）
- `fiber.update(config)`：热更新 config（不重建）

**规范 2.2**：**所有资源注册挂 `ctx.effect` 即获得 dispose 自动清理**——
这是 cordis 的契约。裸注册（绕过 effect）在 dispose 后残留（僵尸闭包根因）。
注入器自身工具必须全部走 `ctx.effect`（已修），插件模板同样强制。

---

## 3. include 配置方言（vendor/include）

- patch 文件是**顶层数组**（entry list），`!!js` 表达式按 entry 上下文求值
- 写回：`entry.update → tree.write() → include 写文件`（原子 tmp+rename）
- `applyEntryPatches`：**结构化克隆输入**——重复应用可回退

**规范 3.1**：**profile patch 永远是单一顶层数组**——`[]` 或 `- id:` 列表，
**绝不混存**（双顶层值 = YAML 解析错误 = 装配全灭）。注入器写 patch 必须
解析式追加（writePatch），这是配置方言的硬性契约。

---

## 4. 注入器规范架构（由此推导）

### 4.1 操作矩阵

| 场景 | 正确通道 | 源码依据 |
|---|---|---|
| 注入新插件 | junction + `loader.create`（新 entry） | loader.create → tree.import + _start |
| 卸载 | `entry.parent.remove(id, true)`（dispose + 树移除） | include/loader remove |
| 热重载（活跃 entry） | REPLACE 结构：`_disposing` → dispose → import → `_start` → 挂 fiber → 失败回滚 | entry.update REPLACE 分支 |
| 自重载（注入器自己） | 同上 + 重启器（global setTimeout 续命） | — |
| 死亡恢复 | **touch patch**（entry 无 fiber → include.refresh → init） | refresh() L124 |
| 缓存丢失降级 | 磁盘 URL import（junction realpath）→ 继续重载 | internal.import 语义 |
| watch 自动重载 | 预检（import 探测）→ REPLACE | 防自杀（经验沉淀） |

### 4.2 与经验补丁的映射（全部有源码依据）

| 经验补丁 | 源码契约 |
|---|---|
| 自重载 `_disposing=1` | internal/plugin case 6 豁免 ✓ |
| touch 恢复 | refresh() 无 fiber 才 init ✓ |
| 降级 realpath 匹配 | loadCache key 是 realpath URL ✓ |
| 预检后自杀 | import 探测 = _init 的 import 阶段前置 ✓ |
| purge 后 import 重读 | loadCache delete → 重新加载 ✓ |
| context duplicate 容忍 | 两 fiber 并存时的防御（规范做法：杜绝并存） |
| 工具挂 ctx.effect | fiber dispose 自动注销 ✓ |
| writePatch 幂等+[]兼容 | 顶层数组方言契约 ✓ |

### 4.3 规范级改进方向（v0.3）

1. **reboot 重构为官方 REPLACE 结构**：直接复用 `entry._start/_dispose`
   （loader 私有但契约稳定），消除手写 rebuild 的 rollback 缺失
2. **杜绝双 fiber 并存**：rebuild 前确保 `entry.fiber === undefined`
   （官方 `_dispose` 语义），从源头消灭 duplicate/僵尸
3. **恢复通道唯一化**：死亡 → touch（已实证）；禁止 kill 进程
4. **watch 预检 = import 探测**（已实现）：损坏 lib 拒绝重载
5. **loadCache/registry 跨副本语义文档化**：cloud-restore 等副本部署
   下 registry 不同 key——重载必须经 entry 通道而非 registry

---

## 5. 铁律（从源码到行为的最终约束）

1. **永不杀进程**——注入器存在的意义是免重启；恢复用 touch，更新用自重载
2. **自重载 = REPLACE 结构**（_disposing → dispose → start → rollback）
3. **资源注册必须 ctx.effect**
4. **patch 永远单一顶层数组**
5. **预检先于任何自杀/重载**（代码不可加载就保持现状）
6. **fiber 身份是 callback，跨副本不共享 registry**
7. **首轮锚定**——插件工具面大时首轮只露核心 1-2 个，首个 `tool/call` 后恢复全部
8. **工具 schema 精简**——description 短句化，详解不进 schema（目录体积 = 首轮 prefill 成本）

---

## 6. 性能引导契约（首轮锚定，源码依据）

依据：`dsh-system-prompt`（Waterfall 事件）、`dsh-session`（事件源日志）、
`dsh-agent`（AssembleContext 合并注入）。全部 API 面已在 DSH 0.1.0-rc.6 验证。

### 6.1 事件契约

- `system-prompt/assemble` 是 **Waterfall**：监听器必须 `await next()` 拿到组装结果，
  然后对 `assembled.tools` 做过滤后返回——跳过 next 会切断下游（工具提供方/排序）。
- `AssembleContext.agent` 由 `dsh-agent` 通过模块合并注入（`agent?: Agent`，
  diagnostics 场景缺省）——必须判空。
- 晋升状态从 `agent.session.events`（持久事件源）推导：存在任一 `type === 'tool/call'`
  即晋升。**工具执行失败也算已持久化**，下一步照常晋升；首次响应未调用工具则不晋升。
  由于阶段来自持久日志而非内存标志，resume/reload 天然不丢状态。
- 目录只应变化一次（首轮 2 项 → 完整目录），首↔次请求之间有一次前缀缓存变化。

### 6.2 过滤边界

- **只裁剪本插件注册的工具**：`MINE` 集合之外的工具原样放行——首轮锚定是插件级
  行为，不改变宿主目录。
- 首轮保留集 = 平台无关的核心工具（本插件 1-2 个），不强制含 shell/read——
  anchored-standard 的 `pwsh/read` 是 preset 级快照的配置选择，不是本契约要求。

### 6.3 成本模型（schema 精简的依据）

- 首轮请求是无前缀缓存的**全量 prefill**，工具目录逐字符计费且参与注意力分配；
  实测 6 插件 description 合计可到 **17.6 万字符**（缓存命中比未命中便宜约 10 倍）。
- 微探针（modeltest 触发机制实验）证明：影响轨迹的是**可调用的 schema 面**，
  把目录文字塞进 user message 无效——所以精简 schema 不是可选项，是性能项。
