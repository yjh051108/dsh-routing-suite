/**
 * e2e-3.1.mjs — 3.1 全链自体验（dogfood）：临时隔离目录,零污染真实盘档。
 * 链：触发 → 脑暴注入 → commit_star → 规格化 L1 → 锁定 → 规格化 L2 → 锁定 → 审核通过
 *     → 注入渲染（self / subagent+redteam / workflow+dual 三组合）→ 组收官 → 终验 → audit。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TMP = mkdtempSync(join(tmpdir(), 'graded-e2e-3.1-'))
process.env.DSH_HOME = TMP
const SID = 'e2e-sid'

import { initMode, trigger, onCommitStar, onEditL1, onLockL1, onEditL2, onLockL2, onReviewApproved, onMark, onRedteamVerdict, saveState, loadState, treeText } from '../src/mode-state.js'
import { commitStarDefinition, editPlanDefinition, lockStageDefinition, markTaskDefinition, redteamVerdictDefinition, reviseDoDefinition } from '../src/tools.js'
import { brainStormText, northStarLong, focusL2, focusL2GroupOpen, groupCheck, finalCheck, northStarShort } from '../src/inject-text.js'
import { auditBody } from '../src/index.js'

const exec = { agent: { session: { id: SID, events: [], append: () => {} }, followup: () => {} } }
const deps = { getState: () => loadState(SID) || initMode(), setState: (a, b) => saveState(a ?? b, b ?? a), askUser: async () => ({ answers: [] }) }
// 模拟 /graded 触发（盘上 off → brainstorm）
saveState(SID, trigger(initMode(), '做一个治愈系交互体验《花》'))

console.log('== ① 脑暴注入（手感） ==')
console.log(brainStormText('做一个治愈系交互体验《花》').slice(0, 180) + '…\n')

console.log('\n== ② commit_star 定稿 ==')
const star = commitStarDefinition()
const rStar = await star.execute({ purpose: '为疲惫的都市人，在 3 分钟的微风与花开中进入治愈状态', requirements: ['可操控风', '花开有反馈'], nonGoals: ['不做多人', '不做存档'], assumptions: ['桌面浏览器'], }, exec)
console.log(rStar.text)

console.log('\n== ③ 规格化 L1+锁定 ==')
const edit = editPlanDefinition(deps)
const lock = lockStageDefinition(deps)
const L1 = [{ title: '感观核心', spec: '风与花的核心体验（组描述，多行）', accept: ['操控感可描述', '花瓣随风摆动可见', '花开有视觉反馈'], verify: 'redteam' }]
const rL1 = await edit.execute({ level: 'L1', items: L1 }, exec)
const rLk1 = await lock.execute({ level: 'L1' }, exec)
console.log(rL1.text + '\n' + rLk1.text)

console.log('\n== ④ 规格化 L2（三形态组合）+锁定 ==')
const L2 = [{ title: '感观核心', items: [
  { title: '微风操控', spec: '指针→风源→花瓣受风', accept: ['指向即受风（位移>10px）'], do: 'self', verify: 'self' },
  { title: '飘逸粒子', spec: '花瓣粒子流+风场', accept: ['漂移路径肉眼可见', '300 只 60fps'], do: 'subagent', verify: 'redteam' },
  { title: '绽放系统', spec: '触碰花开+全境唤醒', accept: ['唤醒→扩张→全境'], do: 'workflow', verify: 'dual' }] }]
const rL2 = await edit.execute({ level: 'L2', groups: L2 }, exec)
const rLk2 = await lock.execute({ level: 'L2' }, exec)
console.log(rL2.text.slice(0, 300) + '\n' + rLk2.text.slice(0, 120) + '\n')

saveState(SID, onReviewApproved(loadState(SID)))
const st = loadState(SID)
console.log('\n== ⑤ 注入差异观感（三组合并排） ==')
console.log(focusL2('感观核心', st.plan.groups[0].items[0], null, 'correct').split('\n').slice(0, 6).join('\n'))
console.log('… …')
console.log(focusL2('感观核心', st.plan.groups[0].items[1], '微风操控', 'experience').split('\n').slice(0, 9).join('\n'))
console.log('… …')
console.log(focusL2('感观核心', st.plan.groups[0].items[2], '飘逸粒子', 'research').split('\n').slice(0, 8).join('\n'))

console.log('\n== ⑥ 组收官 + 终验 + audit ==')
console.log(groupCheck(st.plan.groups[0], 'experience').slice(0, 220))
console.log('… …')
console.log(finalCheck('ex') === '' ? '' : '（finalCheck 输出略）')
const a = auditBody(st)
console.log('audit:', JSON.stringify({ injections: a.injections, uniqueRate: a.uniqueRate, redteam: a.redteam }))

rmSync(TMP, { recursive: true, force: true })
console.log('\nE2E OK（隔离目录已清理）')
