// Pure functions that derive progress, analytics and recommendations from stored records.
import { addDays, diffDays, isSunday, weekStart } from './dates.js'
import {
  STUDY_SLOTS, SUBJECT_SLOTS, REQUIRED_SLOTS, generatePlan, TOTAL_STUDY_DAYS, testSuggestedMin, slotTimes, DEFAULT_START_MIN, topicField, firstDayOfTopic,
} from './plan.js'
import { TOPICS, EXAM, MAINS, SUBJECT_IDS, subjectById, languageMatches } from './syllabus.js'
import { questionFromId } from './questions/index.js'

export const REVISION_OFFSETS = [1, 4, 7, 14, 30]
export const MISTAKE_REVISION_OFFSETS = [1, 4, 7]
// Target seconds per question = official sectional time ÷ questions (Prelims for Reasoning/Numerical, Mains for the rest).
const perQ = (sec) => (sec.minutes * 60) / sec.questions
export const TARGET_SEC = {
  reasoning: perQ(EXAM.sections[0]), numerical: perQ(EXAM.sections[1]),
  ...Object.fromEntries(MAINS.sections.filter((s) => !['reasoning', 'numerical'].includes(s.subject)).map((s) => [s.subject, perQ(s)])),
}
export const MISTAKE_TYPES = ['Concept Error', 'Calculation Error', 'Silly Mistake', 'Time Pressure', 'Guessing', 'Other']
/** Steps of the topic learning flow inside each subject session. */
export const TOPIC_STEPS = [
  { key: 'learn', label: 'Learn Concept', short: 'Learn', icon: '📚' },
  { key: 'shortcuts', label: 'Shortcuts / Tricks', short: 'Shortcuts', icon: '💡' },
  { key: 'practice', label: 'Practice Questions', short: 'Practice', icon: '📝' },
  { key: 'revision', label: 'Revision', short: 'Revise', icon: '🔄' },
  { key: 'quiz', label: 'Revision Quiz', short: 'Quiz', icon: '🧠' },
]

export const accuracy = (correct, attempted) => (attempted ? Math.round((correct / attempted) * 1000) / 10 : 0)
export const nextStudyDate = (iso) => (isSunday(iso) ? addDays(iso, 1) : iso)

export const sessionId = (dayNo, slotKey) => `s-${dayNo}-${slotKey}`
export const dailyTestId = (dayNo) => `daily-${dayNo}`

export function allTopics(content, language) {
  const hidden = new Set(content?.hiddenTopics || [])
  return [...TOPICS, ...(content?.topics || [])].filter((t) => !hidden.has(t.id) && (!language || languageMatches(t, language)))
}

export function getPlan(state) {
  if (!state.profile) return []
  return generatePlan({
    startDate: state.profile.start_date,
    level: state.profile.level,
    reasoningConfidence: state.profile.reasoning_confidence,
    numericalConfidence: state.profile.numerical_confidence,
    language: state.profile.language,
  }, state.content?.planOverrides || {})
}

/** Every answered question across all submitted attempts. */
export function answerLog(state) {
  const out = []
  for (const a of Object.values(state.attempts || {})) {
    if (!a.submitted_at) continue
    for (const qid of a.question_ids) {
      const ans = a.answers?.[qid]
      const meta = a.meta?.[qid]
      if (!meta) continue
      out.push({ qid, topic: meta.topic, subject: meta.subject, subtopic: meta.subtopic, correct: ans?.choice === meta.answer, skipped: ans?.choice == null,
        time: ans?.time_sec || 0, date: a.date, attemptId: a.id, kind: a.kind })
    }
  }
  return out.sort((x, y) => (x.date < y.date ? -1 : 1))
}

const isSubjectSession = (ses) => SUBJECT_IDS.includes(ses.slot_key)

/** Per-topic statistics, including learning → practice → revision → test stage tracking. */
export function topicStats(state, plan = getPlan(state)) {
  const log = answerLog(state).filter((x) => !x.skipped)
  const stats = {}
  for (const t of allTopics(state.content)) {
    stats[t.id] = { id: t.id, subject: t.subject, name: t.name, attempted: 0, correct: 0, time: 0, recent: [], lastPracticed: null,
      mistakes: 0, learned: false, practiced: false, revised: false, tested: false, testAttempted: 0, testCorrect: 0, sessionQs: 0, sessionCorrect: 0 }
  }
  for (const x of log) {
    const s = stats[x.topic]
    if (!s) continue
    s.attempted++; s.correct += x.correct ? 1 : 0; s.time += x.time
    s.recent.push(x.correct ? 1 : 0)
    if (!s.lastPracticed || x.date > s.lastPracticed) s.lastPracticed = x.date
    if (['daily', 'mock', 'topic', 'subject', 'mixed', 'weekly'].includes(x.kind)) { s.testAttempted++; s.testCorrect += x.correct ? 1 : 0 }
  }
  for (const ses of Object.values(state.sessions || {})) {
    const s = stats[ses.topic_id]
    if (!s) continue
    const st = ses.steps || {}
    if (st.learn || (isSubjectSession(ses) && ses.status === 'completed')) s.learned = true
    if (st.practice || (ses.slot_key === 'weak' && ses.status === 'completed')) s.practiced = true
    if (st.revision || st.quiz) s.revised = true
    if (ses.status === 'completed' && ses.manual_attempted) { // questions solved outside the app (in-app practice is already in the answer log)
      s.sessionQs += ses.manual_attempted; s.sessionCorrect += ses.manual_correct || 0
      if (!s.lastPracticed || ses.date > s.lastPracticed) s.lastPracticed = ses.date
    }
  }
  for (const r of Object.values(state.revisions || {})) if (r.status === 'done' && stats[r.topic_id]) stats[r.topic_id].revised = true
  for (const m of Object.values(state.mistakes || {})) if (stats[m.topic_id]) stats[m.topic_id].mistakes++
  const today = state._today
  for (const s of Object.values(stats)) {
    if (s.testAttempted >= 5) s.tested = true
    if (s.attempted >= 20) s.practiced = true
    const totA = s.attempted + s.sessionQs, totC = s.correct + s.sessionCorrect
    s.totalAttempted = totA
    s.accuracy = accuracy(totC, totA)
    const rec = s.recent.slice(-25)
    s.recentAccuracy = rec.length ? Math.round((rec.reduce((a, b) => a + b, 0) / rec.length) * 1000) / 10 : s.accuracy
    s.avgTime = s.attempted ? Math.round(s.time / s.attempted) : 0
    s.completion = 25 * [s.learned, s.practiced, s.revised, s.tested].filter(Boolean).length
    const pending = Object.values(state.revisions || {}).filter((r) => r.topic_id === s.id && r.status === 'pending').sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
    s.revisionDue = pending[0]?.due_date || null
    s.firstPlannedDay = firstDayOfTopic(plan, s.id)?.day_no || null
    // Weakness score: recent accuracy (60%), speed vs target (20%), mistake density (20%).
    const target = TARGET_SEC[s.subject] || 36
    const speedScore = s.avgTime ? Math.max(0, Math.min(100, (target / s.avgTime) * 100)) : 100
    const mistakeScore = Math.max(0, 100 - (s.attempted ? (s.mistakes / s.attempted) * 200 : 0))
    s.score = Math.round(0.6 * s.recentAccuracy + 0.2 * speedScore + 0.2 * mistakeScore)
    s.status = totA < 5 ? 'new' : s.recentAccuracy < 70 || s.score < 65 ? 'weak' : s.recentAccuracy >= 85 && totA >= 10 ? 'strong' : 'average'
    s.daysSince = s.lastPracticed && today ? diffDays(s.lastPracticed, today) : null
  }
  return stats
}

export const weakTopics = (stats, subject) =>
  Object.values(stats).filter((s) => s.status === 'weak' && (!subject || s.subject === subject)).sort((a, b) => a.recentAccuracy - b.recentAccuracy || a.score - b.score)
export const strongTopics = (stats, subject) =>
  Object.values(stats).filter((s) => s.status === 'strong' && (!subject || s.subject === subject)).sort((a, b) => b.recentAccuracy - a.recentAccuracy)

/** Topics actually assigned to a plan day — snapshots from started sessions win, adaptive days use weak topics. */
export function resolveDay(state, day, stats, plan = getPlan(state)) {
  const ses = (k) => state.sessions?.[sessionId(day.day_no, k)]
  const started = (k) => ses(k) && ses(k).status !== 'not_started'
  const out = { ...day }
  for (const { subject } of SUBJECT_SLOTS) {
    const f = topicField(subject)
    if (day.adaptive && !(day.is_mock_day && (subject === 'reasoning' || subject === 'numerical')) && stats && !started(subject) && day.date > state._today) {
      const w = weakTopics(stats, subject).find((x) => languageMatches({ subject, lang: TOPICS.find((t) => t.id === x.id)?.lang }, state.profile?.language))
      if (w) out[f] = w.id
    }
    if (started(subject)) out[f] = ses(subject).topic_id
  }
  // Practice / weak slot: carry forward an incomplete subject topic from the previous study day, else the weakest topic.
  let weak = null, weakReason = ''
  if (started('weak')) { weak = ses('weak').topic_id; weakReason = 'Selected when the session started' }
  else {
    const prev = plan.find((d) => d.day_no === day.day_no - 1)
    if (prev && prev.date < state._today) {
      for (const { subject } of SUBJECT_SLOTS) {
        const ps = state.sessions?.[sessionId(prev.day_no, subject)]
        const tid = ps?.topic_id || prev[topicField(subject)]
        if ((!ps || ps.status !== 'completed') && tid && tid !== 'mixed') { weak = tid; weakReason = `Carried forward — Day ${prev.day_no} ${subjectById[subject].short} topic was not completed`; break }
      }
    }
    if (!weak && stats) {
      const w = weakTopics(stats)[0]
      if (w) { weak = w.id; weakReason = `Weak topic — recent accuracy ${w.recentAccuracy}%` }
    }
    if (!weak) {
      weak = day.is_mock_day ? 'mixed' : out.reasoning_topic
      weakReason = day.is_mock_day ? 'Mock analysis — re-attempt today’s mock mistakes' : 'Extra practice on today’s topics'
    }
  }
  return { ...out, weak_topic: weak, weak_reason: weakReason }
}

export function sessionTopic(rday, slot) {
  if (slot.key === 'revision') return 'revision'
  if (slot.key === 'weak') return rday.weak_topic
  return rday[topicField(slot.subject)]
}

/** Session records for a day (stored or default "not started"). */
export function daySessions(state, rday) {
  return STUDY_SLOTS.map((slot) => {
    const id = sessionId(rday.day_no, slot.key)
    const rec = state.sessions?.[id]
    const topic = rec?.topic_id || sessionTopic(rday, slot)
    return { id, slot, day_no: rday.day_no, date: rday.date, topic_id: topic, status: 'not_started', attempted: 0, correct: 0, elapsed_sec: 0, steps: {}, ...rec }
  })
}

/**
 * Daily Test readiness — based on what has been completed today, never on the clock.
 * Required: the five subject topics + today's revision. Practice / Weak Topics is recommended but optional.
 */
export function readiness(state, rday) {
  const items = REQUIRED_SLOTS.map((slot) => {
    const s = state.sessions?.[sessionId(rday.day_no, slot.key)]
    return { key: slot.key, label: slot.label, subject: slot.subject, done: s?.status === 'completed' }
  })
  const done = items.filter((x) => x.done).length
  return { items, done, total: items.length, pct: Math.round((done / items.length) * 100), ready: done === items.length,
    completed: items.filter((x) => x.done), remaining: items.filter((x) => !x.done) }
}

export function dayStatus(state, day, today) {
  const sessions = STUDY_SLOTS.map((s) => state.sessions?.[sessionId(day.day_no, s.key)])
  const done = sessions.filter((s) => s?.status === 'completed').length
  const any = sessions.some((s) => s && s.status !== 'not_started')
  const test = state.attempts?.[dailyTestId(day.day_no)]
  const testDone = !!test?.submitted_at
  const total = STUDY_SLOTS.length + 1
  const completedUnits = done + (testDone ? 1 : 0)
  const requiredDone = REQUIRED_SLOTS.every((s) => state.sessions?.[sessionId(day.day_no, s.key)]?.status === 'completed')
  let status
  if (requiredDone && testDone) status = 'completed'
  else if (day.date > today) status = 'upcoming'
  else if (completedUnits > 0 || any) status = day.date === today ? 'in_progress' : 'partial'
  else status = day.date === today ? 'today' : 'missed'
  return { status, done, testDone, total, completedUnits, pct: Math.round((completedUnits / total) * 100), testScore: test?.score, testAccuracy: test?.accuracy }
}

export function streak(state, plan, today) {
  // Count consecutive active study days backwards (Sundays never break a streak).
  const active = (d) => { const s = dayStatus(state, d, today); return s.testDone || s.done >= 4 }
  const past = plan.filter((d) => d.date <= today).reverse()
  let count = 0, best = 0, run = 0
  let started = false
  for (const d of past) {
    if (active(d)) { count++; started = true } else if (d.date === today && !started) continue
    else break
  }
  for (const d of plan.filter((x) => x.date <= today)) { if (active(d)) { run++; best = Math.max(best, run) } else if (d.date !== today) run = 0 }
  return { current: count, best }
}

/** Revision dates for a topic learned on `date` (Sundays shift to Monday). */
export function revisionDates(date, offsets = REVISION_OFFSETS) {
  return offsets.map((o) => nextStudyDate(addDays(date, o)))
}

export function createTopicRevisions(state, topicId, date) {
  const existing = Object.values(state.revisions).filter((r) => r.topic_id === topicId && r.kind === 'topic' && r.source_date === date)
  if (existing.length) return []
  return revisionDates(date).map((due, i) => ({ id: `rev-${topicId}-${date}-${i + 1}`, kind: 'topic', topic_id: topicId, source_date: date, step: i + 1,
    label: `Revision ${i + 1} (Day +${REVISION_OFFSETS[i]})`, due_date: due, status: 'pending', completed_at: null }))
}

export function dueRevisions(state, today) {
  return Object.values(state.revisions || {}).filter((r) => r.status === 'pending' && r.due_date <= today).sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
}

export function dueMistakes(state, today) {
  return Object.values(state.mistakes || {}).filter((m) => !m.mastered && (m.revision_dates || []).some((d) => d <= today && !(m.revised_dates || []).includes(d)))
}

/** Aggregate numbers for the dashboard. */
export function overview(state, plan, today, stats) {
  const log = answerLog(state)
  const sessions = Object.values(state.sessions || {})
  const studySec = sessions.reduce((s, x) => s + (x.elapsed_sec || 0), 0)
  const manualQs = sessions.reduce((s, x) => s + (x.manual_attempted || 0), 0)
  const manualCorrect = sessions.reduce((s, x) => s + (x.manual_correct || 0), 0)
  const answered = log.filter((x) => !x.skipped)
  const attempts = Object.values(state.attempts || {}).filter((a) => a.submitted_at)
  const daysDone = plan.filter((d) => dayStatus(state, d, today).status === 'completed').length
  const curDay = [...plan].reverse().find((d) => d.date <= today)
  return {
    currentDay: curDay ? curDay.day_no : 0,
    daysCompleted: daysDone,
    progressPct: Math.round(((curDay?.day_no || 0) / TOTAL_STUDY_DAYS) * 100),
    completionPct: Math.round((daysDone / TOTAL_STUDY_DAYS) * 100),
    studyHours: Math.round((studySec / 3600) * 10) / 10,
    questions: answered.length + manualQs,
    accuracy: accuracy(answered.filter((x) => x.correct).length + manualCorrect, answered.length + manualQs),
    dailyTests: attempts.filter((a) => a.kind === 'daily').length,
    mocks: attempts.filter((a) => a.kind === 'mock').length,
    streak: streak(state, plan, today),
    weak: stats ? weakTopics(stats).slice(0, 5) : [],
  }
}

export function speedStats(state) {
  const log = answerLog(state).filter((x) => !x.skipped)
  const out = {}
  for (const sub of SUBJECT_IDS) {
    const xs = log.filter((x) => x.subject === sub)
    const recent = xs.slice(-60)
    const t = recent.reduce((s, x) => s + x.time, 0)
    out[sub] = {
      attempted: xs.length,
      avgSec: recent.length ? Math.round(t / recent.length) : 0,
      qpm: t ? Math.round((recent.length / (t / 60)) * 100) / 100 : 0,
      accuracy: accuracy(recent.filter((x) => x.correct).length, recent.length),
      targetSec: Math.round(TARGET_SEC[sub] * 10) / 10,
      targetQpm: Math.round((60 / TARGET_SEC[sub]) * 100) / 100,
    }
  }
  return out
}

/** Weekly report for the week (Mon–Sat) that contains or precedes `iso`. */
export function weeklyReport(state, plan, iso, stats) {
  const start = weekStart(iso), end = addDays(start, 5)
  const days = plan.filter((d) => d.date >= start && d.date <= end)
  const today = state._today
  const ds = days.map((d) => ({ day: d, st: dayStatus(state, d, today) }))
  const ids = new Set(days.map((d) => d.date))
  const log = answerLog(state).filter((x) => ids.has(x.date) && !x.skipped)
  const sessions = Object.values(state.sessions || {}).filter((s) => ids.has(s.date))
  const sub = (k) => { const xs = log.filter((x) => x.subject === k); return { attempted: xs.length, accuracy: accuracy(xs.filter((x) => x.correct).length, xs.length) } }
  const weak = stats ? weakTopics(stats).slice(0, 4) : []
  const strong = stats ? strongTopics(stats).slice(0, 4) : []
  const nextDays = plan.filter((d) => d.date > end).slice(0, 6)
  return {
    start, end, days: ds,
    studyDays: ds.filter((x) => x.st.status === 'completed').length,
    activeDays: ds.filter((x) => x.st.completedUnits > 0).length,
    hours: Math.round((sessions.reduce((s, x) => s + (x.elapsed_sec || 0), 0) / 3600) * 10) / 10,
    questions: log.length + sessions.reduce((s, x) => s + (x.manual_attempted || 0), 0),
    dailyTests: ds.filter((x) => x.st.testDone).length,
    accuracy: accuracy(log.filter((x) => x.correct).length, log.length),
    subjects: Object.fromEntries(SUBJECT_IDS.map((k) => [k, sub(k)])),
    reasoning: sub('reasoning'), numerical: sub('numerical'), weak, strong,
    weekTopics: [...new Set(days.flatMap((d) => SUBJECT_SLOTS.map((s) => d[topicField(s.subject)])).filter((t) => t && t !== 'mixed'))],
    nextFocus: [...new Set([...weak.map((w) => w.name), ...nextDays.flatMap((d) => [d.reasoning_topic, d.numerical_topic]).filter((t) => t !== 'mixed').map((t) => stats?.[t]?.name || t)])].slice(0, 5),
  }
}

const SUBJECT_ICON = Object.fromEntries(SUBJECT_IDS.map((k) => [k, subjectById[k].icon]))

/** "What should I study now?" — guides, never blocks. The Daily Test is recommended as soon as the day's preparation is done. */
export function recommend(state, plan, today, nowMin, stats) {
  const startMin = state.profile?.study_start_min ?? DEFAULT_START_MIN
  const day = plan.find((d) => d.date === today)
  const due = dueRevisions(state, today)
  const weak = weakTopics(stats)
  const mistakes = dueMistakes(state, today)
  const name = (id) => stats[id]?.name || id
  if (!day) {
    if (isSunday(today)) return { kind: 'weekly', title: 'Sunday — Weekly Review', reason: 'Sunday is not a study day. Review this week’s report and take the Weekly Test.', action: { to: '/calendar?weekly=1', label: 'Open Weekly Report' } }
    if (plan.length && today < plan[0].date) return { kind: 'wait', title: 'Your plan starts soon', reason: `Day 1 begins on ${plan[0].date}. Preview the 60-day plan meanwhile.`, action: { to: '/plan', label: 'View 60-Day Plan' } }
    return { kind: 'done', title: 'Plan complete — keep revising', reason: 'All 60 study days are over. Take mocks and revise weak topics until the exam.', action: { to: '/mock-tests', label: 'Take a Mock Test' } }
  }
  const rday = resolveDay(state, day, stats, plan)
  const sessions = daySessions(state, rday)
  const ready = readiness(state, rday)
  const test = state.attempts?.[dailyTestId(day.day_no)]
  if (ready.ready && !test?.submitted_at) return { kind: 'test', title: 'Take today’s Daily Test', reason: 'Today’s preparation is complete — the Daily Test is ready now. It is based on today’s topics.', detail: '30 questions · 30 minutes', action: { to: '/daily-test', label: 'Start Daily Test' } }
  const running = sessions.find((s) => s.status === 'in_progress' || s.status === 'paused')
  if (running) return { kind: 'session', title: `Continue ${running.slot.label}`, reason: `${name(running.topic_id)} is in progress.`, sessionId: running.id, action: { to: '/today', label: 'Resume Session' } }
  // Current timetable slot (a guide, not a lock)
  const cur = sessions.find((s) => { const t = slotTimes(s.slot, startMin); return nowMin >= t.start && nowMin < t.end })
  if (cur && cur.status !== 'completed') {
    const t = slotTimes(cur.slot, startMin)
    return { kind: 'session', title: cur.slot.key === 'revision' ? 'Today’s Revision' : `${SUBJECT_ICON[cur.slot.subject] || '🎯'} ${name(cur.topic_id)}`,
      reason: `Scheduled now: ${cur.slot.label}.${cur.slot.key === 'weak' ? ' ' + rday.weak_reason + '.' : ''}`, detail: `${t.start}-${t.end}`, sessionId: cur.id, action: { to: '/today', label: 'Start Session' } }
  }
  const next = sessions.find((s) => s.status !== 'completed' && !s.slot.optional)
  if (next && nowMin >= testSuggestedMin(startMin)) {
    return { kind: 'session', title: `Finish ${next.slot.label}`, reason: `${ready.remaining.length} item(s) left before today’s Daily Test.`, sessionId: next.id, action: { to: '/today', label: 'Continue Today’s Plan' } }
  }
  if (due.length) {
    const overdue = due.filter((r) => r.due_date < today)
    return { kind: 'revision', title: `Revise ${name(due[0].topic_id)}`, reason: overdue.length ? `${overdue.length} revision(s) overdue — spaced repetition keeps topics fresh.` : 'Revision is due today.',
      detail: '10-minute formula recap + 10-question revision quiz', topic: due[0].topic_id, action: { to: '/revision', label: 'Open Revision' } }
  }
  if (next) return { kind: 'session', title: `${next.slot.label}`, reason: `Next pending item: ${next.slot.key === 'revision' ? 'today’s revision' : name(next.topic_id)}.`, sessionId: next.id, action: { to: '/today', label: 'Go to Today’s Plan' } }
  if (weak.length) return { kind: 'practice', title: `Study ${weak[0].name}`, reason: `Recent accuracy is low (${weak[0].recentAccuracy}%).`, detail: '20 practice questions + 10-minute revision', topic: weak[0].id, action: { to: `/practice?topic=${weak[0].id}&count=20`, label: 'Practice Now' } }
  if (mistakes.length) return { kind: 'mistakes', title: 'Re-attempt Mistake Book questions', reason: `${mistakes.length} mistake(s) are due for revision.`, action: { to: '/mistakes?due=1', label: 'Open Mistake Book' } }
  return { kind: 'done', title: 'Today’s preparation is complete!', reason: 'Rest well. Tomorrow’s plan is ready.', action: { to: '/plan', label: 'View Plan' } }
}

export const ACHIEVEMENTS = [
  { key: 'first-session', name: 'First Step', desc: 'Complete your first study session', icon: '🚀' },
  { key: 'streak-7', name: '7-Day Streak', desc: 'Study 7 study-days in a row', icon: '🔥' },
  { key: 'streak-15', name: '15-Day Streak', desc: 'Study 15 study-days in a row', icon: '⚡' },
  { key: 'streak-30', name: '30-Day Streak', desc: 'Study 30 study-days in a row', icon: '🏆' },
  { key: 'q-1000', name: '1000 Questions', desc: 'Solve 1,000 questions', icon: '📚' },
  { key: 'q-5000', name: '5000 Questions', desc: 'Solve 5,000 questions', icon: '🧮' },
  { key: 'first-daily', name: 'Daily Test Done', desc: 'Complete your first Daily Test', icon: '📝' },
  { key: 'first-mock', name: 'First Mock', desc: 'Complete your first full mock test', icon: '🎯' },
  { key: 'acc-90', name: '90% Accuracy', desc: 'Score 90%+ accuracy in a test of 20+ questions', icon: '💎' },
  { key: 'syllabus', name: 'Full Syllabus Completed', desc: 'Complete every syllabus topic at least once', icon: '🎓' },
  { key: 'mistake-master', name: 'Mistake Master', desc: 'Master 25 Mistake Book questions', icon: '🛠️' },
]

export function earnedAchievements(state, plan, today, stats, ov) {
  const subs = Object.values(state.attempts || {}).filter((a) => a.submitted_at)
  const earned = new Set()
  if (Object.values(state.sessions || {}).some((s) => s.status === 'completed')) earned.add('first-session')
  if (ov.streak.best >= 7) earned.add('streak-7')
  if (ov.streak.best >= 15) earned.add('streak-15')
  if (ov.streak.best >= 30) earned.add('streak-30')
  if (ov.questions >= 1000) earned.add('q-1000')
  if (ov.questions >= 5000) earned.add('q-5000')
  if (subs.some((a) => a.kind === 'daily')) earned.add('first-daily')
  if (subs.some((a) => a.kind === 'mock')) earned.add('first-mock')
  if (subs.some((a) => a.question_ids.length >= 20 && a.accuracy >= 90)) earned.add('acc-90')
  const syll = allTopics(state.content, state.profile?.language).filter((t) => TOPICS.some((x) => x.id === t.id) && t.id !== 'current-affairs')
  if (syll.every((t) => stats[t.id]?.learned)) earned.add('syllabus')
  if (Object.values(state.mistakes || {}).filter((m) => m.mastered).length >= 25) earned.add('mistake-master')
  return earned
}

/**
 * Score an attempt. `negative` is the fraction of a question's marks deducted per wrong answer (official: 0.25).
 * attempt.marks optionally gives marks per question by subject (Mains: Reasoning/Numerical 1.25, Computer 0.5, others 1).
 */
export function scoreAttempt(attempt, questions, negative = 0) {
  let correct = 0, wrong = 0, skipped = 0, score = 0, max = 0
  const bySubject = {}, byTopic = {}, bySubtopic = {}
  const meta = {}
  for (const q of questions) {
    const a = attempt.answers?.[q.id]
    const m = attempt.marks?.[q.subject] ?? 1
    const sub = (bySubject[q.subject] ||= { attempted: 0, correct: 0, wrong: 0, skipped: 0, total: 0, time: 0, score: 0, max: 0 })
    const top = (byTopic[q.topic] ||= { attempted: 0, correct: 0, total: 0, time: 0 })
    const stKey = `${q.topic}::${q.subtopic || 'General'}`
    const st = (bySubtopic[stKey] ||= { topic: q.topic, subtopic: q.subtopic || 'General', attempted: 0, correct: 0, total: 0 })
    sub.total++; top.total++; st.total++; sub.max += m; max += m
    sub.time += a?.time_sec || 0; top.time += a?.time_sec || 0
    meta[q.id] = { topic: q.topic, subject: q.subject, subtopic: q.subtopic, answer: q.answer, difficulty: q.difficulty }
    if (a?.choice == null) { skipped++; sub.skipped++; continue }
    sub.attempted++; top.attempted++; st.attempted++
    if (a.choice === q.answer) { correct++; sub.correct++; top.correct++; st.correct++; sub.score += m; score += m }
    else { wrong++; sub.wrong++; sub.score -= m * negative; score -= m * negative }
  }
  for (const s of Object.values(bySubject)) s.score = Math.round(s.score * 100) / 100
  const attempted = correct + wrong
  return { correct, wrong, skipped, attempted, score: Math.round(score * 100) / 100, max: Math.round(max * 100) / 100, accuracy: accuracy(correct, attempted), bySubject, byTopic, bySubtopic, meta }
}

/** Weak areas from an attempt: sub-topics with accuracy below 60% (at least one wrong/skipped). */
export function weakAreas(attempt) {
  return Object.values(attempt.by_subtopic || {})
    .filter((s) => s.total > 0 && s.correct < s.total && (s.correct / s.total) * 100 < 60)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
}

export const resolveQuestions = (ids, content) => ids.map((id) => questionFromId(id, content?.questions || [])).filter(Boolean)
