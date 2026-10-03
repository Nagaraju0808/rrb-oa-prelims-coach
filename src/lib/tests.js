// Test builders: Daily Test, revision quizzes, practice tests, weekly test, full mocks (Prelims & Mains), mistake re-attempts.
import { buildQuestionSet, questionFromId, difficultyPlan, hasQuestions } from './questions/index.js'
import { dailyTestId, weakTopics, TARGET_SEC, allTopics, accuracy } from './engine.js'
import { EXAM, MAINS, SUBJECT_IDS } from './syllabus.js'
import { phaseOf, topicField, SUBJECT_SLOTS } from './plan.js'

const customOf = (state) => state.content?.questions || []
const recentIds = (state, n = 400) => new Set(Object.values(state.attempts).sort((a, b) => (a.started_at < b.started_at ? 1 : -1)).flatMap((a) => a.question_ids).slice(0, n))
const lang = (state) => state.profile?.language || 'en'
/**
 * Practice-style tests use a fixed key → fixed seed, so pressing the same button again (e.g. after going Back)
 * gives exactly the same questions. An unfinished attempt with the same key is resumed instead of recreated.
 */
const practiceKey = (kind, session_id, topics, count) => `${kind}|${session_id || ''}|${[...new Set(topics)].sort().join(',')}|${count}`
const openAttempt = (state, key) => Object.values(state.attempts || {}).find((a) => a.reuse_key === key && !a.submitted_at)
const activeTopicIds = (state, subject) => allTopics(state.content, lang(state)).filter((t) => t.subject === subject).map((t) => t.id)
const withQuestions = (state, ids) => ids.filter((t) => hasQuestions(t) || customOf(state).some((q) => q.topic === t))

/** Topics of a subject studied up to a plan day (falls back to the whole subject). */
function studiedSoFar(state, plan, dayNo, subject) {
  const ids = withQuestions(state, [...new Set(plan.filter((d) => d.day_no <= dayNo).map((d) => d[topicField(subject)]).filter((t) => t && t !== 'mixed'))])
  return ids.length ? ids : withQuestions(state, activeTopicIds(state, subject))
}

// Integrated Daily Test split (30 Q): Reasoning 8, Numerical 8, English/Hindi 5, GA 5, Computer 4.
export const DAILY_SPLIT = { reasoning: 8, numerical: 8, language: 5, ga: 5, computer: 4 }

/**
 * Question split for a Daily Test of `count` questions. Emphasis adapts automatically:
 * the Speed Building phase leans towards Reasoning/Numerical, and the weakest subject (by recent accuracy) gets +1 question.
 */
export function dailySplit(count, dayNo, state) {
  const base = { ...DAILY_SPLIT }
  if (phaseOf(dayNo)?.id === 3) { base.reasoning++; base.numerical++; base.language--; base.ga-- }
  const acc = {}
  for (const a of Object.values(state?.attempts || {})) if (a.submitted_at) for (const [sub, s] of Object.entries(a.by_subject || {})) {
    acc[sub] ||= { c: 0, n: 0 }; acc[sub].c += s.correct; acc[sub].n += s.attempted
  }
  const scored = SUBJECT_IDS.filter((k) => acc[k]?.n >= 10).sort((x, y) => accuracy(acc[x].c, acc[x].n) - accuracy(acc[y].c, acc[y].n))
  if (scored.length >= 2) { base[scored[0]]++; base[scored[scored.length - 1]]-- }
  // Scale to the configured count while keeping every subject represented.
  const total = Object.values(base).reduce((a, b) => a + b, 0)
  const out = Object.fromEntries(SUBJECT_IDS.map((k) => [k, Math.max(1, Math.round((base[k] * count) / total))]))
  let diff = count - Object.values(out).reduce((a, b) => a + b, 0)
  for (const k of ['reasoning', 'numerical', 'language', 'ga', 'computer']) { if (!diff) break; const step = diff > 0 ? 1 : -1; if (out[k] + step >= 1) { out[k] += step; diff -= step } }
  return out
}

/** Daily Test — primarily from the topics studied that day; mock days use everything studied so far, weighted to weak topics. */
export function createDailyTest({ state, plan, rday, stats, actions }) {
  const cfg = state.profile?.daily_test || { count: 30, mix: { easy: 30, medium: 50, hard: 20 } }
  const count = cfg.count || 30
  const split = dailySplit(count, rday.day_no, state)
  // One overall difficulty plan dealt out across subjects so the whole test matches the configured mix.
  const all = difficultyPlan(count, cfg.mix)
  const seed = `daily-${state.profile?.id || 'local'}-${rday.day_no}`
  let cursor = 0
  const qs = []
  for (const subject of SUBJECT_IDS) {
    const n = split[subject]
    const difficulties = all.slice(cursor, cursor + n); cursor += n
    const topic = rday[topicField(subject)]
    let topics = topic && topic !== 'mixed' && withQuestions(state, [topic]).length ? [topic] : studiedSoFar(state, plan, rday.day_no, subject)
    const weights = {}
    if (rday.weak_topic && stats[rday.weak_topic]?.subject === subject && !topics.includes(rday.weak_topic) && topic !== 'mixed') { topics = [...topics, rday.weak_topic]; weights[topics[0]] = 2 }
    if (topic === 'mixed') for (const w of weakTopics(stats, subject)) weights[w.id] = 3
    qs.push(...buildQuestionSet({ topics, count: n, mix: cfg.mix, difficulties, seed: `${seed}-${subject}`, custom: customOf(state), weights, exclude: recentIds(state) }))
  }
  const id = dailyTestId(rday.day_no)
  actions.createAttempt({ id, kind: 'daily', title: `Daily Test — Day ${rday.day_no}`, questions: qs, duration_sec: count * 60, day_no: rday.day_no,
    topics: [...new Set(qs.map((q) => q.topic))], return_to: '/today' })
  return id
}

/**
 * Revision Quiz — 10 questions on the given topic(s). Never empty: if the topics have no questions,
 * it falls back to today's topics, then to everything studied so far.
 */
export function createRevisionQuiz({ state, actions, topics, fallback = [], title, session_id = null, count = 10, return_to = '/today' }) {
  const clean = (xs) => [...new Set(xs.filter((t) => t && t !== 'mixed' && t !== 'revision'))]
  let use = withQuestions(state, clean(topics))
  if (!use.length) use = withQuestions(state, clean(fallback))
  if (!use.length) use = SUBJECT_IDS.flatMap((s) => withQuestions(state, activeTopicIds(state, s)))
  const key = practiceKey('revision-quiz', session_id, use, count)
  const open = openAttempt(state, key)
  if (open) return open.id
  const qs = buildQuestionSet({ topics: use, count, mix: { easy: 40, medium: 40, hard: 20 }, seed: key, custom: customOf(state) })
  const time = qs.reduce((s, q) => s + (TARGET_SEC[q.subject] || 36), 0) * 1.5
  return actions.createAttempt({ kind: 'revision-quiz', title: title || 'Revision Quiz', questions: qs, duration_sec: Math.max(300, Math.round(time / 60) * 60),
    session_id, topics: use, return_to, reuse_key: key })
}

export function createPractice({ state, actions, topics, count = 20, title, kind = 'practice', session_id = null, mix, minutes, return_to = null }) {
  // A topic without questions (e.g. Current Affairs before you add any) falls back to the rest of its subject.
  const key = practiceKey(kind, session_id, topics, count)
  const open = openAttempt(state, key)
  if (open) return open.id
  let use = withQuestions(state, topics)
  if (!use.length) {
    const subjects = new Set(allTopics(state.content).filter((t) => topics.includes(t.id)).map((t) => t.subject))
    use = [...subjects].flatMap((sub) => withQuestions(state, activeTopicIds(state, sub)))
  }
  const qs = buildQuestionSet({ topics: use, count, mix: mix || { easy: 30, medium: 50, hard: 20 }, seed: key, custom: customOf(state) })
  const perQ = qs.reduce((s, q) => s + (TARGET_SEC[q.subject] || 36), 0)
  return actions.createAttempt({ kind, title, questions: qs, duration_sec: Math.round((minutes ? minutes * 60 : perQ * 1.25) / 60) * 60 || 600, session_id, topics, return_to, reuse_key: key })
}

/** Weekly Test — 50 questions across every subject from this week's topics (Mon–Sat). */
export function createWeeklyTest({ state, actions, weekTopics, title = 'Weekly Test' }) {
  const per = { reasoning: 13, numerical: 13, language: 9, ga: 8, computer: 7 }
  const key = practiceKey('weekly', '', weekTopics, 50)
  const open = openAttempt(state, key)
  if (open) return open.id
  const qs = []
  for (const subject of SUBJECT_IDS) {
    const mine = withQuestions(state, weekTopics.filter((t) => activeTopicIds(state, subject).includes(t)))
    const topics = mine.length ? mine : withQuestions(state, activeTopicIds(state, subject))
    qs.push(...buildQuestionSet({ topics, count: per[subject], seed: `${key}-${subject}`, custom: customOf(state) }))
  }
  return actions.createAttempt({ kind: 'weekly', title, questions: qs, duration_sec: 50 * 60, topics: [...new Set(qs.map((q) => q.topic))], negative: 0.25, reuse_key: key })
}

// Blueprints mirror recent paper weightage (40 questions per section).
export const MOCK_BLUEPRINT = {
  reasoning: { 'linear-seating': 5, 'circular-seating': 5, 'floor-puzzle': 5, 'box-puzzle': 3, 'scheduling-puzzle': 3, 'misc-puzzles': 2, inequality: 5, syllogism: 4,
    'coding-decoding': 3, 'blood-relations': 2, 'direction-sense': 1, 'order-ranking': 1, 'alphanumeric-series': 1 },
  numerical: { simplification: 8, approximation: 5, 'number-series': 5, 'quadratic-equations': 5, 'data-interpretation': 5, percentage: 2, 'ratio-proportion': 1, average: 1,
    'profit-loss': 2, 'simple-interest': 1, 'compound-interest': 1, 'time-work': 1, 'time-distance': 1, ages: 1, 'mixture-alligation': 1 },
  language: { 'reading-comprehension': 8, 'cloze-test': 6, 'error-detection': 7, 'sentence-improvement': 4, 'fill-blanks': 5, 'para-jumbles': 3, vocabulary: 4, 'idioms-phrases': 3,
    'hindi-grammar': 20, 'hindi-vocabulary': 20 },
  ga: { 'banking-awareness': 12, 'financial-awareness': 8, 'government-schemes': 8, 'static-gk': 6, 'agriculture-rural': 4, 'current-affairs': 2 },
  computer: { 'computer-fundamentals': 6, 'computer-hardware': 5, 'computer-memory': 5, 'software-os': 5, 'ms-office': 6, 'internet-networking': 5, 'computer-security': 4,
    'keyboard-shortcuts': 3, 'dbms-basics': 1 },
}

/**
 * Full mock in the official pattern. type 'prelims' (Reasoning + Numerical, 45 min) or 'mains' (5 tests, 200 Q, 120 min).
 * Sections are sequential and separately timed; 0.25 of a question's marks is deducted per wrong answer.
 */
export function createMock({ state, actions, type = 'prelims', title, session_id = null, mix = { easy: 30, medium: 50, hard: 20 } }) {
  const pattern = type === 'mains' ? MAINS : EXAM
  const seed = `mock-${type}-${Date.now()}`
  const sections = []
  const qs = []
  const marks = {}
  for (const sec of pattern.sections) {
    const active = new Set(activeTopicIds(state, sec.subject))
    const bp = Object.entries(MOCK_BLUEPRINT[sec.subject]).filter(([t]) => active.has(t))
    const sub = []
    const used = () => new Set([...qs, ...sub].map((q) => q.id))
    for (const [topic, n] of bp) {
      const got = buildQuestionSet({ topics: [topic], count: n, mix, seed: `${seed}-${topic}`, custom: customOf(state), exclude: recentIds(state) })
      const seen = used(); sub.push(...got.filter((q) => !seen.has(q.id)))
    }
    // Top up from the whole subject — bounded, so a small question bank can never hang the app.
    for (let k = 0; k < 5 && sub.length < sec.questions; k++) {
      const seen = used()
      sub.push(...buildQuestionSet({ topics: [...active], count: sec.questions - sub.length, mix, seed: `${seed}-${sec.subject}-fill-${k}`, custom: customOf(state), exclude: seen }).filter((q) => !seen.has(q.id)))
    }
    const take = sub.slice(0, sec.questions)
    if (!take.length) continue
    marks[sec.subject] = sec.marks / sec.questions
    sections.push({ subject: sec.subject, name: sec.name, minutes: sec.minutes, marks: sec.marks, from: qs.length, to: qs.length + take.length - 1, short: take.length < sec.questions })
    qs.push(...take)
  }
  return actions.createAttempt({ kind: 'mock', mock_type: type, title: title || (type === 'mains' ? 'Full Mains Mock' : 'Full Prelims Mock'), questions: qs,
    duration_sec: sections.reduce((s, x) => s + x.minutes * 60, 0), sections, negative: pattern.negativeMark, marks, session_id })
}

export function createMistakeQuiz({ state, actions, mistakes, title = 'Mistake Book Re-attempt' }) {
  const qs = mistakes.map((m) => questionFromId(m.question_id, customOf(state))).filter(Boolean)
  if (!qs.length) return null
  return actions.createAttempt({ kind: 'mistakes', title, questions: qs, duration_sec: Math.max(300, qs.length * 60), topics: [...new Set(qs.map((q) => q.topic))] })
}

export { SUBJECT_SLOTS }
