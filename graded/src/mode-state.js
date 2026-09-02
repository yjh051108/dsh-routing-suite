/**
 * mode-state — 分级模式 v4 状态机（工具驱动,顺序强制,零字符串解析）。
 *
 * v4 心智模型（用户拍板）：
 *   - 顺序强制：大类编辑 → 大类锁定 → 小类编辑 → 小类锁定 → 审核。
 *   - 阶段推进 = 工具调用事件（lock_stage 成功即切阶段），不做任何内容识别。
 *   - 锁了就是锁了：已锁层 edit 被拒（工具层校验）；解锁唯一入口 = 审核拒绝（全解锁回 L1 编辑）。
 *   - 数据面独立：清单只存在于结构化 tree 对象（graded/plan 事件快照），不写官方 todo_write。
 *
 * 本模块只做状态迁移 + 树规范化（纯函数，可单测）。
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

/** 默认 DSH_HOME（无环境变量时=用户主目录/.dsh——运行时计算，不硬编码任何具体用户名/盘符）。 */
const DEFAULT_DSH_HOME = () => join(homedir(), '.dsh')

/** 磁盘权威状态 IO（与 fiber 生命周期解耦：工具 execute 与钩子共用同一单源，代际免疫）。 */
export function stateDirFor() {
  return join(process.env.DSH_HOME || DEFAULT_DSH_HOME(), 'graded-state')
}
export function stateFileFor(sid) {
  return join(stateDirFor(), String(sid || '').replace(/[^a-zA-Z0-9-]/g, '_') + '.json')
}
export function saveState(sid, s) {
  try {
    mkdirSync(stateDirFor(), { recursive: true })
    writeFileSync(stateFileFor(sid), JSON.stringify(serializeState(s)), 'utf-8')
    return true
  } catch (e) {
    console.warn('[graded] saveState failed:', sid, e?.message || e)
    return false
  }
}
export function loadState(sid) {
  try {
    const f = stateFileFor(sid)
    if (!existsSync(f)) return null
    const s = deserializeState(JSON.parse(readFileSync(f, 'utf-8')))
    return s.stage === 'off' ? null : s
  } catch {
    return null
  }
}

/** 序列化（热重载/进程重启恢复用：injected 转数组）。 */
export function serializeState(s) {
  return {
    stage: s.stage,
    task: s.task,
    mode: s.mode,
    star: s.star,
    l1Locked: s.l1Locked,
    l2Locked: s.l2Locked,
    plan: s.plan,
    injected: [...(s.injected || [])],
  }
}

/** 反序列化（校验合法 stage,非法回 initMode）。 */
export function deserializeState(obj) {
  const stages = ['off', 'brainstorm', 'l1-edit', 'l2-edit', 'review', 'develop', 'final']
  if (!obj || typeof obj !== 'object' || !stages.includes(obj.stage)) return initMode()
  return {
    ...initMode(),
    stage: obj.stage,
    task: typeof obj.task === 'string' ? obj.task : null,
    mode: ['correct', 'experience', 'research'].includes(obj.mode) ? obj.mode : 'correct',
    star: normalizeStar(obj.star),
    l1Locked: obj.l1Locked === true,
    l2Locked: obj.l2Locked === true,
    plan: { groups: (Array.isArray(obj.plan?.groups) ? obj.plan.groups : []).map(normalizeGroup) },
    injected: new Set(Array.isArray(obj.injected) ? obj.injected : []),
  }
}

/** 执行形态枚举：未声明 = ''（必填严格——门控抓住"未声明"，不悄悄给默认）。 */
const VERIFY_GROUP = ['self', 'subagent', 'redteam', 'user']
const DO_ITEM = ['self', 'subagent', 'workflow', 'daemon', 'mixed']
const VERIFY_ITEM = ['self', 'subagent', 'redteam', 'dual', 'workflow']
function normalizeVerify(v) { return VERIFY_GROUP.includes(v) ? v : (VERIFY_ITEM.includes(v) ? v : '') }
function normalizeDo(v) { return DO_ITEM.includes(v) ? v : '' }

/** 组/小类结构规范化（deserialize 与编辑入口共用；缺省容错,防未来回归）。 */
export function normalizeGroup(g) {
  const strs = (a) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean) : [])
  return {
    title: String(g?.title || '').trim(),
    spec: typeof g?.spec === 'string' ? g.spec : '',
    accept: strs(g?.accept),
    verify: VERIFY_GROUP.includes(g?.verify) ? g.verify : 'self', // 组收官验证方：缺省 self（保守）
    locked: g?.locked === true,
    items: Array.isArray(g?.items) ? g.items.map(normalizeItem) : [],
    redteam: g?.redteam || undefined,
  }
}
export function normalizeItem(it) {
  const strs = (a) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean) : [])
  const statusOk = it?.status === 'completed' || it?.status === 'in_progress'
  return {
    title: String(it?.title || '').trim(),
    concepts: strs(it?.concepts),
    spec: typeof it?.spec === 'string' ? it.spec : '',
    accept: strs(it?.accept),
    mode: ['correct', 'experience', 'research'].includes(it?.mode) ? it.mode : '', // 缺省''=继承会话模式
    do: normalizeDo(it?.do),
    verify: normalizeVerify(it?.verify),
    status: statusOk ? it.status : 'pending',
    redteam: it?.redteam || undefined,
    doHistory: it?.doHistory || undefined,
  }
}

/** star（头脑风暴定稿）规范化：任何形态输入 → 结构完整四字段。 */
export function normalizeStar(star) {
  const strs = (a) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean) : [])
  return {
    purpose: typeof star?.purpose === 'string' ? star.purpose.trim() : '',
    requirements: strs(star?.requirements),
    nonGoals: strs(star?.nonGoals),
    assumptions: strs(star?.assumptions),
    aligned: star?.aligned === true,
  }
}

/**
 * 空状态。stage: off|'brainstorm'|'l1-edit'|'l2-edit'|'review'|'develop'|'final'；
 * mode: correct|experience|research；star: 脑暴定稿（未对齐时 aligned=false）。
 */
export function initMode() {
  return {
    stage: 'off',
    task: null,
    mode: 'correct',
    star: normalizeStar(null),
    l1Locked: false,
    l2Locked: false,
    plan: { groups: [] },
    injected: new Set(),
  }
}

/** /graded <task> 一次性触发；仅 off 可触发（防重复）。触发后先进脑暴对齐（3.1）。 */
export function trigger(prev, task) {
  return {
    ...(prev || initMode()),
    stage: 'brainstorm',
    task: task || null,
    star: normalizeStar(null), // 新任务：星象清空重对齐
    l1Locked: false,
    l2Locked: false,
    plan: { groups: [] },
    injected: new Set(),
  }
}

export function deactivate() {
  return initMode()
}

/** 脑暴定稿（commit_star）→ star.aligned=true；仅 budget 从 brainstorm（或 off 自激活）进入 l1-edit——
 *  修订（l1/l2-edit/review 期）保留当前阶段，不重置（修复：修订曾无回退 l1-edit 破坏进行中的编辑）。 */
export function onCommitStar(prev, star) {
  const fromStart = !prev || prev.stage === 'brainstorm' || prev.stage === 'off'
  return {
    ...(prev || initMode()),
    stage: fromStart ? 'l1-edit' : (prev?.stage || 'l1-edit'),
    star: { ...normalizeStar(star), aligned: true }, // 定稿 = 对齐完成（门控据此放行）
  }
}

/** 编辑 L1（大类列表：标题+组任务 spec+组验收标准 accept+组收官 verify）→ 树只有组头行。 */
export function onEditL1(prev, items) {
  const groups = (items || []).map((t) => ({
    ...normalizeGroup(t), // spec/accept/verify 规范化
    locked: false,
    items: [],
  }))
  return {
    ...(prev || initMode()),
    plan: { groups },
  }
}

/** 编辑 L2（完整树 groups）→ 深度换入（组名与已锁定大类一致性由调用方校验；组规格字段保留）。 */
export function onEditL2(prev, groups) {
  const normalized = (groups || []).map((g) => {
    const prevG = (prev?.plan?.groups || []).find((x) => x.title === String(g?.title || '').trim())
    return {
      ...normalizeGroup({ ...g, spec: g?.spec ?? prevG?.spec, accept: g?.accept ?? prevG?.accept, verify: g?.verify ?? prevG?.verify }),
      items: (g?.items || []).map(normalizeItem),
    }
  })
  return {
    ...(prev || initMode()),
    plan: { groups: normalized },
  }
}

/** 锁定 L1 → 进入 L2 编辑。 */
export function onLockL1(prev) {
  return {
    ...(prev || initMode()),
    l1Locked: true,
    stage: 'l2-edit',
  }
}

/** 锁定 L2 → 所有门关闭 → 审核。 */
export function onLockL2(prev) {
  return {
    ...(prev || initMode()),
    l2Locked: true,
    stage: 'review',
  }
}

/** 审核通过 → 逐小类开发。 */
export function onReviewApproved(prev) {
  return {
    ...(prev || initMode()),
    stage: 'develop',
  }
}

/** 拒绝/重走时清理开发期注入键（防 focus/check/final/kickoff/reject-ack 残留导致重新确认后不再注入）。 */
export function stripDevelopMarkers(injected) {
  const out = new Set()
  for (const k of injected || []) {
    if (k.startsWith('focus:') || k.startsWith('check:') || k === 'final' ||
      k === 'approved-kickoff' || k === 'review-pending' || k === 'reject-ack') continue
    out.add(k)
  }
  return out
}

/** 审核拒绝/取消 → 全解锁回到 L1 编辑（保留上一次树,按意见改）。 */
export function onReviewRejected(prev) {
  return {
    ...(prev || initMode()),
    l1Locked: false,
    l2Locked: false,
    stage: 'l1-edit',
    injected: stripDevelopMarkers(prev?.injected),
  }
}

/**
 * 标定一个节点状态（develop 阶段用）。
 * level='L2'：title=小类名（须存在于某组）；level='L1'：title=大类名（完整组标定,
 * 仅当组内小类全 completed 时接受 completed——防乱标；in_progress 仅用于组进行中提示）。
 * 返回 { ok, error? } 或失败原因字符串,成功则返回新 state。
 */
export function onMark(prev, level, title, status) {
  const groups = JSON.parse(JSON.stringify(prev?.plan?.groups || []))
  const finalize = (st) => (allDone(st.plan) && st.stage !== 'final' ? { ...st, stage: 'final' } : st)
  if (level === 'L2') {
    for (const g of groups) {
      const it = (g.items || []).find((x) => x.title === title)
      if (it) {
        if (status === 'in_progress') {
          // 同组其它 in_progress 复位（单线聚焦,不一把梭）
          g.items.forEach((x) => { if (x.title !== title && x.status === 'in_progress') x.status = 'pending' })
        }
        it.status = status
        return { ok: true, state: finalize({ ...(prev || initMode()), plan: { groups } }) }
      }
    }
    return { ok: false, error: `小类「${title}」不在计划树里（请复制当前小类标题）` }
  }
  if (level === 'L1') {
    const g = groups.find((x) => x.title === title)
    if (!g) return { ok: false, error: `大类「${title}」不在计划树里` }
    if (status === 'completed') {
      const pending = (g.items || []).some((x) => x.status !== 'completed')
      if (pending) return { ok: false, error: `大类「${title}」下还有未完成小类（完成下的小类后才能标定大类）` }
      g.locked = true // 大类标定：组级完成标记（非"全部小类完成就算完成"，须 L1 标定）
    } else if (status === 'pending') {
      g.locked = false
    }
    return { ok: true, state: finalize({ ...(prev || initMode()), plan: { groups } }) }
  }
  return { ok: false, error: `无效 level ${JSON.stringify(level)}` }
}

/** 红队裁决（redteam_verdict）：仅 verify=redteam 的项可用；轮次累计+log 落盘；
 *  reject → passed=false（再审批义务：修复后必须再次裁决）。level='L1'=组级 'L2'=小类级。 */
export function onRedteamVerdict(prev, level, title, verdict, issues) {
  const groups = JSON.parse(JSON.stringify(prev?.plan?.groups || []))
  const strs = (a) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean) : [])
  const issuesS = strs(issues)
  const applyRt = (rt) => ({
    rounds: (rt?.rounds || 0) + 1,
    passed: verdict === 'pass',
    log: [...(rt?.log || []), { verdict, issues: issuesS, at: Date.now() }],
  })
  if (level === 'L2') {
    for (const g of groups) {
      const it = (g.items || []).find((x) => x.title === title)
      if (it) {
        if (it.verify !== 'redteam') return { ok: false, error: `小类「${title}」未声明红队验证（verify=redteam）——裁决不可用。` }
        it.redteam = applyRt(it.redteam)
        return { ok: true, state: { ...(prev || initMode()), plan: { groups } } }
      }
    }
    return { ok: false, error: `小类「${title}」不在计划树里` }
  }
  if (level === 'L1') {
    const g = groups.find((x) => x.title === title)
    if (!g) return { ok: false, error: `大类「${title}」不在计划树里` }
    if (g.verify !== 'redteam') return { ok: false, error: `大类「${title}」组收官未声明红队验证——裁决不可用。` }
    g.redteam = applyRt(g.redteam)
    return { ok: true, state: { ...(prev || initMode()), plan: { groups } } }
  }
  return { ok: false, error: `无效 level ${JSON.stringify(level)}` }
}

/** 形态修订（revise_do，3.1）：开发期 do 可改（登记轨迹）；verify 只读（本函数不触碰 verify）。 */
export function onReviseDo(prev, title, doNext) {
  const groups = JSON.parse(JSON.stringify(prev?.plan?.groups || []))
  for (const g of groups) {
    const it = (g.items || []).find((x) => x.title === title)
    if (it) {
      if (!DO_ITEM.includes(doNext)) return { ok: false, error: `执行形态（do）无效：self|subagent|workflow|daemon|mixed` }
      const from = it.do || 'self'
      it.doHistory = [...(it.doHistory || []), { at: Date.now(), from, to: doNext }]
      it.do = doNext
      return { ok: true, state: { ...(prev || initMode()), plan: { groups } } }
    }
  }
  return { ok: false, error: `小类「${title}」不在计划树里` }
}

/*
 * ---- 树规范化/一致性（纯函数,供工具层校验与渲染） ----
 */

/** L1 大类列表合法性：非空 + 无重复 + 规格化门控（spec/accept 必填）。 */
export function assertL1Items(items) {
  const clean = (items || []).map((it) => ({
    title: String(it?.title || '').trim(),
    spec: String(it?.spec || '').trim(),
    accept: (Array.isArray(it?.accept) ? it.accept : []).map((x) => String(x).trim()).filter(Boolean),
  }))
  const titles = clean.map((c) => c.title).filter(Boolean)
  if (titles.length === 0) return { ok: false, error: '大类列表为空：至少一个 #L1 大类' }
  const dup = titles.find((t) => titles.indexOf(t) !== titles.lastIndexOf(t))
  if (dup) return { ok: false, error: `大类名重复：${dup}` }
  const badSpec = clean.find((c) => c.title && !c.spec)
  if (badSpec) return { ok: false, error: `大类「${badSpec.title}」缺任务描述（spec）——规格化门控：写清楚这组交付什么。` }
  const badAccept = clean.find((c) => c.title && c.accept.length === 0)
  if (badAccept) return { ok: false, error: `大类「${badAccept.title}」缺验收标准（accept）——规格化门控：至少一条完成条件。` }
  return { ok: true }
}

/** L2 全树校验：组名与已锁定大类一致（不改名/不增删）+ 组内小类非空唯一 + 3.1 小类规格化门控。 */
export function assertL2Groups(groups, lockedTitles) {
  if (!Array.isArray(groups) || groups.length === 0) return { ok: false, error: '小类树为空：至少一组小类' }
  const gTitles = groups.map((g) => String(g?.title || '').trim())
  if (gTitles.some((t) => !t)) return { ok: false, error: '存在空的大类名' }
  const gDup = gTitles.find((t) => gTitles.indexOf(t) !== gTitles.lastIndexOf(t))
  if (gDup) return { ok: false, error: `大类名重复：${gDup}` }
  if (lockedTitles && lockedTitles.size > 0) {
    const missing = [...lockedTitles].filter((t) => !gTitles.includes(t))
    if (missing.length > 0) return { ok: false, error: `小类编辑必须保留已锁定的大类：缺少 ${missing.join('、')}` }
    const extra = gTitles.filter((t) => !lockedTitles.has(t))
    if (extra.length > 0) return { ok: false, error: `小类编辑不能新增/改名大类：${extra.join('、')}（大类已锁定）` }
  }
  for (const g of groups) {
    const its = (g.items || []).map((it) => String(it?.title || '').trim()).filter(Boolean)
    if (its.length === 0) return { ok: false, error: `大类「${g.title}」下没有小类` }
    const iDup = its.find((t) => its.indexOf(t) !== its.lastIndexOf(t))
    if (iDup) return { ok: false, error: `大类「${g.title}」下小类名重复：${iDup}` }
    // 3.1 规格化门控：每小类 spec/accept/do/verify 必填（必填严格——写清楚再锁定）
    for (const it of g.items || []) {
      const name = String(it?.title || '').trim()
      if (!name) continue
      if (!String(it?.spec || '').trim()) return { ok: false, error: `小类「${name}」缺任务说明（spec）` }
      const acc = (Array.isArray(it?.accept) ? it.accept : []).map((x) => String(x).trim()).filter(Boolean)
      if (acc.length === 0) return { ok: false, error: `小类「${name}」缺验收标准（accept）——至少一条完成条件` }
      if (!['self', 'subagent', 'workflow', 'daemon', 'mixed'].includes(it?.do)) return { ok: false, error: `小类「${name}」执行形态（do）无效：self|subagent|workflow|daemon|mixed` }
      if (!['self', 'subagent', 'redteam', 'dual', 'workflow'].includes(it?.verify)) return { ok: false, error: `小类「${name}」验证形态（verify）无效：self|subagent|redteam|dual|workflow` }
      if (it?.mode && !['correct', 'experience', 'research'].includes(it.mode)) return { ok: false, error: `小类「${name}」模式（mode）无效：correct|experience|research（可缺省=继承会话模式）` }
    }
  }
  return { ok: true }
}

/** 当前应聚焦的小类（develop 阶段用）：第一个未完成的小类。 */
export function currentFocus(plan) {
  for (const g of plan?.groups || []) {
    for (const it of g.items || []) {
      if (it.status !== 'completed') return { group: g, item: it }
    }
  }
  return null
}

/** 大类是否全部完成（名下小类全 completed）。 */
export function groupDone(group) {
  return (group.items || []).length > 0 && group.items.every((it) => it.status === 'completed')
}

/** 全部小类完成？ */
export function allDone(plan) {
  const groups = plan?.groups || []
  return groups.length > 0 && groups.every(groupDone)
}

/** 结构化树 → 展示文本（工具结果 / ask detail 的 markdown 树；3.1：行内规格摘要全量）。不做任何解析！ */
export function treeText(plan) {
  const s1 = (s, n) => String(s || '').split('\n')[0].slice(0, n)
  const acc = (a, n) => (a || []).map((x) => (x.length > n ? x.slice(0, n) + '…' : x)).join('；')
  const lines = []
  for (const g of plan?.groups || []) {
    const done = groupDone(g)
    const accS = acc(g.accept, 28)
    lines.push(`#L1 ${g.title}${g.locked ? ' 🔒' : ''}${done ? ' ✅' : ''}｜ ${s1(g.spec, 40)}｜ 验收:${accS}｜ 收官验:${g.verify || 'self'}`)
    for (const it of g.items || []) {
      const mark = it.status === 'completed' ? ' ✅' : it.status === 'in_progress' ? ' ▶' : ''
      const accI = acc(it.accept, 24)
      const specI = s1(it.spec, 32)
      const cs = (it.concepts || []).join(', ')
      const itMode = it.mode ? `｜ 模式:${it.mode === 'experience' ? '验' : it.mode === 'research' ? '研' : '正'}` : ''
      lines.push(`  #L2 ${it.title}${specI ? `｜ ${specI}` : ''}${cs ? `｜ 概念: ${cs}` : ''}${itMode}｜ 验收:${accI}｜ do=${it.do || '?'} verify=${it.verify || '?'}${mark}`)
    }
  }
  return lines.join('\n')
}
