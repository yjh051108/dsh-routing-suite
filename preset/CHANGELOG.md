# Changelog

## v1.27.0 — 隔离与并行（注意力工程 · 支柱4）

**支柱4 隔离与并行**：当两个独立关注点污染单线程、或一个子问题吞噬主线预算时，用 subagent/workflow
（独立上下文）隔离——让子代理持有自己的注意力，主线保持在关键路径上。

> 五大支柱主线：①可见性控制（v1.20）②预算与顺序（阶段出口）③上下文资产化（v1.26）
> ④隔离与并行（本版）⑤主动重定向（proactivity）。

验证：selftest PASS、router.test 26/26、同步 `?v=87/48`。

## v1.26.0 — 上下文资产化（注意力回收 · 支柱3）

**用户定稿方向**：不做画面检测/多假设对比（违背通用原则），思维惯性不急——**专注"注意力机制：分配与回收"**。
本质是**基于模型底层特性的注意力工程**（不是提示词工程/简单上下文工程）。

**支柱3 上下文资产化（注意力回收）**：在阶段1（规划）引导增补——
- **注意区留什么**：任务目标 + 当前决策 + 现场证据（留在 attention window）。
- **沉降到记忆层**：已定的探索/细节 → engram_store（不全部搁在注意区）。
- **丢弃回收**：过期/被取代/已解决的内容真正放下（fresh context 回收注意力）。
- 原则：**"可能有用就都记着"= 注意力泄漏，不是细心**。

> 五大支柱主线：①可见性控制（阶段化释放工具，v1.20 取消预解锁）②预算与顺序（每阶段明确出口）
> ③上下文资产化（本版）④隔离与并行（subagent 独立上下文）⑤主动重定向（proactivity 拉回任务）。

验证：selftest PASS、router.test 26/26、同步 `?v=86/47`。

## v1.25.0 — 验证失败先怀疑假设（用户反馈"错误归因惯性"· 主动怀疑）

**用户反馈**：遇异常时环境引向"检查工具/门禁/证据"，而非"检查最初假设是否错了"——擅长走全流程，
不擅长回到第一性原理。这是"错误归因惯性"。

**改进**（阶段3 验证引导增补 "doubt the HYPOTHESIS first"）：
- 验证失败时，**先质疑最初假设**（符号/边界/错误的物理不变量），回到第一性原理重推导，
  **再**检查门禁/证据——而不是只重走流程（v1.25 anti-blinkers）。

验证：selftest PASS、router.test 26/26、同步 `?v=85/46`。

## v1.24.0 — numeric 不变量校验 + 压上下文（用户反馈"自动怀疑 + 最值得优化"）

**用户反馈**：把验证从"人工看图"再推一步——**自动计算物理不变量/自动检测画面异常/自动对比假设数值**，
让环境替模型完成"主动怀疑"；且**压缩上下文占位成本**（重复 meta 指令是明显负担）。

**改进**：
- **numeric 不变量校验**：delivery_check 支持 `kind='numeric'` 证据——模型自算物理/数值不变量
  （光子球半径、守恒量 H/L 等），门禁**校验它必须是数值**（非人工看图）。已实测：`minr=2.07`→PASS、
  `not-a-number`→FAIL。
- **压上下文**：去重复 meta 指令（PROGRESSIVE_DECL 与 START_GUIDE 两处重复的 meta/native 声明）。

> 注：自动"画面异常检测"**应明确否掉**——它绑定具体渲染任务，违背预设**通用原则**，且回到自研工具
> 老路（v1.23 刚删）。"多假设强制对比"会使模型走流程/再加 meta 负担，也**不做**。
> 改为**阶段3引导怀疑假设**（v1.25）+ **numeric 自校验**（v1.24）——这既不绑定任务、又通用、又促主动怀疑。

验证：selftest PASS、router.test 26/26、同步 `?v=84/45`。

## v1.23.0 — 大道至简：删除自研 dev_page_check（战略减法 · 聚焦核心预设）

**战略决策（用户确认）**：研发核心是**底层注意力机制 + 交付质量收敛**，不是自研工具。
`dev_page_check`（自研页面验证工具）反复出 bug（路径解析/截图堆积/后台job/36点审计），
与其反复修，不如**大道至简**——删掉固定工具，让模型**自己装 CLI 自己测**（bash 跑
playwright/headless Chrome），预设专注**注意力机制 + delivery_check 门禁**。

**删除**：
- `dev_page_check` 工具（主版 + shim 注册块）
- 12 个 page_check 相关函数（pageRunnerPath/stripDomNoise/extractTitle/extractSelectorText/
  extractConsoleLines/runSandboxJs/normalizePageUrl/pageFail/PAGE_BUSY_KEY/pageCheckRun/
  forceTreeKill/pageCheckRunOnce/diagnosePageFail/pageCheckRender）——约 400 行
- status 的 `pageCheckLock` / META_LIVE 引用 / 描述文案 / 阶段3文案中的 dev_page_check 提及
- selftest / router.test / integration.test 中的 page_check 断言与用例

**delivery_check 改造**：不再自跑 headless smoke（此前复用 pageCheckRun）——改为**视觉验证交给
模型用 bash 自测（playwright/headless Chrome 截图 + read_image reviewed:true）**，
delivery_check 校验 **evidence 门禁**（而非自已渲染）。

**引导**（阶段3/系统提示）：明确"verify with your OWN tools: run headless browser/playwright via
bash (or install one), screenshot + read_image"，不再提示固定 dev_page_check 工具。

> 目的：把注意力还给**预设核心（注意力机制/交付收敛）**，删除反复出bug的自研工具，大道至简。

验证：selftest PASS、router.test 26/26（删4个page_check用例+更新deliveryCheck）、
integration.test 24/24（删1个dev_page_check用例）、同步 `?v=82/43`。

## v1.22.0 — 防局部最优引导（实测判断 · 降低思维惯性 · 稳定性能）

**实测发现（读黑洞会话交付物 + 视觉确认）**：模型在开发阶段**陷入局部最优思维**——交付物的 UI/参数/渲染
已完备，但模型**卡在"梯度符号/H 漂移"这一个数值细节上反复循环**（多轮 Edit→Verify→又发现不符→再 Edit），
**没有跳出单点、推进整体交付**。这是思维惯性强、性能不稳定的表现。

**改进（开发阶段 STAGE_GUIDES 增补"防局部最优"引导）**：
- 保持**整体产物可用**，迭代时别让一个顽固细节卡住整个交付。
- 若同一细节**多轮无效不收敛**（如差分符号、守恒漂移）→ 退一步：这细节是否阻塞整体交付？还是打磨？
- 保留一个**能工作的版本**；难点细节并行推进，而非停滞整个交付；个别顽固问题**先完成其余，回头再攻它**。

> 目的：降低模型思维惯性，让它在"单点细节"和"整体交付"间更稳定地平衡，避免无尽打磨单点。

验证：`node --check` OK、selftest PASS、`node --test router.test.mjs` 31/31、同步 `?v=79/40`。

## v1.21.0 — dev_page_check 截图清理（实测发现 · 防 .dsh-shots 堆积）

**实测发现**：`dev_page_check` 每调用生成一个 `page-<ts>.png` 且**从不清理**，多会话累积后
`.dsh-shots/` 堆到 **529 张 / 199MB**（Aug 22-25 四天累积）。这是工具层垃圾堆积，浪费空间且杂乱。

**改进**：`pageCheckRunOnce` 在生成新截图后，清理 `.dsh-shots` 中**超过最近 12 张**的更旧截图
（模型 `read_image` 验证只需最近的；删旧不删刚写的，不影响正在验证的会话）。

- 新增 `readdirSync`/`rmSync` import；按 mtime 排序保留最近 12，删更旧的（含异常兜底，删失败不阻塞）。
- 验证：`node --check` OK、selftest PASS、`node --test router.test.mjs` 31/31、同步 `?v=78/39`。

## v1.20.0 — 取消预解锁：每阶段只看当下（用户定稿 · 对抗"大跃进"）

**哲学主线上的一次重构**：让模型**每个阶段只看当前阶段、不知道后面有什么工具**，从而
不被"知道后面还有工具"诱惑去抢跑，集中注意力把当下阶段做扎实。道德为主、法治为辅。

- **预解锁归零**：`windowFor(stage)` 由 `stage+3`（预放两档）改为 `stage+1`（只含当前档）。
  效果——阶段 0 不再提前可用 `write/edit`，阶段 1 不再预放 `pwsh`；每个阶段只看到本阶段工具。
  **机制框架保留**（`windowFor`/`preUnlockedFor`/`stageSummary`/`catalogMarkExtra`），
  未来若需恢复预放，只把 `stage+1` 改回 `stage+3` 即可回退。
- **STAGE_GUIDES 重写**：每阶段只说三件事——本阶段要求做什么、验收标准是什么、道德引导
  （"把当下这阶段做好、做扎实，后面的工具不用急、不会提前来，做透才算完成"）；
  删除明示的 `write/edit already callable (two-tier pre-unlock)`、`write/edit/pwsh pre-unlocked`
  等"后面有工具"信号。
- **工具描述清理**：`toolsCatalog`/`phaseAdvance` 描述去掉"预放""预放工具直达其档"字样，
  改为"只列当前阶段、不预告后续工具"。
- **道德为主 · 法治为辅**：不做施压式 gate，靠引导（"做扎实+给安全感"）让模型从内部认同
  **竭尽全力做好当下**；gate（delivery_check 等）保留作兜底，不制造焦虑。

验证：`node --check` ×3、selftest PASS、`node --test router.test.mjs` → 31/31 PASS、
`node --test router.integration.test.mjs` → 24/25（唯一 FAIL 为 **pre-existing** 测试隔离问题
`v1.19: completion signals`，与本改动无关，已确认在原 `stage+3` 代码下同样 FAIL）、
同步 `sync-preset.cjs --bump` 两侧一致 `?v=67/28`。

## v1.19.1 — 引导 > 打回：任务回显 · Done 提示 · Next goal · 分配问题引导（用户定稿）

- **任务回显**：`stageText` 新增 `Task: <首条真实用户消息>`（`firstUserTask`，截断 160 字、只认 source=user）——模型每轮都看得清"我在为哪件事工作"，不迷路、不跑题。
- **Done 提示（每关收尾一行）**：阶段指引尾部加 `→ Done? …（动作）`——对齐=回答/计划、方案=计划锁定、开发=自检通过，明确"做完这一步就是下一关"。
- **Next goal（技能卡补全）**：`phase_advance` 返回加 `Next goal: <阶段名> — complete it via its completion signal…`。
- **引导而非打回**：`tools_help` 对未解锁/宿主工具补引导句——"当前调用会被拒绝；若你认为它应属于当前阶段，请指出工具分配问题（调整 STAGES），而不是寻求绕过"；移除 stageText 中 `tools_catalog(all:true)` 残留引用。
- 验证：`node --check` ×3、`node --test` → 56/56 PASS（新增 firstUserTask 单测 + Task 回显/Next goal 集成断言）、selftest PASS、live reload v1.19.1（?v=64）。

## v1.19.0 — 严格 workflow：完成信号驱动晋级 + 阶段 0 强制对齐（用户定稿）

- **删掉"工具名/文本即跳级"**：`autoAdvance` 重写为**完成信号驱动**——0→1：`ask_user_question`（已澄清）或 `todo_write`/`exit_plan_mode`（已计划）；1→2：`todo_write`（计划已锁定）或 `exit_plan_mode`（计划已呈现）；2→3：`delivery_check`（产物自检/交付准备）。调用预放/下一档工具名、文本中写"创建/实现"、编辑器 mutating 操作，**一律不再跳级**——缺工具 = 工具分配位置问题（STAGES 归属），不是给出口。
- **阶段 0 完成标准强制对齐**：STAGE_GUIDES[0] 明确——歧义/多解需求必须先 `ask_user_question` 并拿到用户答复；复杂任务必须先列计划（`todo_write`）；"没有对齐，没有推进"。阶段文本/引导同步改为"Advance is driven ONLY by completion signals"。
- **删除 `tools_catalog(all:true)` 已在 v1.18.5 完成**；v1.19 统一引导文案（无 "use a next-tier tool" 表述）。
- `phase_advance` 保留为显式闯关（meta），但默认晋级路径 = 完成信号。
- 验证：`node --check` ×3、`node --test` → 55/55 PASS（autoAdvance 测试重写为完成信号语义 + 新增四连跳阶梯测试）、selftest PASS、probe 6/6、live reload v1.19.0（?v=63）；实测 todo_write → phase 1 且 `lastAdvance=auto:todo_write`。

## v1.18.5 — 删除 all:true（严格 workflow：无全量出口）

- **`tools_catalog(all:true)` 删除**：全量索引不再一键可得——默认面只列当前可调（预放标 [可调]（预放））；白盒收敛为 `query` 单点（命中未解锁才给相关行，带「解锁于阶段 N」或「宿主·交付期」标注）。汇总头与 all 相关的描述/测试/selftest 断言同步移除。
- **哲学**：严格的阶段 workflow——未解锁工具名称不进入视野；若某阶段需要某种工具，修的是**工具分配位置**，而不是给"绕过阶段"的出口。
- 验证：`node --check` ×3、`node --test` → 55/55 PASS、selftest PASS、live reload v1.18.5（?v=62）。

## v1.18.4 — P1：lastAdvance 闭环 + all:true 汇总头 + host 细分（常驻/交付期）
> 注：汇总头随 v1.18.5 一并移除（all:true 已删）。

- **lastAdvance 持久化与展示**：`phase_advance({reason})` 的 reason 与时刻写入 `stages.json`（`lastAdvance:{at,reason}`）；`agent/pre-step` 自动推进也记录 `auto:<tools>`；`loadStageState` 恢复 `stageAtTime`/`lastAdvance`（此前进程重启后时间过滤退化 `?? 0`）；`dev_router_status`（主/shim）输出 `lastAdvance=<ISO> (<reason>)`，可回答"我为什么在第 N 阶段"。
- **all:true 汇总头**：首行 `N tools: C callable · M meta · L stage-locked · H host`，再列明细——全量白盒从"整墙"变为"可消化"。
- **host 标注细分**：未解锁宿主工具 → `（宿主·交付期：阶段 3 全量开放）`；可调宿主工具（非阶段/meta）→ `（宿主·常驻）`；`tools_help` 同步「解锁阶段: 交付期（宿主工具·阶段 3 全量开放…）」。
- 验证：`node --check` ×3、`node --test` → 55/55 PASS（新增 lastAdvance 持久化/展示/磁盘恢复 + all 汇总头断言）、selftest PASS、probe 6/6、live reload v1.18.4（?v=61）。

## v1.18.3 — 综合评审修复（external 证据一等公民 · own-first 索引 · muted 卡片 · 分类单源）

- **delivery_check external 证据打通**：`kind` enum 主/shim 同步补 `'external'`（此前 schema 拒绝 external，直接违背"外部验证器证据一等公民"）；`toJsonSchema` 升级为**递归**——evidence 这类嵌套参数不再被扁平化丢失子 schema/枚举；新增「注册后工具面」schema 断言（防再犯）。
- **目录=绑定（own-first）**：`registryFullIndex.findDef` 改为 own（scope 自身注册）→ chain → global 查找——`tools_help(dev_page_check)` 现在返回 wire 同款（own-layer shim）描述，消除"工具 schema 与 help 描述不同源"的信誉断点。
- **memoryMuted 漏网**：`phase_advance` 技能卡 `New this stage` / `Pre-unlocked` 均套 `muteAwareList`——禁用记忆的会话不再公告实际不可调的 engram 工具。
- **分类单源**：主/shim 两份 `dom()` 正则合并为 `categorizeDomain()`；`dev_reset_experience` 归入 META_LIVE（目录标 `[meta]` 而非无注解 `[可调]`）；主版 `dev_router_status` 补 `muteAwareList` 与 shim 版同口径。
- **测试面=运行面**：`router.test.mjs` / `router.integration.test.mjs` 改 import `-v34.mjs`（与 agent.cordis.yml 挂载一致），消除"51/51 全绿但运行面漂移"的盲区。
- 验证：`node --check` ×3、`node --test` → 53/53 PASS（新增 external-schema / muted-card 两条回归）、selftest PASS、probe 6/6、live reload v1.18.3（?v=60）。

## v1.18.2 — P0 减漂移（窗口单一来源 · 常量派生 · 口径再收口）

- **窗口单一事实源**：新增 `windowFor(stage)`（= Math.min(stage + 3, STAGES.length)），`stageSummary` / `applyStageRestrict` / `preUnlockedFor` / `markerFor` / `buildStagedSdk` 全部收敛到它；`idx <= stage + 2` 改为 `idx < windowFor(stage)`。"预放窗口"只有一处可改。
- **常量派生**：`STAGE_SAFE = STAGES.flatMap(...)`，`GLOBAL_SAFE` 的阶段部分由它展开；`STAGE_3_TOOLS/STAGE_2_TOOLS/STAGE_HOST` 全部从 `STAGES` 派生——改 STAGES 不再三处手抄漂移。
- **Callable now 分栏**：`stageText` 非交付阶段输出 `Core:`（本阶段）+ `Pre-unlocked (already callable):`（预放）两行——预放"可见但降权"，与技能卡分组闭环；未解锁仍不点名。
- **bootstrap 口径收口**：`phase_begin` 引导文本不再 `stageText(stage, [])` 走静态回退，改为安装 shim 后取真实 `runtimeCallable` 列表（与 system prompt 同一事实源）。
- 验证：`node --check` ×3、`node --test` → 51/51 PASS（新增：stage1 预放标记、stageText 分栏、all:true 每条未解锁带标注）、selftest PASS、probe 6/6、live reload v1.18.2（?v=59）。

## v1.18.1 — 公告分组 · 全量标注 · 口径统一（用户实测反馈）

- **公告=实际（预放分组）**：`phase_advance` 技能卡分两行——`New this stage:`（本阶段新增工具 + 一句话摘要）与 `Pre-unlocked (already callable):`（预放两档内提前可调工具）。阶段 1 不再出现"公告 4 个、实际亮 6 个"的错位。
- **默认目录预放标记**：`tools_catalog()` 默认面对预放工具标 `[可调]（预放）`，本阶段新增标 `[可调]`——一眼分清"刚解锁"与"提前可用"。
- **全量图鉴 100% 标注**：`tools_catalog(all:true)` 每个未解锁条目都带标注——阶段工具 `（解锁于阶段 N）`、宿主/阶段外工具 `（宿主工具·阶段外，交付期全量）`；`tools_help` 对宿主工具同样显示「解锁阶段: 阶段外（宿主工具·交付期全量…）」。杜绝裸 `[未解锁]`。
- **口径统一**：`system-prompt/assemble` 先安装 meta shim 再渲染 `stageText`，`Callable now` 与 `dev_router_status` 的 callable(runtime) 同源同序。
- 新增统一 helper：`stageInfo` / `preUnlockedFor` / `catalogMarkExtra` / `helpUnlockLine`（main/shim 共用，不再双份漂移）。
- 验证：`node --check` ×3、`node --test` → 50/50 PASS、selftest PASS、probe 6/6、live reload 后 v1.18.1（?v=58）。

## v1.18.0 — 注意力盲区版（用户定稿方向：解锁工具 + 解锁说明，闯关游戏式引导）

- **catalog 默认面 = 当前可调**：`tools_catalog()` 不再广播全量索引——默认只列当前阶段可调工具（含预放/meta），未解锁工具一律不点名；`query` 命中时才白盒展示（带「解锁于阶段 N」），`all:true` 显式全量。
- **阶段文本去否定式**：删除 "Not yet callable … every tool NOT …" 长句，改为一行 "More tools unlock with the next stage — browse on demand"（不点名未解锁工具）。
- **STAGE_GUIDES 压缩**：每阶段从大段说明书压成 2–4 行闯关提示（目标 + 新工具 + 1–2 条硬规则）；细节（沙箱提升 / 验证器发现 / evidence 清单）保留在关键句。
- **level-up 技能卡**：`phase_advance` 返回新阶段工具列表 + 每工具一句话摘要（"new tools: … — one-line hint"）。
- **tools_help 白盒层级化**：未解锁工具可查（主动行为），首行注明「解锁阶段: N（当前调用会被拒绝；详情可提前查阅）」。
- **自动初始化（新会话=阶段 0）**：检测到 `request/header reason=initial`（真正的新会话）时，`phase_begin` 自动忽略既存阶段记录、从阶段 0 开始——即使 session id 复用了旧阶段记录，也不再"新会话却恢复 legacy phase"（解决 §15.2 边界）；恢复会话（reason=resume）仍保留原阶段。无手动开关。
- 验证：`node --check` ×3、`node --test router.test.mjs router.integration.test.mjs` → 50/50 PASS、selftest PASS、live reload 后 v1.18.0。

## v1.17.1 — 文案清理与版本戳对齐（用户指令）

- **版本戳统一**：`ROUTER_VERSION` 与两份 bootstrap 文件头 v1.15.0 → v1.17.1，与 STANDARD-PLAN「当前实现状态（v1.17.1）」对齐（v1.17.1 跨代兼容早已在代码与集成测试中）。
- **退役概念文案清理**：phase_begin 描述、START_GUIDE、PROGRESSIVE_DECL、STAGE_GUIDES[2]、preset.yml、agent.cordis.yml、README「当前状态」中的 PTC base / run_code / Code Mode / MAXential pressure guide 残留改为 native 直调 / Proactivity 表述；内部注释同步。
- 保留历史章节（旧 CHANGELOG 条目与 STANDARD-PLAN 历史章）不动，实现以当前代码为准。
- 验证：`node --check` 两份 bootstrap 通过；`node --test router.test.mjs router.integration.test.mjs` → 47/47 PASS；`node probe/selftest.mjs` → 6/6 PASS。

## v1.15.0 — 泄压插件移除 + 主动性自检（用户指令）

- **pressure-sensor 插件移除**（用户：不需要了）——`agent.cordis.yml` 删除 pressure-sensor 行；`pressure-sensor.mjs` 三处（分支/生产/源仓库）删除；事件通道/自适应阈值代码不再装配。
- **泄压引导 → 主动性自检**：常驻引导文本改为 Proactivity 自检（每轮先扫“可推进项”，可逆动作直接做并报告，只有用户偏好/不可逆/外部权限才问）；持久化段 `router-pressure` → `router-proactivity`。
- **主动性协议入声明**：`PROGRESSIVE_DECL` 增加 “act on reversible next steps; ask only for user-owned choices; report actions with evidence”。
- 版本 v1.15.0；selftest 同步（移除 sensor 断言，新增 no-pressure-plugin / proactivity-persist-section / proactivity-guide），lab+prod SELFTEST PASS。
- 实测：dev_router_status v1.15.0；`tools_catalog` 阶段0 bash=`[未解锁]`、阶段3=`[可调]`；run_code 元数据恢复。

## v1.9.0 — 自优化审计修复（v1.13/v1.14，用户实测驱动）

- **P1: bash invalid output** — `gitbash-executor` 缺少 `signal` → `canonicalBashResult` 输出 `signal: undefined` → run_code lossless-JSON 拒绝（`tool "bash" returned invalid output: value is not lossless JSON`）。执行器补 `signal: outcome?.signal ?? null`；本机/生产/源仓库已同步。
- **P1: run_code 二级披露空洞** — `registryFullIndex.findDef` 只查层链，host 注入的 `run_code` 无定义 → catalog/help 空描述/空参数；新增 host 兜底（view/schemas 反查）。
- **P1: 阶段状态落盘分裂** — `stageFile()` 用 `DSH_HOME || homedir()` 导致同一状态落在多个位置；统一 `DSH_HOME || homedir()/.dsh` 根，save/load 失败不再静默。
- **P2: dev_router_status 隐瞒 run_code** — `runtimeCallable` 的 `if (name === 'run_code') continue` 改为列入 base 入口。
- **P2: 双份描述/版本戳/48+ 陈旧** — 描述与版本单源（`DESC` + `ROUTER_VERSION`），`PROGRESSIVE_DECL` 去掉写死 48+，main/shim/文件头版本统一。
- **P2: 标签清义** — 「交付后」改「未解锁」（阶段 0 显示；bash 属验证档：阶段 1 起预放、阶段 3 全量；非“交付完成后才解锁”），阶段 0 引导补验证档说明。
- 验证：`node --check` ×3、selftest PASS、live reload 后 `dev_router_status` v1.14.0、catalog 阶段 0 bash=`[未解锁]` / 阶段 3=`[可调]`、`run_code` 元数据恢复。

## v1.8.0 — Progressive disclosure suite（研发线，未发布）

Self-optimization rounds v1.3 → v1.8 (five real-session feedback loops, Gargantua / suspension-workstation builds):

- **Progressive tool disclosure** — stage-gated unlock (了解→拟合方案→开发→验证), two-tier pre-unlock (write/edit callable from stage 0), jump semantics (calling a pre-unlocked tool lands at its phase), full-catalog delivery at verification.
- **Two-level registry** — `tools_catalog` (full index + phase marks + param hints with types/defaults) / `tools_help` (complete schema); shared main+shim implementation, no drift.
- **PTC base** — staged SDK (39K → phase-visible signatures via `sdkSchemas(view)`), stage header, meta tools bound at `phase_begin`; path auto-encoding (Chinese/raw paths → file:// URL).
- **dev_page_check (v1.7)** — headless Chrome in one call: fresh profile (kills the 600s profile-mutex hang), hard-timeout tree kill, screenshot + DOM smoke, **console/pageerror extraction** (`--enable-logging=stderr`), **title field**, **selector text extraction** (#id/.class/tag), **scale** (device-factor zoom), DOM noise stripped (style/script); **`js` mode** = local VM engine (syntax check + pure-logic unit tests, IIFE return support — no external node needed).
- **Description ⇄ behavior alignment** — `presentation=code|native` self-check (never assert, show actual), marker single semantics (可调/交付后/meta/全量), honest phase text ("Callable now / not yet callable until delivery"), `phase_begin` always visible, `phase_advance` strictly one stage.
- **Platform truth** — bash disabled on win32 (host shell seam is pwsh-only; the old bash row ran pwsh semantics — root cause found), node (harness runtime) prepended to PATH, restrict double-filtered (GLOBAL_SAFE ∩ restrictableNames) so a platform-missing name can never disable the stage gate.
- **Pressure sensor** — real `session/event` channel (was dead), model-adaptive thresholds (Flash 0.6×), cooldown 3 steps, meaning-clarified message ("self-check signal, not an order"), v1.8: loop-pattern fires only alongside ≥2 no-action steps.
- **Goals/memory glue** — goal tools shim (read-before-update, complete/blocked authority), engram stage layout, persistent declaration & pressure sections (survive compaction).

## 0.3.0 — earlier router line

Task-aware reasoning-mode routing (classified persona + first-turn core surface + near-field guides); superseded by the progressive disclosure suite above.
