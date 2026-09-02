/**
 * confirm — 从会话事件流解析"清单确认"结果。
 *
 * 协议：pre-step 引导模型调用 ask_user_question（question id 固定 'graded-plan-review'，
 * intent { kind:'plan-review', approve:'确认' }）。确认结果在 tool/result 事件的
 * message.content[].content JSON（ask_user_question 的 render = JSON.stringify(answers)）。
 *
 * 本模块只做纯解析（可单测）：把事件流变成 { approved, custom, asked }。
 */

/** 从事件流里找模型是否调用过 ask_user_question，且是否拿到答案。 */
export function parseConfirmState(events) {
  const calls = new Map() // callId -> question 摘要
  let result = null
  for (const ev of events || []) {
    if (!ev || typeof ev !== 'object') continue
    if (ev.type === 'tool/call' && ev.data?.name === 'ask_user_question') {
      const input = ev.data.input
      const callId = ev.data.id
      // 模型可能自选 question id（如 confirm_level2）——接受任何"确认清单"类问题
      const q = (Array.isArray(input?.questions) ? input.questions : []).find((q) => {
        const t = (String(q?.question || '') + String(q?.header || '')).toLowerCase()
        return (q?.id === 'graded-plan-review') || t.includes('确认') || t.includes('confirm')
      })
      calls.set(callId, q || null)
    }
    if (ev.type === 'tool/result' && ev.data?.message?.content) {
      const blocks = ev.data.message.content
      for (const b of blocks) {
        if (b?.callId == null) continue
        const q = calls.get(b.callId)
        if (q == null) continue // 非本插件确认（未找到 graded-plan-review 的 question）
        // 找到本问题的工具结果 —— 解析 answers JSON（render 是 JSON.stringify）
        const raw = String(b.content || '').trim()
        let answers = null
        try {
          answers = JSON.parse(raw)
        } catch { /* 非 JSON 就当没有 */ }
        if (answers && Array.isArray(answers.answers)) {
          const a = answers.answers.find((x) => x?.id === 'graded-plan-review') || answers.answers[0] // 兼容任意 id，取首个
          const selected = Array.isArray(a?.selected) ? a.selected : []
          const custom = typeof a?.custom === 'string' ? a.custom : undefined
          result = {
            asked: true,
            approved: selected.some(validApprove),
            custom,
          }
        }
      }
    }
    // 也看 question/requested 事件（UI 层发起的确认）
    if (ev.type === 'question/requested') {
      const qs = Array.isArray(ev.data?.questions) ? ev.data.questions : []
      if (qs.some((q) => q?.id === 'graded-plan-review')) result = { ...(result || {}), asked: true }
    }
  }
  return result || { asked: false, approved: null, custom: undefined }
}

/** 常见批准词（intent approve label 由模型自选，宽匹配兜底）。 */
function validApprove(s) {
  const t = String(s || '').trim().toLowerCase()
  return t === 'confirm' || t.includes('confirm') || t.includes('approve') ||
    t.includes('确认') || t.includes('通过') || t.includes('同意')
}
