import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditBody } from '../src/index.js'
import {
  initMode, trigger, deactivate, onEditL1, onEditL2, onLockL1, onLockL2,
  onReviewApproved, onReviewRejected, onMark, onCommitStar, onRedteamVerdict, normalizeStar, normalizeItem,
  assertL1Items, assertL2Groups,
  currentFocus, groupDone, allDone, treeText, serializeState, deserializeState,
} from '../src/mode-state.js'

const L1 = [
  { title: '分析', spec: '分析链路（组任务描述）', accept: ['链路证据单注', '结论可复核'], verify: 'redteam' },
  { title: '成稿', spec: '汇总成稿（组任务描述）', accept: ['文档可运行'] },
]
const L2 = [
  { title: '分析', items: [
    { title: '双注入核验', spec: '验证双通道单注', accept: ['每条引导恰好 1 次'], do: 'self', verify: 'redteam', concepts: ['handler', 'pre-step'] },
    { title: '冲突核验', spec: '验证顺序冲突', accept: ['顺序强制'], do: 'self', verify: 'self', concepts: ['先大类后小类'] },
  ] },
  { title: '成稿', items: [
    { title: '判据结论清单', spec: '汇总判据', accept: ['PASS/FAIL 全列出'], do: 'self', verify: 'dual', concepts: ['PASS/FAIL'] },
  ] },
]

test('initMode 全开未锁,stage=off', () => {
  const s = initMode()
  assert.equal(s.stage, 'off')
  assert.equal(s.l1Locked, false)
  assert.equal(s.l2Locked, false)
  assert.deepEqual(s.plan.groups, [])
})

test('trigger（3.1）: off → brainstorm，星象清空未对齐', () => {
  const s = trigger(initMode(), '整理 README')
  assert.equal(s.stage, 'brainstorm')
  assert.equal(s.task, '整理 README')
  assert.equal(s.star.aligned, false)
  assert.equal(s.star.purpose, '')
  assert.equal(s.l1Locked, false)
})

test('onCommitStar：from-brainstorm/off→l1-edit；修订保留当前阶段（l2-edit 不被重置）', () => {
  assert.equal(onCommitStar(trigger(initMode(), 't'), { purpose: 'p' }).stage, 'l1-edit')
  let s = onCommitStar(trigger(initMode(), 't'), { purpose: 'p' })
  s = onEditL1(s, [{ title: 'A', spec: 's', accept: ['a'] }])
  s = onLockL1(s) // l2-edit
  const r = onCommitStar(s, { purpose: '修订目的（十二字以上）' })
  assert.equal(r.stage, 'l2-edit') // 修订保留
  assert.equal(r.star.aligned, true)
})

test('normalizeStar：任意形态容错为四字段', () => {
  assert.deepEqual(normalizeStar(null), { purpose: '', requirements: [], nonGoals: [], assumptions: [], aligned: false })
  const s = normalizeStar({ purpose: 123, requirements: 'r', assumptions: ['A'], aligned: true })
  assert.equal(s.purpose, '')
  assert.equal(s.aligned, true)
  assert.deepEqual(s.assumptions, ['A'])
})

test('deactivate 回零', () => {
  assert.equal(deactivate().stage, 'off')
})

test('onEditL1: 树只有组头（组规格字段入树）', () => {
  const s = onEditL1(trigger(initMode(), 't'), L1)
  assert.equal(s.plan.groups.length, 2)
  assert.deepEqual(s.plan.groups[0].items, [])
  assert.equal(s.plan.groups[0].spec, '分析链路（组任务描述）')
  assert.equal(s.plan.groups[0].verify, 'redteam')
  assert.equal(s.plan.groups[1].verify, 'self') // 缺省 self
  assert.deepEqual(s.plan.groups[0].accept, ['链路证据单注', '结论可复核'])
})

test('onEditL2 保留组规格（prev 回填,组名一致）', () => {
  let s = trigger(initMode(), 't')
  s = onEditL1(s, L1)
  s = onLockL1(s)
  s = onEditL2(s, L2) // L2 树未含组 spec/accept
  assert.equal(s.plan.groups[0].spec, '分析链路（组任务描述）') // 保留
  assert.equal(s.plan.groups[0].verify, 'redteam')
  assert.deepEqual(s.plan.groups[0].accept, ['链路证据单注', '结论可复核'])
  // 组头保持未锁定,小类入树
  assert.equal(s.plan.groups[0].locked, false)
  assert.equal(s.plan.groups[0].items.length, 2)
})

test('assertL1Items: 空/重复/缺 spec/缺 accept/OK', () => {
  assert.equal(assertL1Items([]).ok, false)
  assert.equal(assertL1Items([{ title: 'A', spec: 's', accept: ['a'] }, { title: 'A', spec: 's2', accept: ['b'] }]).ok, false)
  assert.equal(assertL1Items([{ title: 'A', accept: ['a'] }]).ok, false) // 缺 spec
  assert.equal(assertL1Items([{ title: 'A', spec: 's' }]).ok, false) // 缺 accept
  assert.equal(assertL1Items(L1).ok, true)
})

test('onLockL1: l1Locked + 切 l2-edit', () => {
  const s = onLockL1(onEditL1(trigger(initMode(), 't'), L1))
  assert.equal(s.l1Locked, true)
  assert.equal(s.l2Locked, false)
  assert.equal(s.stage, 'l2-edit')
})

test('assertL2Groups: 缺大类/改名/新增/重复/缺规格/OK', () => {
  const locked = new Set(['分析', '成稿'])
  assert.equal(assertL2Groups([], locked).ok, false)
  assert.equal(assertL2Groups([{ title: '分析', items: [] }], locked).ok, false) // 缺"成稿"
  assert.equal(assertL2Groups([{ title: '分析', items: [{ title: 'X' }] }, { title: '改名的', items: [{ title: 'Y' }] }], locked).ok, false) // 改名
  const extra = L2.concat({ title: '新增', items: [{ title: 'Z' }] })
  assert.equal(assertL2Groups(extra, locked).ok, false)
  // 3.1 规格化门控：缺 spec / 缺 accept / do 无效 / verify 无效
  assert.equal(assertL2Groups([{ title: '分析', items: [{ title: 'X', accept: ['a'], do: 'self', verify: 'self' }] }, { title: '成稿', items: [{ title: 'Y', accept: ['b'], do: 'self', verify: 'self' }] }], locked).ok, false) // 缺 spec
  assert.equal(assertL2Groups([{ title: '分析', items: [{ title: 'X', spec: 's', do: 'self', verify: 'self' }] }, { title: '成稿', items: [{ title: 'Y', spec: 's', accept: ['b'], do: 'self', verify: 'self' }] }], locked).ok, false) // 缺 accept
  assert.equal(assertL2Groups([{ title: '分析', items: [{ title: 'X', spec: 's', accept: ['a'], do: 'hack', verify: 'self' }] }, { title: '成稿', items: [{ title: 'Y', spec: 's', accept: ['b'], do: 'self', verify: 'self' }] }], locked).ok, false) // do 无效
  assert.equal(assertL2Groups(L2, locked).ok, true)
})

test('onEditL2: 完整树入 plan（概念保留）', () => {
  const s = onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2)
  assert.equal(s.plan.groups[0].items.length, 2)
  assert.deepEqual(s.plan.groups[0].items[0].concepts, ['handler', 'pre-step'])
})

test('onLockL2: 双锁 + review', () => {
  const s = onLockL2(onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2))
  assert.equal(s.l1Locked, true)
  assert.equal(s.l2Locked, true)
  assert.equal(s.stage, 'review')
})

test('onReviewApproved → develop', () => {
  const s = onReviewApproved(onLockL2(onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2)))
  assert.equal(s.stage, 'develop')
})

test('onReviewRejected → 全解锁回 l1-edit（树保留）', () => {
  const before = onLockL2(onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2))
  const s = onReviewRejected(before)
  assert.equal(s.stage, 'l1-edit')
  assert.equal(s.l1Locked, false)
  assert.equal(s.l2Locked, false)
  assert.equal(s.plan.groups.length, 2) // 树保留供按意见改
})

test('currentFocus: 第一个未完成 / 全完成返回 null', () => {
  let s = onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2)
  assert.equal(currentFocus(s.plan).item.title, '双注入核验')
  s.plan.groups[0].items[0].status = 'completed'
  assert.equal(currentFocus(s.plan).item.title, '冲突核验')
  s.plan.groups[0].items[1].status = 'completed'
  s.plan.groups[1].items[0].status = 'completed'
  assert.equal(currentFocus(s.plan), null)
})

test('groupDone / allDone', () => {
  const s = onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2)
  assert.equal(groupDone(s.plan.groups[0]), false)
  s.plan.groups[0].items.forEach((it) => { it.status = 'completed' })
  assert.equal(groupDone(s.plan.groups[0]), true)
  assert.equal(allDone(s.plan), false)
  s.plan.groups[1].items[0].status = 'completed'
  assert.equal(allDone(s.plan), true)
})

test('treeText: 组头行 + 缩进子行 + 3.1 规格摘要（纯展示文本）', () => {
  const s = onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2)
  const t = treeText(s.plan)
  assert.equal(t.includes('#L1 分析'), true)
  assert.equal(t.includes('验收:链路证据单注；结论可复核'), true)
  assert.equal(t.includes('收官验:redteam'), true)
  assert.equal(t.includes('  #L2 双注入核验'), true)
  assert.equal(t.includes('do=self verify=redteam'), true)
  assert.equal(t.includes('概念: handler, pre-step'), true)
})

test('onMark L2: 标定 in_progress 单线聚焦（同组复位）,completed 推进', () => {
  let s = onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2)
  // 标第一个为 in_progress,再标第二个 in_progress → 第一个被复位
  s = onMark(s, 'L2', '双注入核验', 'in_progress').state
  const r = onMark(s, 'L2', '冲突核验', 'in_progress')
  assert.equal(r.ok, true)
  assert.equal(r.state.plan.groups[0].items[0].status, 'pending')
  assert.equal(r.state.plan.groups[0].items[1].status, 'in_progress')
  // 完成后焦点轮转
  let next = r.state
  next = onMark(next, 'L2', '冲突核验', 'completed').state
  assert.equal(next.plan.groups[0].items[1].status, 'completed')
  assert.equal(currentFocus(next.plan).item.title, '双注入核验') // 还差一个
  next = onMark(next, 'L2', '双注入核验', 'completed').state
  assert.equal(groupDone(next.plan.groups[0]), true)
  assert.equal(currentFocus(next.plan).item.title, '判据结论清单')
  assert.equal(allDone(next.plan), false)
})

test('onMark: 未知标题/L1 未全完被拒,L1 全完可标', () => {
  let s = onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2)
  assert.equal(onMark(s, 'L2', '不存在的小类', 'completed').ok, false)
  assert.equal(onMark(s, 'L1', '分析', 'completed').ok, false) // 组内未全完
  s.plan.groups[0].items.forEach((it) => { it.status = 'completed' })
  const r = onMark(s, 'L1', '分析', 'completed')
  assert.equal(r.ok, true)
})

test('onMark 纯函数：不修改原 state', () => {
  const s = onEditL2(onLockL1(onEditL1(trigger(initMode(), 't'), L1)), L2)
  const before = JSON.stringify(s.plan)
  onMark(s, 'L2', '双注入核验', 'in_progress')
  assert.equal(JSON.stringify(s.plan), before)
})

test('serialize/deserialize 往返（热重载恢复）', () => {
  let s = trigger(initMode(), '任务')
  s = onCommitStar(s, { purpose: '为测试者快速核验', requirements: ['R1'], nonGoals: ['N1'], assumptions: ['A1'] })
  s = onEditL1(s, L1)
  s = onLockL1(s)
  s = onEditL2(s, L2)
  s.injected.add('l1-guidance')
  s.injected.add('focus:分析:双注入核验:pending')
  const round = deserializeState(JSON.parse(JSON.stringify(serializeState(s))))
  assert.equal(round.stage, s.stage)
  assert.equal(round.l1Locked, true)
  assert.equal(round.l2Locked, false)
  assert.equal(round.plan.groups.length, 2)
  assert.equal(round.injected.has('l1-guidance'), true)
  assert.deepEqual(round.plan.groups[0].items[0].concepts, ['handler', 'pre-step'])
  // 3.1：star 四字段+aligned 无损往返
  assert.equal(round.star.aligned, true)
  assert.equal(round.star.purpose, '为测试者快速核验')
  assert.deepEqual(round.star.requirements, ['R1'])
  assert.deepEqual(round.star.nonGoals, ['N1'])
  assert.deepEqual(round.star.assumptions, ['A1'])
})

test('auditBody：注入前缀聚合 / 指纹稳定 / redteam 统计 / 唯一率', () => {
  let s = trigger(initMode(), '任务')
  s = onCommitStar(s, { purpose: '为测试者快速核验' })
  s = onEditL1(s, [{ title: '组A', spec: 's', accept: ['a'], verify: 'redteam' }])
  s = onLockL1(s)
  s = onEditL2(s, [{ title: '组A', items: [{ title: '项一', spec: 's', accept: ['a'], do: 'self', verify: 'redteam' }] }])
  s.injected.add('brainstorm-guidance')
  s.injected.add('focus:组A:项一:pending')
  s = onRedteamVerdict(s, 'L2', '项一', 'reject', ['缺边界']).state
  s = onRedteamVerdict(s, 'L2', '项一', 'pass', []).state
  const a1 = auditBody(s)
  assert.equal(a1.injections['brainstorm-guidance'], 1)
  assert.equal(a1.injections['focus:*'], 1)
  assert.deepEqual(a1.redteam, { rounds: 2, passed: 1, rejected: 1, pending: 1 }) // 组级 redteam 未裁决 → pending
  assert.equal(a1.uniqueRate, 1)
  assert.equal(a1.dupKeys.length, 0)
  // 指纹稳定（同状态同指纹）
  assert.equal(a1.fingerprint, auditBody(s).fingerprint)
  // 重复键（模拟异常盘档为数组）→ uniqueRate < 1 且 dupKeys 报告
  const s2 = { ...s, injected: ['focus:*', 'focus:*'] }
  const a2 = auditBody(s2)
  assert.equal(a2.uniqueRate, 0.5) // 2 条目中 1 条重复 → 唯一率 50%
  assert.deepEqual(a2.dupKeys, ['focus:*'])
})

test('normalizeItem（3.1）：未声明 do/verify=空串（门控可抓）、redteam/doHistory 透传、in_progress 保留', () => {
  const it = normalizeItem({ title: 'X', status: 'in_progress', redteam: { rounds: 1, passed: false, log: [] }, doHistory: [{ at: 1, from: 'self', to: 'subagent' }] })
  assert.equal(it.do, '') // 未声明=空（门控"必填严格"的依据）
  assert.equal(it.verify, '')
  assert.equal(it.status, 'in_progress') // 非 completed 状态不丢
  assert.deepEqual(it.redteam, { rounds: 1, passed: false, log: [] }) // 透传
  assert.equal(it.doHistory.length, 1)
  assert.equal(normalizeItem({ title: 'Y', do: 'workflow', verify: 'redteam' }).do, 'workflow')
  assert.equal(normalizeItem({ title: 'Z', do: 'bad', verify: 'bad' }).do, '') // 非法枚举归空
  assert.equal(normalizeItem(null).title, '') // 容错
})

test('deserializeState 非法输入回 initMode', () => {
  assert.equal(deserializeState(null).stage, 'off')
  assert.equal(deserializeState({ stage: 'nope' }).stage, 'off')
  assert.equal(deserializeState({ stage: 'develop', plan: null }).stage, 'develop') // plan 容错为空组
  assert.equal(deserializeState({ stage: 'develop', plan: null }).plan.groups.length, 0)
})
