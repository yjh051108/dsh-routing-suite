/**
 * v04-damping — v0.4 事件触发阻尼（用户 2026-09-04 拍板：LQR 主干 + 轻 PID 外环防震荡）。
 *
 * 纪律：**不是监工是阻尼**——不按步常开（零仪式税），只在盘上信号触发时多注一行短句：
 *   P（比例）：V 相对合同总权重过高 → 提示本段闭合加另头审；
 *   I（积分）：V 平台期（连续 k 个读数不动）→ 重规划信号（滚动时域触发器）；
 *   D（微分）：V 序列差分符号翻转≥m 次（震荡）或借据签发率突增 → 冻结自动闭合、升级人审。
 * 纯函数零副作用；输入全是 v04-core 基数读数的时间序列（证伪实验可直接回放）。
 */

/** I：平台检测——尾部连续 |ΔV|<eps 的次数 ≥k。 */
export function detectPlateau(vSeries, { k = 3, eps = 1e-3 } = {}) {
  const vs = (vSeries || []).map((x) => (typeof x === 'number' ? x : x?.V))
  if (vs.length < k + 1) return { plateau: false, run: 0 }
  let run = 0
  for (let i = vs.length - 1; i > 0; i--) {
    if (Math.abs(vs[i] - vs[i - 1]) < eps) run++
    else break
  }
  return { plateau: run >= k, run }
}

/** D：震荡检测——尾部差分符号翻转次数 ≥m（升-降-升…反复）。 */
export function detectOscillation(vSeries, { m = 3 } = {}) {
  const vs = (vSeries || []).map((x) => (typeof x === 'number' ? x : x?.V)).filter((x) => Number.isFinite(x))
  const diffs = []
  for (let i = 1; i < vs.length; i++) {
    const d = vs[i] - vs[i - 1]
    if (Math.abs(d) > 1e-9) diffs.push(Math.sign(d))
  }
  let flips = 0
  for (let i = 1; i < diffs.length; i++) if (diffs[i] !== diffs[i - 1]) flips++
  return { oscillating: flips >= m, flips }
}

/** D（借据侧）：签发率突增——窗口步数内新借据 ≥b。 */
export function detectIouSurge(iouIssuedAt, { window = 5, b = 3 } = {}, atStep = 0) {
  const inWin = (iouIssuedAt || []).filter((s) => s > atStep - window && s <= atStep)
  return { surge: inWin.length >= b, count: inWin.length }
}

/** P：高 V 提示——V > 总权重×θ。 */
export function detectHighV(V, totalW, { theta = 0.6 } = {}) {
  return { high: totalW > 0 && V > totalW * theta, ratio: totalW > 0 ? Math.round((V / totalW) * 100) / 100 : 0 }
}

/** 组合仲裁：三信号→至多一行阻尼短句（无信号=静默 null，常闭税为零）。 */
export function dampingLine({ plateau, oscillating, iouSurge, highV } = {}) {
  const parts = []
  if (oscillating || iouSurge) parts.push('【阻尼·D】读数震荡/借据突增——冻结自动闭合，升级人审')
  if (plateau) parts.push('【阻尼·I】V 平台期——重规划信号（滚动时域，权重不动）')
  if (highV) parts.push('【阻尼·P】V 高位——本段闭合建议加另头审')
  return parts.length ? parts.join('；') : null
}
