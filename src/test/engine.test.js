import { describe, it, expect } from 'vitest'
import { studyDates, generatePlan, SLOTS, TEST_SLOT, testSuggestedMin, currentDayNo, REQUIRED_SLOTS } from '../lib/plan.js'
import { isSunday } from '../lib/dates.js'
import { revisionDates, scoreAttempt, topicStats, weakTopics, dayStatus, streak, resolveDay, createTopicRevisions, recommend, dailyTestId, sessionId, readiness, weakAreas } from '../lib/engine.js'
import { emptyState, migrate } from '../lib/store.jsx'
import { dailySplit, createRevisionQuiz, createMock, createPractice } from '../lib/tests.js'
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
  it('integrated timetable: all five subjects, revision, practice, then the Daily Test (suggested 5:30 PM)', () => {
    expect(SLOTS[SLOTS.length - 1]).toBe(TEST_SLOT)
    expect(SLOTS.filter((s) => s.mode === 'topic').map((s) => s.subject)).toEqual(['reasoning', 'numerical', 'language', 'ga', 'computer'])
    expect(testSuggestedMin(600)).toBe(17 * 60 + 30)
    expect(REQUIRED_SLOTS.map((s) => s.key)).toEqual(['reasoning', 'numerical', 'language', 'ga', 'computer', 'revision'])
  })
  it('every plan day covers all five subjects; Hindi choice switches language topics', () => {
    const en = generatePlan({ startDate: '2026-10-01' }), hi = generatePlan({ startDate: '2026-10-01', language: 'hi' })
    for (const d of en) for (const k of ['reasoning', 'numerical', 'language', 'ga', 'computer']) expect(d[`${k}_topic`], `${d.day_no} ${k}`).toBeTruthy()
    expect(hi[0].language_topic).toMatch(/^hindi-/)
    expect(en[0].language_topic).not.toMatch(/^hindi-/)
    expect(en.filter((d) => d.is_mock_day).map((d) => d.mock_type)).toContain('mains')
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
    for (const k of ['reasoning', 'numerical', 'language', 'ga', 'computer']) s.sessions[sessionId(2, k)] = { status: 'completed' }
    const r = resolveDay(s, plan[2], topicStats(s, plan), plan)
    expect(r.weak_topic).toBe('number-series')
  })
})

describe('day status, streaks and recommendations', () => {
  const plan = generatePlan({ startDate: '2026-10-01' })
  it('a past day with nothing done is missed; a full day is completed', () => {
    const s = { ...emptyState(), profile }
    expect(dayStatus(s, plan[0], '2026-10-02').status).toBe('missed')
    for (const sl of REQUIRED_SLOTS) s.sessions[sessionId(1, sl.key)] = { status: 'completed' }
    s.attempts[dailyTestId(1)] = { submitted_at: 'x', score: 20 }
    expect(dayStatus(s, plan[0], '2026-10-02').status).toBe('completed')
  })
  it('streak skips Sundays', () => {
    const s = { ...emptyState(), profile }
    for (const n of [2, 3, 4]) s.attempts[dailyTestId(n)] = { submitted_at: 'x' } // Fri 2, Sat 3, Mon 5
    expect(streak(s, plan, '2026-10-05').current).toBe(3)
  })
  it('Daily Test is NOT time-locked: recommended as soon as preparation is complete, even at 11 AM', () => {
    const s = { ...emptyState(), profile, _today: '2026-10-01' }
    const st = topicStats(s, plan)
    // Nothing done at 5:31 PM -> the coach sends you back to the plan
    expect(recommend(s, plan, '2026-10-01', 17 * 60 + 31, st).kind).toBe('session')
    expect(recommend(s, plan, '2026-10-01', 10 * 60 + 5, st).title).toMatch(/Inequality/)
    for (const sl of REQUIRED_SLOTS) s.sessions[sessionId(1, sl.key)] = { status: 'completed', slot_key: sl.key }
    const rday = resolveDay(s, plan[0], st, plan)
    expect(readiness(s, rday).ready).toBe(true)
    expect(recommend(s, plan, '2026-10-01', 11 * 60, st).kind).toBe('test')
  })
  it('readiness lists completed and remaining items', () => {
    const s = { ...emptyState(), profile, _today: '2026-10-01' }
    s.sessions[sessionId(1, 'reasoning')] = { status: 'completed' }
    const r = readiness(s, plan[0])
    expect(r.done).toBe(1); expect(r.ready).toBe(false); expect(r.remaining.length).toBe(5)
  })
  it('on Sunday recommends the weekly review', () => {
    const s = { ...emptyState(), profile, _today: '2026-10-04' }
    expect(recommend(s, plan, '2026-10-04', 600, topicStats(s, plan)).kind).toBe('weekly')
  })
})

describe('data migration (keeps existing progress)', () => {
  it('merges old concept/practice sessions into one subject session and relinks tests', () => {
    const old = { ...emptyState(), schema: 1, profile,
      sessions: {
        's-1-r-concept': { id: 's-1-r-concept', day_no: 1, date: '2026-10-01', slot_key: 'r-concept', topic_id: 'inequality', status: 'completed', elapsed_sec: 600, manual_attempted: 10, manual_correct: 8, practice_attempted: 6, practice_correct: 2 },
        's-1-r-practice': { id: 's-1-r-practice', day_no: 1, date: '2026-10-01', slot_key: 'r-practice', topic_id: 'inequality', status: 'not_started', elapsed_sec: 0 },
        's-1-n-concept': { id: 's-1-n-concept', day_no: 1, date: '2026-10-01', slot_key: 'n-concept', topic_id: 'simplification', status: 'in_progress', elapsed_sec: 120, run_started_at: 'x' },
        's-1-revision': { id: 's-1-revision', day_no: 1, date: '2026-10-01', slot_key: 'revision', status: 'not_started' },
      },
      attempts: { a: { id: 'a', session_id: 's-1-r-concept', question_ids: [] } } }
    const m = migrate(old)
    expect(m.schema).toBe(2)
    expect(m.sessions['s-1-reasoning']).toMatchObject({ status: 'completed', topic_id: 'inequality', elapsed_sec: 600, manual_attempted: 10, practice_attempted: 6 })
    expect(m.sessions['s-1-reasoning'].steps.learn).toBe(true)
    expect(m.sessions['s-1-numerical']).toMatchObject({ status: 'paused', elapsed_sec: 120 })
    expect(m.sessions['s-1-revision']).toBeTruthy()
    expect(m.sessions['s-1-r-concept']).toBeUndefined()
    expect(m.attempts.a.session_id).toBe('s-1-reasoning')
    expect(migrate(m)).toBe(m) // idempotent
  })
})

describe('tests: revision quiz, daily split, mains marks', () => {
  const fakeActions = () => { const made = []; return { made, createAttempt: (a) => { made.push(a); return 'id' } } }
  it('Revision Quiz is never empty — falls back when a topic has no questions (the old bug)', () => {
    const state = { ...emptyState(), profile }
    for (const topics of [['current-affairs'], [], ['revision'], ['mixed']]) {
      const act = fakeActions()
      createRevisionQuiz({ state, actions: act, topics, fallback: ['percentage', 'syllogism'] })
      expect(act.made[0].questions.length, JSON.stringify(topics)).toBe(10)
      expect(act.made[0].kind).toBe('revision-quiz')
    }
  })
  it('Daily Test split is 8/8/5/5/4 = 30 and adapts to the weakest subject', () => {
    expect(dailySplit(30, 1, {})).toEqual({ reasoning: 8, numerical: 8, language: 5, ga: 5, computer: 4 })
    const st = { attempts: { x: { submitted_at: 'y', by_subject: { ga: { correct: 2, attempted: 20 }, reasoning: { correct: 19, attempted: 20 } } } } }
    const sp = dailySplit(30, 1, st)
    expect(Object.values(sp).reduce((a, b) => a + b, 0)).toBe(30)
    expect(sp.ga).toBe(6); expect(sp.reasoning).toBe(7)
  })
  it('Mains mock: 5 sections in official order with official marks and negative marking', () => {
    const act = fakeActions()
    createMock({ state: { ...emptyState(), profile }, actions: act, type: 'mains' })
    const a = act.made[0]
    expect(a.sections.map((s) => s.subject)).toEqual(['reasoning', 'computer', 'ga', 'language', 'numerical'])
    expect(a.sections.map((s) => s.minutes)).toEqual([30, 15, 15, 30, 30])
    expect(a.questions.length).toBe(200)
    expect(a.marks).toEqual({ reasoning: 1.25, computer: 0.5, ga: 1, language: 1, numerical: 1.25 })
    const answers = Object.fromEntries(a.questions.map((q) => [q.id, { choice: q.answer }]))
    expect(scoreAttempt({ answers, marks: a.marks }, a.questions, 0.25).score).toBe(200)
    const q = a.questions.find((x) => x.subject === 'computer')
    expect(scoreAttempt({ answers: { ...answers, [q.id]: { choice: (q.answer + 1) % 4 } }, marks: a.marks }, a.questions, 0.25).score).toBeCloseTo(200 - 0.5 - 0.125, 1)
  })
  it('weak areas come from sub-topics below 60%', () => {
    expect(weakAreas({ by_subtopic: { a: { topic: 't', subtopic: 'A', total: 4, correct: 1 }, b: { topic: 't', subtopic: 'B', total: 2, correct: 2 } } }).map((x) => x.subtopic)).toEqual(['A'])
  })
})

describe('practice tests give the same questions every time', () => {
  const store = () => {
    const state = { ...emptyState(), profile }
    const actions = { createAttempt: (a) => { const id = `a${Object.keys(state.attempts).length}`; state.attempts[id] = { ...a, id, question_ids: a.questions.map((q) => q.id), submitted_at: null }; return id } }
    return { state, actions }
  }
  it('pressing the button again (after Back) resumes the unfinished test', () => {
    const { state, actions } = store()
    const a = createPractice({ state, actions, topics: ['percentage'], count: 15, title: 'P', session_id: 's-1-numerical' })
    const b = createPractice({ state, actions, topics: ['percentage'], count: 15, title: 'P', session_id: 's-1-numerical' })
    expect(b).toBe(a)
    expect(Object.keys(state.attempts).length).toBe(1)
  })
  it('even after finishing, the same button builds the same questions', () => {
    const { state, actions } = store()
    const a = createPractice({ state, actions, topics: ['syllogism'], count: 20, title: 'T', kind: 'topic' })
    state.attempts[a].submitted_at = 'done'
    const b = createPractice({ state, actions, topics: ['syllogism'], count: 20, title: 'T', kind: 'topic' })
    expect(b).not.toBe(a)
    expect(state.attempts[b].question_ids).toEqual(state.attempts[a].question_ids)
  })
  it('the revision quiz is stable too', () => {
    const { state, actions } = store()
    const a = createRevisionQuiz({ state, actions, topics: ['inequality'], session_id: 's-1-revision' })
    state.attempts[a].submitted_at = 'done'
    const b = createRevisionQuiz({ state, actions, topics: ['inequality'], session_id: 's-1-revision' })
    expect(state.attempts[b].question_ids).toEqual(state.attempts[a].question_ids)
  })
})
