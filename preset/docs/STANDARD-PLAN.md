# Router Standard 总策划书

**渐进式披露革命 —— 融合统一的最强套装预设**

版本：v0.7（2026-08-21）→ 当前研发线 v1.19.1（2026-08-23）| 状态：**研发中，未发布**（以代码为准；历史章节保留演进真相）

---

## 〇、一句话定位

**Router Standard 不是"又一个预设"——它是工具调用方式的革命：把"开局全铺 48 工具"的注意力税，改成"按任务阶段渐进解锁 + 按需二级披露"，并融合记忆系统、知识系统、压力感应，做成一套"模型越用越顺手、注意力永远花在刀刃上"的最强套装。**

---

## 一、哲学：还原，不是控制

贯穿全部设计的核心立场（用户定稿，反复校正的结论）：

| 错误方向（已废弃） | 正确方向（本标准） |
|---|---|
| 思维帽/预算帽：限制思考量 | 深度自主：想多深由任务定，不设帽 |
| 强制交替：系统节拍器 | 泄压引导：压力信号出现时给"选择"，不命令 |
| 关键词分类换装：classifyTask 计数 → 换 persona | 阶段化披露：工具按需解锁，模型自己判断 |
| 团队协议：we 提示词工程（压制式话术） | 还原训练接口（RL 句）+ 自然引导 |

**一句话**：模型本身能力足够，接口污染让它失控；标准模式做的就是**接口还原 + 注意力经济 + 压力感知**——不干预模型的思考自由，只优化它看到的世界。

---

## 二、核心创新：渐进式披露（Progressive Tool Disclosure）

### 2.1 问题：工具 schema 是注意力税

- DSH 全量工具目录 ≈ 48 项，完整 schema ≈ 6.5K+ 字符（PTC 的 SDK 段高达 39K）
- 实测（2026-08-15）：59K system 下 Flash 首轮 **0 行动**（推理耗尽在读工具/规划上）
- 模型首轮注意力被"选工具/看工具"吃掉——**元思考爆发**（"which tool should I..."）挤占技术思考

### 2.2 方案：四阶段门控 + 二级披露（当前实现 = 标准模式基底 native）

```
呈现 = 官方标准模式基底（native）：wire 数组 = restrict 过滤后的可见工具
      —— 注入面与调用面"同时"阶段化，直调保留，无 PTC 包装。
阶段 0 了解/对齐   read/glob/grep/web_search/ask_user_question + 记忆（用户禁用则整包剔除）
      ↓ 完成信号（对齐透/已提问/已记计划）→ 解锁阶段 1；无预放，模型只见当前阶段工具
阶段 1 拟合方案    + todo_write/exit_plan_mode + 记忆盘点
      ↓ 完成信号（计划锁定/已呈现）
阶段 2 开发        + write/edit/str_replace_editor + 记忆沉淀
      ↓ 完成信号（产物存在 + 自检通过）
阶段 3 验证→交付   + pwsh/bash/read_image/jobs + delivery_check（交付 gate）
      ↓ 交付：restrict 释放，全量开放（文本单句，无矛盾）
```

> **v1.20.0（用户定稿）：预解锁归零**——`windowFor(stage)` 由 `stage+3`（预放两档）改为 `stage+1`（只含当前档）。
> 每阶段模型只看当前阶段工具，不知道/不预告后续工具（消除"知道后面有工具"的焦虑与大跃进入口）；
> 机制框架保留（未来需放宽预放时只把 `stage+1` 改回 `stage+3` 即可回退）。
> 哲学：**道德为主、法治为辅**——引导模型"没负担地竭尽全力做好当下"，gate 兜底不施压。

**阶段文本 = 单一事实源**：系统头/引导/状态三处同值（同函数、同运行时列表），模型不再需要交叉验证。

### 2.3 机制实现

| 层 | 机制 | 说明 |
|---|---|---|
| **执行层门控** | `tools.restrict({ allow: 阶段0..N })` | 全局工具按阶段可见（GLOBAL_SAFE ∩ restrictableNames 双过滤；scope-local 宿主工具豁免且如实列出） |
| **注入面阶段化** | `presentAs('native')` | wire = restrict 过滤后的可见工具——**注入面=调用面**，39K SDK 段归零（标准模式基底；both/code 双注入态已废弃） |
| **二级披露** | `tools_catalog`（名+一行摘要+参数速览）/ `tools_help`（完整 schema） | 索引轻、详情重；**行标注 = 运行时真绑定**（runtimeMark/runtimeCallable 与 SDK 同源，绝不谎报） |
| **阶段文本单事实源** | `stageText(stage, runtimeList, muted)` | 系统头/引导/status 同一函数同一数据；用户禁用记忆则替换/剔除（memoryMuted） |
| **行为信号推进** | `autoAdvance`（直达语义） | todo_write→1；调用 write→2；调用 pwsh→3（"用哪档工具就到哪档"）；phase_advance 逐级不跳 |
| **交付 gate** | `delivery_check` | 存在/非空/UTF-8 + smoke（requireSmoke 默认，external 证据一等公民）+ evidence 清单；全 PASS 才许宣告完成 |
| **页面验证（官方通道）** | pwsh + 外部验证器（Playwright 等） + read_image | 模型自行探测验证器与路径（零硬编码）；dev_page_check = 可选便利（lite 单帧省 CPU；失败给诊断不外静默） |
| **自查自调** | `dev_router_status` / `dev_router_mode` | 阶段/运行时可调列表/presentation/override 一项不缺 |

### 2.4 为什么是"革命"

- 生态现状：**所有预设都是开局全铺**（schema 即注意力税）
- 本标准：**工具知识按需加载**（类 man page）——精准调用不变（help 给完整 schema），开始不分散
- 即使最终不可避免全量开放，**注意力也已花在有用工具上**（用户原话：最优通用路径——了解→对齐→查资料→拟合方案→开发→验证）

---

## 三、系统融合：记忆 + 知识 + 主动性（压力感应已退役）

### 3.1 记忆系统（engram 深度融合）

| 阶段 | 工具 | 语义 |
|---|---|---|
| 0 了解 | engram_recall | 唤醒跨会话记忆（入口 + 渐进披露展开） |
| 0 了解 | engram_verify / engram_respond | 知识主张白箱验证（✓锚定/?图谱外）+ 学科卡出招 |
| 1 方案 | engram_search / engram_open | 盘点记忆图谱、展开细节 |
| 2 开发 | engram_store / engram_link | 沉淀决策、织因果网（决策树可回溯） |

**设计**：记忆不是"注入负担"而是"能力接入"——阶段 0 先问"我们之前做过什么"，开发中持续沉淀"为什么这么定"。

### 3.2 知识系统（灵枢）

- 主张先 verify 再下结论（en gram_verify：✓锚定 / ?图谱外不裁决——诚实边界）
- 知识出招按条件路由（engram_respond：条件→学科卡→出招动作）
- 自动补卡：弱命中自动补簇桥接（当场学会，下次就有）

### 3.3 压力：注意力最优化即最优泄压（压力传感器已退役 · v1.17 用户定稿）

> 历史：早期方案设外置压力感应（长推理/循环/失联 → 温和提醒）。经多轮实测，用户定稿：
> **"重复截图反复调参没关系——不需要压力释放工具；注意力最优化就是最优压力释放。"**
> 压力传感器（pressure-sensor）整套已退役删除（插件/组合/状态统计），仅保留哲学：
> 提醒是压制，优化注意力的机制（阶段化、单事实源、零监测打扰）才是真泄压。

**哲学（保留）**：不干预思考自由，深度自主是原则——小结果小思考、重要分叉全推理；环境只提供"不打扰的选项"，注意力由模型自己管理。

### 3.4 主动性引导（Proactivity，persona 常驻；原 MAXential 泄压口）

```
每轮行动前（常驻段）：
想做就做可逆的下一步；只问用户拥有的选择；行动用证据收尾。
深度推理不循环——想一步 → 修正上一步 → 分支+合并 → 真正 settled 才完成。
```

---

## 四、PTC 底座 —— 已退役（用户拍板：标准模式基底）

> **历史与结论**：早期方案以 run_code（PTC 底座）为工具面（一次执行多步，"五轮变一轮"）。
> 经实测（both/code 两种呈现：全量 schema 双注入 → 注意力税；折叠 → 直调被拒），
> 2026-08-23 用户定稿：**改为标准模式基底（native）——原生直接调用，无 PTC/run_code 包装，
> 心智零转换**。相关历史数据（39K 压顶、688 字符首轮）保留在 §六，作为"弱模型被 SDK 压顶"
> 的证据；但 run_code 不再进入工具面（§4 的验收项 PTC 效率随之归档）。
> 纯逻辑单元验证由 dev_page_check({js}) 承担（本地 VM，不依赖 run_code）。

---

## 五、运行期修复（社区 PR 吸收，实测验证）

| 修复 | 来源 | 作用 |
|---|---|---|
| agent/inbox/claimed 首轮捕获 | #13/#17/#32 | 首条真实用户消息（不依赖事件时序） |
| pre-step 引导通道 | #34/#36/#55 | 同一请求携带引导（免 2× API 调用） |
| currentMode 类型统一 | #32B | 原始文本过 bandOf → spec 恒成立的 bug |
| queueMicrotask 死锁 | #32D | 事件窗口内 append reenter |
| sessionModels（assembled.variables） | #9 | 会话选择模型（非启动默认） |
| 子代理放行 | #5 | parentSession 会话跳过路由 |
| extractText/bandOf import | #6/#11 | 首条消息必崩的 ReferenceError |
| shell 缺失放行 | v0.7 | 渐进披露下 shell 是阶段工具，缺失是正常态 |

---

## 六、实测数据支撑

| 实验 | 数据 | 结论 |
|---|---|---|
| RL 接口还原（2026-08-15） | 46 字符 + 双工具 → 25 步/24 工具调用/19KB 产物 vs 污染接口 101K 推理 0 行动 | 接口还原有效 |
| PTC 压顶（2026-08-15/21） | 39K/59K system → Flash 首轮 0 行动 | SDK 全量是注意力税+压顶元凶 |
| 阶段化披露（2026-08-21） | 688 字符首轮 + run_code 行动（standard2 实测） | 阶段精简 SDK 解决压顶 |
| 相变反演（1290 请求） | Pro xc=0.192；Flash 无相变（spec 强锚） | 接口-行为映射（archive/flash、archive/pro 全量数据） |
| 崩溃预算矩阵 | 32K→4K 收敛 5.8× | 预算即收敛机制（但不设帽——还原接口后自然短） |

---

## 七、版本史与演进

| 版本 | 事件 |
|---|---|
| v0.1.x | 分类路由（关键词计数换装）——已废弃（傻逼设计） |
| v0.2.0 | RL 接口还原（46 字符 + 双工具）——快速版 |
| v0.3.0 | 社区 real-assembly-chain fixes（claimed/pre-step/import 修复）——被社区改回分类路由 |
| v0.4 | react 定稿：RL 接口 + 自路由（native） |
| v0.5 | 渐进披露原型（catalog/help + 阶段门控） |
| v0.6 | we-team 实验（团队协议 → 废弃；PTC 压顶实测） |
| **v0.7** | **standard 定稿：渐进披露革命 + 记忆/知识融合 + 压力感应 + 泄压引导（PTC 底座）** |

**三大预设分工**：
| 预设 | 定位 |
|---|---|
| react | RL 接口还原 + 自路由（快速执行） |
| spec | 深度 persona + 自路由（雷霆大思考） |
| **standard** | **渐进披露革命（主力创新）** |

---

## 八、验收标准（用户实测驱动；当前版本对应状态）

1. **首轮注意力**：首轮只见阶段化注入面（restrict 过滤后的 wire，无 SDK 全量段）——元思考占比下降（以对比实验量化；注意长上下文模型收益会被掩盖，见 §十五 边界）✅ 机制在，量化待测
2. **阶段推进自然**：阶段文本=单一事实源，无需交叉验证；行为信号推进/直达语义有效 ✅
3. **行动率**：任务首轮直接行动（native，无包装无压顶）✅
4. **零监测打扰**：无压力传感器、无元监测注入（注意力最优化即最优泄压）✅（v1.17 定稿）
5. **记忆闭环**：跨会话唤醒/沉淀；用户禁用记忆时整包从调用面+注入面剔除（memoryMuted）✅
6. **直调零转换**：write 就是 write，bash 就是 bash——无 run_code 包装 ✅（PTC 已退役，见 §四）
7. **目录=绑定**：可调/未解锁标注与运行时 SDK 同源（runtimeMark/runtimeCallable），不得谎报 ✅
8. **交付 gate**：delivery_check 全 PASS 才许宣告完成；外部验证器证据一等公民；无"需要绕过自己门禁" ✅
9. **通用性**：零硬编码路径（验证器发现=模型职责）；失败诊断给原因+下一步，不静默 ✅

---

## 九、未来方向（待探索；已做项归档）

1. **阶段细化**：四阶段 → 按任务类型动态阶段（修复类任务跳过开发前阶段？）
2. **注意力度量**：正式量化元思考占比（vs 全目录基线对比实验；长上下文模型的"掩盖效应"正是需要量化的变量）
3. **记忆预取**：阶段 0 自动 recall（任务关键词 → 记忆入口预注入；需尊重用户禁用）
4. **发布形态**：标准模式基底 + 披露机制提取为独立插件（dsh-progressive-tools），任何预设可用
5. ~~SDK 按需生成 / 压力阈值自适 / PTC 维护~~（随 PTC 与压力传感退役而归档）

---

## 十~十四、实测演进记录（历史章；机制以当前实现为准）

> 以下各节完整保留每轮实测的问题与修复过程（真相与决策树），但**呈现代言已经历多轮重构**：
> §10.1 的假推进/假索引/死感应器、§13 的 Git Bash/交付 gate、§14 的序列化/直调等——凡与
> §二/§四/§八 当前表述冲突的，以本文档"当前实现状态"为准。历史正文不再逐句修正。

> 本节的每一条都来自真实会话体验（router-standard-v22 live 会话，任务："读 STANDARD-PLAN.md 并自体验、自总结、自修复"），
> 不是推测。复现路径本身就是线索：会话起步即被文本信号误推进、只读查看就被当成"开发"。

### 10.1 复现到的体验痛点

| # | 现象 | 根因（代码） |
|---|---|---|
| 1 | 用户消息只包含文件名 `STANDARD-PLAN.md`，会话却自动从阶段 0 跳到"拟合方案"（从未调用 todo_write） | `autoAdvance` 文本信号用 `/计划|方案|plan/i` 宽匹配 |
| 2 | 用 `str_replace_editor` 仅仅 **view** 目录（只读），阶段却自动从"拟合方案"跳到"开发" | `autoAdvance` 只看工具名，不看 `command`；view/create/str_replace/insert 一律当作开发 |
| 3 | `tools_catalog` 只列出当前 restrict 可见的 34 项，计划书承诺的"48+ 全量索引"和 `tools_help` 查询锁定工具（如 subagent）都不存在 | shim `allSchemas()` 用 `schemas(agent)`——restrict 投影后的可见面，而非已知面 |
| 4 | `dev_router_status`（shim）只有 phase/unlocked/preset，描述却写"persona/override"；主注册版 `fmtMode` 反向（0 → react、1 → spec）；main 与 shim 各写一张 override 表，`dev_router_mode(react)` 后 status 仍显示 auto | shim 缺字段 + `fmtMode` 映射写反 + override map 未跨代共享 |
| 5 | 计划书写"阶段 3 → 交付：全量开放（restrict 释放）"，实际 `applyStageRestrict` 到阶段 3 仍设 allow={阶段工具+META}，subagent/workflow/ralph 永远不可见 | 最终阶段没有释放 restrict |
| 6 | `dev_reset_experience` 重置 stage=0 却不重新 `applyStageRestrict`，工具面仍是旧阶段 | 遗漏 restrict 重放 |
| 7 | pressure-sensor 从未在真实会话里触发过：它监听 `agent` / `assistant/chunk` / `tool/call`，而 DSH 实际事件通道是 `session/event` | 事件名错误，感应器形同虚设 |
| 8 | `phase_begin` 可重复执行并重复注入 Bootstrap guide（无 idempotence） | 未检查 `guided` 标记 |
| 9 | 含无 `time` 的历史/种子事件时，`e.time >= stageAt` 为 false，推进判定丢事件 | 时间过滤未兼容缺省时间 |
| 10 | 仓库集成测试 5 项失败：仍期待旧首轮 `pwsh/str_replace_editor` 与 pre-step 注入引导，与当前 phase_begin 门控实现脱节 | 测试未跟随实现演进 |

### 10.2 修复

| 文件 | 变更 |
|---|---|
| `preset/router-standard/router-bootstrap-v34.mjs`（+ `router-bootstrap.mjs` 同步） | ① 文本信号收紧：仅 `todo_write` 或 `开始开发/进入开发/着手实现/开始实现/write the code`；② `autoAdvance` 升级为携带参数的工具调用数组，`str_replace_editor` 仅 `create/str_replace/insert` 视为开发；③ `tools_catalog/tools_help` 走 `view(agent).knownNames` + 层链原始定义——**全量索引按需查，调用面仍受 restrict**；④ 统一 `overrideMap()`（globalThis Symbol）供 main/shim 共用；⑤ `dev_router_status` 补 mode/band/persona/override/fullCatalog，`fmtMode` 改用 `bandFor`（修正反向）；⑥ 最终阶段 `applyStageRestrict` 释放 restrict（不再新增 allow）；⑦ `phase_begin` 幂等（guided=true 只返回 started）；⑧ 时间过滤兼容 `time === undefined`；⑨ `dev_reset_experience` 重置时补 `applyStageRestrict(agent, 0)` |
| `preset/router-standard/pressure-sensor.mjs` | 改为监听 `session/event`（assistant/chunk / tool/call / tool/code-dispatch）；日志路径用 `join(DSH_HOME)` 跨平台；引导文案去掉 `run_code` 专属措辞，改为通用"call the next tool — write, edit, or run the next step" |
| `router.test.mjs` / `router.integration.test.mjs` | 集成测试重写为 phase_begin 门控 + 阶段推进语义；新增回归：文件名含 "plan" 不推进、view 不推进而 mutating 推进、最终阶段不再新增 restrict、`phase_begin` 只注入一次 |
| `docs/STANDARD-PLAN.md` | 本实测问题与修复章节 |

### 10.3 验证

- `node --test router.test.mjs router.integration.test.mjs` → **32/32 PASS**（修复前 5 项失败）
- 安装目录 `router-bootstrap-v34.selftest.mjs` → **SELFTEST PASS**
- `node --check` 全部改动文件通过
- 实弹（当前会话 `dev_reload_preset_live` 后）：
  - `tools_catalog(query:"subagent")` → 列出 subagent/subagent_fork/list_agents/send_message/workflow；`tools_help(subagent)` 返回完整 schema（此前"未知工具"）
  - `dev_router_status` → `mode=react (band=react)`、`override=1`、`fullCatalog=restrict released (all tools open)`
  - pressure-sensor 真实注入了一次 `loop-pattern x7` 提醒（修复前从未触发）

### 10.4 已知边界（诚实记录）

- 当前这个热重载会话的旧 restrict disposer 可能仍是历史代设置、不在 `sharedLift` 中（EXPERIENCE-LOG 条目 003 的老问题），所以"全量放开"在已开始的会话里可能仍受旧限制；**全新会话从零挂载新一代后，阶段 3 释放即真正生效**。
- `tools_catalog` 全量索引与调用面解耦：能查（看）并不代表当前阶段能调（用）——这正是计划的意图（二级披露：索引轻、详情重、调用仍按阶段）。

---

## 十一、计划对齐增量（v1.3.0，2026-08-22）

> §10 修复了「真实体验痛点」；本节补齐与策划书正面条款的剩余差距（引导注意力税 / 常驻 / 指引 / 标记 / 阈值自适）。

### 11.1 差距 → 增量

| 策划书条款 | 差距 | 增量 |
|---|---|---|
| §2.3 机制表「PTC SDK 阶段化」 | 只裁了 SDK（39K）；100-199 段每工具引导是静态注册、不受 restrict 过滤——同款注意力税 | `filterToolGuidance`：promoted 后仅保留「当前阶段可见工具」的 `tool:*` 引导段；安全规则＝后缀属全量真实名且不可见才裁（未知段名、交付阶段不裁） |
| §3.4「泄压引导（MAXential，persona 常驻）」 | PRESSURE_GUIDE 只在一次性 bootstrap 消息（压缩后会丢） | promoted 后常驻 `router-pressure` 段（order 3） |
| §2.3「解锁指引：要解锁 X，先做 Y」 | STAGE_GUIDES[1..3] 从未使用（死代码） | `stageText` 并入 `STAGE_GUIDES[stage]`（每阶段指南常驻 system prompt，免 message 打断、压缩不丢）；阶段 0 指南加入「先 recall/verify 再动手」 |
| §2.4 注意力经济 / §3.1 记忆闭环 | 索引与 shim 各一份实现（漂移）；主实现仍用全局视图（漏 preset 层工具） | `registryFullIndex`/`knownToolNames` 共享实现；main 与 shim 同源 |
| §9.4 压力阈值自适 | 阈值写死 | pressure-sensor `FLASH_SCALE=0.6`（Flash 系 30K→18K、循环 4→2） |
| 二级披露的「索引轻」 | catalog 行无可用性信息 | `markerFor`：每行 `[当前/预放/锁定/meta/全量]`——先看能调什么，再挑工具 |

### 11.2 验证

- `node --test` 单测 20/20 + 集成 14/14 PASS（新增 guidance 裁剪、marker 语义、常驻段断言）
- 安装目录 selftest PASS（含 v1.3 新断言）；`agentPresets.standingKeyFor('router-standard-v22')` → MOUNTED OK
- 版本戳 ?v=23 → ?v=24（dev + installed 同步）

---

## 十二、实弹体验吸收（v1.4.0，2026-08-22）

> 用户实弹报告（Gargantua 构建会话，四阶段全场跑通）喂出的摩擦吸收：不改架构，把「探路灯」放进常驻文本与二级披露。

### 12.1 摩擦 → 吸收

| 实弹摩擦 | 吸收（v1.4.0） |
|---|---|
| 所有工具经 run_code 调，签名不统一（glob `pattern` / read `file_path` / todo_write `content`），来回试错 | `paramHint`：tools_catalog 每行内嵌 `(params: …)`；PROGRESSIVE_DECL 常驻「首次使用前看签名，never guess」 |
| 文件改过后 edit 被「请重新读取」拦 | STAGE_GUIDES[2]：改前重读规则（编辑器强制新鲜读） |
| `bash` 表现像 PowerShell（本机复核未复现：系统 PATH 有 Git bin、GNU 输出正常） | STAGE_GUIDES[3]：Windows 优先 pwsh；bash=Git Bash（GNU）如实说明。**v1.4.1 补事实层**：apply() 把 `bash.exe` 候选（PATH 序）写入 `bash-diag.json`——sandbox 继承本进程 env，此处顺序即工具内解析顺序；下次实弹读事实，不再猜 |
| headless 浏览器沙箱拦截 | STAGE_GUIDES[3]：对同一条命令一次性提升（既定协议），禁止绕过——不放松沙箱（预设即其命名插件的特权之和） |
| read_image 一次一张，多图对比效率低 | STAGE_GUIDES[3]：逐张读，或用 pwsh 拼 contact sheet 一次读（read_image 确认无多图能力，故为指引而非改工具） |

### 12.2 验证

- 单测 21/21 + 集成 14/14 + selftest PASS（含 paramHint/常驻指引断言）；standingKeyFor → MOUNTED OK；?v=25。

---

## 十三、二轮实弹根因修复（v1.5.0，2026-08-22）

> 六项反馈中三项找到硬根因（非指引可解）：bash=PowerShell 是组合错误、node 不在 PATH 是运行时路径、headless 600s 挂起是 profile 互斥锁。

| 反馈 | 根因（源码级） | 修复 |
|---|---|---|
| bash 像 PowerShell（pwd 表格/cmdlet 报错） | **dsh-base 在 win32 只装配 pwsh 且 disabled bash-sandbox**；preset 的 bash 行继承了 pwsh 语义 | agent.cordis.yml：tool-bash 在 win32 禁用（与 host 对齐）；STAGES 平台化（win32 移除 bash）；applyStageRestrict 按 restrictableNames 双过滤（平台缺失名不再击穿阶段门控） |
| node 不在 PATH（无法 node --check） | harness node 位于 .hanako 自定义运行时目录，不在系统 PATH | PATH 修整：`dirname(process.execPath)` 前置（node 直通所有 shell 工具） |
| headless 600s 挂死、无产物 | **Chrome profile 互斥锁**（无 `--user-data-dir` 时挂起）；且无硬超时/杀树 | 新 meta 工具 **`dev_page_check`**：新鲜 profile（实测 1.5s 出 DOM+PNG）+ 硬超时杀树（默认 20s/上限 180s）+ `--dump-dom` DOM smoke + 截图落 `.dsh-shots/`；`?shot=` 重页面按需调大预算 |
| write/edit 回显灾难（8 万+字符截断） | dsh-tool-fs 的 VALUE 带全量 before/after（UI diff 卡用）；模型 print 绑定结果即爆上下文 | 常驻指引：只取 path/operation、勿 print 全量；**包级修复（VALUE→hunk 摘要）属 host 包，明确未动**（边界） |
| 直调 phase_advance 浪费一轮 / dev_router_status 传 {} 报错 / read limit 2000 运行时才发现 | run_code 折叠规则未言明 + 零参工具契约 + 运行时 cap | 常驻文档：只有 run_code 可直调、零参传 `{}`、上线前查 tools_help；paramHint 带类型+默认上限（`limit: number≤2000`） |
| pressure 提醒噪音 | 冷却 2 步 | 冷却 3 步 |

**验证**：单测 22/22 + 集成 14/14 + selftest PASS + MOUNTED OK（?v=28）；页面配方实测（轻页 1.5s；重页 66s 硬超时杀树正常返回，不再挂死）；本机 CPU 重载测试按用户要求停止，重页全链路截图留待按需。

---

## 十四、三轮实弹修复（v1.6.0，2026-08-22）

> 三项硬修复 + 四项语义/契约澄清。P0 是 dev_page_check 的 shim 序列化——上轮的"已内置页面验证"宣传在 shim 路径上确实是断的。

| 反馈 | 修复 |
|---|---|
| **P0：dev_page_check 序列化坏**（invalid output: value must be a string） | shim `make()` 硬编码字符串输出；改为透传 `def.output`（对象 schema + 专属 render），shim 版补对象输出——工具立即可用 |
| "先推进度再干活"摩擦（写 HTML 要先玩路由） | **预放两档**：阶段 0 即见 write/edit（stage+3 语义）；**直达语义**：调用预放工具直达其档、开发意图文本直达（写一个/创建/生成/…）——直给任务零路由成本；phase_advance 明确"逐级一次不跳级" |
| 中文路径需手工百分号编码 | `normalizePageUrl`：裸路径/相对路径/中文路径自动转 file:// URL（pathToFileURL），非 http/file scheme 原样拒绝 |
| loop-pattern x31 无含义、像"你该停手了" | pressure 提醒改为"self-check signal, not an order"+ 每个触发器含义（loop-pattern=高频重复犹豫词，不是停手命令） |
| 跨语言转义踩坑（JS 模板里的 PowerShell `${env:V}`） | STAGE_GUIDES[2] 常驻提醒：run_code 程序是 JS——交叉语言字符串先防插值（单引号/拼接） |
| Chrome 异步落地误判失败 | STAGE_GUIDES[3]：dev_page_check 返回 settled result，无需轮询（$LASTEXITCODE/延迟写出坑由工具消化） |
| dev_router_status 结构不一致 / HEALTH CHECK / approval 通告 | 状态主/shim 契约统一并写进描述（文本行 + unlocked=[…]）；HEALTH CHECK 与 approval-policy 通告非本 preset（环境插件 + 宿主 approval 子系统事件） |

**验证**：单测 23/23 + 集成 14/14 + selftest PASS + MOUNTED OK（?v=29）；全程零浏览器运行。

> **v1.6.1 追加（?v=30，"自己想办法修复"，不等复现）**：dev_page_check 第二轮根因链——失败分支返回 `{ok:false,error}`（缺 schema 7 字段 + error 不在 additionalProperties:false 内）→ 任意失败路径照样 invalid output；已统一 `pageFail()` 全形状，并把 shim 注册路径做成集成回归（对象 schema + render + 7 字段全分支断言，单测 23/23 / 集成 16/16 / MOUNTED OK）。

---

## 十五、当前实现状态与边界（v1.17.1，2026-08-23）

### 15.1 实现状态（与代码一一对应）

| 面 | 现状 |
|---|---|
| 呈现 | **标准模式基底（native）**：wire=restrict 过滤后可见工具，直调零包装；SDK/PTC 段不存在 |
| 披露 | 四阶段 + 两档预放 + 直达语义；`stageText` 单一事实源（系统头/引导/status 同值） |
| 目录 | `runtimeMark`/`runtimeCallable` = 运行时 view 真绑定（目录可调 = SDK 一定绑定） |
| 交付 | `delivery_check`（file/UTF-8/smoke/evidence；external 证据一等公民；requireSmoke 默认） |
| 页面验证 | 官方通道权威（pwsh+外部验证器+read_image）；dev_page_check=可选便利（lite 单帧/诊断） |
| 记忆 | memoryMuted：用户禁用 → 引导替换 + 工具面/注入面剔除 |
| 压力 | **已退役**（无监测注入；proactivity 引导保留） |
| Shell | win32 Git Bash 一等（isolate realm 私有 shell seam）+ pwsh 降级；零硬编码探测 |
| 通用性 | 引用零本机路径；失败诊断给原因+下一步；`?v` 单代推进 |

### 15.2 诚实边界

- **长上下文模型掩盖收益**：§2.1 的动机是弱模型（Flash）被 39K SDK 压顶（0 行动）；现代长上下文模型能"略读+自动忽略"，会**抵消**披露收益、同时放大了元文本成本——收益显著区间在弱模型侧，本次实测无法验证另一半（需量化实验 §九.2）。
- **恢复会话 ≠ 新会话**：阶段按 session id 持久化——"继续旧会话"= 阶段 3/全量（设计）；"新会话"= 阶段 0。GUI 行为无法从预设侧区分。
- **scope-local 宿主工具豁免 restrict**：dev_*/engram_* 由宿主插件注册到 agent 自身层，天然绕过阶段过滤——只要真实可调必如实列出（目录=绑定约定），但"注意力面"不可能裁剪它们以外的宿主注入工具。
- **验证器探测是模型的职责**：指引不硬编码路径；模型若未探测到（Playwright 等），按诊断四步走（lite/路径/外部验证器/参数）。

### 15.3 v1.18.x：注意力盲区 + 公告分组（用户定稿方向：解锁工具 + 解锁说明，闯关式引导）

- **默认态 = 不知道**：`tools_catalog()` 默认只列当前可调工具（含预放/meta），未解锁工具一律不点名；白盒保留为主动查询——`query` 命中时展示（带「解锁于阶段 N」或「宿主·阶段外」），`all:true` 显式全量且每条未解锁均带标注。
- **预放 vs 新增分组**：`phase_advance` 技能卡分 `New this stage` / `Pre-unlocked (already callable)` 两行；默认目录对预放工具标 `[可调]（预放）`——公告=实际，不再错位。
- **指南压缩**：STAGE_GUIDES 每阶段 2–4 行「新关卡提示」（目标 + 新工具 + 硬规则一句）；阶段文本删除否定式长句。
- **口径统一**：`Callable now` 与 `dev_router_status` 同源同序（meta shim 先装、stageText 后算）。
- **自动初始化（新会话=阶段 0）**：检测到 `request/header reason=initial`（真正新会话）时自动从 0 开始，不受既有阶段记录影响；恢复会话（resume）保留原阶段。无手动开关。
- **P0 减漂移（v1.18.2）**：`windowFor(stage)` 成为预放窗口单一事实源；`GLOBAL_SAFE`/`STAGE_HOST` 从 `STAGES` 派生；`stageText` 分 `Core:` / `Pre-unlocked:` 两栏（预放可见但降权）；bootstrap 引导与 system prompt 同用真实 runtime 列表——"当前档/预放一档/预放两档"只有一处可改。
- **评审修复（v1.18.3）**：delivery_check `kind` enum 补 `'external'`（外部验证器证据一等公民真正可声明）+ `toJsonSchema` 递归（嵌套 schema 不被扁平化）；`registryFullIndex` own-first（tools_help 与 wire 同定义）；`phase_advance` 卡片在 memoryMuted 下过滤 engram；`dom()` 两份正则合并 `categorizeDomain`；`dev_reset_experience` 归 META；主版 status 与 shim 同口径；测试面改 import `-v34` 与运行面一致。
- **P1（v1.18.4）**：`lastAdvance:{at,reason}` 持久化 + `dev_router_status` 展示"上次推进原因"；`loadStageState` 恢复 `stageAtTime`（修复 resume 时间过滤退化）；host 标注细分「宿主·常驻 / 宿主·交付期」。
- **严格 workflow（v1.18.5）**：删除 `tools_catalog(all:true)`——二级披露无"一键全量出口"；默认面只列当前可调，白盒收敛为 `query` 单点（命中未解锁才给）。哲学：未解锁工具不进入视野；阶段需要但缺少的工具 → 修工具分配位置，而不是给绕过阶段的出口。
- **完成信号驱动（v1.19.0）**：阶段晋级只由"完成本阶段任务"触发——对齐（0→1）：`ask_user_question` 已澄清或计划已记录；方案（1→2）：计划已锁定/呈现；开发（2→3）：`delivery_check`。工具名、文本意图不再跳级；阶段 0 完成标准强制"先对齐（提问/计划），没有对齐没有推进"；`phase_advance` 保留为显式闯关。
- **引导 > 打回（v1.19.1）**：`stageText` 回显 `Task: <首条真实用户消息>`（每轮看清目标）；阶段指引尾部 `→ Done?` 完成动作提示；`phase_advance` 返回 `Next goal` 行；`tools_help` 对未解锁工具改口"当前调用会被拒绝；若认为应属当前阶段，请指出工具分配问题（调整 STAGES），而不是寻求绕过"——把"打回"变成"引导"。
- 验证：`node --check` ×3、56/56 测试、selftest PASS、live reload v1.19.1。

---

*本策划书随实现演进更新——机制以代码为准，方向以用户为准。*
