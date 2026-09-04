/**
 * v04-grader — v0.4-alpha 探针：判分器（measure-spec）与棘轮单向阀。
 *
 * 原理（THEORY-v0.4 §3.1【修3/4】；Everitt et al. arXiv:1908.04734 因果分离）：
 * 判分器住在宿主侧目录（本插件唯一写通道=commitSpec，agent 工具面只有 propose 语义），
 * 生效判定=**结构单调性机判**：新增断言/加严权重/抬高阈值=自动生效；
 * 删除/放松=机拒；命令文本或 kind 变更=语义判断超出棘轮权限→人审队列。
 * Goodhart 的出路不是"切断写入"（那没法工作），是**单向阀**（收紧自由，放松越权）。
 *
 * 诚实限制（不装）：文件系统对 agent 无真隔离（宿主沙箱策略=后续件）；
 * 防篡改层=每次 commit 附 canonical sha + git 历史可 diff + 证伪时对照 freeze 快照复核。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'

export function graderDir() {
  return join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'graded-state', 'measures')
}
export const graderFileFor = (sid) =>
  join(graderDir(), String(sid || '').replace(/[^a-zA-Z0-9-]/g, '_') + '.measures.json')

const KINDS = ['bool', 'ratio', 'count']
const normM = (m) => ({
  id: String(m?.id || '').trim(),
  w: typeof m?.w === 'number' && m.w >= 0 ? m.w : 0,
  cmd: String(m?.cmd || '').trim(),
  kind: KINDS.includes(m?.kind) ? m.kind : 'bool',
  target: typeof m?.target === 'number' ? m.target : null,
})

export function normalizeSpec(spec) {
  const list = (Array.isArray(spec?.measures) ? spec.measures : []).map(normM).filter((m) => m.id)
  const seen = new Set()
  const measures = list.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
  return { v: 4, measures }
}

/** canonical 序列化（key 固定序，sha 稳定） */
export function canonicalJson(spec) {
  const s = normalizeSpec(spec)
  return JSON.stringify({ v: 4, measures: [...s.measures].sort((a, b) => a.id < b.id ? -1 : 1) })
}
export const shaOf = (spec) => createHash('sha256').update(canonicalJson(spec)).digest('hex').slice(0, 16)

/**
 * 棘轮判定（纯函数）。返回 { verdict: 'auto'|'reject'|'review', violations[], queue[] }
 * auto=纯收紧立即生效 · reject=含放松/删除（机拒） · review=仅命令/kind 语义变更（人审）
 */
export function ratchetCheck(oldSpec, newSpec) {
  const o = normalizeSpec(oldSpec).measures
  const n = normalizeSpec(newSpec).measures
  const om = new Map(o.map((x) => [x.id, x]))
  const nm = new Map(n.map((x) => [x.id, x]))
  const violations = []
  const queue = []
  for (const [id] of om) if (!nm.has(id)) violations.push(`删除 measure「${id}」：判分器不可摘除`)
  for (const [id, x] of nm) {
    const y = om.get(id)
    if (!y) continue // 新增=收紧方向，自由
    if (x.w < y.w) violations.push(`「${id}」权重 ${y.w}→${x.w}：放松`)
    if (y.target !== null && x.target !== null && x.target < y.target) violations.push(`「${id}」阈值 ${y.target}→${x.target}：放松`)
    if (x.cmd !== y.cmd) queue.push(`「${id}」测量命令变更（语义超出棘轮机判权限）`)
    if (x.kind !== y.kind) queue.push(`「${id}」kind ${y.kind}→${x.kind}（读数语义变更）`)
  }
  const verdict = violations.length ? 'reject' : queue.length ? 'review' : 'auto'
  return { verdict, violations, queue }
}

export function loadSpec(sid) {
  try {
    const f = graderFileFor(sid)
    if (!existsSync(f)) return { spec: normalizeSpec(null), history: [], sha: shaOf({ measures: [] }) }
    const obj = JSON.parse(readFileSync(f, 'utf8'))
    return {
      spec: normalizeSpec(obj.spec),
      history: Array.isArray(obj.history) ? obj.history : [],
      sha: shaOf(obj.spec || { measures: [] }),
    }
  } catch { return { spec: normalizeSpec(null), history: [], sha: shaOf({ measures: [] }) } }
}

/** 唯一生效写入：auto 直落 / review 需携带 humanApproved=true / reject 永不。历史链 append（前 sha+新 sha+时间）。 */
export function commitSpec(sid, newSpec, { humanApproved = false } = {}) {
  const cur = loadSpec(sid)
  const r = ratchetCheck(cur.spec, newSpec)
  if (r.verdict === 'reject') return { ok: false, ...r }
  if (r.verdict === 'review' && !humanApproved) return { ok: false, needHuman: true, ...r }
  const spec = normalizeSpec(newSpec)
  const nextSha = shaOf(spec)
  const entry = { at: Date.now(), from: cur.sha, to: nextSha, via: r.verdict === 'auto' ? 'ratchet-auto' : 'ratchet-human' }
  mkdirSync(graderDir(), { recursive: true })
  const f = graderFileFor(sid)
  const tmp = f + '.tmp'
  writeFileSync(tmp, JSON.stringify({ spec, history: [...cur.history, entry] }, null, 2), 'utf8')
  // Windows 语义：rename 不覆盖既有文件——.prev 备份先清旧、主文件改名让位；改名失败则退直写
  try {
    if (existsSync(f)) {
      try { unlinkSync(f + '.prev') } catch { /* 无旧 prev */ }
      renameSync(f, f + '.prev')
    }
  } catch { /* prev 是便利用品，失败不阻断生效 */ }
  try { renameSync(tmp, f) } catch { writeFileSync(f, readFileSync(tmp, 'utf8'), 'utf8'); unlinkSync(tmp) }
  return { ok: true, verdict: r.verdict, sha: nextSha, entry, queue: r.queue }
}
