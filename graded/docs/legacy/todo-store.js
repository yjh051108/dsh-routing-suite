/**
 * todo-store — 官方 todo 快照的纯函数层（零侵入：读写同一 todo/write 事件流）。
 *
 * 分级模式 v3 的四个工具与官方 dsh-tool-todo 同源：
 *   - 读：从 session.events 取最后一条 todo/write 快照（last-write-wins）
 *   - 写：session.append('todo/write', { todos })（whole-list replacement）
 *   - 行协议：#L1 <大类> / #L2 <大类> | <小类> | 概念: a,b,c
 *
 * 本模块只做纯转换（可单测）：归一化/生成/匹配/更新，不含 agent/session 访问。
 */

export const STATUSES = ['pending', 'in_progress', 'completed']

/** 从事件流提取最后一条 todo 快照（官方 session.events；无则空数组）。 */
export function snapshotFromEvents(events) {
  try {
    let out = null
    for (const e of events || []) {
      if (e?.type !== 'todo/write') continue
      const d = e?.data
      const list = Array.isArray(d?.todos) ? d.todos : (Array.isArray(d) ? d : null)
      if (list) out = list
    }
    return out || []
  } catch {
    return []
  }
}

/** 计数（官方 todo_write 输出同名结构）。 */
export function counts(todos) {
  const c = (s) => todos.filter((t) => t.status === s).length
  return { pending: c('pending'), inProgress: c('in_progress'), completed: c('completed') }
}

/** 归一化大类标题：接受 '#L1 店壳' / 'L1-1 店壳' / 'L1:1 店壳' / 裸标题，一律输出裸标题。 */
export function normalizeTitle(raw, kind) {
  const t = String(raw || '').trim()
  if (kind === 'l1') return t.replace(/^#?L1\s*[-:]?\d*\s*/i, '').trim()
  if (kind === 'l2') return t.replace(/^#?L2\s*[-:]?\d*\s*/i, '').trim()
  return t
}

/** 大类行。 */
export function l1Line(title, status = 'pending') {
  const t = normalizeTitle(title, 'l1')
  if (!t) throw new Error('plan-l1: 大类标题不能为空')
  return { content: `#L1 ${t}`, status }
}

/** 小类行（支持单行合并编码；概念超 3 只提示不拒绝——宽容策略）。 */
export function l2Line(parentTitle, title, concepts = [], status = 'pending') {
  const p = normalizeTitle(parentTitle, 'l1')
  const t = normalizeTitle(title, 'l2')
  if (!p || !t) throw new Error('plan-l2: 大类/小类标题不能为空')
  const list = (concepts || []).map((c) => String(c).trim()).filter(Boolean)
  return { content: `#L2 ${p} | ${t} | 概念: ${list.join(',') || '—'}`, status, concepts: list }
}

/** 从全清单找唯一匹配行：match 命中 content 的「标题段」（大类=#L1 后整段；小类=#L2 后第二段）。
 *  返回 { index, line } 或 null；多命中抛错（要求唯一性，防误标）。 */
export function matchLine(todos, kind, match) {
  const m = String(match || '').trim()
  if (!m) throw new Error('match 不能为空')
  const hits = []
  todos.forEach((todo, index) => {
    const content = String(todo?.content || '').trim()
    if (kind === 'l1') {
      const mm = content.match(/^#L1\s+(.+?)\s*$/)
      if (mm && mm[1].trim() === m) hits.push({ index, line: todo })
    } else {
      const mm = content.match(/^#L2\s+(.+?)\s*\|\s*(.+?)(?:\s*\|\s*概念.*)?$/)
      if (mm && mm[2].trim() === m) hits.push({ index, line: todo })
    }
  })
  if (hits.length === 0) return null
  if (hits.length > 1) throw new Error(`mark-${kind}: "${m}" 匹配到 ${hits.length} 行，请用更精确标题`)
  return hits[0]
}

/** 更新指定行 status（whole-list replacement 语义；返回新列表）。 */
export function updateStatus(todos, index, status) {
  if (!STATUSES.includes(status)) throw new Error(`invalid status "${status}"`)
  const next = todos.map((t, i) => (i === index ? { ...t, status } : { ...t }))
  return next
}

/** plan-l1 动作：整份清单替换为 #L1 大类行。 */
export function applyPlanL1(items) {
  if (!Array.isArray(items)) throw new Error('plan-l1: items 必须是数组')
  return items.map((it) => l1Line(it?.title, it?.status || 'pending'))
}

/** plan-l2 动作：整份清单替换为 #L1+#L2 合并清单。返回 { todos, warnings }。 */
export function applyPlanL2(groups) {
  if (!Array.isArray(groups)) throw new Error('plan-l2: groups 必须是数组')
  const todos = []
  const warnings = []
  for (const g of groups) {
    const parentTitle = normalizeTitle(g?.title, 'l1')
    if (!parentTitle) throw new Error('plan-l2: 大类标题不能为空')
    todos.push(l1Line(parentTitle))
    const items = Array.isArray(g?.items) ? g.items : []
    for (const item of items) {
      const t = normalizeTitle(item?.title, 'l2')
      if (!t) continue
      const concepts = Array.isArray(item?.concepts) ? item.concepts.map((c) => String(c).trim()).filter(Boolean) : []
      if (concepts.length > 3) {
        warnings.push(`「${parentTitle} / ${t}」概念数 ${concepts.length} > 3（提示不拒绝：建议 ≤3 让每个小类可一图/一跑验证）`)
      }
      todos.push(l2Line(parentTitle, t, concepts))
    }
  }
  return { todos, warnings }
}
