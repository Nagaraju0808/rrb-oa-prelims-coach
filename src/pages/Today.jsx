import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Pause, CheckCircle2, Coffee, RotateCcw, Trophy, FileClock, ChevronDown, PenLine, Brain, Check, Circle } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useTodayInfo } from '../lib/hooks.js'
import { SLOTS, slotTimes, phaseOf, topicField, SUBJECT_SLOTS } from '../lib/plan.js'
import { fmtTime, fmtDuration, fmtDate, isSunday, addDays, now } from '../lib/dates.js'
import { topicName } from '../lib/syllabus.js'
import { accuracy, dueMistakes, allTopics, TOPIC_STEPS } from '../lib/engine.js'
import { createPractice, createMock, createMistakeQuiz, createRevisionQuiz, createDailyTest } from '../lib/tests.js'
import { PageHeader, StatusBadge, SubjectChip, Modal, Field, cx, Empty, ProgressBar, Tabs } from '../components/ui.jsx'
import { ConceptView, ShortcutsView, RulesView } from '../components/TopicGuide.jsx'

function liveElapsed(s) {
  const run = s.status === 'in_progress' && s.run_started_at ? (now().getTime() - Date.parse(s.run_started_at)) / 1000 : 0
  return (s.elapsed_sec || 0) + Math.max(0, run)
}

export default function Today() {
  const { state, today, nowMin, plan, stats, actions } = useStore()
  const info = useTodayInfo()
  const nav = useNavigate()
  const [, setT] = useState(0)
  const [completing, setCompleting] = useState(null)
  const [open, setOpen] = useState(null)
  useEffect(() => { const t = setInterval(() => setT((x) => x + 1), 1000); return () => clearInterval(t) }, [])
  // Open the current/next topic by default.
  useEffect(() => { if (open === null && info.next) setOpen(info.next.id) }, [info.next?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!info.day) {
    const next = plan.find((d) => d.date > today)
    return (
      <div className="fade-in">
        <PageHeader title="Today's Plan" subtitle={fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })} />
        <div className="card">
          <Empty icon={isSunday(today) ? '🌤️' : '📅'} title={isSunday(today) ? 'Sunday is a rest & review day' : 'No study day today'}>
            {isSunday(today) ? 'Sundays are not counted in the 60 study days. Read your Weekly Report, take the Weekly Test and revise your Mistake Book.' : next ? 'Your plan has not started yet.' : 'Your 60-day plan is complete.'}
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

  const { rday, sessions, testAttempt, startMin, ready } = info
  const phase = phaseOf(rday.day_no)
  const byKey = Object.fromEntries(sessions.map((s) => [s.slot.key, s]))
  const todaysTopics = SUBJECT_SLOTS.map((s) => rday[topicField(s.subject)]).filter((t) => t && t !== 'mixed')
  const studied = [...new Set(plan.filter((d) => d.day_no <= rday.day_no).flatMap((d) => SUBJECT_SLOTS.map((s) => d[topicField(s.subject)])).filter((t) => t && t !== 'mixed'))]
  const go = (id) => { if (id) nav(`/test/${id}`) }

  const ctx = {
    practice: (s, count = 15) => {
      if (s.status === 'not_started' || s.status === 'missed') actions.startSession(s)
      const topics = s.topic_id && s.topic_id !== 'mixed' ? [s.topic_id] : todaysTopics
      go(createPractice({ state, actions, topics, count, title: `${s.slot.label} — Practice: ${topicName(topics[0])}`, session_id: s.id, return_to: '/today' }))
    },
    quiz: (s) => {
      // Revision slot: due revision topics → today's topics → everything studied so far. Subject slots: that topic.
      const topics = s.slot.key === 'revision' ? [...new Set(info.due.map((r) => r.topic_id))] : [s.topic_id]
      go(createRevisionQuiz({ state, actions, topics, fallback: s.slot.key === 'revision' ? [...todaysTopics, ...studied] : todaysTopics, session_id: s.id,
        title: 'Revision Quiz — Today’s revision' }))
    },
    mock: (s) => {
      if (s.status === 'not_started' || s.status === 'missed') actions.startSession(s)
      go(createMock({ state, actions, type: rday.mock_type || 'prelims', title: `Full ${rday.mock_type === 'mains' ? 'Mains' : 'Prelims'} Mock — Day ${rday.day_no}`, session_id: s.id }))
    },
    mistakes: () => go(createMistakeQuiz({ state, actions, mistakes: dueMistakes(state, today) })),
    complete: setCompleting,
  }

  return (
    <div className="fade-in">
      <PageHeader title={`Day ${rday.day_no} · Today's Plan`} subtitle={`${fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })} · Phase ${phase.id}: ${phase.name}`}>
        <Link to="/plan" className="btn-secondary">60-Day Plan</Link>
      </PageHeader>

      <div className="card mb-4 !p-4">
        <div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold">Today’s Preparation</span><span className="font-semibold">{ready.pct}%</span></div>
        <ProgressBar value={ready.pct} color={ready.ready ? 'bg-emerald-500' : 'bg-brand-600'} label="Today's preparation" />
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">{ready.items.map((x) => (
          <span key={x.key} className={cx('chip', x.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
            {x.done ? '✓' : '○'} {x.label.replace("Today's ", '')}</span>))}</div>
      </div>

      <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[19px] before:w-0.5 before:bg-slate-200 sm:before:left-[23px] dark:before:bg-slate-800">
        {SLOTS.map((slot) => {
          const t = slotTimes(slot, startMin)
          if (slot.kind === 'break') return (
            <div key={slot.key} className="relative flex items-center gap-3 pl-1 sm:pl-2">
              <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 sm:h-9 sm:w-9 dark:bg-slate-800"><Coffee size={15} /></div>
              <div className="text-sm text-slate-500">{fmtTime(t.start)} – {fmtTime(t.end)} · {slot.label}</div>
            </div>
          )
          if (slot.kind === 'test') return <DailyTestCard key="test" t={t} rday={rday} ready={ready} testAttempt={testAttempt}
            onStart={() => go(testAttempt?.id || createDailyTest({ state, plan, rday, stats, actions }))} />
          const s = byKey[slot.key]
          return <SessionCard key={slot.key} s={s} t={t} isNow={nowMin >= t.start && nowMin < t.end} rday={rday} info={info} today={today}
            open={open === s.id} onToggle={() => setOpen(open === s.id ? '' : s.id)} ctx={ctx} />
        })}
      </div>
      <CompleteModal s={completing} onClose={() => setCompleting(null)} onDone={(v) => { actions.completeSession(completing.id, v); setCompleting(null) }} />
      {plan.find((d) => d.date === addDays(today, 1)) && <p className="muted mt-6 text-center">Tomorrow: {(() => { const d = plan.find((x) => x.date === addDays(today, 1)); return SUBJECT_SLOTS.map((x) => d[topicField(x.subject)]).filter((y) => y !== 'mixed').map(topicName).join(' · ') })()}</p>}
    </div>
  )
}

function SessionCard({ s, t, isNow, rday, info, today, open, onToggle, ctx }) {
  const { state, actions } = useStore()
  const slot = s.slot
  const el = liveElapsed(s)
  const acc = accuracy(s.correct, s.attempted)
  const mockSlot = rday.is_mock_day && slot.key === 'reasoning'
  const topic = allTopics(state.content).find((x) => x.id === s.topic_id)
  const steps = s.steps || {}
  const isTopic = slot.mode === 'topic' && topic && !mockSlot
  const doneSteps = TOPIC_STEPS.filter((x) => steps[x.key]).length
  const quizAttempt = Object.values(state.attempts).filter((a) => a.session_id === s.id && a.kind === 'revision-quiz' && a.submitted_at).sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1))[0]
  const icon = { reasoning: '🧠', numerical: '🔢', language: '🗣️', ga: '📰', computer: '💻' }[slot.subject] || (slot.key === 'revision' ? '🔄' : '🎯')
  return (
    <div className="relative flex gap-3">
      <div className={cx('z-10 mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg sm:h-12 sm:w-12',
        s.status === 'completed' ? 'bg-emerald-600 text-white' : s.status === 'in_progress' ? 'bg-brand-600 text-white' : s.status === 'missed' ? 'bg-rose-100 dark:bg-rose-950' : 'bg-white ring-2 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700')}>
        {s.status === 'completed' ? <CheckCircle2 size={20} /> : icon}
      </div>
      <div className={cx('card min-w-0 flex-1', isNow && s.status !== 'completed' && 'ring-2 ring-brand-500')}>
        <button className="w-full text-left" onClick={onToggle} aria-expanded={open}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{fmtTime(t.start)} – {fmtTime(t.end)}</span>
            <SubjectChip subject={slot.subject} />
            <StatusBadge status={s.status} />
            {slot.optional && <span className="chip bg-slate-100 text-slate-500 dark:bg-slate-800">optional</span>}
            {isNow && <span className="chip bg-brand-600 text-white">NOW</span>}
            <ChevronDown size={18} className={cx('ml-auto shrink-0 text-slate-400 transition', open && 'rotate-180')} />
          </div>
          <div className="mt-1 text-base font-bold text-slate-900 sm:text-lg dark:text-white">
            {slot.key === 'revision' ? "Today's Revision" : mockSlot ? `Full ${rday.mock_type === 'mains' ? 'Mains' : 'Prelims'} Mock` : `${slot.key === 'weak' ? 'Practice / Weak Topic' : slot.label} — ${topicName(s.topic_id)}`}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{s.goal}</p>
          {isTopic && (
            <div className="mt-2 flex flex-wrap items-center gap-1" aria-label={`${doneSteps} of 5 steps done`}>
              {TOPIC_STEPS.map((x) => (
                <span key={x.key} className={cx('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', steps[x.key] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                  {steps[x.key] ? <Check size={11} /> : <Circle size={9} />}{x.short}
                </span>))}
            </div>
          )}
        </button>

        {open && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            {isTopic ? <TopicFlow s={s} topic={topic} steps={steps} ctx={ctx} />
              : slot.key === 'revision' ? <RevisionFlow s={s} info={info} today={today} quizAttempt={quizAttempt} ctx={ctx} />
                : mockSlot ? <div className="text-sm"><p className="mb-3">Today is a mock day. The mock follows the official pattern with separately timed sections and 0.25 negative marking.</p>
                  <button className="btn-primary" onClick={() => ctx.mock(s)}><Trophy size={16} />Start Full {rday.mock_type === 'mains' ? 'Mains' : 'Prelims'} Mock</button></div>
                  : <div className="space-y-3 text-sm">
                    <p>{rday.weak_reason}.</p>
                    {topic && <ShortcutsView topic={topic} compact />}
                    <button className="btn-primary" onClick={() => ctx.practice(s, 20)}><PenLine size={16} />Practice 20 questions</button>
                  </div>}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>⏱ {fmtDuration(el)}</span>
          <span>Questions: <b>{s.attempted || 0}</b></span>
          <span>Correct: <b>{s.correct || 0}</b></span>
          <span>Accuracy: <b>{s.attempted ? `${acc}%` : '—'}</b></span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(s.status === 'not_started' || s.status === 'missed') && <button className="btn-secondary" onClick={() => actions.startSession(s)}><Play size={16} />Start timer</button>}
          {s.status === 'in_progress' && <button className="btn-secondary" onClick={() => actions.pauseSession(s.id)}><Pause size={16} />Pause</button>}
          {s.status === 'paused' && <button className="btn-secondary" onClick={() => actions.resumeSession(s.id)}><Play size={16} />Resume</button>}
          {['in_progress', 'paused'].includes(s.status) && <button className="btn-success" onClick={() => ctx.complete(s)}><CheckCircle2 size={16} />{isTopic ? 'Mark topic completed' : 'Mark completed'}</button>}
          {s.status === 'completed' && <button className="btn-ghost" onClick={() => actions.resetSession(s.id)} title="Undo completion"><RotateCcw size={16} />Undo</button>}
        </div>
      </div>
    </div>
  )
}

const FLOW_TABS = [
  { value: 'learn', label: '📚 Concept' }, { value: 'shortcuts', label: '💡 Shortcuts' }, { value: 'rules', label: '📌 Rules' },
  { value: 'practice', label: '📝 Practice' }, { value: 'revision', label: '🔄 Revision' },
]

function TopicFlow({ s, topic, steps, ctx }) {
  const { actions } = useStore()
  const firstOpen = TOPIC_STEPS.find((x) => !steps[x.key])?.key || 'revision'
  const [tab, setTab] = useState(firstOpen === 'learn' ? 'learn' : firstOpen)
  const mark = (step) => actions.setStep(s, step)
  const Done = ({ step, label }) => steps[step]
    ? <span className="btn bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Check size={16} />Done</span>
    : <button className="btn-primary" onClick={() => mark(step)}><Check size={16} />{label}</button>
  return (
    <div>
      <Tabs value={tab} onChange={setTab} tabs={FLOW_TABS} />
      {tab === 'learn' && <div className="space-y-3"><ConceptView topic={topic} /><div className="flex flex-wrap gap-2"><Done step="learn" label="I’ve learned the concept" /><button className="btn-ghost" onClick={() => setTab('shortcuts')}>Next: Shortcuts →</button></div></div>}
      {tab === 'shortcuts' && <div className="space-y-3"><ShortcutsView topic={topic} /><div className="flex flex-wrap gap-2"><Done step="shortcuts" label="I’ve read the shortcuts" /><button className="btn-ghost" onClick={() => setTab('rules')}>Next: Rules →</button></div></div>}
      {tab === 'rules' && <div className="space-y-3"><RulesView topic={topic} /><button className="btn-ghost" onClick={() => setTab('practice')}>Next: Practice →</button></div>}
      {tab === 'practice' && (
        <div className="space-y-3 text-sm">
          <p>Solve questions on <b>{topic.name}</b> in the app — your score is added to this session automatically. Solved questions from a book? Log them when you mark the topic completed.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => ctx.practice(s, 15)}><PenLine size={16} />Practice 15 questions</button>
            <button className="btn-secondary" onClick={() => ctx.practice(s, 25)}>Practice 25</button>
            {steps.practice && <span className="btn bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Check size={16} />Practice done ({s.practice_correct || 0}/{s.practice_attempted || 0})</span>}
          </div>
        </div>
      )}
      {tab === 'revision' && (
        <div className="space-y-3 text-sm">
          <p className="font-semibold">Quick recap:</p>
          <ShortcutsView topic={topic} compact />
          <RulesView topic={topic} />
          <div className="flex flex-wrap gap-2">
            <Done step="revision" label="I’ve revised this topic" />
            {(s.status === 'not_started' || s.status === 'missed') && <button className="btn-success" onClick={() => { actions.startSession(s); ctx.complete(s) }}><CheckCircle2 size={16} />Mark topic completed</button>}
          </div>
        </div>
      )}
    </div>
  )
}

function RevisionFlow({ s, info, today, quizAttempt, ctx }) {
  const { state, actions } = useStore()
  const mistakes = dueMistakes(state, today)
  return (
    <div className="space-y-3 text-sm">
      {info.due.length === 0 ? <p className="muted">No spaced revisions are due today — the quiz will cover today’s topics instead.</p> : (
        <div className="space-y-1.5">{info.due.map((r) => (
          <label key={r.id} className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={false} onChange={() => actions.completeRevision(r.id)} />
            <span>{topicName(r.topic_id)}</span><span className="text-xs text-slate-400">{r.label}{r.due_date < today ? ' · overdue' : ''}</span>
            <Link className="ml-auto text-xs text-brand-600 hover:underline" to={`/topic/${r.topic_id}`}>Shortcuts</Link>
          </label>))}</div>
      )}
      {quizAttempt && <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">Last quiz: <b>{quizAttempt.score}/{quizAttempt.max}</b> · {quizAttempt.accuracy}% · <Link className="text-brand-600 hover:underline" to={`/test/${quizAttempt.id}`}>View analysis</Link></div>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => ctx.quiz(s)}><Brain size={16} />{quizAttempt ? 'Retake Revision Quiz' : 'Start Revision Quiz'}</button>
        {mistakes.length > 0 && <button className="btn-secondary" onClick={ctx.mistakes}><RotateCcw size={16} />Re-attempt {mistakes.length} Mistake Book question(s)</button>}
      </div>
    </div>
  )
}

function DailyTestCard({ t, rday, ready, testAttempt, onStart }) {
  const [early, setEarly] = useState(false)
  const done = !!testAttempt?.submitted_at
  return (
    <div className="relative flex gap-3">
      <div className={cx('z-10 mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12', done ? 'bg-emerald-600 text-white' : ready.ready ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800')}><FileClock size={20} /></div>
      <div className={cx('card flex-1 border-2', ready.ready && !done ? 'border-brand-500' : 'border-dashed')}>
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">Suggested: {fmtTime(t.start)} onwards</span><span className="chip bg-brand-600 text-white">LAST ITEM OF THE DAY</span></div>
        <div className="mt-1 text-lg font-bold">🎯 DAILY TEST</div>
        <p className="muted">30 questions · 30 minutes · from today’s topics: {SUBJECT_SLOTS.map((x) => rday[topicField(x.subject)]).filter((y) => y !== 'mixed').map(topicName).join(', ') || 'everything studied so far'}</p>
        <div className="mt-3">
          {done ? <Link to={`/test/${testAttempt.id}`} className="btn-success"><CheckCircle2 size={16} />Completed — {testAttempt.score}/{testAttempt.max} · View analysis</Link>
            : ready.ready ? <button className="btn-primary !py-3" onClick={onStart}><Play size={16} />{testAttempt ? 'RESUME DAILY TEST' : '🎯 Daily Test Ready — START TEST'}</button>
              : (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Today’s preparation is not complete ({ready.done}/{ready.total}).</p>
                  <p className="text-slate-500">Remaining: {ready.remaining.map((x) => x.label.replace("Today's ", '')).join(', ')}</p>
                  <div className="flex flex-wrap gap-2">
                    <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="btn-primary">Continue Today’s Plan</a>
                    <button className="btn-secondary" onClick={() => (testAttempt ? onStart() : setEarly(true))}>{testAttempt ? 'Resume test' : 'Start test early'}</button>
                  </div>
                </div>
              )}
        </div>
      </div>
      <Modal open={early} onClose={() => setEarly(false)} title="Start the Daily Test early?"
        footer={<><button className="btn-secondary" onClick={() => setEarly(false)}>Continue preparing</button><button className="btn-primary" onClick={() => { setEarly(false); onStart() }}>Start now</button></>}>
        <p className="text-sm">You still have {ready.remaining.length} item(s) left today. The test covers all of today’s topics, so your score may be lower — but you can take it now if you want to.</p>
      </Modal>
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
        {inApp > 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950">In-app practice and quizzes counted automatically: <b>{inAppC}/{inApp}</b> correct.</p>}
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
