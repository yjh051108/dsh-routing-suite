/**
 * audit-dispatch — v0.3 另头审（THEORY-v0.3 §2：fresh 子代理直读盘档，verdict≤1KB 回账）。
 *
 * 结构立场：自报回路独立化——审材由本模块从**盘档栈文件机械切片**（函数入参=文件原文，
 * 无模型书写通道）；审的回执必须携带**盘档原文子串引文**（parseVerdict 逐条 substring 校验，
 * 伪造/改写=拒收）——fresh 上下文「真冷眼」的唯一可证形态。手动 cost_audit 同形复用为修订通道。
 */
import { readFileSync } from 'node:fs'

export const BRIEF_BUDGET = 1536
export const RECEIPT_BUDGET = 1024

const cut = (s, n) => {
  const x = String(s || '')
  return x.length > n ? x.slice(0, n) + '…' : x
}

/** 审材切片：目标步全契约 + 链邻域两步（标题+band）+ Q_N 摘要。禁全栈。 */
export function auditBrief({ stackRaw, targetTitle, cost }) {
  const stack = JSON.parse(stackRaw)
  const steps = stack.steps || []
  const i = steps.findIndex((s) => s.title === targetTitle)
  if (i < 0) return { ok: false, error: `目标步「${targetTitle}」不在栈里——审材无从生成（禁止臆构造）` }
  const t = steps[i]
  const nb = [steps[i - 1], steps[i + 1]].filter(Boolean).map((s) => `#${s.n}「${cut(s.title, 20)}」${s.dv ? `${s.dv.before}→${s.dv.after}` : s.status}`)
  const lines = [
    `【另头审·审材】目标 #${t.n}「${cut(t.title, 28)}」status=${t.status}`,
    `契约: 预测 ${(t.predictions || []).map((p) => `${p.key}=${cut(p.value, 18)}←${cut(p.source, 24)}`).join(' | ')}`,
    `代价: ${(t.cost || []).map((c) => `${cut(c.failure, 20)}(${cut(c.weight, 14)})`).join(' | ')}`,
    `law×${(t.law || []).length} 通道×${(t.measure?.channels || []).length} vExpect=${t.vExpect || '?'} dv=${t.dv ? `${t.dv.before}→${t.dv.after}` : '?'} 吻合×${(t.agreed || []).length} 不吻合×${(t.discrepancies || []).length}`,
    nb.length ? `邻域: ${nb.join(' ⇄ ')}` : '邻域: 无（单步）',
    cost?.assertions?.length ? `Q_N: ${cost.assertions.map((a) => `${a.severity === 'catastrophic' ? '⚡' : a.severity === 'minor' ? '○' : '△'}${cut(a.text, 24)}`).join(' / ')}` : 'Q_N: （盘档无断言）',
    '审纪律：冷视角找茬=契约推导链（预测 source 是否真实依据/判定语义有无收缩/law 是否前置），不审产物对错。',
    '输出（仅一个 JSON，≤800B）: {"verdict":"pass|reject","issues":["reject 必填：证据清单定位"],"quotes":["盘档文件原文子串≥1条（逐字，伪造即拒）"]}',
  ]
  const brief = lines.join('\n')
  if (Buffer.byteLength(brief, 'utf8') > BRIEF_BUDGET) return { ok: false, error: `审材超预算 ${Buffer.byteLength(brief, 'utf8')}>${BRIEF_BUDGET}B——降切片参数重生成（契约摘要位数），禁全栈` }
  return { ok: true, brief, target: t }
}

/** 回执校验：形状 + 引文=盘档原文子串 + ≤1KB。任一不过=拒收并回缺陷清单。 */
export function parseVerdict({ stackRaw, verdictText }) {
  let v = null
  try {
    const a = String(verdictText || '').indexOf('{')
    const b = String(verdictText || '').lastIndexOf('}')
    if (a < 0 || b <= a) throw new Error('no-json')
    v = JSON.parse(String(verdictText).slice(a, b + 1))
  } catch {
    return { ok: false, error: '回执非单个 JSON（另头须按输出契约）——重派指引见 brief 末行' }
  }
  const errors = []
  if (!['pass', 'reject'].includes(v.verdict)) errors.push('verdict 须为 pass|reject')
  if (v.verdict === 'reject' && !(Array.isArray(v.issues) && v.issues.length > 0)) errors.push('reject 必附证据清单 issues（无清单=无据打回，拒收）')
  if (!(Array.isArray(v.quotes) && v.quotes.length >= 1)) errors.push('缺盘档直读引文 quotes≥1——accept 硬规：无原文引文=没读盘档，审无效')
  const raw = String(stackRaw)
  const bad = (Array.isArray(v.quotes) ? v.quotes : []).filter((q) => !raw.includes(String(q)))
  if (bad.length) errors.push(`引文非盘档原文（伪造/改写即拒）: ${bad.map((q) => cut(q, 16)).join('；')}`)
  const bytes = Buffer.byteLength(JSON.stringify(v), 'utf8')
  if (bytes > RECEIPT_BUDGET) errors.push(`回执 ${bytes}B 超 ${RECEIPT_BUDGET}B 上限——浓缩重出（另头省账变另头造账=拒）`)
  if (errors.length) return { ok: false, error: errors.join('；'), defects: errors }
  return { ok: true, verdict: { verdict: v.verdict, issues: (v.issues || []).map(String), quotes: v.quotes.map(String), at: Date.now() } }
}

/** 落账：写盘档 v3 closed[].audit（rounds 累计，与 v0.2 审史同槽位族）。 */
export function recordAuditVerdict(state, title, verdict) {
  const closed = (state.closed || []).map((c) => (c.title === title ? {
    ...c,
    audit: { rounds: (c.audit?.rounds || 0) + 1, last: verdict },
  } : c))
  if (!closed.some((c) => c.title === title)) return { ok: false, error: `落账失败：「${title}」不在已闭集` }
  return { ok: true, state: { ...state, closed } }
}

/** 从盘档目录直读栈原文（另头审的统一入口：路径由引擎拼，模型不指路）。 */
export function readStackRaw(dir, file) {
  return readFileSync(join(dir, file), 'utf8')
}
