import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { now as clockNow, toISO, minutesOfDay, addDays, todayISO } from './dates.js'
import {
  getPlan, topicStats, createTopicRevisions, overview, earnedAchievements, ACHIEVEMENTS, scoreAttempt, dayStatus,
  MISTAKE_REVISION_OFFSETS, nextStudyDate, sessionId, dailyTestId,
} from './engine.js'
import { STUDY_SLOTS } from './plan.js'

const VERSION = 1
const emptyContent = () => ({ topics: [], questions: [], templates: [], resources: [], planOverrides: {}, hiddenTopics: [] })
export const emptyState = () => ({
  version: VERSION, profile: null, sessions: {}, attempts: {}, mistakes: {}, revisions: {}, logs: {}, achievements: {}, notifications: {}, days: {},
  content: emptyContent(), firedReminders: {},
})

const storageKey = (uid) => `rrb_state_v${VERSION}:${uid}`
export const STORAGE_KEY = storageKey('local')
export const BACKUP_KEY = 'rrb_state_backup'
const parse = (raw) => ({ ...emptyState(), ...JSON.parse(raw) })

/** Load saved progress. Never throws; unreadable data is preserved under a separate key instead of being overwritten. */
function load(uid) {
  let raw = null
  try { raw = localStorage.getItem(storageKey(uid)) } catch { return emptyState() }
  if (raw) {
    try { return parse(raw) } catch {
      try { localStorage.setItem(`${storageKey(uid)}:unreadable-${Date.now()}`, raw) } catch { /* ignore */ }
    }
  }
  // Main copy missing or unreadable → fall back to the daily safety backup.
  try { const b = localStorage.getItem(BACKUP_KEY); if (b) return parse(b) } catch { /* ignore */ }
  return emptyState()
}

const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const iso = () => clockNow().toISOString()

/** Mistake re-attempt: mark due revision dates done; a wrong answer schedules another revision in 2 days. */
function applyRevise(m, correct) {
  const d = todayISO()
  const due = (m.revision_dates || []).filter((x) => x <= d && !(m.revised_dates || []).includes(x))
  m.revised_dates = [...new Set([...(m.revised_dates || []), ...(due.length ? due : [d])])]
  if (!correct) m.revision_dates = [...new Set([...(m.revision_dates || []), nextStudyDate(addDays(d, 2))])].sort()
  m.last_result = correct ? 'correct' : 'wrong'
  m.mastered = correct && m.revised_dates.length >= 2 && (m.revision_dates || []).every((x) => m.revised_dates.includes(x) || x > d)
  m.updated_at = iso()
}

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ userId = 'local', children }) {
  const [state, setState] = useState(() => load(userId))
  const lastSaved = useRef(state) // skip writing until something actually changes
  const [tick, setTick] = useState(0)

  // Clock tick (drives Daily Test unlock, reminders, current-slot detection)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15000)
    return () => clearInterval(t)
  }, [])
  const nowDate = useMemo(() => clockNow(), [tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const today = toISO(nowDate)
  const nowMin = minutesOfDay(nowDate)

  // Persist locally (debounced). Also keeps a once-a-day safety backup of the previous saved copy.
  useEffect(() => {
    if (state === lastSaved.current) return
    const t = setTimeout(() => {
      try {
        const key = storageKey(userId)
        const prev = localStorage.getItem(key)
        const day = todayISO()
        if (prev && localStorage.getItem('rrb_backup_date') !== day && prev.includes('"start_date"')) {
          localStorage.setItem(BACKUP_KEY, prev); localStorage.setItem('rrb_backup_date', day)
        }
        localStorage.setItem(key, JSON.stringify(state))
        lastSaved.current = state
      } catch { /* storage full or blocked — progress stays in memory for this visit */ }
    }, 250)
    return () => clearTimeout(t)
  }, [state, userId])

  // Keep several open tabs in sync so one tab never overwrites progress made in another.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== storageKey(userId) || !e.newValue) return
      try { const next = parse(e.newValue); lastSaved.current = next; setState(next) } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [userId])

  const mutate = useCallback((recipe) => {
    setState((prev) => {
      const draft = structuredClone(prev)
      recipe(draft)
      return draft
    })
  }, [])

  const view = useMemo(() => ({ ...state, _today: today }), [state, today])
  const plan = useMemo(() => getPlan(view), [view.profile, view.content?.planOverrides]) // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(() => topicStats(view, plan), [view, plan])
  const ov = useMemo(() => overview(view, plan, today, stats), [view, plan, today, stats])

  // ---- Reconcile: record missed sessions for past days, unlock achievements, keep daily_progress rows ----
  useEffect(() => {
    if (!state.profile || !plan.length) return
    const missing = []
    for (const d of plan) {
      if (d.date >= today) break
      for (const slot of STUDY_SLOTS) {
        const id = sessionId(d.day_no, slot.key)
        const s = state.sessions[id]
        if (!s || ['not_started', 'in_progress', 'paused'].includes(s.status)) missing.push({ id, d, slot, s })
      }
    }
    const earned = earnedAchievements(view, plan, today, stats, ov)
    const newAch = [...earned].filter((k) => !state.achievements[k])
    const dayRows = plan.filter((d) => d.date <= today).map((d) => {
      const st = dayStatus(view, d, today)
      const mins = STUDY_SLOTS.reduce((s, sl) => s + Math.round((state.sessions[sessionId(d.day_no, sl.key)]?.elapsed_sec || 0) / 60), 0)
      return { id: `day-${d.day_no}`, day_no: d.day_no, date: d.date, status: st.status, sessions_completed: st.done, study_minutes: mins, test_score: st.testScore ?? null, test_accuracy: st.testAccuracy ?? null }
    }).filter((r) => { const o = state.days[r.id]; return !o || o.status !== r.status || o.sessions_completed !== r.sessions_completed || o.study_minutes !== r.study_minutes || o.test_score !== r.test_score })
    if (!missing.length && !newAch.length && !dayRows.length) return
    mutate((s) => {
      const ts = iso()
      for (const { id, d, slot, s: old } of missing) {
        s.sessions[id] = { id, day_no: d.day_no, date: d.date, slot_key: slot.key, subject: slot.subject, topic_id: old?.topic_id || (slot.subject === 'reasoning' ? d.reasoning_topic : slot.subject === 'numerical' ? d.numerical_topic : slot.key),
          attempted: 0, correct: 0, elapsed_sec: 0, ...old, status: 'missed', run_started_at: null, updated_at: ts }
      }
      for (const k of newAch) {
        const a = ACHIEVEMENTS.find((x) => x.key === k)
        s.achievements[k] = { id: k, key: k, unlocked_at: ts, updated_at: ts }
        const nid = uid('n')
        s.notifications[nid] = { id: nid, title: `${a.icon} Achievement unlocked: ${a.name}`, body: a.desc, at: ts, read: false, updated_at: ts }
      }
      for (const r of dayRows) s.days[r.id] = { ...r, updated_at: ts }
    })
  }, [state, plan, today, view, stats, ov, mutate])

  // ---------------- Actions ----------------
  const actions = useMemo(() => ({
    completeOnboarding(p) {
      mutate((s) => {
        s.profile = { id: userId, role: s.profile?.role || 'student', theme: 'system', language: 'en', notifications: { enabled: true, sound: false },
          daily_test: { count: 30, mix: { easy: 30, medium: 50, hard: 20 } }, study_start_min: 600, target_exam: 'CRP RRBs XV — Office Assistant (Multipurpose) Prelims',
          ...s.profile, ...p, created_at: s.profile?.created_at || iso(), updated_at: iso() }
      })
    },
    updateProfile(patch) { mutate((s) => { s.profile = { ...s.profile, ...patch, updated_at: iso() } }) },

    startSession(rec) {
      mutate((s) => {
        const ts = iso()
        // Only one running session at a time: pause others.
        for (const o of Object.values(s.sessions)) if (o.status === 'in_progress' && o.id !== rec.id) {
          o.elapsed_sec += Math.max(0, (Date.parse(ts) - Date.parse(o.run_started_at)) / 1000); o.status = 'paused'; o.run_started_at = null; o.updated_at = ts
        }
        const old = s.sessions[rec.id]
        s.sessions[rec.id] = { attempted: 0, correct: 0, elapsed_sec: 0, started_at: ts, ...old, id: rec.id, day_no: rec.day_no, date: rec.date, slot_key: rec.slot.key,
          subject: rec.slot.subject, topic_id: old?.topic_id || rec.topic_id, goal: rec.goal, status: 'in_progress', run_started_at: ts, updated_at: ts }
      })
    },
    pauseSession(id) {
      mutate((s) => {
        const o = s.sessions[id]; if (!o || o.status !== 'in_progress') return
        const ts = iso()
        o.elapsed_sec += Math.max(0, (Date.parse(ts) - Date.parse(o.run_started_at)) / 1000); o.status = 'paused'; o.run_started_at = null; o.updated_at = ts
      })
    },
    resumeSession(id) {
      mutate((s) => { const o = s.sessions[id]; if (o) { o.status = 'in_progress'; o.run_started_at = iso(); o.updated_at = iso() } })
    },
    completeSession(id, { attempted = 0, correct = 0, notes = '' } = {}) {
      mutate((s) => {
        const o = s.sessions[id]; if (!o) return
        const ts = iso()
        if (o.status === 'in_progress' && o.run_started_at) o.elapsed_sec += Math.max(0, (Date.parse(ts) - Date.parse(o.run_started_at)) / 1000)
        o.elapsed_sec = Math.round(o.elapsed_sec)
        o.status = 'completed'; o.run_started_at = null; o.completed_at = ts; o.updated_at = ts; o.notes = notes
        // Questions solved outside the app (books/PDFs) are logged manually; in-app practice is counted automatically.
        o.manual_attempted = Math.max(0, +attempted || 0)
        o.manual_correct = Math.min(o.manual_attempted, Math.max(0, +correct || 0))
        o.attempted = (o.practice_attempted || 0) + o.manual_attempted
        o.correct = (o.practice_correct || 0) + o.manual_correct
        const lid = `log-${id}`
        s.logs[lid] = { id: lid, session_id: id, date: o.date, minutes: Math.round(o.elapsed_sec / 60), subject: o.subject, topic_id: o.topic_id, updated_at: ts }
        // Learning day → schedule spaced revisions (Day 1, 4, 7, 14, 30).
        if (o.slot_key.endsWith('concept') && o.topic_id && o.topic_id !== 'mixed') {
          for (const r of createTopicRevisions(s, o.topic_id, o.date)) s.revisions[r.id] = { ...r, updated_at: ts }
        }
      })
    },
    resetSession(id) { mutate((s) => { const o = s.sessions[id]; if (o) Object.assign(o, { status: 'not_started', elapsed_sec: 0, attempted: 0, correct: 0, manual_attempted: 0, manual_correct: 0, run_started_at: null, completed_at: null, updated_at: iso() }) }) },

    /** Create an attempt record. questions: full question objects. */
    createAttempt({ id = uid('att'), kind, title, questions, duration_sec, sections = null, day_no = null, session_id = null, negative = 0, topics = [] }) {
      const ts = iso()
      const meta = Object.fromEntries(questions.map((q) => [q.id, { topic: q.topic, subject: q.subject, answer: q.answer, difficulty: q.difficulty }]))
      mutate((s) => {
        s.attempts[id] = { id, kind, title, day_no, date: todayISO(), topics, question_ids: questions.map((q) => q.id), meta, sections, session_id, duration_sec, negative,
          answers: {}, started_at: ts, submitted_at: null, updated_at: ts }
      })
      return id
    },
    saveAnswers(id, answers, extra = {}) { mutate((s) => { const a = s.attempts[id]; if (a && !a.submitted_at) { a.answers = answers; Object.assign(a, extra); a.updated_at = iso() } }) },
    submitAttempt(id, questions, { auto = false, answers, timeTaken } = {}) {
      mutate((s) => {
        const a = s.attempts[id]; if (!a || a.submitted_at) return
        if (answers) a.answers = answers
        const res = scoreAttempt(a, questions, a.negative || 0)
        const ts = iso()
        Object.assign(a, { submitted_at: ts, auto_submitted: auto, time_taken_sec: Math.round(timeTaken ?? (Date.parse(ts) - Date.parse(a.started_at)) / 1000),
          score: res.score, max: res.max, correct: res.correct, wrong: res.wrong, skipped: res.skipped, accuracy: res.accuracy,
          by_subject: res.bySubject, by_topic: res.byTopic, meta: res.meta, updated_at: ts })
        if (a.kind === 'mistakes') {
          for (const m of Object.values(s.mistakes)) if (a.meta[m.question_id]) applyRevise(m, a.answers[m.question_id]?.choice === a.meta[m.question_id].answer)
        }
        if (a.session_id && s.sessions[a.session_id]) {
          const o = s.sessions[a.session_id]
          const linked = Object.values(s.attempts).filter((x) => x.session_id === o.id && x.submitted_at)
          o.practice_attempt_id = a.id
          o.practice_attempted = linked.reduce((t, x) => t + x.correct + x.wrong, 0)
          o.practice_correct = linked.reduce((t, x) => t + x.correct, 0)
          o.attempted = o.practice_attempted + (o.manual_attempted || 0)
          o.correct = o.practice_correct + (o.manual_correct || 0)
          o.updated_at = ts
        }
      })
    },
    discardAttempt(id) { mutate((s) => { if (s.attempts[id] && !s.attempts[id].submitted_at) { delete s.attempts[id] } }) },

    addMistake({ question, attempt, choice, type, note = '' }) {
      mutate((s) => {
        const id = `m-${attempt?.id || 'x'}-${question.id}`.slice(0, 180)
        const date = todayISO(), ts = iso()
        s.mistakes[id] = { id, question_id: question.id, attempt_id: attempt?.id || null, topic_id: question.topic, subject: question.subject,
          question_text: question.stem, wrong_answer: choice == null ? '(skipped)' : question.options[choice], correct_answer: question.options[question.answer],
          explanation: question.explanation, mistake_type: type, note, date, revision_dates: MISTAKE_REVISION_OFFSETS.map((o) => nextStudyDate(addDays(date, o))),
          revised_dates: [], mastered: false, updated_at: ts }
      })
    },
    updateMistake(id, patch) { mutate((s) => { if (s.mistakes[id]) Object.assign(s.mistakes[id], patch, { updated_at: iso() }) }) },
    deleteMistake(id) { mutate((s) => { delete s.mistakes[id] }) },
    reviseMistake(id, correct) { mutate((s) => { if (s.mistakes[id]) applyRevise(s.mistakes[id], correct) }) },
    completeRevision(id) { mutate((s) => { const r = s.revisions[id]; if (r) { r.status = 'done'; r.completed_at = iso(); r.updated_at = iso() } }) },
    undoRevision(id) { mutate((s) => { const r = s.revisions[id]; if (r) { r.status = 'pending'; r.completed_at = null; r.updated_at = iso() } }) },
    addExtraRevision(topicId, date) {
      mutate((s) => {
        const id = `rev-${topicId}-extra-${date}`
        if (!s.revisions[id]) s.revisions[id] = { id, kind: 'weak', topic_id: topicId, source_date: date, step: 0, label: 'Extra revision (weak topic)', due_date: date, status: 'pending', completed_at: null, updated_at: iso() }
      })
    },

    notify(title, body, key) {
      mutate((s) => {
        if (key) { if (s.firedReminders[key]) return; s.firedReminders[key] = true }
        const id = uid('n'), ts = iso()
        s.notifications[id] = { id, title, body, at: ts, read: false, updated_at: ts }
      })
    },
    markNotificationsRead() { mutate((s) => { for (const n of Object.values(s.notifications)) if (!n.read) { n.read = true; n.updated_at = iso() } }) },
    clearNotifications() { mutate((s) => { s.notifications = {} }) },

    // ---- Admin content ----
    setContent(recipe) { mutate((s) => { s.content = s.content || emptyContent(); recipe(s.content) }) },

    resetProgress() {
      mutate((s) => {
        Object.assign(s, { sessions: {}, attempts: {}, mistakes: {}, revisions: {}, logs: {}, achievements: {}, notifications: {}, days: {}, firedReminders: {} })
      })
    },
    startOver() {
      mutate((s) => {
        const content = s.content
        Object.assign(s, emptyState(), { content, profile: null })
      })
    },
    importState(json) { setState({ ...emptyState(), ...json }) },
    restoreBackup() { try { const b = localStorage.getItem(BACKUP_KEY); if (!b) return false; setState(parse(b)); return true } catch { return false } },
  }), [mutate, userId])

  const isAdmin = true // single-user app: the owner manages content

  const value = { state: view, today, nowMin, nowDate, plan, stats, ov, actions, mutate, isAdmin }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export { dailyTestId, sessionId }
