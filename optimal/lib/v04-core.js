/**
 * v04-core — v0.4-alpha 探针：基数 V（cost-to-go，无沉没成本【修1】）+ 借据账本【修2】。
 *
 * z∈[0,1] 读数语义（与 v04-grader 的 measure-spec 同一形状）：
 *   bool: exit==0 → z=1；ratio: 分式或数值 ÷ target 截断 [0,1]；count: 数值 ÷ target 截断。
 * V = Σ w·(1−z) ——**只含未来代价**；步成本/墙钟另列 R 账（计量归 G4，本模块零掺入）。
 *
 * 借据（铺垫步合法化，替代宣誓式 dip）：
 *   registerIou 绑定抵押=占位断言 + dueStep；到期未赎 → tickIOU 置 expired，
 *   抵押并入有效 measures 且 z=0（**V 自动涨**——兑现由测量强制不由回忆强制）；
 *   未偿 open 抵押权重和受外生 budget 约束（模型不可自削），爆预算=拒+人审信号。
 */
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

export function zOf(measure, observed) {
  const k = measure.kind
  if (k === 'bool') return observed?.exit === 0 ? 1 : 0
  const raw = typeof observed?.value === 'number' ? observed.value : Number(observed?.value)
  if (!Number.isFinite(raw)) return 0
  if (observed?.normalized === true) return clamp01(raw) // 分式已归一（5/10→0.5），不再除 target（语义冲突修复）
  const tgt = typeof measure.target === 'number' && measure.target > 0 ? measure.target : 1
  return clamp01(raw / tgt)
}

/** 读数解析（纯文本→observed）："12/15"→归一分式；裸数字→原值（zOf ÷target）；无数字→NaN(zOf 给 0)。 */
export function parseOutput(measure, stdout, exit = 0) {
  if (measure.kind === 'bool') return { exit }
  const t = String(stdout ?? '').trim()
  let mm = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(t)
  if (mm && Number(mm[2]) > 0) return { value: Number(mm[1]) / Number(mm[2]), normalized: true }
  mm = /\b(\d+(?:\.\d+)?)\b/.exec(t)
  return mm ? { value: Number(mm[1]) } : { value: NaN }
}

export function vCompute(measures, zs) {
  const rows = measures.map((mm) => ({ id: mm.id, w: mm.w, z: zs[mm.id] ?? 0 }))
  const V = rows.reduce((a, r) => a + r.w * (1 - r.z), 0)
  return { V: Math.round(V * 1e4) / 1e4, rows }
}

/* ---------- 借据账本 ---------- */
export function initIouBook({ budget = 3 } = {}) {
  return { budget, entries: [], humanReviewRequired: false }
}

export function registerIou(book, { id, collateral, dueStep, reason } = {}, atStep = 0) {
  if (!id || !collateral?.id || !(dueStep > atStep)) return { ok: false, error: '借据需 id + 抵押占位断言 + dueStep>当前步' }
  if (book.entries.some((e) => e.id === id)) return { ok: false, error: `借据 id「${id}」已存在` }
  const openW = book.entries.filter((e) => e.status === 'open').reduce((a, e) => a + (e.collateral?.w ?? 0), 0)
  if (openW + (collateral.w ?? 0) > book.budget) {
    return { ok: false, budgetFull: true, error: `R_dip 预算耗尽（在途 ${openW} + ${collateral.w ?? 0} > ${book.budget}）→ 强制人审，不自动放行` }
  }
  return {
    ok: true,
    book: { ...book, entries: [...book.entries, { id, collateral, dueStep, reason: String(reason || ''), issuedAt: atStep, status: 'open' }] },
  }
}

/** 步进：到期 open→expired（抵押将并入有效 measures 变红）。 */
export function tickIOU(book, atStep) {
  const expired = []
  const entries = book.entries.map((e) => {
    if (e.status === 'open' && atStep >= e.dueStep) { expired.push(e); return { ...e, status: 'expired' } }
    return e
  })
  return {
    book: { ...book, entries, humanReviewRequired: expired.length > 0 ? true : book.humanReviewRequired },
    expired: expired.map((e) => e.id),
  }
}

export function redeemIOU(book, id) {
  const hit = book.entries.find((e) => e.id === id && e.status === 'open')
  if (!hit) return { ok: false, error: `借据「${id}」不在途（无此 id 或已了结）` }
  return { ok: true, book: { ...book, entries: book.entries.map((e) => (e === hit ? { ...e, status: 'redeemed' } : e)) } }
}

/** 有效 measures = 原集 ∪ 已过期借据抵押（同 id 以原集为准）——账本合并，非 V 公式掺假。 */
export function effectiveMeasures(measures, book) {
  const ids = new Set(measures.map((x) => x.id))
  const expiredColl = book.entries.filter((e) => e.status === 'expired').map((e) => e.collateral).filter((c) => c && !ids.has(c.id))
  return [...measures, ...expiredColl]
}

/** V 终算：过期抵押 z=0 自动并入（测量强制，非叙述强制）。 */
export function vWithIOU(measures, book, zs = {}) {
  const eff = effectiveMeasures(measures, book)
  const zAll = { ...zs }
  for (const c of eff) if (!(c.id in zAll)) zAll[c.id] = 0
  return vCompute(eff, zAll)
}
