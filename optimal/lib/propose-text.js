/**
 * propose-text — v0.3 快环最小状态面（THEORY-v0.3 §2 Propose；BENCH §3 预登记目标）。
 *
 * 教育=违规事件原则：本模块**只做展示**——一切判定条款住在 optimal-engine 的拒绝文本里
 * （编译器报错即教学，不开机前讲课）。stateFace 是纯函数：同入参逐字节等，零时钟零随机。
 * 输入=mode-state.controlSurface(state)（慢环合同+演进量直读），输出 ≤ FACE_BUDGET 字节。
 */

export const FACE_BUDGET = 1333 // UTF-8 字节上限 = v0.2 注入基线 3.9KB/块（FIT-plant P 场实测）× 1/3

const cut = (s, n) => {
  const x = String(s || '')
  return x.length > n ? x.slice(0, n) + '…' : x
}
const SEV_MARK = { catastrophic: '⚡', major: '△', minor: '○' }

/** 四元驻留面：残差读数 / Q_N 摘要 / 已闭集 / cost-to-go 提议指令。全文深信息=盘档按需展开。 */
export function stateFace(surface) {
  const s = surface || {}
  const r = s.residual || {}
  const qn = s.cost || {}
  const lines = []
  lines.push(`【闭环·${s.stage || 'off'}】残差:组未落账=${(r.groupsOpen || []).length}·已闭动作=${r.closedCount || 0}·档=${r.lastBand || 'far'}·dip=${r.dipPending ? '未清' : '无'}`)
  const as = (qn.assertions || []).map((a) => `${SEV_MARK[a?.severity] || '?'}${cut(a?.text, 28)}(${a?.severity || '?'})`)
  if (as.length) lines.push(`Q_N×${as.length}: ${as.join(' / ')}——全文盘档可展开`)
  const gs = (s.groups || []).map((g) => `${cut(g?.title, 24)}${g?.settled ? '✓' : ''}`).join(' ')
  if (gs) lines.push(`组: ${gs}`)
  const cs = (s.closed || []).map((c) => String(c?.title || '')).filter(Boolean)
  if (cs.length) lines.push(`已闭: ${cs.slice(-6).map((t) => cut(t, 16)).join('、')}${cs.length > 6 ? ` 等${cs.length}项` : ''}`)
  lines.push('▸ 提议：取使 cost-to-go 最小（剩余 Q_N 距离降最多）的动作，给理由+差分契约（title+predict+channels）即可；不预排序列，轨迹不入合同。')
  return lines.join('\n')
}

/** 合同锁定态回执（weights 态最小面：待用户「确认」的慢环主权提示，无讲课件）。 */
export function weightsFace(surface) {
  const s = surface || {}
  const qn = s.cost || {}
  return [`【闭环·合同已锁待确认】Q_N×${(qn.assertions || []).length}（⚡${(qn.assertions || []).filter((a) => a?.severity === 'catastrophic').length}）·组×${(s.groups || []).length}·非目标×${(qn.nonGoals || []).length}`,
    '确认=开快环（每步实时定序）；「修改」=解锁重排。'].join('\n')
}
