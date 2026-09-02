/**
 * e2e-redteam-group.mjs — 组级红队实战链（遗留边界③补验）：
 * 规格化组 verify=redteam → 小类全打卡 → 组级裁决 reject → 修复 → 再裁决 pass → L1 标定放行。
 * 隔离目录；全程走工具 execute（真实路径），零污染。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const TMP = mkdtempSync(join(tmpdir(), 'graded-e2e-rtm-'))
process.env.DSH_HOME = TMP
const SID = 'rtm-sid'

import { initMode, loadState, saveState, trigger, onReviewApproved } from '../src/mode-state.js'
import { commitStarDefinition, editPlanDefinition, lockStageDefinition, markTaskDefinition, redteamVerdictDefinition } from '../src/tools.js'

const exec = { agent: { session: { id: SID, events: [], append: () => {} }, followup: () => {} } }
const deps = { getState: () => loadState(SID) || initMode(), setState: (a, b) => saveState(a ?? b, b ?? a) === undefined ? saveState(b ?? a) : saveState(SID, b ?? a), askUser: async () => ({ answers: [] }) }
const set = (s) => saveState(SID, s)
const st = () => loadState(SID)

const commitStar = commitStarDefinition(), edit = editPlanDefinition(deps), lock = lockStageDefinition(deps), mark = markTaskDefinition(deps), rt = redteamVerdictDefinition()

console.log('① 自主进入 + 规格化（组 verify=redteam）')
let r = await commitStar.execute({ purpose: '为疲惫的都市人，在 3 分钟的微风与花开中进入治愈状态' }, exec)
console.log('   ' + r.text.split('\n')[0])
r = await edit.execute({ level: 'L1', items: [{ title: '感观核心', spec: '风与花核心体验（多行）', accept: ['操控感可描述', '花开有视觉反馈'], verify: 'redteam' }] }, exec)
await lock.execute({ level: 'L1' }, exec)
r = await edit.execute({ level: 'L2', groups: [{ title: '感观核心', items: [{ title: '微风操控', spec: '指针→风源→花瓣受风', accept: ['指向即受风（位移>10px）'], do: 'self', verify: 'self' }] }] }, exec)
await lock.execute({ level: 'L2' }, exec)
set(onReviewApproved(st()))
console.log('   进入 develop ✓')

console.log('② 小类打卡（组级红队门此时拦截 L1 标定）')
await mark.execute({ level: 'L2', title: '微风操控', status: 'completed' }, exec)
try { await mark.execute({ level: 'L1', title: '感观核心', status: 'completed' }, exec) } catch (e) { console.log('   组标定被拒：' + e.message.slice(0, 46) + '…') }

console.log('③ 组级红队：打回 → 修复 → 再裁决（再审批）')
r = await rt.execute({ level: 'L1', title: '感观核心', verdict: 'reject', issues: ['P1: 操控感缺客观判据（accept 未绑定数值）'] }, exec)
console.log('   ' + r.text.split('\n')[0].slice(0, 40) + '…')
try { await mark.execute({ level: 'L1', title: '感观核心', status: 'completed' }, exec) } catch (e) { console.log('   打回后标定仍被拒 ✓（再审批义务）') }
r = await rt.execute({ level: 'L1', title: '感观核心', verdict: 'pass' }, exec)
console.log('   ' + r.text.split('\n')[0].slice(0, 40) + '…')
r = await mark.execute({ level: 'L1', title: '感观核心', status: 'completed' }, exec)
console.log('④ 组标定放行：' + r.text.replace(/\n/g, ' ⏎ '))

rmSync(TMP, { recursive: true, force: true })
console.log('\nE2E-REDTEAM-GROUP OK')
