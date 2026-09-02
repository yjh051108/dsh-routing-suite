/**
 * tools — 分级模式 v4 的三个语义化工具（agent 层注册,不污染全局）。
 *
 *   edit_plan   按层级编辑树（level 参数切语义：'L1' 大类列表 / 'L2' 完整树）
 *   lock_stage  锁定当前层级（level 参数；锁了就是锁了——已锁层 edit 被拒）
 *   mark_task   开发期标定完成（level/title/status；标注后 pre-step 自动注入下一个小类）
 *
 * 数据面（todo max）：清单只存在于结构化状态（plan.groups）与工具结果文本,
 * 不写官方 todo_write；自定义事件不落盘（DSH 会话加载器只认白名单事件类型,
 * 库外插件事件会被判 SessionFormatUnsupportedError）。
 *
 * Schema 形态约束（血泪坑,勿改）：
 *   register() 用 assertSupportedJsonSchema 直查 output.schema 原文,发给模型的
 *   parameters 经服务端 JSON Schema 严格校验——全都只认标准 raw 形态：
 *   对象级 required 数组,属性级一律不允许 required 键。
 *
 * definition 由 index.js 构造（execute 需要 apply 作用域的 state/事件/ask 依赖）：
 *   editPlanDefinition(deps) / lockStageDefinition(deps) / markTaskDefinition(deps)
 *   deps = { getState(sid), setState(sid, s), askUser(agent, state) }
 */

import {
  assertL1Items, assertL2Groups, onEditL1, onEditL2, onLockL1, onLockL2,
  onReviewApproved, onReviewRejected, onMark, onCommitStar, onRedteamVerdict, onReviseDo,
  treeText, groupDone, loadConceptLimit, loadVerifyMode, allDone, currentFocus,
  trigger, initMode, loadState, saveState,
} from './mode-state.js'
import { focusL2, focusL2GroupOpen, focusL2Last, groupCheck, finalCheck, phaseL2, reviewPendingText, specSheet } from './inject-text.js'

const TEXT = (text) => ([{ type: 'text', text: String(text) }])

/** 打卡续轮防爆计数（同一小类最多自动续轮 2 次；热重载清空不致命,最坏多续一轮） */
const deferCounts = new Map()

const outputSpec = {
  schema: {
    type: 'object', additionalProperties: false, required: ['ok', 'text'],
    properties: {
      ok: { type: 'boolean' },
      text: { type: 'string' },
      warnings: { type: 'array', items: { type: 'string' }, description: '软约束提示（如概念超限），非错误' },
    },
  },
  render: (_args, value) => TEXT(value.text + (value.warnings?.length ? `\n（提示：${value.warnings.join('；')}）` : '')),
}

/* 标准 raw JSON Schema 子节点（无属性级 required 键）；3.1 小类规格化：spec/accept/do/verify 必填 */
const groupItemSchema = {
  type: 'object', additionalProperties: false, required: ['title', 'spec', 'accept', 'do', 'verify'],
  properties: {
    title: { type: 'string', description: '小类名（纯名词短语,不要重复大类词）' },
    concepts: { type: 'array', items: { type: 'string' }, description: `核心概念（≤${loadConceptLimit(null)} 个——面板设置实时值；超限仅提示非错误）` },
    spec: { type: 'string', description: '小类任务说明（多行；可提及参考文档/文件，注入时自然引用）' },
    accept: { type: 'array', items: { type: 'string' }, description: '验收标准（按模式文法：correct=可测量断言/experience=感受断言+可复现动作/research=可复核断言;探索型须带退路占位）' },
    mode: { type: 'string', enum: ['correct', 'experience', 'research'], description: '本小类验收模式（可缺省=继承会话模式——全栈任务可按小类粒度换重心）' },
    do: { type: 'string', enum: ['self', 'subagent', 'workflow', 'daemon', 'mixed'], description: '开发增量执行形态（选项内自主抉择,注入给摘要）' },
    verify: { type: 'string', enum: ['self', 'subagent', 'redteam', 'dual', 'workflow'], description: '验证执行形态（开发期只读；redteam 走裁决门）' },
  },
}
const groupSchema = {
  type: 'object', additionalProperties: false, required: ['title', 'items'],
  properties: {
    title: { type: 'string', description: '大类名（须与已锁定的大类一致）' },
    spec: { type: 'string', description: '组任务描述（可选；缺省保留 L1 已定值）' },
    accept: { type: 'array', items: { type: 'string' }, description: '组级验收标准（可选；缺省保留 L1 已定值）' },
    verify: { type: 'string', enum: ['self', 'subagent', 'redteam', 'user'], description: '组收官验证方（可选；缺省保留 L1 已定值）' },
    items: { type: 'array', items: groupItemSchema },
  },
}

/** 软约束提示采集（概念上限为提示级约束，不阻断；上限=loadConceptLimit 面板设置）。 */
function collectWarnings(level, args, sid) {
  const out = []
  if (level === 'L2') {
    const limit = (() => { try { return loadConceptLimit(sid) } catch { return 3 } })()
    for (const g of (args?.groups || [])) {
      for (const it of (g?.items || [])) {
        const n = (it?.concepts || []).length
        if (n > limit) out.push(`「${g?.title || ''}/${it?.title || ''}」概念超限 ${n} > ${limit}（仅提示，不阻断）`)
      }
    }
  }
  return out
}

/**
 * commit_star：头脑风暴定稿（3.1）。purpose 必填（北极星目的宣言）；
 * 校验：不得照抄任务原文、不得过短敷衍；brainstorm/l1-edit/l2-edit/review 可定稿或修订，
 * develop/final 只读（星象已在规约中，改口回『修改』）。
 */
export function commitStarDefinition() {
  return {
    name: 'commit_star',
    description: '【分级·定稿】头脑风暴定稿：purpose=北极星目的宣言（必填，一句话：为谁/处境/价值/可观测结果，不得照抄任务原文）；requirements=对齐后需求；nonGoals=非目标；assumptions=假设；mode=脑暴模式题的选择（correct/experience/research，随定稿落盘为会话模式）。定稿后进入大类规划（edit_plan L1）。开发前可再次调用=修订。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['purpose'],
      properties: {
        purpose: { type: 'string', description: '北极星：一句话目的宣言（为【谁】在【什么处境】下达成【什么价值/可观测结果】）' },
        requirements: { type: 'array', items: { type: 'string' }, description: '需求条目（对齐后）' },
        nonGoals: { type: 'array', items: { type: 'string' }, description: '非目标/不做清单' },
        assumptions: { type: 'array', items: { type: 'string' }, description: '假设（默认理解与采纳方式）' },
        mode: { type: 'string', enum: ['correct', 'experience', 'research'], description: '脑暴模式题的用户选择（随定稿落盘为会话验收模式；不传=保持当前）' },
      },
    },
    output: outputSpec,
    async execute(args, exec) {
      const sid = exec?.agent?.session?.id
      if (!sid) throw new Error('commit_star 需要会话')
      let s = loadState(sid) || initMode() // 磁盘权威（代际免疫）
      const { purpose, requirements, nonGoals, assumptions, mode } = args || {}
      // 阶段只读优先（语义最明确：不该调用的阶段先报阶段，再谈内容）
      const editable = s.stage === 'brainstorm' || s.stage === 'l1-edit' || s.stage === 'l2-edit' || s.stage === 'review'
      if (!editable && s.stage !== 'off') throw new Error('开发/终验阶段星象只读（北极星已入规约；改口走『修改』回审）。')
      const p = String(purpose || '').trim()
      if (!p) throw new Error('commit_star 需要 purpose：北极星目的宣言（必填）')
      const task = String(s.task || '').trim()
      if (task && (p === task || p.includes(task))) throw new Error('purpose 不得机械照抄任务原文：须用"为谁/处境/价值/结果"句式重新表述（对齐后）。')
      if (p.length < 12) throw new Error('purpose 过短（<12 字）：请给出有信息量的目的宣言，而非口号。')
      let auto = false
      if (s.stage === 'off') {
        // 模型自主进入（3.1）：off → 写目的宣言即激活（脑暴链一次对齐；/graded 非必需）
        s = trigger(initMode(), `（模型自主进入）${p.slice(0, 60)}`)
        auto = true
      }
      const finalized = onCommitStar(s, { purpose: p, requirements, nonGoals, assumptions })
      // v3.2：脑暴模式题选择随定稿落盘（唯一可信的会话模式来源）
      if (mode && ['correct', 'experience', 'research'].includes(mode)) finalized.mode = mode
      saveState(sid, finalized)
      const cur = loadState(sid) || s
      return {
        ok: true,
        text: auto
          ? `⭐ 模型自主进入分级模式（未 /graded 亦激活）——脑暴已由目的宣言一次对齐：\n${p}\n需求 ${cur.star.requirements.length} 条 / 非目标 ${cur.star.nonGoals.length} 条 / 假设 ${cur.star.assumptions.length} 条\n进入大类规划：edit_plan(level="L1", items[].title 一行一个大类,组 spec/accept 必填)。\n（信息缺口将按"默认理解"写入 assumptions——用户随时可 [模式:xxx] 或评语补正）`
          : `⭐ 北极星已定稿：${p}\n需求 ${cur.star.requirements.length} 条 / 非目标 ${cur.star.nonGoals.length} 条 / 假设 ${cur.star.assumptions.length} 条——进入大类规划：edit_plan(level="L1", items[].title 一行一个大类)。`,
      }
    },
    presentCall: (args) => ({ card: 'generic', title: '脑暴定稿 (commit_star)', kind: 'other', rawInput: args }),
  }
}

/**
 * redteam_verdict：红队裁决（3.1）。仅 verify=redteam 的小类/组可用；
 * reject 必须附问题清单（issues 非空）；reject → 修复后**必须再次裁决**（再审批义务,自演红队同流程）；
 * pass 后 mark_task 才可推进（门由组合流程层执行）。轮次/log 落盘（面板消费）。
 */
export function redteamVerdictDefinition() {
  return {
    name: 'redteam_verdict',
    description: '【分级·红队】对 verify=redteam 的项做裁决（冷视角打脸）：level=L1 组级/L2 小类级，title 精确匹配；verdict=pass 通过 / reject 打回（打回必须附 issues 问题清单）；打回后修复必须再次裁决（再审批,自演同流程）。裁决轮次与日志落盘。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['level', 'title', 'verdict'],
      properties: {
        level: { type: 'string', enum: ['L1', 'L2'], description: '裁决层级：L1 组级（组收官）/ L2 小类级' },
        title: { type: 'string', description: '要裁决的类名（精确匹配）' },
        verdict: { type: 'string', enum: ['pass', 'reject'], description: '通过 / 打回' },
        issues: { type: 'array', items: { type: 'string' }, description: '问题清单（reject 必填,每条=证据/行号/建议）' },
      },
    },
    output: outputSpec,
    async execute(args, exec) {
      const { level, title, verdict, issues } = args || {}
      const sid = exec?.agent?.session?.id
      const s = loadState(sid) || initMode() // 磁盘权威（代际免疫）
      if (!sid || !s || (s.stage !== 'develop' && s.stage !== 'final')) {
        throw new Error('redteam_verdict 仅在开发/终验阶段可用（审核通过后）')
      }
      if (verdict !== 'pass' && verdict !== 'reject') throw new Error('verdict 必须是 pass 或 reject')
      if (verdict === 'reject' && !(Array.isArray(issues) && issues.some((x) => String(x || '').trim()))) {
        throw new Error('reject 必须附问题清单（issues 至少一条：证据/行号/建议）')
      }
      const res = onRedteamVerdict(s, level, title, verdict, issues)
      if (!res.ok) throw new Error(res.error)
      saveState(sid, res.state)
      const cur = loadState(sid) || res.state
      const node = level === 'L1'
        ? (cur.plan.groups || []).find((g) => g.title === title)
        : (cur.plan.groups || []).flatMap((g) => g.items || []).find((it) => it.title === title)
      const rt = node?.redteam || {}
      const head = verdict === 'pass' ? '✅ 红队裁决：通过' : '⭕ 红队裁决：打回'
      const extra = verdict === 'reject' ? `——修复后**必须再次裁决**（再审批义务：改一次不算过,经过再算过）。` : ''
      return { ok: true, text: `${head}「${title}」轮次=${rt.rounds}${extra}\n问题清单：${(rt.log?.[rt.log.length - 1]?.issues || []).join('；') || '（无）'}` }
    },
    presentCall: (args) => ({ card: 'generic', title: `红队裁决 (redteam_verdict ${args?.level || ''} ${args?.title || ''})`, kind: 'other', rawInput: args }),
  }
}

/**
 * revise_do：开发期执行形态修订（3.1）。do 可改（登记 doHistory）；
 * verify 只读——本工具不提供任何 verify 修改能力（验收承诺不因形态变化打折）。
 */
export function reviseDoDefinition() {
  return {
    name: 'revise_do',
    description: '【分级·形态修订】开发期改执行形态（do）：level 固定 L2、title 精确匹配；新形态枚举合法；修订登记轨迹（从→到）。verify 只读：验证承诺不因形态变化而打折（真不行走『修改』回审）。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['title', 'do'],
      properties: {
        title: { type: 'string', description: '小类名（精确匹配）' },
        do: { type: 'string', enum: ['self', 'subagent', 'workflow', 'daemon', 'mixed'], description: '新执行形态' },
      },
    },
    output: outputSpec,
    async execute(args, exec) {
      const { title, do: doNext } = args || {}
      const sid = exec?.agent?.session?.id
      const s = loadState(sid) || initMode() // 磁盘权威（代际免疫）
      if (!sid || !s || (s.stage !== 'develop' && s.stage !== 'final')) {
        throw new Error('revise_do 仅在开发/终验阶段可用（审核通过后）')
      }
      const res = onReviseDo(s, title, doNext)
      if (!res.ok) throw new Error(res.error)
      saveState(sid, res.state)
      return { ok: true, text: `已修订「${title}」执行形态 → do=${doNext}（轨迹登记在案）。\n⚠️ 温和提醒：verify 不变——验收承诺不因形态变化而打折；形态不符时先自纠再干。` }
    },
    presentCall: (args) => ({ card: 'generic', title: `形态修订 (revise_do ${args?.title || ''})`, kind: 'other', rawInput: args }),
  }
}

/** edit_plan：按 level 编辑树。已锁层 → 拒绝；级别与阶段不符 → 拒绝。 */export function editPlanDefinition(deps) {
  return {
    name: 'edit_plan',
    description: `【分级·编辑】按层级编辑计划树：level=L1 大类（title/spec/accept 必填；accept=组级完成条件 ≤3 条），level=L2 完整树（每小类 title/spec/accept/do/verify 必填——spec=任务说明、accept=验收标准（按模式文法）、do=开发形态、verify=验证形态；concepts ≤${loadConceptLimit(null)} 个——面板设置实时值）。每次传全量（整体替换）。顺序：大类 → lock_stage(L1) → 小类 → lock_stage(L2)。`,
    parameters: {
      type: 'object', additionalProperties: false, required: ['level'],
      properties: {
        level: { type: 'string', enum: ['L1', 'L2'], description: '编辑层级：L1 大类 / L2 小类' },
        items: {
          type: 'array',
          description: 'level=L1 时的大类列表（title/spec/accept 必填,verify 可缺省=self）',
          items: { type: 'object', additionalProperties: false, required: ['title', 'spec', 'accept'], properties: {
            title: { type: 'string', description: '大类名（纯名词短语）' },
            spec: { type: 'string', description: '组任务描述：这组交付什么（含负面声明/参考文档提及）' },
            accept: { type: 'array', items: { type: 'string' }, description: '组级验收标准（≤3 条,完成条件）' },
            verify: { type: 'string', enum: ['self', 'subagent', 'redteam', 'user'], description: '组收官验证方（缺省 self）' },
          } },
        },
        groups: { type: 'array', items: groupSchema, description: 'level=L2 时的完整大类→小类树' },
      },
    },
    output: outputSpec,
    async execute(args, exec) {
      const level = args?.level
      const sid = exec?.agent?.session?.id
      const s = loadState(sid) || initMode() // 磁盘权威（代际免疫）
      if (!sid || !s || s.stage === 'off') throw new Error('edit_plan 需要激活的会话（先 /graded <任务> 触发）')
      // 门控前置（3.1）：脑暴未定稿 → 禁止规划（信息不闭环不前进）
      if (s.stage === 'brainstorm' && !(s.star && s.star.aligned)) {
        throw new Error('先完成需求对齐并定稿北极星：调用 commit_star（purpose 必填）后再规划；愿以假设闭环则把假设写入 assumptions 并照样定稿。')
      }
      if (level === 'L1') {
        if (s.stage !== 'l1-edit') {
          throw new Error(s.l1Locked ? 'L1 已锁定：锁了就是锁了,不可再 edit_plan(L1)。要改大类请先让用户拒绝/取消审核。' : '当前不是大类编辑阶段（顺序：大类 → 锁定 → 小类 → 锁定）')
        }
        const check = assertL1Items(args?.items)
        if (!check.ok) throw new Error(check.error)
        saveState(sid, onEditL1(s, args.items))
      } else if (level === 'L2') {
        if (s.stage !== 'l2-edit' || !s.l1Locked) {
          throw new Error('当前不是小类编辑阶段：请先 lock_stage(L1) 锁定大类')
        }
        const locked = new Set((s.plan?.groups || []).map((g) => g.title))
        const check = assertL2Groups(args?.groups, locked)
        if (!check.ok) throw new Error(check.error)
        saveState(sid, onEditL2(s, args.groups))
      } else {
        throw new Error(`edit_plan: level 必须是 "L1" 或 "L2"，得到 ${JSON.stringify(level)}`)
      }
      const cur = loadState(sid) || s
      const warnings = collectWarnings(level, args, sid)
      return { ok: true, text: `已编辑 ${level} 计划（${treeCount(cur)}）：\n${treeText(cur.plan)}`, ...(warnings.length ? { warnings } : {}) }
    },
    presentCall: (args) => ({ card: 'generic', title: `计划编辑 (edit_plan ${args?.level || ''})`, kind: 'other', rawInput: args }),
  }
}

/** 引导幂等键注册：followup **成功后**登记 injected 键（先注后键=成功才防重；
 *  失败则不登记 → pre-step splice 兜底补入,引导不丢）。 */
function registerInjected(sid, key) {
  try {
    const st = loadState(sid)
    if (st && key && !st.injected.has(key)) {
      st.injected.add(key)
      saveState(sid, st)
    }
  } catch { /* 幂等 */ }
}

/** 同 turn 引导合并（60ms 窗口只发最新一条——连续打卡不把引导叠进 next-step 队列）。 */
const pendingGuide = new Map()
const guideTimers = new Map()

/** lock_stage：锁定当前层。L1 锁 → 切 L2 编辑；L2 锁 → 全门关,自动弹树状审核。 */
export function lockStageDefinition(deps) {
  return {
    name: 'lock_stage',
    description: '【分级·锁定】锁定当前层级：level=L1 锁定大类（锁定后进入小类编辑阶段）；level=L2 锁定小类（所有门关闭,自动弹出树状图审核确认）。锁定前请确认该层内容完整。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['level'],
      properties: {
        level: { type: 'string', enum: ['L1', 'L2'], description: '锁定层级：L1 大类 / L2 小类' },
      },
    },
    output: outputSpec,
    async execute(args, exec) {
      const level = args?.level
      const sid = exec?.agent?.session?.id
      const s = loadState(sid) || initMode() // 磁盘权威（代际免疫）
      if (!sid || !s || s.stage === 'off') throw new Error('lock_stage 需要激活的会话（先 /graded <任务> 触发）')
      if (level === 'L1') {
        if (s.stage !== 'l1-edit') throw new Error(s.l1Locked ? 'L1 已锁定（重复锁定）' : '当前不是大类编辑阶段')
        if ((s.plan?.groups || []).length === 0) throw new Error('L1 还没有内容：先 edit_plan(L1) 写入大类')
        // 3.1：L1 复检（组规格化门控——旁路写入也不放过）
        const gBad = (s.plan.groups || []).find((g) => !String(g.spec || '').trim() || (g.accept || []).length === 0)
        if (gBad) throw new Error(`大类「${gBad.title}」规格不全（组任务描述 spec / 组验收标准 accept 缺失）——补全后再锁定。`)
        saveState(sid, onLockL1(s))
        const cur = loadState(sid) || s
        // 锁 L1 → **同一 turn 的下一步**注入小类分化要求（steer=next-step：不跨轮、不过期；
        // 键注册防 pre-step splice 兜底重复——回滚/重启场景仍可补）
        try {
          exec?.agent?.steer?.({
            id: 'graded-follow-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
            role: 'user', content: [{ type: 'text', text: phaseL2(cur.mode, loadConceptLimit(sid)) }],
            source: { kind: 'plugin', plugin: 'dsh-graded-mode' },
          })
          registerInjected(sid, 'l2-guidance')
        } catch { /* 引导失败不阻断（不注册键 → pre-step 兜底补） */ }
        return { ok: true, text: `已锁定 L1 大类（${cur.plan.groups.length} 个）。现在进入小类编辑：请调 edit_plan(L2) 给每个大类编写小类（≤3 概念）。` }
      }
      if (level === 'L2') {
        // 3.1：**先复检后写入**——拒绝=状态必须不变（曾因 saveState 先行导致拒绝后 stage 已污染为 review）
        if ((s.plan?.groups || []).some((g) => (g.items || []).length === 0)) {
          throw new Error('还有大类下没有小类：先 edit_plan(L2) 补全再锁定')
        }
        const gBad = (s.plan.groups || []).find((g) => !String(g.spec || '').trim() || (g.accept || []).length === 0)
        if (gBad) throw new Error(`大类「${gBad.title}」规格不全（组任务描述/组验收标准）——补全后再锁定。`)
        for (const g of s.plan.groups || []) {
          for (const it of g.items || []) {
            const n = it.title || '(未命名)'
            if (!String(it.spec || '').trim()) throw new Error(`小类「${n}」缺任务说明（spec）——补全后再锁定。`)
            if (!(it.accept || []).length) throw new Error(`小类「${n}」缺验收标准（accept）——补全后再锁定。`)
            if (!['self', 'subagent', 'workflow', 'daemon', 'mixed'].includes(it.do)) throw new Error(`小类「${n}」执行形态（do）缺失或无效。`)
            if (!['self', 'subagent', 'redteam', 'dual', 'workflow'].includes(it.verify)) throw new Error(`小类「${n}」验证形态（verify）缺失或无效。`)
          }
        }
        if (s.stage === 'review') {
          // 热重载/中断后重入：锁定已生效但审核未决 → 重锁定等价（幂等,不弹窗）
          saveState(sid, onLockL2(s))
        } else if (s.stage !== 'l2-edit' || !s.l1Locked) {
          throw new Error('当前不是小类编辑阶段（v0.3.1）：请先 lock_stage(L1)')
        } else {
          saveState(sid, onLockL2(s))
        }
        const cur = loadState(sid) || s
        // 锁 L2（进入 review）→ **同一 turn 的下一步**注入审核提示（steer=next-step：不跨轮、不过期）；
        // 完整规格单仍在锁定回执呈现；键注册防 splice 兜底重复
        try {
          exec?.agent?.steer?.({
            id: 'graded-follow-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
            role: 'user',
            content: [{ type: 'text', text: reviewPendingText() }],
            source: { kind: 'plugin', plugin: 'dsh-graded-mode' },
          })
          registerInjected(sid, 'review-pending')
        } catch { /* 引导失败不阻断（不注册键 → pre-step 兜底补） */ }
        // 所有门已关闭 → 进入审核（文本通道：用户回复『确认』/『修改』,pre-step 扫描翻转）
        // 3.1 修订：**锁定回执即完整规格评审单**（该时刻呈现全貌——北极星+需求+树）；确认请求由审核提示唯一发出
        return { ok: true, text: `清单已锁定（${treeCount(cur)}）。以下为完整规格评审单，请过目。\n════ 完整规格评审单 ════\n${specSheet(cur)}\n════════════════` }
      }
      throw new Error(`lock_stage: level 必须是 "L1" 或 "L2"，得到 ${JSON.stringify(level)}`)
    },
    presentCall: (args) => ({ card: 'generic', title: `锁定 (lock_stage ${args?.level || ''})`, kind: 'other', rawInput: args }),
  }
}

/** 计算打卡后的下一条引导（与 pre-step 注入同逻辑；键同步防重复注入）。 */
function nextGuideText(state) {
  const mode = state.mode || 'correct'
  const unmarked = (state.plan?.groups || []).filter((g) => groupDone(g) && !g.locked)
  if (unmarked.length > 0) return { key: 'check:' + unmarked[0].title, text: groupCheck(unmarked[0], mode) }
  if ((state.plan?.groups || []).length > 0) {
    const focus = currentFocus(state.plan)
    if (focus) {
      const idx = (focus.group.items || []).indexOf(focus.item)
      const groupIdx = (state.plan?.groups || []).indexOf(focus.group)
      const prevMarked = (state.plan?.groups || []).slice(0, groupIdx).some((g) => g.locked)
      const isFirst = idx === 0
      const isLast = (focus.group.items || []).slice(idx + 1).every((it) => it.status === 'completed')
      let prev = null
      for (let i = idx - 1; i >= 0; i--) {
        if (focus.group.items[i].status === 'completed') { prev = focus.group.items[i].title; break }
      }
      const text = isFirst && prevMarked
        ? focusL2GroupOpen(focus.group.title, focus.item, mode, state.star?.purpose)
        : isLast
          ? focusL2Last(focus.group.title, focus.item, prev, mode, state.star?.purpose)
          : focusL2(focus.group.title, focus.item, prev, mode, state.star?.purpose)
      return { key: 'focus:' + focus.group.title + ':' + focus.item.title + ':' + focus.item.status, text }
    }
  }
  if (allDone(state.plan)) return { key: 'final', text: finalCheck(mode) }
  return null
}

/** mark_task：开发期标定（小类/大类状态）。标定后预注入下一步引导（第一时间,防自推）。 */
export function markTaskDefinition(deps) {
  return {
    name: 'mark_task',
    description: '【分级·标定】开发期逐个标定完成状态：level=L2 标小类（title 精确匹配,复制当前小类标题）；level=L1 标大类（仅当组内小类全 completed 才接受 completed）。完成一个就标一个,不要收尾一把梭。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['level', 'title', 'status'],
      properties: {
        level: { type: 'string', enum: ['L1', 'L2'], description: '标定层级：L2 小类 / L1 大类' },
        title: { type: 'string', description: '要标定的类名（精确匹配计划树里的一行）' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], description: 'pending | in_progress | completed' },
      },
    },
    output: outputSpec,
    async execute(args, exec) {
      const { level, title, status } = args || {}
      const sid = exec?.agent?.session?.id
      const s = loadState(sid) || initMode() // 磁盘权威（代际免疫）
      if (!sid || !s || (s.stage !== 'develop' && s.stage !== 'final')) {
        throw new Error('mark_task 仅在审核通过后的开发阶段可用')
      }
      // 3.1 redteam 门：verify=redteam 未裁决通过不得打卡（再审批铁律落地；轮次=已裁决次数）
      if (level === 'L2') {
        const it = (s.plan.groups || []).flatMap((g) => g.items || []).find((x) => x.title === title)
        if (it && it.verify === 'redteam' && !(it.redteam && it.redteam.passed)) {
          throw new Error(`小类「${title}」verify=redteam：尚未裁决通过（轮次=${it.redteam?.rounds || 0}）——先调 redteam_verdict(level="L2", title="${title}", verdict=...) 出裁决；打回则修复后再裁决（再审批）。`)
        }
      }
      if (level === 'L1') {
        const g = (s.plan.groups || []).find((x) => x.title === title)
        if (g && g.verify === 'redteam' && !(g.redteam && g.redteam.passed)) {
          throw new Error(`大类「${title}」组收官 verify=redteam：尚未裁决通过（轮次=${g.redteam?.rounds || 0}）——先调 redteam_verdict(level="L1", title="${title}", verdict=...) 出裁决。`)
        }
      }
      const res = onMark(s, level, title, status)
      if (!res.ok) throw new Error(res.error)
      saveState(sid, res.state)
      const cur = loadState(sid) || res.state
      // 打卡 → 下一条引导**第一时间**进上下文（随工具结果 defer,模型续轮第一眼就是引导——
      // 杜绝"自推 Next/先写后引导/空块"；键同步写入 injected,pre-step 不再重复注入）
      // L1 组标定同样 defer（入口引导）："收官(上一轮)→标定(本轮)→入口(本轮)"时序成立；
      // 同轮 L2+L1 双 mark 的齐发由门禁语系约束（"打卡后立即停下,不得同轮再标"）
      try {
        const guide = nextGuideText(cur)
        // 抢跑 guard：L1 组标定若"组收官键未注入过"（=模型没看过【大类收官】就标定,Code 批跑常见）
        // → 不喂入口引导；下一轮 pre-step 会先补收官再给入口——杜绝"收官/入口同批乱序"
        let effectiveGuide = guide
        if (level === 'L1' && guide) {
          const stC = loadState(sid) || cur
          const injectedC = stC.injected || new Set()
          if (!injectedC.has('check:' + title)) effectiveGuide = null
        }
        const text = effectiveGuide ? effectiveGuide.text : ''
        // 键注册移入下方 followup 成功之后（先注后键：失败→不注册→pre-step splice 兜底）
        // 防爆：同一小类最多自动续轮 2 次——打卡续轮若陷入死循环（模型反复打卡同项）
        // 会无限放大上下文（实测一个 turn 跑到 200+ 步、冲爆 1M 上限）,超限即停、控制权还给用户；
        // 无引导文本（L1 抢跑 guard 命中）时不发 followup——空 user 消息=无引导空地,不如不发
        const deferKey = sid + '|' + level + '|' + title
        const deferCount = (deferCounts.get(deferKey) || 0) + 1
        deferCounts.set(deferKey, deferCount)
        const msg = deferCount > 2
          ? `【自动续轮已暂停】「${title}」已连续打卡多次——暂停自动续轮，请停在这里等用户指令。`
          : (text || null)
        // 续轮驱动（v3.2 修正）：**steer=next-step**——同轮下一步即消费，不留 next-turn 堆积；
        // 且**同 turn 多条引导合并**（60ms 窗口只发最新一条——连续打卡不会把引导叠进队列）
        // 双注防治：**投递成功后**才注册幂等键（先注后键）——pre-step splice 通道见键跳过；
        // 失败则不注册 → pre-step 兜底 splice,引导不丢
        try {
          if (msg) {
            const pendingKey = sid + '|guide'
            pendingGuide.set(pendingKey, { msg, key: effectiveGuide?.key, agent: exec?.agent })
            if (!guideTimers.has(pendingKey)) {
              guideTimers.set(pendingKey, setTimeout(() => {
                guideTimers.delete(pendingKey)
                const p = pendingGuide.get(pendingKey)
                pendingGuide.delete(pendingKey)
                if (!p || !p.msg) return
                try {
                  p.agent?.steer?.({
                    id: 'graded-guide-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
                    role: 'user',
                    content: [{ type: 'text', text: p.msg }],
                    source: { kind: 'plugin', plugin: 'dsh-graded-mode' },
                  })
                  if (p.key) registerInjected(sid, p.key)
                } catch { /* 投递失败不阻断（键未注册 → pre-step 兜底补） */ }
              }, 60))
            }
          }
        } catch { /* 续轮失败不阻断（键未注册 → pre-step 兜底补） */ }
      } catch { /* 引导失败不阻断 */ }
      // 回执=当下状态（只显示当前组+刚标定项——后续任务不由树提前暴露,
      // 避免模型"看到后面任务"而分心；下一个任务由锚句/焦点注入引导）
      const brief = (() => {
        if (level === 'L1') return `#L1 ${title} 🔒 ✅`
        for (const g of cur.plan.groups) {
          for (const it of g.items) {
            if (it.title === title) {
              const done = it.status === 'completed' ? ' ✅' : ''
              return `#L1 ${g.title}\n  #L2 ${it.title}${done}`
            }
          }
        }
        return treeText(cur.plan)
      })()
      return { ok: true, text: brief }
    },
    presentCall: (args) => ({ card: 'generic', title: `标定 (mark_task ${args?.level || ''})`, kind: 'other', rawInput: args }),
  }
}

/** 树规模简述。 */
function treeCount(state) {
  const groups = state.plan?.groups || []
  const items = groups.reduce((n, g) => n + (g.items || []).length, 0)
  return `${groups.length} 大类 / ${items} 小类`
}
