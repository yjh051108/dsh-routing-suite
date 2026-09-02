/**
 * inject-text — 分级模式 v4 的阶段注入文本（幂等注入,每阶段一次）。
 *
 * 文本意图：引导模型调用工具语言（edit_plan / lock_stage），全程不背格式——
 * 工具 API 就是协议；#L1/#L2 只是结果展示文本,从不参与解析。
 *
 * 模式（correct | experience | research）：开局由模型自报 [模式:x] 选自,
 * 用户随时可发 [模式:x] 改口。模式不改任务与范围,只改"什么算验收合格"——
 * 三类都要求证据链,只调"重心"（correct=正确性、experience=体感、research=可复核）。
 */

import { treeText } from './mode-state.js'

/** 模式名/判定法/验收重心一句话。 */
const MODES = {
  correct: {
    name: '正确性（C）',
    judge: '主体是代码/数据/接口/公式/可测量的行为',
    center: '证据链与指标：概念→证据(数值)→结论',
  },
  experience: {
    name: '体验（E）',
    judge: '主体是视觉/交互/氛围/叙事/手感——最终是"给人用的"',
    center: '体感验收：亲眼看/亲手玩/亲耳听，感受判断先于指标',
  },
  research: {
    name: '研究（R）',
    judge: '主体是分析/论证/调查/比较——最终是"结论可信"',
    center: '可复核性：每条结论有来源、推导链与复现路径',
  },
}
export function modeName(mode) { return (MODES[mode] || MODES.correct).name }
export function modeCenter(mode) { return (MODES[mode] || MODES.correct).center }

/** 回滚确认引导（『修改』后：解锁提示——时序空窗修复：用户改意见后系统必须开口）。 */
export function rejectAck() {
  return `【分级·已按意见解锁】清单已回滚到大类编辑（可改写大类/小类/星象——commit_star 可修订）。
请：① 按用户意见修订（edit_plan 重新呈交，树会即时展示）② 修订后逐级锁定（锁定回执=完整规格评审单，请模型再请用户确认）③ 不要直接沿用旧树重锁——修订与呈现是必走环节。`
}

/** 关闭回执（/graded off 后注入——模型不再误以为还在分级模式）。 */
export function offReceipt() {
  return `✅ 分级模式已关闭。后续对话回归常规模式；需要时发 @graded <任务> 重新开启（或模型自主 commit_star 进入）。`
}

/** 星象取源（3.1）：北极星/需求文本从 state.star 取；未定稿返回空（门控外兜底）。 */
export function starPurpose(state) {
  return (state?.star && typeof state.star.purpose === 'string') ? state.star.purpose.trim() : ''
}

/** 北极星·元认知长版（approved 入场讲一次——不再重复；来源=star.purpose）。 */
export function northStarLong(state) {
  const p = starPurpose(state) || '（目的宣言：需求对齐时定稿）'
  return `【北极星·元认知】（此刻讲一遍，之后不再重复）
本会话的一切对象——大类、小类、执行形态、验证方式——都要回答同一个问题：它们服务于哪个目的？
目的就是需求对齐后定稿的目标：**${p}**

这正是"以目的为导向"的意思：**验收是对目的的验收**——不是为了"做过"、为了"证据好看"、
为了"提示词写完了"而验收；而是"这件事要做到什么程度才算服务于目的"。

但北极星不在每个小类里跟你重讲——你被允许、也只被允许在开工前一眼确认：
**「对于这个目的，我这一次任务实际要的是什么？」**
答完这一眼（目的→本次任务→验收锚），就把全部注意力放回这一块砖。

任何更远的思考——"后面还有没有更好的路""该不该改计划""别的小类是不是能顺带做了"——
都不是此刻的事，它们属于审核、收官、终验的舞台。

专注不等于盲目，清醒不等于分心：**目的是远处站岗的人，你只管把手头这块砌好、验好、打卡。**`
}

/** 北极星·浓缩版（组入口前置两行）。 */
export function northStarShort(state, item) {
  const p = starPurpose(state) || '（目的宣言）'
  const acc = (item.accept || []).slice(0, 2).map((a) => (a.length > 20 ? a.slice(0, 20) + '…' : a)).join('；')
  return `（北极星·本组）本组仍服务于：${p}。当前唯一任务=${item.title}，验收锚=${acc || '（先声明）'}。`
}

/** 审核通过 → 开发入场（3.1：确认宣言 + 北极星长版一次 + 进入单类门禁打卡制）。 */
export function approvedKickoff(state) {
  return `【分级·第三步】清单已确认 ✅——进入**【单类门禁 + 打卡制】**开发（本会话模式：**${modeName(state.mode || 'correct')}**——验收重心=${modeCenter(state.mode || 'correct')}）。每小类三步：做（仅当前小类交付物）→ 验（按本小类验收标准）→ 打卡（mark_task——唯一前进许可,也是获取下一步正确引导的钥匙；不打卡就停）。
${northStarLong(state)}`
}

/** BRAINSTORM：需求对齐（3.1 出题版——用 ask_user_question 选择题对齐；可多轮直到歧义结清）。 */
export function brainStormText(task) {
  return `【头脑风暴·需求对齐】（规划前的第一件事——用**选择题**对齐，不要写长文）
任务文本：${task || '（没有额外任务文本）'}
用 **ask_user_question** 出一组选择题对齐需求（**≤5 题/轮；可多轮**，直到**所有歧义点都有明确选择**才算对齐）。每题=一个疑点，选项=默认理解+变体，描述=影响一行；按需增改题目。
基准题集（可裁剪/合并；**含必选模式题**）：
· 本任务验收模式（**必选**）：correct=代码/数据/接口/可测量行为 / experience=视觉/交互/氛围/手感（推荐：本任务直观判据=看与玩）/ research=分析/论证/调查（单选）
· 范围/对象：默认=…，对吗？（单选）
· 完成度：底线可判 vs 理想态另列（单选）
· 约束/环境：资源/时机/技术取舍（多选）
· 出口/收口：链尾如何收（单选）
· 问题策略：测试中新发现问题=立即修 vs 只记录（单选）
循环规则：
- 用户答复后：若已无未决歧义 → 调 **commit_star**(purpose=定稿北极星, requirements=对齐后需求, nonGoals=非目标, assumptions=假设) → 显示定稿 → 进入规划；
- 若仍有歧义/用户新提不确定 → 继续出下一组题（**最多 3 轮**）；
- 用户答"按你理解来/可以/没有补充" → 把全部未决疑点写入 assumptions（标注采纳方式）→ 照样 commit_star——**闭不了环就标注假设，而不是不写。**`
}

/** L1-EDIT：先想大类（任务前置 → 要求；单类门禁 + 专注当前 + 信引导 + 模式自选）。 */
export function phaseL1(task) {
  return `【分级·第一步】收到任务。
任务：${task || '（没有额外任务文本）'}
要求：
① **单类门禁（本模式第一铁律，优先级高于一切效率/质量/"更好做"）**：只允许一个"激活小类"= 计划树中最近一个未打卡项；其余一切均为**禁入区**。每次工具调用、文件写入、每行新代码只服务于它；禁止提前实现/占位/搭骨架/"以后要用"（即使"反正都要写，现在写更省事"）。借口清单——"一次写完后面好调""相互依赖分不开""这是基础设施""先搭好骨架再精修""打卡回头补"——出现即违规，不讨论。**mark_task 打卡 = 唯一前进许可，也是获取下一步正确引导的钥匙**：打卡后系统立即给出下一个激活小类的引导；不打卡就只能停，无引导可接。发现超前内容＝未完成，回滚重走。
② **听从引导（同级铁律）**：下一步永远由注入的引导词给出——你只执行它告诉你的：**不预判前进、不抢跑下一步、不自推"下一个"**；引导给到哪一步，你就只做哪一步。
③ **不必一次思考整个增量**——现在只需"分大类"这一件事。**专注当前提示的任务**，跟着引导走即可，不要预想全局、不要一次做完。
④ 想好就调用 **edit_plan**（level="L1"，items[].title 一行一个大类）——工具会即时展示并整理成树。
⑤ 大类确认无误后调用 **lock_stage**（level="L1"）**锁定**——锁了就是锁了，锁定后大类不可再改（想改要等审核拒绝）。
⑥ **先判验收重心·模式自选**：写正文前先判一步——本任务最终交付"什么算合格"由哪个维度定义？按判定法自报一句 **\`[模式:correct]\` / \`[模式:experience]\` / \`[模式:research]\`**（写在回应首行，系统据此切换本会话全部验收引导）。
   - ${MODES.correct.judge} → \`[模式:correct]\`
   - ${MODES.experience.judge} → \`[模式:experience]\`
   - ${MODES.research.judge} → \`[模式:research]\`
   **模式只改"验收重心"，不改任务与范围**（三类都要求证据链；重心=${MODES.correct.center} / ${MODES.experience.center} / ${MODES.research.center}）。判不定时选任务意图最接近的一档；用户随时可发 \`[模式:xxx]\` 改口。
${DELEGATE_ONCE}
⭐ **打卡制（本模式的元规则）**：这不是北极星——看着方向不算完成。每一小类都是一个打卡点：交付物可见可验 → **打卡**（调 **mark_task** 标记完成）→ **打卡既放行下一步，也换来下一步的正确引导**——不打卡 = 没完成 = 没有引导可接。`
}

/** 插件版本戳（注入头部——一眼判断部署版本，防"旧版混入"类误判）。 */
export const VERSION = '0.0.1-rc1'

/** L2-EDIT：三概念分化（携带当前模式提示,让小类单元定义对齐模式；conceptLimit 可随设置）。 */
export function phaseL2(mode = 'correct', conceptLimit = 3) {
  return `【分级·第二步·${VERSION}】大类已锁定。现在把每个大类分化成小类（本会话模式：${modeName(mode)}；概念上限：${conceptLimit}，随面板设置）：
① 一个小类 = 一个"能一截图/一运行独立验证"的完成单元（独立交付物，不是步骤）——按本模式定义"验证"：${modeCenter(mode)}。
② 每个小类 ≤${conceptLimit} 个核心概念（记在 concepts 里，超 ${conceptLimit} 个就拆成两个小类）。
③ 小类名是纯名词短语，不要重复大类词（大类"分析"，小类就写"双注入核验"，别写"分析——双注入核验"）。
④ 调 **edit_plan**（level="L2"，groups[].items 完整树，大类名必须与已锁定的一致）写完当场展示。
⑤ 全部小类确认后调 **lock_stage**（level="L2"）——所有门关闭，会自动弹出树状图审核确认。`
}

/** 完整规格评审单（3.1 修订：锁定动作时呈现——北极星+需求计数+规格树）。 */
export function specSheet(state) {
  const star = state?.star
  const starBlock = star && star.aligned
    ? `【北极星】${star.purpose || '（未定稿）'}\n需求 ${star.requirements.length} 条 / 非目标 ${star.nonGoals.length} 条 / 假设 ${star.assumptions.length} 条\n`
    : `⚠️ 北极星未定稿（脑暴未闭环）——建议先 commit_star 再锁定。\n`
  return `${starBlock}${treeText(state?.plan)}`
}

/** 审核待确认（3.1 修订：简短提示——完整规格单已在锁定回执呈现，此处不重复大块）。 */
export function reviewPendingText() {
  return `【审核】清单已锁定待确认（完整规格评审单见上方锁定回执）——请等用户文本回复：『确认』开始开发，『修改』/『建议』调整（附意见）；亦可 /graded off 退出。⚠️ 不要调用 ask_user_question 或任何其他工具——只需向用户展示清单并静候其回复。`
}

/** 审核通过 → 逐小类开发（衔接语 + 模式声明一次,全程后端默认为准）。 */
export function approvedToDevelop(mode = 'correct') {
  return `【分级·第三步】清单已确认 ✅——进入**单类门禁 + 打卡制**开发（本会话模式：**${modeName(mode)}**——验收重心=${modeCenter(mode)}）。每小类一次走完三步：做（仅当前小类交付物，禁入区=其余一切）→ 验（按本模式验收：截图/运行/落盘/体感/复现并核对概念）→ 打卡（mark_task——**唯一前进许可，也是获取下一步正确引导的钥匙**；打卡即获引导，不打卡就停）。`
}

/** 高要求验收机制（压缩核心 + 自问触发器——注意力预算优先,不随轮次膨胀）。 */
const VERIFY_PROTOCOL = `**验收铁律（恒定,不增不减）**：
① 证据链：每个概念一行「概念→证据(任何可核验产出+数值)→结论(通过/未证实)」；未证实不标通过。
② 先宣告后对照：开工一句【如何验证/怎样算通过】；验收必须回应它——宣告了没做=未完成。
③ 两遍法+相邻锚：先证据后"陌生人挑刺"（同源自检不可信）；只对照相邻接口,别想全局。
**开工前自问一句**：「我是否已列出本小类的证据与验收方法？若现在被别人审,我会不会脸红？」`

/** 验收细则·修辞变体轮换 已退役（3.1：结构差异足够,铁律按模式固定）——保留迁移期兼容（勿用于新模板）。 */
const VERIFY_VARIANTS = []
export function verifyVariant(n) { return VERIFY_VARIANTS[n % Math.max(VERIFY_VARIANTS.length, 1)] }

/** 模式专属验收尾句（3.0 兼容导出；3.1 已并入 verifyLaw——勿用于新模板）。 */
export function modeTail(mode = 'correct') {
  if (mode === 'experience') {
    return `**体验验收（本模式重心·与证据链同级）**：以最终使用者身份实际"看/听/玩"一遍本小类成品——截图/实况/试听/交互轨迹为**第一证据**（先于指标）；收尾一句感受判断：**像不像 / 顺不顺 / 最该改**（三者至少其一；禁止用指标冒充感受）。若本小类无独立可体验面，把最接近的体验面（连挂载点一起）过一遍。`
  }
  if (mode === 'research') {
    return `**可复核性（本模式重心·与证据链同级）**：每条结论标注**来源**（公式/实现/数据出处/引用）与**复现路径**（命令/参数/文件行号）；宣称与事实分层——复核不了的标"未证实"，不硬通过。`
  }
  return ''
}

/** 委派/红队能力 + 开发实践四条（开局一次告知；不每步重复——避免决策分心）。 */
const DELEGATE_ONCE = `（能力与纪律提示·供自行判断,非每步任务）
· 独立大块资产可派 subagent/workflow 批产（交付=证据+验收记录）；你的岗位=调度/组装/终验；组收官/终验可派冷视角红队（证据级问题清单）。
· **验证工具复用**：一次写好的 mock/封装/脚本/截屏流程，沉淀为共享工具（如 verify/ 目录）供后续小类复用——不要每类重造验证脚手架。
· **实例用后即回收**：浏览器/服务/进程单例 + 用完即关，防资源泄漏。
· **环境先指认**：验证失败先怀疑"环境陈旧"（旧进程/旧端口/旧产物/缓存），确认服务与产物是新的再改代码。
· **脚本先自测**：验证脚本自身先跑通小样例/对照常量表，防"裁判=选手"的脚本笔误吞轮次。`

/** 检测模式提示行（verify 倾向随面板设置；auto=无提示=现状）。 */
export function verifyHint(vm) {
  if (vm === 'self-redteam') return '【检测模式：单自红队】——本小类验收建议先走自演红队裁决（verify=redteam）；未裁决通过不得打卡。'
  if (vm === 'subagent') return '【检测模式：单 subagent】——本小类建议委派子代理执行（do=subagent）；回收证据后按盘档标准独立验收。'
  return ''
}

/** 北极星锚定行（开工前一眼——替代"开工前自问"式声明：锚=目的+本小类验收锚）。 */
export function starAnchor(item, purpose) {
  const p = (purpose || '').trim()
  const acc = (item.accept || [])[0] || (item.spec || '').split('\n')[0] || '（先声明）'
  return p
    ? `**开工前一眼（北极星锚定）**：本小类服务于：${p.length > 46 ? p.slice(0, 46) + '…' : p}。本小类验收锚：${acc.length > 30 ? acc.slice(0, 30) + '…' : acc}——答完这一眼，回到砖上。`
    : `**开工前一眼（目的锚定）**：本小类验收锚：${acc.length > 30 ? acc.slice(0, 30) + '…' : acc}——按它做、验它过，答完这一眼回到砖上。`
}

/** 验收铁律（3.1 固定,按模式措辞；不再轮换变体——结构差异已足够）。 */
export function verifyLaw(mode = 'correct') {
  const base = `① 证据链：每个概念一行「概念→证据(任何可核验产出+数值)→结论(通过/未证实)」；未证实不标通过。
② 先宣告后对照：开工一句【如何验证/怎样算通过】；验收必须回应它——宣告了没做=未完成。
`
  if (mode === 'experience') {
    return `**验收铁律**：
${base}③ 体感优先（本模式重心）：最终以"看/听/玩"的第一证据判，感受判断先于指标（禁止指标冒充感受）；收尾一句：像不像/顺不顺/最该改（至少其一）。`
  }
  if (mode === 'research') {
    return `**验收铁律**：
${base}③ 可复核性（本模式重心）：结论标来源+复现路径+边界；未证实明示,不得把"我觉得"当结论。`
  }
  return `**验收铁律**：
${base}③ 两遍法+相邻锚：先证据后"陌生人挑刺"；只对照相邻接口。`
}

/** do/verify 选项摘要（skill 卡化雏形——每选项一句话；模型在选项内自主抉择）。 */
export function doSummary(d) {
  switch (d) {
    case 'subagent': return '委派 subagent 执行（prompt 内嵌规格；岗位=撰写委派→派发→回收→按标准独立验收→打卡）'
    case 'workflow': return 'workflow 批量编排（自编并行/流水线脚本；岗位=编排+护栏+汇总判分）'
    case 'daemon': return 'daemon-loop 守护循环（定时+自主 agent loop,适合常驻/长跑）'
    case 'mixed': return '混合（先自干再派,或分阶段换形态）'
    default: return '自执行（做→验→打卡,单类门禁全程）'
  }
}
export function verifySummary(v) {
  switch (v) {
    case 'subagent': return '独立 subagent 验证（与开发隔离）'
    case 'redteam': return '冷视角红队裁决（pass 才可打卡；打回必再审批）'
    case 'dual': return '双轨并行（开发+独立验证并行推进,完成后对照）'
    case 'workflow': return 'workflow 批量验证（多标准并行验）'
    default: return '自查证据链（开发方自验+两遍法）'
  }
}

/** 委派 skill（do=subagent 形态段完整规范——skill 卡化：名字+触发+正文）。 */
export function delegateSpec(item) {
  const acc = (item.accept || []).map((a) => `· ${a}`).join('\n') || '· （无——先声明两句话）'
  return `【委派 skill】
· 委派对象：subagent（独立上下文；全工具；可再派生——引导大于限制）
· **委派通道（自主决策）**：后台（run_in_background=true，默认推荐——不阻塞主链推进，异步回收证据）/ 阻塞（当前任务依赖其结果才可继续时空）。自行选并在委派记录标注通道选择。
· 委派 prompt：**允许基于情景合理改写**（子代理无本会话上下文——把角色/目标/术语讲清楚）——但**规格事实每条必须完整进入**：任务要点 ${item.spec || item.title}；验收标准逐条对应：\n${acc}
· 改写边界：**可换表达、不得删减/软化/自造标准**；验收判据=盘档规格（accept 原文），不以委托文本为准
· 子代理约束：交付=成果+证据链+验收记录；边界=只做本小类（禁入区外不改）；标准边缘情况**书面报告**,不得自行放宽
· 你的岗位：结合情景起草/改写委派 prompt → 派发（按通道决策） → 回收证据 → 按**盘档标准**独立验收（未过：打回再派/自补）→ 打卡
· 验收纪律：你验收的是"盘档标准是否被达成"——不是子代理说了什么；标准是唯一判据`
}

/** 编排 skill（do=workflow 形态段完整规范）。 */
export function workflowSpec(item) {
  const acc = (item.accept || []).map((a) => `· ${a}`).join('\n') || '· （无——先声明两句话）'
  return `【编排 skill】
· 编排形态自选：并行 fan-out / 阶段流水线 / 混合（自编脚本,以目的为导向）
· 每个实例/阶段携带验收标准（不可剥离）：\n${acc}
· 你的岗位：写脚本 → 护栏（阶段门控/回收检查） → 汇总判分 → 按标准验收 → 打卡
· 护栏纪律：任何实例产出必须先按标准验,不合格不入汇总（不许"先合起来再修"）`
}

/** 红队裁决规范（verify=redteam 形态段追加——组合在允许集内自主；裁决流程+再审批铁律）。 */
export function redteamSpec() {
  return `【红队裁决规范】（verify=redteam）
· 裁决组合（允许集内**自主**决定并在验收记录说明；可组合）：自演红队 / 独立 subagent / 双红队交叉 / 用户复核
· 裁决流程：按验收标准**逐条**裁决 → pass（通过）或 reject（问题清单：证据/行号/建议）
· 再审批铁律：reject → 修复后**必须再次裁决**（改一次不算过）；pass 后调 **redteam_verdict** 落盘 → 才可打卡
· 全流程铁律：未 pass 不得 mark_task；**自演红队=同义务**（绝不能自己改完就说过了，裁决与修复必须分开表演）`
}

/** 双轨并行规范（verify=dual 形态段追加）。 */
export function dualSpec() {
  return `【双轨并行规范】（verify=dual）
· 开发轨与验证轨并行推进（可分开派发/时序交错）
· 对照纪律：验证轨**独立于**开发轨（不得由开发方兼任验证）；完成后双向对照出结论（差异=缺陷线索）
· 对齐点：只有验收标准——开发说"做了"不算，验证说"达到标准"才算`
}

/** 形态段渲染（do=subagent/workflow 用完整 skill 卡；verify=redteam/dual 追加对应规范）。 */
export function formSection(item) {
  const d = item.do || 'self'
  const v = item.verify || 'self'
  let head = ''
  if (d === 'subagent') head = `【执行形态·委派】do=subagent | verify=${v} · ${verifySummary(v)}\n${delegateSpec(item)}`
  else if (d === 'workflow') head = `【执行形态·编排】do=workflow | verify=${v} · ${verifySummary(v)}\n${workflowSpec(item)}`
  else head = `【执行形态】do=${d} · ${doSummary(d)} | verify=${v} · ${verifySummary(v)}`
  if (v === 'redteam') head += `\n${redteamSpec()}`
  else if (v === 'dual') head += `\n${dualSpec()}`
  return head
}

/** develop：当前小类焦点注入——**规格前置三段式**（任务 spec → 验收 accept → 执行形态 → 北极星锚定 → 铁律 → 打卡 → 门禁）。item.mode 优先于会话模式（小类粒度自定义）。 */
export function focusL2(groupTitle, item, prevTitle, mode = 'correct', purpose = '', limit = 3, verifyMode = 'auto') {
  const prev = prevTitle ? `上一小类「${prevTitle}」已打卡 ✅；` : ''
  const m = item.mode || mode
  const acc = (item.accept || []).map((a) => `  · ${a}`).join('\n') || '  · （无——先声明两句话再开工）'
  return `【当前小类·${groupTitle}】${prev}【概念上限：${limit || 3}】现在专注完成「${item.title}」${item.concepts?.length ? `（核心概念：${item.concepts.join('、')}）` : ''}。
【本小类任务】${item.spec || item.title}
【本小类验收标准】（开局已锁,打卡前逐条对照；本小类模式：${modeName(m)}；
${acc}
${formSection(item)}
你的岗位：**唯一推进负责人**——对规格负责（做/派/编均需自验后打卡）。\n（做/派/编均需自验后打卡）。
${starAnchor(item, purpose)}
${verifyHint(verifyMode)}\n${verifyLaw(m)}
然后**打卡**：调 **mark_task**(level="L2", title="${item.title}", status="completed")——唯一前进许可，**也是获取下一步正确引导的钥匙**。
**单类门禁**：务必专注当前小类任务；其余小类一切内容=禁入区（"反正都要写""先搭骨架""相互依赖"等借口直接违规）；不得为了提高效率一次完成多个小类——小类完成后打卡，即自动引导下一个小类。`
}

/** develop：大类入口——上一大类已标定,进入新大类,专注第一小类（规格前置同构；组入口前置北极星浓缩版）。 */
export function focusL2GroupOpen(groupTitle, item, mode = 'correct', purpose = '', limit = 3, verifyMode = 'auto') {
  const m = item.mode || mode
  const acc = (item.accept || []).map((a) => `  · ${a}`).join('\n') || '  · （无——先声明两句话再开工）'
  const star = purpose ? `${northStarShort({ star: { purpose } }, item)}\n` : ''
  return `${star}【新大类·${groupTitle}】✅ 上一大类已标定。现在进入【${groupTitle}】大类，当前专注第一小类「${item.title}」${item.concepts?.length ? `（核心概念：${item.concepts.join('、')}）` : ''}。
【本小类任务】${item.spec || item.title}
【本小类验收标准】（开局已锁,打卡前逐条对照；本小类模式：${modeName(m)}；
${acc}
${formSection(item)}
你的岗位：**唯一推进负责人**——对规格负责（做/派/编均需自验后打卡）。\n（做/派/编均需自验后打卡）。
${starAnchor(item, purpose)}
${verifyHint(verifyMode)}\n${verifyLaw(m)}
然后**打卡**：调 **mark_task**(level="L2", title="${item.title}", status="completed")——唯一前进许可，**也是获取下一步正确引导的钥匙**。
**单类门禁**：务必专注当前小类任务；其余小类一切内容=禁入区（"反正都要写""先搭骨架""相互依赖"等借口直接违规）；不得为了提高效率一次完成多个小类——小类完成后打卡，即自动引导下一个小类。`
}

/** develop：大类出口——本大类最后一个小类（完成后→即停→等下一步引导自动到来）。 */
export function focusL2Last(groupTitle, item, prevTitle, mode = 'correct', purpose = '', limit = 3, verifyMode = 'auto') {
  const prev = prevTitle ? `上一小类「${prevTitle}」已打卡 ✅；` : ''
  const m = item.mode || mode
  const acc = (item.accept || []).map((a) => `  · ${a}`).join('\n') || '  · （无——先声明两句话再开工）'
  return `【当前小类·${groupTitle}】${prev}【概念上限：${limit || 3}】现在专注完成「${item.title}」${item.concepts?.length ? `（核心概念：${item.concepts.join('、')}）` : ''}——**这是本大类最后一个小类**。
【本小类任务】${item.spec || item.title}
【本小类验收标准】（开局已锁,打卡前逐条对照；本小类模式：${modeName(m)}；
${acc}
${formSection(item)}
你的岗位：**唯一推进负责人**——对规格负责（做/派/编均需自验后打卡）。\n（做/派/编均需自验后打卡）。
${starAnchor(item, purpose)}
${verifyHint(verifyMode)}\n${verifyLaw(m)}
然后**打卡（只此一个 mark_task）**：调 **mark_task**(level="L2", title="${item.title}", status="completed")——唯一前进许可。
**单类门禁**：打卡后**即停**——下一步引导（验收/标定）会在打卡后自动到来；**不预判、不抢跑**；每轮只允许一个 mark_task 动作，听引导走。`
}

/** 组收官的②「体验过目」按模式取措辞（correct=轻量试运行, experience=人视角完整体验, research=可复核过目）。 */
function groupReviewTitle(mode) {
  if (mode === 'experience') {
    return `② **体验过目（本模式重心·强制）**：以**最终消费者身份**体验一遍与本组相关的成品（试玩/走查/通读/试运行）——记录三件事：哪里让我**想停下来**、哪里让我**想继续**、**最该改的一处**。**结论是"感受判断"，不是指标清单**（指标全绿≠体验过）。本组若与其它组衔接，带衔接部分一起过目（全局而非只本组）。`
  }
  if (mode === 'research') {
    return `② **可复核过目（本模式重心·强制）**：本组每条关键结论标注来源与复现路径；**挑 1 条亲自复现**（执行/验算），记录"复现成功/失败+偏差"。宣称与事实分层。`
  }
  return `② **轻量过目**：本组成品若可运行则试运行一遍（错误路径也过一眼），记录一处"最可疑/最想改"；纯接口/数据组则以使用者视角通读一遍。`
}

/** 组收官验证方注入（3.1：verify 注入——每档给"怎么做"）；redteam=先裁后定。 */
export function groupVerifyNote(group) {
  const v = group.verify || 'self'
  if (v === 'redteam') {
    return `③.5 **组级红队裁决（verify=redteam·先裁后定）**：先调 **redteam_verdict**(level="L1", title="${group.title}", verdict=...) 出裁决（通过/打回+问题清单）；**打回 → 修复 → 再裁决 → 通过后才允许标定**（再审批铁律）。\n${redteamSpec()}`
  }
  if (v === 'user') {
    return `（组收官验证方=**用户复核**）：把 ② 每条判定+证据呈现给用户，**待用户确认**后再进行 ④ 标定。`
  }
  if (v === 'subagent') {
    return `（组收官验证方=**独立 subagent**）：派 subagent 按 ② 逐条复核（交付=复核记录+不一致清单），复核通过后再进行 ④ 标定。`
  }
  return `（组收官验证方=**自验收**）：以"最挑剔观者"身份自验 ② 逐条结论——不通过项必须定位到所属小类。`
}

/** develop：一个大类整体完成时的验收+标定（证据回放 → **组级标准逐条核对** → 组 verify 注入 → 整体验收 → 标定）。 */
export function groupCheck(group, mode = 'correct') {
  const g = group?.title || ''
  const acc = (group?.accept || []).map((a) => `  · ${a} → `).join('\n') || '  · （组级无标准——回退小类证据链）'
  return `【大类收官·${g}】本大类小类已全部完成——
① **证据回放**：把本组各小类证据各列 1 行（路径+数值），逐条过目（防"停滞当进步"）。
② **组级验收标准·逐条核对**（严苛程度**高于小类**：每条单独判定+证据，不得整体"过"）：
${acc}
（每条后补：判定+证据路径+数值）
${groupVerifyNote(group)}
③ 整体验收（一致性/覆盖性）。
④ **标定大类完成**：mark_task(level="L1", title="${g}", status="completed")。完成后即停，等下一步引导。`
}

/** final：成品整体验收协议（通用·正确性层 + 按模式的体验/复核终验——不可替代为指标）。 */
export function finalCheck(mode = 'correct') {
  const t6 = mode === 'experience'
    ? `⑥ **终端体验验收（本模式重心·独立项,不可替代为指标）**：以**真实用户身份完整玩一遍成品**（不跳过、不拆解、不代劳），记录"想继续/想停/最该改的一处" + 至少一张成品实况截图——**体验不过=不通过**（哪怕测试全绿）。`
    : mode === 'research'
      ? `⑥ **终验可复核性（本模式重心·独立项）**：以读者身份通读全成品，逐条判定"结论从哪来、能否复现、边界是否明示"；挑至少 2 条亲自复现，未复核项明示——**边界不明=不通过**。`
      : `⑥ **终端体验验收（独立项,不可替代为指标）**：以**真实用户身份完整消费一遍成品**（试玩/通读/走查/试运行），记录"想继续/想停/最该改的一处"——**体验不过=不通过**（哪怕测试全绿）。`
  return `【收尾·成品整体验收】（部件合格≠成品合格,以下每项给"通过/不通过+证据"）：
① **全面复查**：从用户/功能/边界多个角度检查成品整体（不是只盯局部单点）——**以最挑剔观者身份**："这成品拿给最刁钻的人看，会被怎么评价？"（拒绝"指标没问题=完美"的幻觉——指标对≠体验对）。
② **一致性**：风格/格式/接口/约定是否统一——有无"占位感/草稿感/拼贴割裂"。
③ **核心要求**：任务的核心效果、关键对比是否真正达成（"局部有"≠"整体达成"）。
④ **边界与残留**：错误路径/边角/接缝/占位符/调试残留是否清除。
⑤ **副作用**：有无喧宾夺主、性能/体积/噪音等不必要影响。
${t6}
不通过项 → 定位到所属小类，回去补（补完仍走打卡+标定流程）。`
}
