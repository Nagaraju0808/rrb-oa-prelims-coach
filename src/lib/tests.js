// Test builders: Daily Test, practice tests, full mocks, mistake re-attempts.
import { buildQuestionSet, topicIdsBySubject, questionFromId, difficultyPlan } from './questions/index.js'
import { dailyTestId, weakTopics, TARGET_SEC, allTopics } from './engine.js'
import { EXAM } from './syllabus.js'

const customOf = (state) => state.content?.questions || []
const recentIds = (state, n = 400) => new Set(Object.values(state.attempts).sort((a, b) => (a.started_at < b.started_at ? 1 : -1)).flatMap((a) => a.question_ids).slice(0, n))
const activeTopicIds = (state, subject) => allTopics(state.content).filter((t) => t.subject === subject).map((t) => t.id)

function studiedSoFar(plan, dayNo, subject) {
  const key = subject === 'reasoning' ? 'reasoning_topic' : 'numerical_topic'
  const ids = [...new Set(plan.filter((d) => d.day_no <= dayNo).map((d) => d[key]).filter((t) => t !== 'mixed'))]
  return ids.length ? ids : topicIdsBySubject(subject)
}

/** Daily Test — questions only from the topics studied that day (mock days: everything studied so far, weighted to weak topics). */
export function createDailyTest({ state, plan, rday, stats, actions }) {
  const cfg = state.profile?.daily_test || { count: 30, mix: { easy: 30, medium: 50, hard: 20 } }
  const count = cfg.count || 30
  const half = Math.ceil(count / 2)
  // Split one overall difficulty plan between the two subjects so the whole test matches the configured mix exactly.
  const all = difficultyPlan(count, cfg.mix)
  const split = { reasoning: all.filter((_, i) => i % 2 === 0), numerical: all.filter((_, i) => i % 2 === 1) }
  const seed = `daily-${state.profile?.id || 'local'}-${rday.day_no}`
  const pick = (subject, n, topic) => {
    const difficulties = split[subject].slice(0, n)
    let topics = topic && topic !== 'mixed' ? [topic] : studiedSoFar(plan, rday.day_no, subject)
    const weights = {}
    if (rday.weak_topic && stats[rday.weak_topic]?.subject === subject && !topics.includes(rday.weak_topic) && topic !== 'mixed') topics = [...topics, rday.weak_topic]
    if (topic === 'mixed') for (const w of weakTopics(stats, subject)) weights[w.id] = 3
    else if (topics.length > 1) weights[topics[0]] = 2 // the day's main topic dominates; the weak/carried topic adds a few questions
    return buildQuestionSet({ topics, count: n, mix: cfg.mix, difficulties, seed: `${seed}-${subject}`, custom: customOf(state), weights, exclude: recentIds(state) })
  }
  const qs = [...pick('reasoning', half, rday.reasoning_topic), ...pick('numerical', count - half, rday.numerical_topic)]
  const id = dailyTestId(rday.day_no)
  actions.createAttempt({ id, kind: 'daily', title: `Daily Test — Day ${rday.day_no}`, questions: qs, duration_sec: count * 60, day_no: rday.day_no,
    topics: [...new Set(qs.map((q) => q.topic))] })
  return id
}

export function createPractice({ state, actions, topics, count = 20, title, kind = 'practice', session_id = null, mix, minutes }) {
  const qs = buildQuestionSet({ topics, count, mix: mix || { easy: 30, medium: 50, hard: 20 }, seed: `${kind}-${Date.now()}`, custom: customOf(state), exclude: recentIds(state) })
  const perQ = qs.reduce((s, q) => s + (TARGET_SEC[q.subject] || 36), 0)
  return actions.createAttempt({ kind, title, questions: qs, duration_sec: Math.round((minutes ? minutes * 60 : perQ * 1.25) / 60) * 60 || 600, session_id, topics })
}

// Official prelims: 40 Reasoning (25 min) + 40 Numerical Ability (20 min). Blueprint mirrors recent paper weightage.
export const MOCK_BLUEPRINT = {
  reasoning: { 'linear-seating': 5, 'circular-seating': 5, 'floor-puzzle': 5, 'box-puzzle': 3, 'scheduling-puzzle': 3, 'misc-puzzles': 2, inequality: 5, syllogism: 4,
    'coding-decoding': 3, 'blood-relations': 2, 'direction-sense': 1, 'order-ranking': 1, 'alphanumeric-series': 1 },
  numerical: { simplification: 8, approximation: 5, 'number-series': 5, 'quadratic-equations': 5, 'data-interpretation': 5, percentage: 2, 'ratio-proportion': 1, average: 1,
    'profit-loss': 2, 'simple-interest': 1, 'compound-interest': 1, 'time-work': 1, 'time-distance': 1, ages: 1, 'mixture-alligation': 1 },
}

export function createMock({ state, actions, title = 'Full Prelims Mock', session_id = null, mix = { easy: 30, medium: 50, hard: 20 } }) {
  const seed = `mock-${Date.now()}`
  const sections = []
  const qs = []
  for (const sec of EXAM.sections) {
    const active = new Set(activeTopicIds(state, sec.subject))
    const bp = Object.entries(MOCK_BLUEPRINT[sec.subject]).filter(([t]) => active.has(t))
    const sub = []
    for (const [topic, n] of bp) sub.push(...buildQuestionSet({ topics: [topic], count: n, mix, seed: `${seed}-${topic}`, custom: customOf(state), exclude: recentIds(state) }))
    while (sub.length < sec.questions) sub.push(...buildQuestionSet({ topics: [...active], count: sec.questions - sub.length, mix, seed: `${seed}-${sec.subject}-fill-${sub.length}`, custom: customOf(state) }))
    sections.push({ subject: sec.subject, name: sec.name, minutes: sec.minutes, from: qs.length, to: qs.length + sec.questions - 1 })
    qs.push(...sub.slice(0, sec.questions))
  }
  const id = actions.createAttempt({ kind: 'mock', title, questions: qs, duration_sec: EXAM.sections.reduce((s, x) => s + x.minutes * 60, 0), sections, negative: EXAM.negativeMark, session_id })
  return id
}

export function createMistakeQuiz({ state, actions, mistakes, title = 'Mistake Book Re-attempt' }) {
  const qs = mistakes.map((m) => questionFromId(m.question_id, customOf(state))).filter(Boolean)
  if (!qs.length) return null
  return actions.createAttempt({ kind: 'mistakes', title, questions: qs, duration_sec: Math.max(300, qs.length * 60), topics: [...new Set(qs.map((q) => q.topic))] })
}
