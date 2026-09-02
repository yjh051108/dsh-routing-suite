import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseConfirmState } from '../src/confirm.js'

test('未提问 = asked false', () => {
  assert.deepEqual(parseConfirmState([]), { asked: false, approved: null, custom: undefined })
})

test('approved 确认（selected 含 确认）', () => {
  const events = [
    { type: 'tool/call', data: { id: 'c1', name: 'ask_user_question', input: { questions: [{ id: 'graded-plan-review', question: 'OK?', options: ['确认 (Recommended)', '取消'] }] } } },
    { type: 'tool/result', data: { message: { content: [{ callId: 'c1', content: JSON.stringify({ answers: [{ id: 'graded-plan-review', selected: ['确认 (Recommended)'] }] }) }] } } },
  ]
  const r = parseConfirmState(events)
  assert.equal(r.asked, true)
  assert.equal(r.approved, true)
})

test('declined 取消（selected 含 取消）', () => {
  const events = [
    { type: 'tool/call', data: { id: 'c2', name: 'ask_user_question', input: { questions: [{ id: 'graded-plan-review' }] } } },
    { type: 'tool/result', data: { message: { content: [{ callId: 'c2', content: JSON.stringify({ answers: [{ id: 'graded-plan-review', selected: ['取消'] }] }) }] } } },
  ]
  const r = parseConfirmState(events)
  assert.equal(r.asked, true)
  assert.equal(r.approved, false)
})

test('custom 打字框意见', () => {
  const events = [
    { type: 'tool/call', data: { id: 'c3', name: 'ask_user_question', input: { questions: [{ id: 'graded-plan-review' }] } } },
    { type: 'tool/result', data: { message: { content: [{ callId: 'c3', content: JSON.stringify({ answers: [{ id: 'graded-plan-review', selected: [], custom: '第一项拆两半' }] }) }] } } },
  ]
  const r = parseConfirmState(events)
  assert.equal(r.asked, true)
  assert.equal(r.approved, false)
  assert.equal(r.custom, '第一项拆两半')
})

test('非本插件的 ask 忽略', () => {
  const events = [
    { type: 'tool/call', data: { id: 'c4', name: 'ask_user_question', input: { questions: [{ id: 'other' }] } } },
    { type: 'tool/result', data: { message: { content: [{ callId: 'c4', content: JSON.stringify({ answers: [{ id: 'other', selected: ['确认'] }] }) }] } } },
  ]
  const r = parseConfirmState(events)
  assert.equal(r.asked, false)
  assert.equal(r.approved, null)
})

test('approve label 自定义宽匹配', () => {
  const events = [
    { type: 'tool/call', data: { id: 'c5', name: 'ask_user_question', input: { questions: [{ id: 'graded-plan-review' }] } } },
    { type: 'tool/result', data: { message: { content: [{ callId: 'c5', content: JSON.stringify({ answers: [{ id: 'graded-plan-review', selected: ['approve'] }] }) }] } } },
  ]
  assert.equal(parseConfirmState(events).approved, true)
})
