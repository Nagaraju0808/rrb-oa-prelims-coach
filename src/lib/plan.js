import { addDays, isSunday, parseISO } from './dates.js'

export const TOTAL_STUDY_DAYS = 60

export const PHASES = [
  { id: 1, name: 'Foundation', from: 1, to: 15, color: 'emerald', goal: 'Concepts + basics of every high-priority chapter' },
  { id: 2, name: 'Core Syllabus', from: 16, to: 30, color: 'sky', goal: 'Puzzles, seating, arithmetic and DI' },
  { id: 3, name: 'Speed Building', from: 31, to: 42, color: 'violet', goal: 'Timed drills on high-weightage topics' },
  { id: 4, name: 'Revision', from: 43, to: 50, color: 'amber', goal: 'Weak-topic revision and Mistake Book' },
  { id: 5, name: 'Mock Preparation', from: 51, to: 60, color: 'rose', goal: 'Full prelims mocks + analysis' },
]
export const phaseOf = (dayNo) => PHASES.find((p) => dayNo >= p.from && dayNo <= p.to)

// Integrated daily timetable (Prelims + Mains together). Offsets are minutes from the study start time (default 10:00 AM).
// Every subject is studied every day as one topic session: Learn → Shortcuts → Practice → Revision → Revision Quiz.
// The Daily Test is the last item of the day. It is NOT time-locked: it becomes ready as soon as the day's
// required sessions are complete (and can be started earlier on purpose). The slot below is only the suggested time.
export const SLOTS = [
  { key: 'reasoning', start: 0, end: 75, kind: 'study', subject: 'reasoning', mode: 'topic', label: 'Reasoning Ability' },
  { key: 'break1', start: 75, end: 90, kind: 'break', label: 'Break' },
  { key: 'numerical', start: 90, end: 165, kind: 'study', subject: 'numerical', mode: 'topic', label: 'Numerical Ability' },
  { key: 'lunch', start: 165, end: 210, kind: 'break', label: 'Lunch' },
  { key: 'language', start: 210, end: 270, kind: 'study', subject: 'language', mode: 'topic', label: 'English / Hindi' },
  { key: 'break2', start: 270, end: 285, kind: 'break', label: 'Break' },
  { key: 'ga', start: 285, end: 345, kind: 'study', subject: 'ga', mode: 'topic', label: 'General Awareness' },
  { key: 'computer', start: 345, end: 390, kind: 'study', subject: 'computer', mode: 'topic', label: 'Computer Knowledge' },
  { key: 'revision', start: 390, end: 420, kind: 'study', subject: 'mixed', mode: 'revision', label: "Today's Revision" },
  { key: 'weak', start: 420, end: 450, kind: 'study', subject: 'mixed', mode: 'weak', label: 'Practice / Weak Topics', optional: true },
  { key: 'test', start: 450, end: 480, kind: 'test', subject: 'mixed', mode: 'test', label: 'DAILY TEST' },
]
export const STUDY_SLOTS = SLOTS.filter((s) => s.kind === 'study')
export const SUBJECT_SLOTS = STUDY_SLOTS.filter((s) => s.mode === 'topic')
/** Sessions that must be finished before the Daily Test is "ready" (Practice / Weak Topics is recommended, not required). */
export const REQUIRED_SLOTS = STUDY_SLOTS.filter((s) => !s.optional)
export const TEST_SLOT = SLOTS[SLOTS.length - 1]
if (TEST_SLOT.kind !== 'test' || SLOTS.some((s) => s.end > TEST_SLOT.start && s !== TEST_SLOT)) {
  throw new Error('Timetable invariant violated: the Daily Test must be the last item of the day')
}

export const DEFAULT_START_MIN = 600 // 10:00 AM
export const ALLOWED_START_TIMES = [480, 540, 600, 660] // 8, 9, 10, 11 AM — the whole block shifts together

export const slotTimes = (slot, startMin = DEFAULT_START_MIN) => ({ start: startMin + slot.start, end: startMin + slot.end })
/** Suggested (not enforced) time for the Daily Test. */
export const testSuggestedMin = (startMin = DEFAULT_START_MIN) => startMin + TEST_SLOT.start
/** Plan-day field that holds a subject's topic, e.g. reasoning → reasoning_topic. */
export const topicField = (subject) => `${subject}_topic`

// ---- Topic sequences per phase (recommended preparation order from the syllabus document) ----
const P1_R = ['inequality', 'inequality', 'syllogism', 'syllogism', 'syllogism', 'coding-decoding', 'coding-decoding',
  'blood-relations', 'blood-relations', 'direction-sense', 'direction-sense', 'order-ranking', 'order-ranking', 'alphanumeric-series', 'alphanumeric-series']
const P1_N = ['simplification', 'simplification', 'simplification', 'approximation', 'approximation', 'number-series', 'number-series',
  'number-series', 'quadratic-equations', 'quadratic-equations', 'number-system', 'number-system', 'percentage', 'percentage', 'percentage']
const P2_R = ['linear-seating', 'linear-seating', 'circular-seating', 'circular-seating', 'linear-seating', 'floor-puzzle', 'floor-puzzle',
  'box-puzzle', 'box-puzzle', 'scheduling-puzzle', 'scheduling-puzzle', 'misc-puzzles', 'misc-puzzles', 'misc-reasoning', 'misc-reasoning']
const P2_N = ['ratio-proportion', 'average', 'profit-loss', 'profit-loss', 'simple-interest', 'compound-interest', 'time-work', 'time-work',
  'time-distance', 'time-distance', 'ages', 'mixture-alligation', 'partnership', 'data-interpretation', 'mensuration']
// Speed phase: weaker subject gets the heavier, high-weightage topics.
const P3_R_STRONG = ['inequality', 'syllogism', 'linear-seating', 'coding-decoding', 'circular-seating', 'floor-puzzle',
  'blood-relations', 'box-puzzle', 'direction-sense', 'scheduling-puzzle', 'order-ranking', 'misc-puzzles']
const P3_R_WEAK = ['linear-seating', 'circular-seating', 'floor-puzzle', 'syllogism', 'box-puzzle', 'scheduling-puzzle',
  'inequality', 'misc-puzzles', 'coding-decoding', 'linear-seating', 'blood-relations', 'floor-puzzle']
const P3_N_STRONG = ['simplification', 'number-series', 'data-interpretation', 'approximation', 'percentage', 'data-interpretation',
  'quadratic-equations', 'profit-loss', 'time-work', 'data-interpretation', 'time-distance', 'number-series']
const P3_N_WEAK = ['simplification', 'approximation', 'number-series', 'data-interpretation', 'simplification', 'number-series',
  'data-interpretation', 'percentage', 'approximation', 'data-interpretation', 'profit-loss', 'number-series']
const P4_R = ['syllogism', 'linear-seating', 'inequality', 'circular-seating', 'coding-decoding', 'floor-puzzle', 'blood-relations', 'box-puzzle']
const P4_N = ['simplification', 'number-series', 'approximation', 'data-interpretation', 'percentage', 'quadratic-equations', 'profit-loss', 'time-work']
// Mains subjects rotate through their chapters across all 60 days (integrated preparation from Day 1).
const LANG_EN = ['vocabulary', 'error-detection', 'fill-blanks', 'reading-comprehension', 'sentence-improvement', 'cloze-test', 'idioms-phrases', 'para-jumbles']
const LANG_HI = ['hindi-grammar', 'hindi-vocabulary']
const GA_ROTATION = ['banking-awareness', 'financial-awareness', 'government-schemes', 'banking-awareness', 'agriculture-rural', 'static-gk', 'current-affairs']
const COMPUTER_ROTATION = ['computer-fundamentals', 'computer-hardware', 'computer-memory', 'software-os', 'ms-office', 'internet-networking', 'computer-security', 'keyboard-shortcuts', 'dbms-basics']

/** Build the list of 60 study dates, skipping Sundays. A Sunday start date begins on Monday. */
export function studyDates(startISO, total = TOTAL_STUDY_DAYS) {
  const out = []
  let d = startISO
  while (out.length < total) {
    if (!isSunday(d)) out.push(d)
    d = addDays(d, 1)
  }
  return out
}

/**
 * Generate the 60-study-day plan.
 * profile: { startDate, level, reasoningConfidence, numericalConfidence, language: 'en' | 'hi' }
 * overrides: admin-edited day topics { [dayNo]: { reasoning, numerical, language, ga, computer, focus } }
 */
export function generatePlan(profile, overrides = {}) {
  const dates = studyDates(profile.startDate)
  const rWeak = profile.reasoningConfidence === 'weak'
  const nWeak = profile.numericalConfidence === 'weak'
  const p3R = rWeak ? P3_R_WEAK : P3_R_STRONG
  const p3N = nWeak ? P3_N_WEAK : P3_N_STRONG
  return dates.map((date, i) => {
    const dayNo = i + 1
    const phase = phaseOf(dayNo)
    let reasoning, numerical, focus, mock = false
    if (dayNo <= 15) { reasoning = P1_R[i]; numerical = P1_N[i]; focus = 'Learn concepts, solve basic questions' }
    else if (dayNo <= 30) { reasoning = P2_R[i - 15]; numerical = P2_N[i - 15]; focus = 'Core syllabus — concepts + mixed practice' }
    else if (dayNo <= 42) { reasoning = p3R[i - 30]; numerical = p3N[i - 30]; focus = 'Speed drills — timed sets, target time per question' }
    else if (dayNo <= 50) { reasoning = P4_R[i - 42]; numerical = P4_N[i - 42]; focus = 'Revision — weak topics, Mistake Book, formula recap' }
    else {
      reasoning = 'mixed'; numerical = 'mixed'; mock = true
      focus = dayNo % 2 ? 'Full Prelims-pattern mock (80 Q / 45 min) + analysis' : 'Full Mains-pattern mock (200 Q / 120 min) + analysis'
    }
    const lang = profile.language === 'hi' ? LANG_HI : LANG_EN
    const o = overrides[dayNo] || {}
    return {
      id: `day-${dayNo}`, day_no: dayNo, date, phase: phase.id,
      reasoning_topic: o.reasoning || reasoning, numerical_topic: o.numerical || numerical,
      language_topic: o.language || lang[i % lang.length], ga_topic: o.ga || GA_ROTATION[i % GA_ROTATION.length],
      computer_topic: o.computer || COMPUTER_ROTATION[i % COMPUTER_ROTATION.length],
      focus: o.focus || focus, is_mock_day: mock, mock_type: mock ? (dayNo % 2 ? 'prelims' : 'mains') : null, adaptive: dayNo > 42,
    }
  })
}

/** All topics scheduled on a plan day, by subject. */
export const dayTopics = (day) => Object.fromEntries(SUBJECT_SLOTS.map((s) => [s.subject, day[topicField(s.subject)]]))
export const firstDayOfTopic = (plan, topicId) => plan.find((d) => SUBJECT_SLOTS.some((s) => d[topicField(s.subject)] === topicId)) || null

export function dayForDate(plan, iso) {
  return plan.find((d) => d.date === iso) || null
}

export function currentDayNo(plan, iso) {
  if (!plan.length) return 0
  if (iso < plan[0].date) return 0
  const idx = plan.findIndex((d) => d.date >= iso)
  if (idx === -1) return TOTAL_STUDY_DAYS
  return plan[idx].date === iso ? plan[idx].day_no : plan[idx].day_no - 1
}

export const weekdayName = (iso) => parseISO(iso).toLocaleDateString('en-IN', { weekday: 'long' })
