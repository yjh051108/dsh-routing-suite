/**
 * contract-merge — v0.3 差分契约（THEORY-v0.3 §2 快环：args=差分 / 闸=全量）。
 *
 * 职责边界（诚实声明）：本模块**不做任何闸判定**——四闸（无源=无效 / ≥2 通道 / dip 回升 /
 * 签名反漂移）全部留在 optimal-engine.declareStep（v0.2 原函数复用，零拷贝零重写）。
 * 本模块只做两件事：
 *   1) materialize：把模型差分（title+预测+通道+可选覆写）与盘档 v3 慢环合同 merge 成
 *      declareStep 可消费的全量契约（链式量/成本投影/法基行=引擎直读，模型不抄）；
 *   2) 准入判定（第5闸）：channels≥2=light；channels<2=heavy——回执带重流程引导词，
 *      **但拒绝照旧**（定理5 不因重流程豁免：引导=补第二通道或降提议态，不是绕闸）。
 */
import { costBand } from './optimal-engine.js' // 档位函数复用（不重定义）

/** 引擎固定法基行（不可省略位——快环自身的预声明偏差策略）。 */
export const BASE_LAW = Object.freeze({ signal: 'ΔV 实测相对上一实测读数不降，或 dip 声明后回升失败', action: 'converge 直拒 → rollback re-linearize（换建模，不换参数；定理6 局部式）' })

/** 第5闸引导词（重流程=完整仪式，非降级通道——拍板 D 无旁路纪律的 v0.3 形态）。 */
export const GATE5_NOTE = '第5闸·无测量不放权：本动作通道<2，准入判定=重流程（完整仪式）。处置二选一：① 补第二条独立测量通道（标识与既有一条两两不同）；② 该动作降为提议态（只出建议不落闭合账）。定理5 双通道闸不因重流程豁免——不存在绕闸第三位。'

/**
 * 物化：materialize(surface, diff) → { ok, admission, notes, contract }
 * surface = mode-state.controlSurface(state)（慢环合同+演进量直读，禁历史快照字面量）。
 * diff = { title, predict:[{key,value,source}], channels:[str], invariants?, law?, cost?,
 *          right?, wrong?, vExpect?, dipPlan?, confidence? }
 */
export function materialize(surface, diff) {
  const d = diff || {}
  const title = String(d.title || '').trim()
  if (!title) return { ok: false, error: 'diff 需要 title（本动作名——闭合按此落账）' }
  const preds = (Array.isArray(d.predict) ? d.predict : []).map((p) => ({
    key: String(p?.key || ''), value: String(p?.value || ''), source: String(p?.source || '').trim(),
  }))
  const channels = (Array.isArray(d.channels) ? d.channels : []).map(String).filter(Boolean)
  const admission = channels.length >= 2 ? 'light' : 'heavy'
  const notes = admission === 'heavy' ? [GATE5_NOTE] : []

  const r = surface?.residual || {}
  const qn = surface?.cost || {}
  const beforeBand = r.lastBand || 'far'
  // 链式量/残差/Q_N 摘要=引擎物化（读时现值，不钉历史字面量）
  const invariants = [
    `链：beforeBand=${beforeBand}（引擎直读盘档 lastBand，模型不书写）`,
    `残差：组未落账=${(r.groupsOpen || []).length}·已闭动作=${r.closedCount || 0}·dip挂账=${r.dipPending === true}`,
    `档函数：costBand 复用引擎（${costBand(0)}/${costBand(1)}/${costBand(9)}）`,
    ...(d.invariants || []).map(String),
  ]
  // 成本投影：Q_N 断言逐档直读（缺覆写时）
  const cost = (Array.isArray(d.cost) && d.cost.length > 0)
    ? d.cost
    : (qn.assertions || []).map((a) => ({
        failure: `Q_N 断言违例：${a.text}`,
        defense: 'converge 三要素 + 终检归零（慢环闸覆盖）',
        weight: a.severity === 'catastrophic' ? '失败态→∞（Q_N 直读）' : a.severity === 'major' ? 'major（Q_N 直读）' : 'minor（Q_N 直读）',
      }))
  const law = [BASE_LAW, ...(d.law || []).map((l) => ({ signal: String(l?.signal || ''), action: String(l?.action || '') }))]

  const contract = {
    title,
    invariants,
    predictions: preds,
    cost,
    law,
    measure: {
      right: String(d.right || `全部 ${preds.length} 条预测实测与声明一致`),
      wrongSignal: String(d.wrong || '任一预测实测≠声明，或通道标识非两两不同'),
      channels,
    },
    vExpect: ['dip', 'maintain'].includes(d.vExpect) ? d.vExpect : 'improve',
    dipPlan: String(d.dipPlan || ''),
    confidence: ['high', 'medium', 'low'].includes(d.confidence) ? d.confidence : 'medium',
  }
  return { ok: true, admission, notes, contract }
}
