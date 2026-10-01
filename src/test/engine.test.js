import { describe, it, expect } from 'vitest'
import { studyDates, generatePlan, SLOTS, TEST_SLOT, testUnlockMin, currentDayNo } from '../lib/plan.js'
import { isSunday } from '../lib/dates.js'
import { revisionDates, scoreAttempt, topicStats, weakTopics, dayStatus, streak, resolveDay, createTopicRevisions, recommend, dailyTestId, sessionId } from '../lib/engine.js'
import { emptyState } from '../lib/store.jsx'
import { generateQuestion } from '../lib/questions/index.js'

const profile = { start_date: '2026-10-01', level: 'beginner', reasoning_confidence: 'average', numerical_confidence: 'average', study_start_min: 600 }

describe('60-day plan', () => {
  it('has exactly 60 study days and never a Sunday', () => {
    const d = studyDates('2026-10-01')
    expect(d.length).toBe(60)
    expect(d.some(isSunday)).toBe(false)
    expect(new Set(d).size).toBe(60)
  })
  it('computes dates from the start date (Thu 1 Oct 2026 → Day 60 on Wed 9 Dec)', () => {
    const d = studyDates('2026-10-01')
    expect(d[0]).toBe('2026-10-01')
    expect(d[3]).toBe('2026-10-05') // skips Sunday 4 Oct
    expect(d[59]).toBe('2026-12-09')
  })
  it('a Sunday start begins on Monday', () => {
    expect(studyDates('2026-10-04')[0]).toBe('2026-10-05')
  })
  it('assigns the five phases to the right day ranges', () => {
    const p = generatePlan({ startDate: '2026-10-01' })
    expect(p.filter((d) => d.phase === 1).length).toBe(15)
    expect(p.filter((d) => d.phase === 2).length).toBe(15)
    expect(p.filter((d) => d.phase === 3).length).toBe(12)
    expect(p.filter((d) => d.phase === 4).length).toBe(8)
    expect(p.filter((d) => d.phase === 5).length).toBe(10)
    expect(p.filter((d) => d.is_mock_day).map((d) => d.day_no)).toEqual([51, 52, 53, 54, 55, 56, 57, 58, 59, 60])
  })
  it('applies admin overrides', () => {
    const p = generatePlan({ startDate: '2026-10-01' }, { 3: { reasoning: 'syllogism', numerical: 'average' } })
    expect(p[2].reasoning_topic).toBe('syllogism')
    expect(p[2].numerical_topic).toBe('average')
  })
  it('currentDayNo handles before / during / Sunday / after', () => {
    const p = generatePlan({ startDate: '2026-10-01' })
    expect(currentDayNo(p, '2026-09-30')).toBe(0)
    expect(currentDayNo(p, '2026-10-03')).toBe(3)
    expect(currentDayNo(p, '2026-10-04')).toBe(3)
    expect(currentDayNo(p, '2027-01-01')).toBe(60)
  })
})

describe('timetable', () => {
  it('Daily Test is the final session, 5:30–6:00 PM by default', () => {
    expect(SLOTS[SLOTS.length - 1]).toBe(TEST_SLOT)
    expect(Math.max(...SLOTS.map((s) => s.end))).toBe(TEST_SLOT.end)
    expect(testUnlockMin(600)).toBe(17 * 60 + 30)
    expect(600 + TEST_SLOT.end).toBe(18 * 60)
  })
  it('shifting study hours keeps the test last', () => {
    expect(testUnlockMin(540)).toBe(16 * 60 + 30)
  })
})

describe('revision engine', () => {
  it('schedules Day +1, +4, +7, +14, +30 and moves Sundays to Monday', () => {
    expect(revisionDates('2026-10-01')).toEqual(['2026-10-02', '2026-10-05', '2026-10-08', '2026-10-15', '2026-10-31'])
    expect(revisionDates('2026-10-03')[0]).toBe('2026-10-05') // +1 lands on Sunday → Monday
  })
  it('does not duplicate revisions for the same learning day', () => {
    const s = emptyState()
    for (const r of createTopicRevisions(s, 'syllogism', '2026-10-01')) s.revisions[r.id] = r
    expect(Object.keys(s.revisions).length).toBe(5)
    expect(createTopicRevisions(s, 'syllogism', '2026-10-01').length).toBe(0)
  })
})

function attemptWith(questions, choices, extra = {}) {
  const answers = {}
  questions.forEach((q, i) => { if (choices[i] !== null) answers[q.id] = { choice: choices[i] === 'right' ? q.answer : (q.answer + 1) % 4, time_sec: 30 } })
  return { id: 'a1', answers, question_ids: questions.map((q) => q.id), ...extra }
}

describe('scoring', () => {
  const qs = [0, 1, 2, 3].map((i) => generateQuestion('percentage', 'easy', i))
  it('computes correct / wrong / skipped / accuracy', () => {
    const r = scoreAttempt(attemptWith(qs, ['right', 'right', 'wrong', null]), qs)
    expect([r.correct, r.wrong, r.skipped]).toEqual([2, 1, 1])
    expect(r.accuracy).toBe(66.7)
    expect(r.score).toBe(2)
  })
  it('applies 0.25 negative marking for mocks', () => {
    const r = scoreAttempt(attemptWith(qs, ['right', 'wrong', 'wrong', null]), qs, 0.25)
    expect(r.score).toBe(0.5)
  })
})

function stateWithAnswers(topic, correctFlags, date = '2026-10-02') {
  const s = { ...emptyState(), profile, _today: '2026-10-03' }
  const qs = correctFlags.map((_, i) => generateQuestion(topic, 'medium', `w${i}`))
  const a = attemptWith(qs, correctFlags.map((c) => (c ? 'right' : 'wrong')))
  const sc = scoreAttempt(a, qs)
  s.attempts.a1 = { ...a, kind: 'practice', date, submitted_at: 'x', meta: sc.meta, ...sc }
  return s
}

describe('weak topic detection', () => {
  it('flags a topic below 70% recent accuracy as weak', () => {
    const s = stateWithAnswers('number-series', [true, false, false, true, false, true, false, false, true, false])
    const st = topicStats(s)
    expect(st['number-series'].recentAccuracy).toBe(40)
    expect(weakTopics(st).map((w) => w.id)).toContain('number-series')
  })
  it('needs at least 5 attempts before judging', () => {
    const s = stateWithAnswers('percentage', [false, false, false])
    expect(topicStats(s).percentage.status).toBe('new')
  })
  it('an incomplete concept session from the previous day is carried forward first', () => {
    const s = stateWithAnswers('number-series', [false, false, false, false, false, true])
    const plan = generatePlan({ startDate: '2026-10-01' })
    const r = resolveDay(s, plan[2], topicStats(s, plan), plan)
    expect(r.weak_topic).toBe(plan[1].reasoning_topic)
    expect(r.weak_reason).toMatch(/Carried forward/)
  })
  it('otherwise weak topics fill the Weak Topic slot', () => {
    const s = stateWithAnswers('number-series', [false, false, false, false, false, true])
    const plan = generatePlan({ startDate: '2026-10-01' })
    for (const k of ['r-concept', 'n-concept']) s.sessions[sessionId(2, k)] = { status: 'completed' }
    const r = resolveDay(s, plan[2], topicStats(s, plan), plan)
    expect(r.weak_topic).toBe('number-series')
  })
})

describe('day status, streaks and recommendations', () => {
  const plan = generatePlan({ startDate: '2026-10-01' })
  it('a past day with nothing done is missed; a full day is completed', () => {
    const s = { ...emptyState(), profile }
    expect(dayStatus(s, plan[0], '2026-10-02').status).toBe('missed')
    for (const sl of SLOTS.filter((x) => x.kind === 'study')) s.sessions[sessionId(1, sl.key)] = { status: 'completed' }
    s.attempts[dailyTestId(1)] = { submitted_at: 'x', score: 20 }
    expect(dayStatus(s, plan[0], '2026-10-02').status).toBe('completed')
  })
  it('streak skips Sundays', () => {
    const s = { ...emptyState(), profile }
    for (const n of [2, 3, 4]) s.attempts[dailyTestId(n)] = { submitted_at: 'x' } // Fri 2, Sat 3, Mon 5
    expect(streak(s, plan, '2026-10-05').current).toBe(3)
  })
  it('recommends the Daily Test once unlocked, otherwise the current session', () => {
    const s = { ...emptyState(), profile, _today: '2026-10-01' }
    const st = topicStats(s, plan)
    expect(recommend(s, plan, '2026-10-01', 17 * 60 + 31, st).kind).toBe('test')
    const r = recommend(s, plan, '2026-10-01', 10 * 60 + 5, st)
    expect(r.kind).toBe('session')
    expect(r.title).toMatch(/Inequality/)
  })
  it('on Sunday recommends the weekly review', () => {
    const s = { ...emptyState(), profile, _today: '2026-10-04' }
    expect(recommend(s, plan, '2026-10-04', 600, topicStats(s, plan)).kind).toBe('weekly')
  })
})
