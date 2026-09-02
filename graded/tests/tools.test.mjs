import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { editPlanDefinition, lockStageDefinition, markTaskDefinition, commitStarDefinition, redteamVerdictDefinition, reviseDoDefinition } from '../src/tools.js'
import { initMode, trigger, onCommitStar, onEditL1, onLockL1, onEditL2, onLockL2, onReviewApproved, loadState, saveState, stateFileFor } from '../src/mode-state.js'

// 测试级状态目录（磁盘权威：execute 直读写盘）
const TMP = mkdtempSync(join(tmpdir(), 'graded-test-'))
process.env.DSH_HOME = TMP
beforeEach(() => { try { rmSync(stateFileFor('sid-1'), { force: true }) } catch { /* 幂等 */ } })

/** 3.1 起步：脑暴定稿（commit_star）后进入 l1-edit。 */
function begin(task = '任务') {
  return onCommitStar(trigger(initMode(), task), { purpose: '测试目的：验证契约' })
}

/** deps 兼容双轨：旧签名 setState(state) / 新签名 setState(sid, state)；执行侧统一走盘。 */
function makeHarness(askResult) {
  const store = { state: initMode() }
  const deps = {
    getState: () => loadState('sid-1') || store.state, // execute 写盘 → 断言读盘（权威）
    setState: (a, b) => {
      if (b === undefined) { b = a; }
      store.state = b
      saveState('sid-1', b) // 与 execute 的盘读取同源
    },
    askUser: async () => askResult,
  }
  return { store, deps }
}

/** 模拟一次工具执行（提供最小 exec）。 */
async function run(def, deps, args) {
  const exec = {
    agent: {
      session: {
        id: 'sid-1',
        events: [],
        append: (type, data) => {},
      },
      followup: () => {},
    },
  }
  return def.execute(args, exec)
}

test('definition 形状：name/description/parameters/output 齐全,level 枚举', () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  assert.equal(edit.name, 'edit_plan')
  assert.match(edit.description, /level=L1/)
  assert.equal(edit.parameters.properties.level.enum.join(','), 'L1,L2')
  assert.deepEqual(edit.parameters.required, ['level'])
  assert.equal(edit.output.schema.type, 'object')
  assert.equal(lock.name, 'lock_stage')
})

test('edit L1：未触发/层级不符被拒；L1 编辑成功树为组头', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  await assert.rejects(() => run(edit, deps, { level: 'L1', items: [{ title: '分析' }] }), /激活|spec/) // off 未激活优先
  deps.setState(deps.getState(), begin('任务'))
  await assert.rejects(() => run(edit, deps, { level: 'L2' }), /lock_stage/)
  const r2 = await run(edit, deps, { level: 'L1', items: [{ title: '分析', spec: '任务', accept: ['标准'] }, { title: '成稿', spec: '任务', accept: ['标准'] }] })
  assert.match(r2.text, /已编辑 L1 计划/)
  assert.equal(deps.getState().plan.groups.length, 2)
})

test('锁 L1 后 edit L1 被拒（锁了就是锁了）', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  deps.setState(deps.getState(), begin('任务'))
  await run(edit, deps, { level: 'L1', items: [{ title: '分析', spec: '任务', accept: ['标准'] }] })
  await run(lock, deps, { level: 'L1' })
  await assert.rejects(() => run(edit, deps, { level: 'L1', items: [{ title: '改', spec: 'x', accept: ['y'] }] }), /已锁定/)
})

test('L2 编辑：大类名与锁定不一致被拒；合法 → 树完整', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  deps.setState(deps.getState(), begin('任务'))
  await run(edit, deps, { level: 'L1', items: [{ title: '分析', spec: '任务', accept: ['标准'] }] })
  await run(lock, deps, { level: 'L1' })
  await assert.rejects(() => run(edit, deps, { level: 'L2', groups: [{ title: '改名大类', items: [{ title: 'X' }] }] }), /缺少|新增|改名/)
  const r = await run(edit, deps, { level: 'L2', groups: [{ title: '分析', items: [{ title: '双注入核验', spec: 's', accept: ['a'], do: 'self', verify: 'self', concepts: ['handler'] }] }] })
  assert.match(r.text, /已编辑 L2 计划/)
  assert.equal(deps.getState().plan.groups[0].items.length, 1)
})

test('锁 L2 → 进入 review（文本通道审核,不弹窗）', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  deps.setState(deps.getState(), begin('任务'))
  await run(edit, deps, { level: 'L1', items: [{ title: '分析', spec: '任务', accept: ['标准'] }] })
  await run(lock, deps, { level: 'L1' })
  await run(edit, deps, { level: 'L2', groups: [{ title: '分析', items: [{ title: '核验', spec: 's', accept: ['a'], do: 'self', verify: 'self', concepts: ['a'] }] }] })
  const r = await run(lock, deps, { level: 'L2' })
  assert.match(r.text, /清单已锁定/)
  assert.match(r.text, /完整规格评审单/) // 锁定回执=规格单（确认请求由审核注入唯一发出——不再此处催）
  assert.equal(deps.getState().stage, 'review')
  assert.equal(deps.getState().l2Locked, true)
})

test('锁 L2（review 重入）→ 幂等保持 review,树保留', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  deps.setState(deps.getState(), begin('任务'))
  await run(edit, deps, { level: 'L1', items: [{ title: '分析', spec: '任务', accept: ['标准'] }] })
  await run(lock, deps, { level: 'L1' })
  await run(edit, deps, { level: 'L2', groups: [{ title: '分析', items: [{ title: '核验', spec: 's', accept: ['a'], do: 'self', verify: 'self', concepts: ['a'] }] }] })
  await run(lock, deps, { level: 'L2' })
  const r2 = await run(lock, deps, { level: 'L2' }) // review 重入
  assert.match(r2.text, /清单已锁定/)
  assert.equal(deps.getState().stage, 'review')
  assert.equal(deps.getState().plan.groups.length, 1)
})

test('edit_plan（3.1）：脑暴未定稿被门控拒绝（信息不闭环不前进）', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  deps.setState(deps.getState(), trigger(deps.getState(), '任务')) // 停在 brainstorm,未 commit_star
  await assert.rejects(() => run(edit, deps, { level: 'L1', items: [{ title: '分析' }] }), /需求对齐|commit_star/)
  assert.equal(deps.getState().stage, 'brainstorm')
})

test('commit_star 模型自主进入（3.1）：off → 定稿即激活 l1-edit；信息不足仍拒', async () => {
  const { deps } = makeHarness()
  const star = commitStarDefinition()
  // off 未激活态：直接调 commit_star → 自主激活
  const r = await run(star, deps, { purpose: '为疲惫的都市人，在 3 分钟的微风与花开中进入治愈状态' })
  assert.match(r.text, /模型自主进入分级模式/)
  assert.equal(deps.getState().stage, 'l1-edit')
  assert.equal(deps.getState().star.aligned, true)
  assert.match(deps.getState().task, /模型自主进入/)
  // 信息不足拒绝（过短/照抄）——不给激活（先重置 off）
  deps.setState(deps.getState(), initMode())
  await assert.rejects(() => run(star, deps, { purpose: '好' }), /过短/)
  assert.equal(deps.getState().stage, 'off') // 未被激活
})

test('commit_star：定稿成功/必填与照抄被拒/修订覆盖/develop 只读', async () => {
  const { deps } = makeHarness()
  const star = commitStarDefinition()
  deps.setState(deps.getState(), trigger(deps.getState(), '整理一份 README 文档'))
  // 必填 & 过短 & 照抄任务原文 → 拒
  await assert.rejects(() => run(star, deps, {}), /purpose/)
  await assert.rejects(() => run(star, deps, { purpose: '好' }), /过短/)
  await assert.rejects(() => run(star, deps, { purpose: '整理一份 README 文档' }), /照抄/)
  // 定稿成功
  const r = await run(star, deps, {
    purpose: '为协作的开发者，把 README 从散落备注变成 1 分钟可查的命令手册',
    requirements: ['可运行命令清单', '零依赖说明'],
    assumptions: ['读者熟悉 Node'],
  })
  assert.match(r.text, /北极星已定稿/)
  assert.equal(deps.getState().stage, 'l1-edit')
  assert.equal(deps.getState().star.aligned, true)
  assert.equal(deps.getState().star.requirements.length, 2)
  // 修订：l1-edit 可再次调用，覆盖 purpose
  const r2 = await run(star, deps, { purpose: '为协作的开发者，把 README 变成 3 分钟内上手的命令手册（修订版）' })
  assert.match(r2.text, /北极星已定稿/)
  assert.match(deps.getState().star.purpose, /修订版/)
  // develop 只读
  deps.setState(deps.getState(), onReviewApproved(onLockL2(onEditL2(onLockL1(onEditL1(deps.getState(), [{ title: 'A', spec: 'x', accept: ['y'] }])), [{ title: 'A', items: [{ title: 'a' }] }]))))
  await assert.rejects(() => run(star, deps, { purpose: '开发期改目的宣言尝试' }), /只读|修改/)
})

test('lock 复检（3.1）：L1/L2 规格不全被拒且状态不变', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  deps.setState(deps.getState(), begin('任务'))
  // 旁路：直接构造残缺树（缺组 accept）→ lock L1 被拒
  deps.setState(deps.getState(), onEditL1(deps.getState(), [{ title: 'A', spec: 'x' }])) // 无 accept
  await assert.rejects(() => run(lock, deps, { level: 'L1' }), /规格不全/)
  assert.equal(deps.getState().l1Locked, false)
  // 缺小类 verify 的树 → lock L2 被拒
  deps.setState(deps.getState(), onEditL1(deps.getState(), [{ title: 'A', spec: 'x', accept: ['a'] }]))
  await run(lock, deps, { level: 'L1' })
  deps.setState(deps.getState(), onEditL2(deps.getState(), [{ title: 'A', items: [{ title: 'a', spec: 's', accept: ['a'], do: 'self' }] }])) // 无 verify
  await assert.rejects(() => run(lock, deps, { level: 'L2' }), /verify/)
  assert.equal(deps.getState().stage, 'l2-edit')
})

test('redteam_verdict：非 redteam 拒 / reject 必附清单 / 轮次累计与再审批', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  const rt = redteamVerdictDefinition()
  deps.setState(deps.getState(), begin('任务'))
  await run(edit, deps, { level: 'L1', items: [{ title: 'A', spec: 'x', accept: ['a'] }] })
  await run(lock, deps, { level: 'L1' })
  await run(edit, deps, { level: 'L2', groups: [{ title: 'A', items: [
    { title: '核验一', spec: 's', accept: ['a'], do: 'self', verify: 'self' },      // 非 redteam
    { title: '核验二', spec: 's', accept: ['b'], do: 'self', verify: 'redteam' }] }] })
  await run(lock, deps, { level: 'L2' })
  deps.setState(deps.getState(), onReviewApproved(deps.getState()))
  // 开发期外不可用：现在是 develop ✔；非 redteam 项 → 拒
  await assert.rejects(() => run(rt, deps, { level: 'L2', title: '核验一', verdict: 'pass' }), /未声明红队/)
  // reject 必须附问题清单
  await assert.rejects(() => run(rt, deps, { level: 'L2', title: '核验二', verdict: 'reject' }), /问题清单/)
  // 打回 → issues 落盘 → 再裁决通过 → 轮次=2
  const r1 = await run(rt, deps, { level: 'L2', title: '核验二', verdict: 'reject', issues: ['P1: 缺边界断言（L12）'] })
  assert.match(r1.text, /打回.*轮次=1.*再审批/)
  let it = deps.getState().plan.groups[0].items[1]
  assert.equal(it.redteam.passed, false)
  assert.equal(it.redteam.log.length, 1)
  const r2 = await run(rt, deps, { level: 'L2', title: '核验二', verdict: 'pass' })
  assert.match(r2.text, /通过.*轮次=2/)
  it = deps.getState().plan.groups[0].items[1]
  assert.equal(it.redteam.passed, true)
  assert.equal(it.redteam.rounds, 2)
})

test('revise_do：开发期改形态登记轨迹；枚举无效拒；verify 只读', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  const revise = reviseDoDefinition()
  deps.setState(deps.getState(), begin('任务'))
  await run(edit, deps, { level: 'L1', items: [{ title: 'A', spec: 'x', accept: ['a'] }] })
  await run(lock, deps, { level: 'L1' })
  await run(edit, deps, { level: 'L2', groups: [{ title: 'A', items: [
    { title: '核验一', spec: 's', accept: ['a'], do: 'self', verify: 'self' }] }] })
  await run(lock, deps, { level: 'L2' })
  deps.setState(deps.getState(), onReviewApproved(deps.getState()))
  // 枚举无效 → 拒
  await assert.rejects(() => run(revise, deps, { title: '核验一', do: 'hack' }), /无效/)
  // 修订成功 + doHistory 登记（from=self → to=subagent）
  const r = await run(revise, deps, { title: '核验一', do: 'subagent' })
  assert.match(r.text, /已修订「核验一」执行形态 → do=subagent/)
  assert.match(r.text, /verify 不变——验收承诺不因形态变化而打折/)
  const it = deps.getState().plan.groups[0].items[0]
  assert.equal(it.do, 'subagent')
  assert.equal(it.doHistory.length, 1)
  assert.equal(it.doHistory[0].from, 'self')
  assert.equal(it.doHistory[0].to, 'subagent')
  assert.equal(it.verify, 'self') // verify 未被触碰（只读）
})

test('redteam 门：未 pass 无法打卡（小类/组级）；pass 后放行', async () => {
  const { deps } = makeHarness()
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  const mark = markTaskDefinition(deps)
  const rt = redteamVerdictDefinition()
  deps.setState(deps.getState(), begin('任务'))
  await run(edit, deps, { level: 'L1', items: [{ title: 'A', spec: 'x', accept: ['a'], verify: 'redteam' }] })
  await run(lock, deps, { level: 'L1' })
  await run(edit, deps, { level: 'L2', groups: [{ title: 'A', items: [
    { title: '核验一', spec: 's', accept: ['a'], do: 'self', verify: 'redteam' }] }] })
  await run(lock, deps, { level: 'L2' })
  deps.setState(deps.getState(), onReviewApproved(deps.getState()))
  // 小类未 pass → mark 拒（提示先裁决+轮次）
  await assert.rejects(() => run(mark, deps, { level: 'L2', title: '核验一', status: 'completed' }), /尚未裁决通过（轮次=0）|redteam_verdict/)
  // 组级：组 verify=redteam（L1 已设），未裁决 → L1 标定拒
  await assert.rejects(() => run(mark, deps, { level: 'L1', title: 'A', status: 'completed' }), /组收官 verify=redteam：尚未裁决通过/)
  // 打回（轮次1）→ 仍拒；裁决通过（轮次2）→ 小类可 mark（组级仍需组裁决）
  await run(rt, deps, { level: 'L2', title: '核验一', verdict: 'reject', issues: ['缺陷1'] })
  await assert.rejects(() => run(mark, deps, { level: 'L2', title: '核验一', status: 'completed' }), /尚未裁决通过（轮次=1）/)
  await run(rt, deps, { level: 'L2', title: '核验一', verdict: 'pass' })
  const r = await run(mark, deps, { level: 'L2', title: '核验一', status: 'completed' })
  assert.match(r.text, /#L2 核验一.*✅/)
  await assert.rejects(() => run(mark, deps, { level: 'L1', title: 'A', status: 'completed' }), /组收官 verify=redteam/) // 组未裁决仍拒
  await run(rt, deps, { level: 'L1', title: 'A', verdict: 'pass' })
  const r2 = await run(mark, deps, { level: 'L1', title: 'A', status: 'completed' })
  assert.match(r2.text, /#L1 A 🔒 ✅/)
})

test('6 工具定义形状：name/parameters 必填枚举齐全（3.1 工具集）', () => {
  const defs = [commitStarDefinition(), redteamVerdictDefinition(), reviseDoDefinition()]
  const names = defs.map((d) => d.name).sort().join(',')
  assert.equal(names, 'commit_star,redteam_verdict,revise_do')
  // commit_star：purpose 必填
  assert.deepEqual(commitStarDefinition().parameters.required, ['purpose'])
  // redteam_verdict：level/title/verdict 必填,issues 可选（reject 时强制）
  assert.deepEqual(redteamVerdictDefinition().parameters.required, ['level', 'title', 'verdict'])
  // revise_do：title/do 必填,无 level 参数（固定 L2——verify 只读的设计面）
  assert.deepEqual(reviseDoDefinition().parameters.required, ['title', 'do'])
  assert.equal(reviseDoDefinition().parameters.properties.level, undefined)
})

test('commit_star 带 mode：脑暴模式题选择随定稿落盘；不传=保持', async () => {
  const { deps } = makeHarness()
  const star = commitStarDefinition()
  const r = await run(star, deps, { purpose: '为复盘者把会话证据压成可复核结论（十二字以上）', mode: 'research' })
  assert.match(r.text, /北极星已定稿|模型自主进入/)
  assert.equal(deps.getState().mode, 'research') // 落盘
  assert.equal(deps.getState().stage, 'l1-edit')
  // 不传 mode → 保持（修订不重置模式）
  await run(star, deps, { purpose: '为测试者再次定稿验证模式保持（十二字以上）' })
  assert.equal(deps.getState().mode, 'research') // 未变
})

test('mark_task: 仅 develop/final 可用;标定推进焦点', async () => {
  const { deps } = makeHarness({ answers: [{ id: 'graded-plan-review', selected: ['确认'] }] })
  const edit = editPlanDefinition(deps)
  const lock = lockStageDefinition(deps)
  const mark = markTaskDefinition(deps)
  deps.setState(deps.getState(), begin('任务'))
  await assert.rejects(() => run(mark, deps, { level: 'L2', title: '核验', status: 'completed' }), /审核通过后的开发阶段/)
  await run(edit, deps, { level: 'L1', items: [{ title: '分析', spec: '任务', accept: ['标准'] }] })
  await run(lock, deps, { level: 'L1' })
  await run(edit, deps, { level: 'L2', groups: [{ title: '分析', items: [
    { title: '核验一', spec: 's', accept: ['a'], do: 'self', verify: 'self', concepts: ['a'] },
    { title: '核验二', spec: 's', accept: ['b'], do: 'self', verify: 'self', concepts: ['b'] }] }] })
  await run(lock, deps, { level: 'L2' }) // 锁定 → review（文本通道确认）
  deps.setState(deps.getState(), onReviewApproved(deps.getState())) // 模拟 pre-step 文本扫描「确认」
  const r = await run(mark, deps, { level: 'L2', title: '核验一', status: 'completed' })
  assert.match(r.text, /#L2 核验一.*✅/)
  assert.equal(deps.getState().plan.groups[0].items[0].status, 'completed')
  assert.equal(deps.getState().plan.groups[0].items[1].status, 'pending')
  // 未知标题被拒
  await assert.rejects(() => run(mark, deps, { level: 'L2', title: '不存在', status: 'completed' }), /不在计划树里/)
})
