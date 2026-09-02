import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePlanTree, isL1, isL2, isGradedList, groupDone, currentFocus } from '../src/plan-tree.js'

const todos = [
  { content: '#L1 店壳', status: 'in_progress' },
  { content: '#L2 店壳 | 玻璃橱窗 | 概念≤3: 玻璃,窗框,雨痕', status: 'pending' },
  { content: '#L2 店壳 | 自动门 | 概念≤3: 门体,开合动画', status: 'completed' },
  { content: '#L2 店壳 | 招牌灯箱 | 概念≤3: 灯箱,字体,微闪', status: 'pending' },
  { content: '#L1 店内', status: 'pending' },
  { content: '#L2 店内 | 货架组 | 概念≤3: 货架,商品', status: 'pending' },
  { content: '普通行也应该保留', status: 'pending' },
]

test('isL1/isL2 前缀识别', () => {
  assert.ok(isL1('#L1 店壳'))
  assert.ok(isL2('#L2 店壳 | 玻璃橱窗 | 概念≤3: 玻璃,窗框,雨痕'))
  assert.ok(!isL1('普通行'))
})

test('parsePlanTree 解析成树', () => {
  const plan = parsePlanTree(todos)
  assert.equal(plan.roots.length, 2)
  assert.equal(plan.roots[0].title, '店壳')
  assert.equal(plan.roots[0].items.length, 3)
  assert.equal(plan.roots[1].title, '店内')
  assert.equal(plan.roots[1].items.length, 1)
  assert.equal(plan.loose.length, 1) // 普通行
  const glass = plan.roots[0].items[0]
  assert.equal(glass.conceptCount, 3)
  assert.deepEqual(glass.concepts, ['玻璃', '窗框', '雨痕'])
  const door = plan.roots[0].items[1]
  assert.equal(door.status, 'completed')
})

test('概念数：无显式数字时按拆分算', () => {
  const plan = parsePlanTree([
    { content: '#L1 店壳' },
    { content: '#L2 店壳 | 招牌灯箱 | 概念: 灯箱,字体,微闪' },
  ])
  assert.equal(plan.roots[0].items[0].conceptCount, 3)
})

test('groupDone 大类是否全完成', () => {
  const plan = parsePlanTree(todos)
  assert.ok(!groupDone(plan.roots[0])) // 有 2 项 pending
  const donePlan = parsePlanTree([
    { content: '#L1 店壳', status: 'pending' },
    { content: '#L2 店壳 | 玻璃橱窗 | 概念≤3: 玻璃', status: 'completed' },
  ])
  assert.ok(groupDone(donePlan.roots[0]))
})

test('currentFocus 第一个未完成小类', () => {
  const plan = parsePlanTree(todos)
  const f = currentFocus(plan)
  assert.equal(f.group.title, '店壳')
  assert.equal(f.item.title, '玻璃橱窗')
})

test('单行合并格式解析（#L1 A | #L2-1 B (概念)）', () => {
  const plan = parsePlanTree([
    { content: '#L1 系统基底 | #L2-1 运行时脚手架 (页面壳, 渲染器/相机, 轨道控制器) — 待复核', status: 'pending' },
    { content: '#L1 系统基底 | #L2-2 三渲二管线 (分级渐变贴图, 卡通光照组) — 待复核', status: 'pending' },
    { content: '#L1 店壳 | #L2-7 建筑体块与分色 (体块, 立面分色, 雨棚屋檐) — 待复核', status: 'pending' },
  ])
  assert.equal(plan.roots.length, 2)
  assert.equal(plan.roots[0].title, '系统基底')
  assert.equal(plan.roots[0].items.length, 2)
  assert.equal(plan.roots[0].items[0].title, '运行时脚手架')
  assert.deepEqual(plan.roots[0].items[0].concepts, ['页面壳', '渲染器/相机', '轨道控制器'])
  assert.equal(plan.roots[0].items[0].conceptCount, 3)
  const f = currentFocus(plan)
  assert.equal(f.item.title, '运行时脚手架')
})

test('isGradedList', () => {
  assert.ok(isGradedList(parsePlanTree(todos)))
  assert.ok(!isGradedList(parsePlanTree([{ content: '普通行' }])))
})
