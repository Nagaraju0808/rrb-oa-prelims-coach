import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Pause, CheckCircle2, BookOpen, PenLine, Lock, Unlock, Coffee, RotateCcw, Trophy, FileClock } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useTodayInfo } from '../lib/hooks.js'
import { SLOTS, slotTimes, phaseOf } from '../lib/plan.js'
import { fmtTime, fmtDuration, fmtDate, isSunday, addDays, now } from '../lib/dates.js'
import { topicName } from '../lib/syllabus.js'
import { accuracy, dueMistakes } from '../lib/engine.js'
import { createPractice, createMock, createMistakeQuiz } from '../lib/tests.js'
import { PageHeader, StatusBadge, SubjectChip, Modal, Field, cx, Empty } from '../components/ui.jsx'

function liveElapsed(s) {
  const run = s.status === 'in_progress' && s.run_started_at ? (now().getTime() - Date.parse(s.run_started_at)) / 1000 : 0
  return (s.elapsed_sec || 0) + Math.max(0, run)
}

export default function Today() {
  const { state, today, nowMin, plan, actions } = useStore()
  const info = useTodayInfo()
  const nav = useNavigate()
  const [, setT] = useState(0)
  const [completing, setCompleting] = useState(null)
  useEffect(() => { const t = setInterval(() => setT((x) => x + 1), 1000); return () => clearInterval(t) }, [])

  if (!info.day) {
    const next = plan.find((d) => d.date > today)
    return (
      <div className="fade-in">
        <PageHeader title="Today's Plan" subtitle={fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })} />
        <div className="card">
          <Empty icon={isSunday(today) ? '🌤️' : '📅'} title={isSunday(today) ? 'Sunday is a rest & review day' : 'No study day today'}>
            {isSunday(today) ? 'Sundays are not counted in the 60 study days. Read your Weekly Report and revise your Mistake Book.' : next ? 'Your plan has not started yet.' : 'Your 60-day plan is complete.'}
            {next && <div className="mt-2">Next study day: <b>Day {next.day_no}</b> on {fmtDate(next.date, { weekday: 'long', day: 'numeric', month: 'short' })}.</div>}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {isSunday(today) && <Link className="btn-primary" to="/calendar?weekly=1">Open Weekly Report</Link>}
              <Link className="btn-secondary" to="/mistakes">Mistake Book</Link>
            </div>
          </Empty>
        </div>
      </div>
    )
  }

  const { rday, sessions, testAttempt, startMin, unlockMin, testUnlocked } = info
  const phase = phaseOf(rday.day_no)
  const byKey = Object.fromEntries(sessions.map((s) => [s.slot.key, s]))
  const done = sessions.filter((s) => s.status === 'completed').length

  const practice = (s, count = 15) => {
    const topics = s.slot.key === 'revision' ? [...new Set(info.due.map((r) => r.topic_id))] : [s.topic_id]
    if (s.slot.key === 'revision' && !topics.length) {
      const mids = dueMistakes(state, today)
      const id = createMistakeQuiz({ state, actions, mistakes: mids.length ? mids : Object.values(state.mistakes).slice(-10) })
      if (id) nav(`/test/${id}`)
      return
    }
    if (s.topic_id === 'mixed') {
      const id = createMistakeQuiz({ state, actions, mistakes: Object.values(state.mistakes).filter((m) => m.date === today) })
      if (id) { nav(`/test/${id}`); return }
    }
    if (s.status === 'not_started') actions.startSession(s)
    const id = createPractice({ state, actions, topics: topics.filter((t) => t !== 'mixed').length ? topics.filter((t) => t !== 'mixed') : [rday.reasoning_topic, rday.numerical_topic].filter((t) => t !== 'mixed'),
      count, title: `${s.slot.label} — ${s.slot.key === 'revision' ? 'Revision set' : topicName(s.topic_id)}`, session_id: s.id })
    nav(`/test/${id}`)
  }
  const startMock = (s) => {
    if (s.status === 'not_started') actions.startSession(s)
    const id = createMock({ state, actions, title: `Full Prelims Mock — Day ${rday.day_no}`, session_id: s.id })
    nav(`/test/${id}`)
  }

  return (
    <div className="fade-in">
      <PageHeader title={`Day ${rday.day_no} · Today's Plan`} subtitle={`${fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })} · Phase ${phase.id}: ${phase.name} · ${done}/${sessions.length} sessions done`}>
        <Link to="/plan" className="btn-secondary">60-Day Plan</Link>
      </PageHeader>

      <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[19px] before:w-0.5 before:bg-slate-200 sm:before:left-[23px] dark:before:bg-slate-800">
        {SLOTS.map((slot) => {
          const t = slotTimes(slot, startMin)
          const isNow = nowMin >= t.start && nowMin < t.end
          if (slot.kind === 'break') return (
            <div key={slot.key} className="relative flex items-center gap-3 pl-1 sm:pl-2">
              <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 sm:h-9 sm:w-9 dark:bg-slate-800"><Coffee size={15} /></div>
              <div className="text-sm text-slate-500">{fmtTime(t.start)} – {fmtTime(t.end)} · {slot.label}</div>
            </div>
          )
          if (slot.kind === 'test') return (
            <div key={slot.key} className="relative flex gap-3">
              <div className={cx('z-10 mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12', testAttempt?.submitted_at ? 'bg-emerald-600 text-white' : testUnlocked ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800')}><FileClock size={20} /></div>
              <div className={cx('card flex-1 border-2', testUnlocked && !testAttempt?.submitted_at ? 'border-brand-500' : 'border-dashed')}>
                <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">{fmtTime(t.start)} – {fmtTime(t.end)}</span><span className="chip bg-brand-600 text-white">FINAL SESSION</span></div>
                <div className="mt-1 text-lg font-bold">📝 DAILY TEST</div>
                <p className="muted">30 questions · 30 minutes · based on today’s topics: {topicName(rday.reasoning_topic)} & {topicName(rday.numerical_topic)}</p>
                <div className="mt-3">
                  {testAttempt?.submitted_at ? <Link to={`/test/${testAttempt.id}`} className="btn-success"><CheckCircle2 size={16} />Completed — {testAttempt.score}/{testAttempt.max} · View analysis</Link>
                    : testUnlocked ? <Link to="/daily-test" className="btn-primary"><Unlock size={16} />🟢 Daily Test is now available</Link>
                      : <span className="btn bg-slate-100 text-slate-500 dark:bg-slate-800"><Lock size={16} />🔒 Unlocks at {fmtTime(unlockMin)}</span>}
                </div>
              </div>
            </div>
          )
          const s = byKey[slot.key]
          const el = liveElapsed(s)
          const acc = accuracy(s.correct, s.attempted)
          const mockSlot = rday.is_mock_day && slot.key === 'r-concept'
          return (
            <div key={slot.key} className="relative flex gap-3">
              <div className={cx('z-10 mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg sm:h-12 sm:w-12',
                s.status === 'completed' ? 'bg-emerald-600 text-white' : s.status === 'in_progress' ? 'bg-brand-600 text-white' : s.status === 'missed' ? 'bg-rose-100 dark:bg-rose-950' : 'bg-white ring-2 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700')}>
                {s.status === 'completed' ? <CheckCircle2 size={20} /> : slot.subject === 'reasoning' ? '🧠' : slot.subject === 'numerical' ? '🔢' : slot.key === 'revision' ? '📘' : '🎯'}
              </div>
              <div className={cx('card flex-1', isNow && s.status !== 'completed' && 'ring-2 ring-brand-500')}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">{fmtTime(t.start)} – {fmtTime(t.end)}</span>
                  <SubjectChip subject={slot.subject} />
                  <StatusBadge status={s.status} />
                  {isNow && <span className="chip bg-brand-600 text-white">NOW</span>}
                </div>
                <div className="mt-1 text-base font-bold text-slate-900 sm:text-lg dark:text-white">{slot.label}{slot.key !== 'revision' && ` — ${mockSlot ? 'Full Mock' : topicName(s.topic_id)}`}</div>
                <p className="text-sm text-slate-600 dark:text-slate-400"><b>Today’s goal:</b> {s.goal}</p>
                {slot.key === 'revision' && (
                  <div className="mt-2 space-y-1.5">
                    {info.due.length === 0 ? <p className="muted">No topic revisions due. Re-attempt Mistake Book questions instead.</p> : info.due.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={false} onChange={() => actions.completeRevision(r.id)} />
                        <span>{topicName(r.topic_id)}</span><span className="text-xs text-slate-400">{r.label}{r.due_date < today ? ' · overdue' : ''}</span>
                        <Link className="ml-auto text-xs text-brand-600 hover:underline" to={`/topic/${r.topic_id}`}>Notes</Link>
                      </label>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>⏱ {fmtDuration(el)}</span>
                  <span>Questions solved: <b>{s.attempted || 0}</b></span>
                  <span>Correct: <b>{s.correct || 0}</b></span>
                  <span>Accuracy: <b>{s.attempted ? `${acc}%` : '—'}</b></span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.status === 'not_started' || s.status === 'missed' ? <button className="btn-primary" onClick={() => actions.startSession(s)}><Play size={16} />Start Session</button> : null}
                  {s.status === 'in_progress' && <button className="btn-secondary" onClick={() => actions.pauseSession(s.id)}><Pause size={16} />Pause</button>}
                  {s.status === 'paused' && <button className="btn-primary" onClick={() => actions.resumeSession(s.id)}><Play size={16} />Resume</button>}
                  {mockSlot ? <button className="btn-secondary" onClick={() => startMock(s)}><Trophy size={16} />Start Full Mock</button>
                    : <button className="btn-secondary" onClick={() => practice(s, slot.mode === 'concept' ? 15 : 20)}><PenLine size={16} />{slot.key === 'revision' ? 'Revision quiz' : 'Practice in app'}</button>}
                  {s.topic_id && !['revision', 'mixed'].includes(s.topic_id) && <Link className="btn-ghost" to={`/topic/${s.topic_id}`}><BookOpen size={16} />Concepts</Link>}
                  {['in_progress', 'paused'].includes(s.status) && <button className="btn-success" onClick={() => setCompleting(s)}><CheckCircle2 size={16} />Complete</button>}
                  {s.status === 'completed' && <button className="btn-ghost" onClick={() => actions.resetSession(s.id)} title="Undo completion"><RotateCcw size={16} />Undo</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <CompleteModal s={completing} onClose={() => setCompleting(null)} onDone={(v) => { actions.completeSession(completing.id, v); setCompleting(null) }} />
      {plan.find((d) => d.date === addDays(today, 1)) && <p className="muted mt-6 text-center">Tomorrow: {(() => { const d = plan.find((x) => x.date === addDays(today, 1)); return d.is_mock_day ? 'Full mock day' : `${topicName(d.reasoning_topic)} · ${topicName(d.numerical_topic)}` })()}</p>}
    </div>
  )
}

function CompleteModal({ s, onClose, onDone }) {
  const [a, setA] = useState(''), [c, setC] = useState(''), [notes, setNotes] = useState('')
  useEffect(() => { if (s) { setA(String(s.manual_attempted || '')); setC(String(s.manual_correct || '')); setNotes(s.notes || '') } }, [s])
  if (!s) return null
  const inApp = s.practice_attempted || 0, inAppC = s.practice_correct || 0
  const tot = inApp + (+a || 0), totC = inAppC + Math.min(+c || 0, +a || 0)
  const bad = (+c || 0) > (+a || 0)
  return (
    <Modal open onClose={onClose} title={`Complete: ${s.slot.label}`}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-success" disabled={bad} onClick={() => onDone({ attempted: +a || 0, correct: +c || 0, notes })}><CheckCircle2 size={16} />Mark Completed</button></>}>
      <div className="space-y-3">
        {inApp > 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950">In-app practice counted automatically: <b>{inAppC}/{inApp}</b> correct.</p>}
        <p className="muted">Solved questions from a book/PDF? Log them here.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Questions attempted"><input className="input" type="number" min="0" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value)} /></Field>
          <Field label="Correct answers"><input className="input" type="number" min="0" inputMode="numeric" value={c} onChange={(e) => setC(e.target.value)} /></Field>
        </div>
        {bad && <p className="text-sm text-rose-600">Correct answers cannot exceed questions attempted.</p>}
        <Field label="Notes (optional)"><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you learn? What was hard?" /></Field>
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">Session total: <b>{tot}</b> questions · <b>{totC}</b> correct · Accuracy = {totC} / {tot} × 100 = <b>{accuracy(totC, tot)}%</b></div>
      </div>
    </Modal>
  )
}
