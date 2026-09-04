/**
 * inject-text — v0.3 薄面（定理7：讲课撤销，教育=违规事件）。
 *
 * v0.2 讲课件（rollingKickoff / cycleFocus / settleGuide / terminalGuide / convergeLaw /
 * decomposeGuide / reviewPendingText / starPurpose / rejectAck 等）**全部废除**：常驻面改由
 * propose-text.stateFace 从盘档机械生成；旧法条以 optimal-engine 的拒绝文本承载（编译器式——
 * 违规即回执含条款+违例定位，不开机前讲课）。本文件只留 off 回执与版本真相。
 *
 * 语系铁律延续：文本只讲控制循环（标定→组冻结→快环定序→终端归零）；禁词以 tests/lingua-forbid
 * 表为准（本文件刻意不写全词，避免自引用命中）。展示文本从不参与解析、从不参与判定。
 */

export const VERSION = '0.3.3'

/** /optimal off 回执（模型可见的收口提示，唯一保留的固定文本）。 */
export function offReceipt() {
  return `✅ 最优律协议 v${VERSION} 已关闭。后续对话回归常规模式；重开：/optimal <任务>（或模型自主 cost_set 进入）。` +
    '已闭合的 V 账本（.optimal.json）保留——重开单不抹历史，盘档权威可跨代续。'
}
