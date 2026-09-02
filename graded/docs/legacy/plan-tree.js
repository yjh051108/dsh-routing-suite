/**
 * plan-tree — 两级 todo 编码协议解析器（content 前缀）。
 *
 * 协议（写入 todo_write 的 content）：
 *   #L1 店壳                          → 大类行（树节点头）
 *   #L2 店壳 | 玻璃橱窗 | 概念≤3:玻璃,框,雨痕 → 小类行（挂在"店壳"下）
 *
 * 解析成树：{ title, items:[{title, conceptCount, concepts[]}], state }
 * 未知格式行 = 普通行（不干预）。
 */

const L1_RE = /^(?:#L1\s+|L1-\d+\s*)(.+?)\s*$/  // #L1 标题行 或 L1-N 编号行
const L2_RE = /^#L2\s+(.+?)\s*\|\s*(.+?)(?:\s*\|\s*概念[≤<>]*\s*(\d*)\s*:\s*(.*))?$/
// 单行合并：#L1 店壳 | #L2-1 玻璃 (概念...) 或 #L1 店壳 | #L2-1 玻璃 (玻璃, 窗框)
// 单行合并解析用确定性拆分（正则分组对可选括号易失败）
function parseSingleLine(text) {
  const m = text.match(/^#L1\s+(.+?)\s*\|\s*#L2-\d+\s+(.+?)(?:\s*\(([^)]*)\))?(?:\s*—.*)?$/)
  if (!m) return null
  const parentTitle = m[1].trim()
  const title = m[2].trim()
  const concepts = (m[3] || '').split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
  if (!parentTitle || !title) return null
  return { parentTitle, title, concepts }
}

export function parsePlanTree(todos) {
  const roots = []
  const loose = [] // 未标记行
  let current = null
  for (const todo of todos || []) {
    const text = String(todo?.content || '').trim()
    const sm = parseSingleLine(text)
    if (sm) {
      // 单行合并（#L1 店壳 | #L2-1 玻璃 (...)）优先——它形似 L1 但含子项
      const { parentTitle, title, concepts } = sm
      const item = { title, parentTitle, status: todo?.status || 'pending', conceptCount: concepts.length, concepts, raw: text }
      const parent = roots.find((r) => r.title === parentTitle)
      if (parent) parent.items.push(item)
      else {
        const p = { title: parentTitle, items: [item], status: todo?.status || 'pending' }
        roots.push(p)
      }
      continue
    }
    const m1 = text.match(L1_RE)
    const m2 = text.match(L2_RE)
    if (m1) {
      current = { title: m1[1].trim(), items: [], status: todo?.status || 'pending' }
      roots.push(current)
    } else if (m2) {
      const parentTitle = m2[1].trim()
      const title = m2[2].trim()
      // 概念数：显式数字 > 拆分计数 > 未标
      const explicit = m2[3] ? Number(m2[3]) : null
      const concepts = (m2[4] || '').trim() ? m2[4].split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : []
      const conceptCount = explicit ?? concepts.length
      const item = { title, parentTitle, status: todo?.status || 'pending', conceptCount, concepts, raw: text }
      const parent = current && (current.title === parentTitle) ? current : roots.find((r) => r.title === parentTitle)
      if (parent) parent.items.push(item)
      else loose.push(item) // parent 未定义（异常）也挂 loose
    } else {
      const sm = parseSingleLine(text)
      if (sm) {
        // 单行合并格式：#L1 店壳 | #L2-1 玻璃 (玻璃, 窗框)
        const { parentTitle, title, concepts } = sm
        const item = { title, parentTitle, status: todo?.status || 'pending', conceptCount: concepts.length, concepts, raw: text }
        const parent = roots.find((r) => r.title === parentTitle)
        if (!parent) {
          const p = { title: parentTitle, items: [], status: todo?.status || 'pending' }
          roots.push(p)
          p.items.push(item)
        } else {
          parent.items.push(item)
        }
      } else {
        loose.push({ title: text, status: todo?.status || 'pending', raw: text, plain: true })
      }
    }
  }
  return { roots, loose }
}

/** 判断一个 todo 行是否为 L1 标题。 */
export function isL1(content) {
  return L1_RE.test(String(content || '').trim())
}

/** 判断一个 todo 行是否为 L2 小类。 */
export function isL2(content) {
  return L2_RE.test(String(content || '').trim())
}

/** 新会话是否已有正式编码清单（有 L1 或 L2 行即视为已启用协议）。 */
export function isGradedList(plan) {
  return plan?.roots?.length > 0 || (plan?.loose?.length > 0 && plan.loose.some((x) => x.raw?.startsWith('#L')))
}

/** 大类是否全部小类完成。 */
export function groupDone(root) {
  if (root.items.length === 0) return false
  return root.items.every((i) => i.status === 'completed')
}

/** 当前应专注的 L2（第一个未完成的小类），带其父 L1。 */
export function currentFocus(plan) {
  for (const root of plan.roots) {
    for (const item of root.items) {
      if (item.status !== 'completed' && item.status !== 'superseded') {
        return { group: root, item }
      }
    }
  }
  return null
}
