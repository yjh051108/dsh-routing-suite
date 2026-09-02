import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  phaseL1, phaseL2, approvedToDevelop, focusL2, focusL2GroupOpen, focusL2Last,
  groupCheck, finalCheck, modeTail, modeName, modeCenter, verifyLaw, doSummary, verifySummary,
  delegateSpec, workflowSpec, formSection, redteamSpec, dualSpec, reviewPendingText, offReceipt, specSheet, rejectAck, starAnchor,
  brainStormText, starPurpose, northStarLong, northStarShort, approvedKickoff,
} from '../src/inject-text.js'

test('verifyLaw 无“开工前自问”（声明式移除）；铁律③保留', () => {
  assert.doesNotMatch(verifyLaw('correct'), /开工前自问/)
  assert.doesNotMatch(verifyLaw('experience'), /开工前自问/)
  assert.doesNotMatch(verifyLaw('research'), /开工前自问/)
  assert.match(verifyLaw('correct'), /两遍法/)
  assert.match(verifyLaw('experience'), /体感优先/)
  assert.match(verifyLaw('research'), /可复核性/)
})

import { treeText } from '../src/mode-state.js'

test('focus 小类粒度模式：item.mode 覆盖会话模式（全栈任务分重心）', () => {
  const item = { title: 'X', spec: 's', accept: ['a'], do: 'self', verify: 'self', mode: 'experience' }
  // 会话 correct、小类 experience → 注入按 experience（体感优先）
  const t = focusL2('组', item, null, 'correct', '为治愈者带来一分钟平静')
  assert.match(t, /本小类模式：体验（E）/)
  assert.match(t, /体感优先/)
  assert.doesNotMatch(t, /③ 两遍法/) // experience 铁律非 correct 措辞（形态摘要含"两遍法"属 verifySummary 正常）
  // 无 item.mode → 继承会话
  const t2 = focusL2('组', { ...item, mode: undefined }, null, 'research', '')
  assert.match(t2, /本小类模式：研究（R）/)
  assert.match(t2, /可复核性/)
  // treeText 标注小类模式
  const plan = { groups: [{ title: 'A', spec: 's', accept: ['a'], verify: 'self', items: [{ title: '项', concepts: [], spec: 's2', accept: ['a2'], mode: 'experience', do: 'self', verify: 'self' }] }] }
  assert.match(treeText(plan), /模式:验/)
  const planInherit = { groups: [{ title: 'A', spec: 's', accept: ['a'], verify: 'self', items: [{ title: '项', concepts: [], spec: 's2', accept: ['a2'], mode: '', do: 'self', verify: 'self' }] }] }
  assert.doesNotMatch(treeText(planInherit), /模式:/)
})

test('starAnchor：北极星元认知锚定（目的+验收锚，非自我质询）', () => {
  const a = starAnchor({ accept: ['指向即受风（位移>10px）'], spec: 's' }, '为疲惫的都市人，在 3 分钟的微风与花开中进入治愈状态')
  assert.match(a, /北极星锚定/)
  assert.match(a, /本小类服务于/)
  assert.match(a, /验收锚：指向即受风（位移>10px）/)
  assert.match(a, /回到砖上/)
  // 无 purpose 兜底（目的锚定版）
  assert.match(starAnchor({ accept: [], spec: '任务说明' }, ''), /目的锚定/)
  assert.match(starAnchor({ accept: [], spec: '任务说明' }, ''), /按它做、验它过/)
})

test('rejectAck：回滚后开口引导（时序空窗修复）', () => {
  const t = rejectAck()
  assert.match(t, /已按意见解锁/)
  assert.match(t, /按用户意见修订/)
  assert.match(t, /修订与呈现是必走环节/)
})

test('offReceipt：关闭回执含已关闭+回归常规+重开途径', () => {
  const t = offReceipt()
  assert.match(t, /分级模式已关闭/)
  assert.match(t, /回归常规模式/)
  assert.match(t, /@graded <任务> 重新开启/)
})

test('specSheet：完整规格评审单（北极星+需求计数+规格树）——锁定回执呈现', () => {
  const st = { star: { purpose: '为学习者快速留痕', requirements: ['R1', 'R2'], nonGoals: ['N1'], assumptions: ['A1'], aligned: true }, plan: { groups: [{ title: '组A', spec: 's', accept: ['a'], verify: 'self', items: [{ title: '项一', concepts: [], spec: 's2', accept: ['a2'], do: 'self', verify: 'self', status: 'pending' }] }] } }
  const t = specSheet(st)
  assert.match(t, /【北极星】为学习者快速留痕/)
  assert.match(t, /需求 2 条 \/ 非目标 1 条 \/ 假设 1 条/)
  assert.match(t, /#L1 组A｜ s｜ 验收:a｜ 收官验:self/)
  assert.match(specSheet({ star: { aligned: false } }), /北极星未定稿/)
})

test('reviewPendingText（3.1 修订）：简短提示——规格单引锁定回执', () => {
  const t = reviewPendingText()
  assert.match(t, /完整规格评审单见上方锁定回执/)
  assert.match(t, /不要调用 ask_user_question/)
  assert.doesNotMatch(t, /【北极星】/)
})

test('北极星：长版取 star.purpose / 浓缩版组入口 / approvedKickoff 含确认+长版', () => {
  const st = { star: { purpose: '为学习者快速留痕' }, mode: 'correct' }
  const long = northStarLong(st)
  assert.match(long, /为学习者快速留痕/)
  assert.match(long, /以目的为导向/)
  assert.match(long, /远处站岗/)
  assert.match(long, /不再重复/)
  const item = { title: '首项', accept: ['判定 A', '判定 B'] }
  const short = northStarShort(st, item)
  assert.match(short, /北极星·本组/)
  assert.match(short, /为学习者快速留痕/)
  assert.match(short, /当前唯一任务=首项/)
  assert.match(short, /验收锚=判定 A；判定 B/)
  const k = approvedKickoff(st)
  assert.match(k, /清单已确认 ✅/)
  assert.match(k, /为学习者快速留痕/)
  assert.match(k, /不打卡就停/)
  // 组入口前置浓缩版
  const g = focusL2GroupOpen('组', item, 'correct', '为学习者快速留痕')
  assert.match(g, /（北极星·本组）本组仍服务于：为学习者快速留痕/)
  // 未定稿兜底
  assert.match(northStarLong({ star: { purpose: '' } }), /需求对齐时定稿/)
})

test('brainStormText：出题式对齐（ask_user_question 选择题/多轮/歧义结清才定稿+必选模式题）', () => {
  const t = brainStormText('做 X')
  assert.match(t, /用 \*\*ask_user_question\*\* 出一组选择题/)
  assert.match(t, /≤5 题\/轮；可多轮/)
  assert.match(t, /所有歧义点都有明确选择/)
  assert.match(t, /本任务验收模式（\*\*必选\*\*）/)
  assert.match(t, /correct=代码\/数据\/接口/)
  assert.match(t, /experience=视觉\/交互\/氛围\/手感/)
  assert.match(t, /最多 3 轮/)
  assert.match(t, /commit_star/)
  assert.match(t, /闭不了环就标注假设，而不是不写/)
})

test('focus 模式标注无重复右括号（modeName 自带括号）', () => {
  const t = focusL2('组', { title: 'X', spec: 's', accept: ['a'], do: 'self', verify: 'self' }, null, 'correct', '')
  assert.doesNotMatch(t, /））：/)
  assert.match(t, /本小类模式：正确性（C）；/)
})

test('starPurpose：定稿取 purpose / 未定稿空', () => {
  assert.equal(starPurpose(null), '')
  assert.equal(starPurpose({ star: null }), '')
  assert.equal(starPurpose({ star: { purpose: ' 为学习者快速留痕 ' } }), '为学习者快速留痕')
  assert.equal(starPurpose({ star: { purpose: '   ' } }), '')
})

test('modeName / modeCenter 映射与容错', () => {
  assert.equal(modeName('correct'), '正确性（C）')
  assert.equal(modeName('experience'), '体验（E）')
  assert.equal(modeName('research'), '研究（R）')
  assert.equal(modeName('nope'), modeName('correct')) // 未知回退 correct
  assert.match(modeCenter('experience'), /体感/)
  assert.match(modeCenter('research'), /可复核/)
})

test('phaseL1 含三种模式自报引导 + "只改验收重心"承诺', () => {
  const t = phaseL1('分析 X')
  assert.match(t, /\[模式:correct\]/)
  assert.match(t, /\[模式:experience\]/)
  assert.match(t, /\[模式:research\]/)
  assert.match(t, /模式只改"验收重心"，不改任务与范围/)
  assert.match(t, /写在回应首行，系统据此切换本会话全部验收引导/)
})

test('phaseL2 / approvedToDevelop 按模式声明重心', () => {
  assert.match(phaseL2('experience'), /体验（E）/)
  assert.match(phaseL2('research'), /可复核性/)
  assert.match(approvedToDevelop('experience'), /体验（E）.*验收重心=体感验收/)
})

test('modeTail：correct 空(铁律即重心), experience/research 各一句重心尾句', () => {
  assert.equal(modeTail('correct'), '')
  assert.equal(modeTail('nope'), '')
  const e = modeTail('experience')
  assert.match(e, /体验验收（本模式重心/)
  assert.match(e, /像不像 \/ 顺不顺 \/ 最该改/)
  assert.match(e, /禁止用指标冒充感受/)
  const r = modeTail('research')
  assert.match(r, /可复核性（本模式重心/)
  assert.match(r, /复现路径/)
  assert.match(r, /未证实/)
})

test('focusL2* 规格前置三段式（spec→accept→形态→铁律→打卡→门禁）', () => {
  const item = {
    title: '触发与首注', spec: '验证 phaseL1 单注', accept: ['日志中恰 1 次', '工具就位'],
    do: 'subagent', verify: 'redteam', concepts: ['a', 'b'],
  }
  const e = focusL2('组', item, '前项', 'experience')
  assert.match(e, /【本小类任务】验证 phaseL1 单注/)
  assert.match(e, /【本小类验收标准】[\s\S]*· 日志中恰 1 次[\s\S]*· 工具就位/)
  assert.match(e, /【执行形态·委派】do=subagent/)
  assert.match(e, /verify=redteam · 冷视角红队裁决/)
  assert.match(e, /唯一推进负责人/)
  assert.match(e, /体感优先/)
  assert.match(e, /mark_task\*\*\(level="L2", title="触发与首注"/)
  const r = focusL2GroupOpen('组', { ...item, accept: [] }, 'research')
  assert.match(r, /先声明两句话再开工/)
  assert.match(r, /可复核性/)
  const c = focusL2Last('组', item, '前项', 'correct')
  assert.match(c, /这是本大类最后一个小类/)
  assert.match(c, /只此一个 mark_task/)
  assert.match(c, /两遍法/)
})

test('verifyLaw / doSummary / verifySummary：模式措辞与枚举摘要', () => {
  assert.match(verifyLaw('correct'), /两遍法/)
  assert.match(verifyLaw('experience'), /体感优先/)
  assert.match(verifyLaw('research'), /可复核性/)
  assert.match(doSummary('workflow'), /workflow 批量编排/)
  assert.match(doSummary('subagent'), /委派/)
  assert.match(verifySummary('dual'), /双轨并行/)
  assert.equal(verifySummary('self'), '自查证据链（开发方自验+两遍法）')
})

test('组收官四段：组标准逐条核对 + verify 注入四档 + redteam 先裁', () => {
  const g = { title: '组A', accept: ['标准1', '标准2'], verify: 'redteam' }
  const t = groupCheck(g, 'correct')
  assert.match(t, /组级验收标准·逐条核对\*\*（严苛程度\*\*高于小类\*\*/)
  assert.match(t, /· 标准1 → /)
  assert.match(t, /· 标准2 → /)
  assert.match(t, /组级红队裁决/)
  assert.match(t, /redteam_verdict\*\*\(level="L1", title="组A"/)
  assert.match(t, /通过后才允许标定/)
  assert.match(groupCheck({ ...g, verify: 'user' }), /用户复核/)
  assert.match(groupCheck({ ...g, verify: 'subagent' }), /独立 subagent/)
  const selfT = groupCheck({ ...g, verify: 'self' })
  assert.match(selfT, /自验收/)
  assert.match(selfT, /最挑剔观者/)
  assert.match(groupCheck({ title: '组B', verify: 'self' }), /组级无标准——回退小类证据链/)
})

test('redteam/dual 规范 + formSection 追加分支 + 铁律任意形态不变', () => {
  assert.match(redteamSpec(), /允许集内\*\*自主\*\*决定/)
  assert.match(redteamSpec(), /再审批铁律/)
  assert.match(redteamSpec(), /自演红队=同义务/)
  assert.match(redteamSpec(), /未 pass 不得 mark_task/)
  assert.match(dualSpec(), /验证轨\*\*独立于\*\*开发轨/)
  assert.match(dualSpec(), /"达到标准"才算/)
  const fs = formSection({ title: 'X', spec: 's', accept: ['a'], do: 'self', verify: 'redteam' })
  assert.match(fs, /红队裁决规范/)
  assert.match(fs, /verify=redteam · 冷视角红队裁决/)
  const fd = formSection({ title: 'X', spec: 's', accept: ['a'], do: 'subagent', verify: 'dual' })
  assert.match(fd, /双轨并行规范/)
  assert.match(fd, /委派 skill/)
  // 铁律固定：verify 不影响铁律文本
  const l1 = focusL2('组', { title: 'X', spec: 's', accept: ['a'], do: 'self', verify: 'redteam' }, null, 'correct')
  assert.match(l1, /两遍法/)
})

test('委派/编排 skill 卡 + formSection 渲染分支', () => {
  const item = { title: 'X', spec: '任务 X', accept: ['标准1'], do: 'subagent', verify: 'redteam' }
  assert.match(delegateSpec(item), /委派 skill/)
  assert.match(delegateSpec(item), /委派通道（自主决策）/)
  assert.match(delegateSpec(item), /后台（run_in_background=true，默认推荐/)
  assert.match(delegateSpec(item), /阻塞/)
  assert.match(delegateSpec(item), /允许基于情景合理改写/)
  assert.match(workflowSpec({ ...item, do: 'workflow' }), /编排 skill/)
  assert.match(workflowSpec({ ...item, do: 'workflow' }), /护栏/)
  const fs = formSection(item)
  assert.match(fs, /【执行形态·委派】do=subagent/)
  assert.match(fs, /verify=redteam · 冷视角红队裁决/)
  assert.match(formSection({ ...item, do: 'workflow' }), /【执行形态·编排】/)
  assert.match(formSection({ ...item, do: 'self' }), /【执行形态】do=self · 自执行/)
})

test('groupCheck（3.1）②=组级标准逐条核对（模式不再改②措辞——统一语义）', () => {
  const g = { title: '组', accept: ['标准'], verify: 'self' }
  for (const mode of ['correct', 'experience', 'research']) {
    assert.match(groupCheck(g, mode), /组级验收标准·逐条核对/)
    assert.doesNotMatch(groupCheck(g, mode), /体验过目/)
    assert.doesNotMatch(groupCheck(g, mode), /可复核过目/)
  }
})

test('finalCheck 按模式取⑥措辞,均保留"不可替代为指标"语义', () => {
  assert.match(finalCheck('experience'), /完整玩一遍/)
  assert.match(finalCheck('experience'), /体验不过=不通过/)
  assert.match(finalCheck('research'), /终验可复核性（本模式重心·独立项）/)
  assert.match(finalCheck('research'), /挑至少 2 条亲自复现/)
  assert.match(finalCheck('correct'), /试玩\/通读\/走查\/试运行/)
  assert.match(finalCheck('correct'), /体验不过=不通过/)
})
