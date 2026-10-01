import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, MinusCircle, Clock, Target, BookPlus, Check } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { MISTAKE_TYPES, weakAreas } from '../lib/engine.js'
import { fmtDuration } from '../lib/dates.js'
import { topicName } from '../lib/syllabus.js'
import { QuestionBody } from './TestRunner.jsx'
import { Ring, Tabs, cx, accColor, ProgressBar, accBar, SubjectChip } from './ui.jsx'

export default function TestResult({ attempt, questions, actionsSlot }) {
  const { state, actions } = useStore()
  const [filter, setFilter] = useState('wrong')
  const subj = attempt.by_subject || {}
  const topics = Object.entries(attempt.by_topic || {}).sort((a, b) => (a[1].correct / (a[1].attempted || 1)) - (b[1].correct / (b[1].attempted || 1)))
  const status = (q) => { const c = attempt.answers?.[q.id]?.choice; return c == null ? 'skipped' : c === q.answer ? 'correct' : 'wrong' }
  const list = useMemo(() => questions.map((q, i) => ({ q, i, st: status(q) })).filter((x) => filter === 'all' || x.st === filter), [questions, filter]) // eslint-disable-line react-hooks/exhaustive-deps
  const counts = { all: questions.length, wrong: attempt.wrong, skipped: attempt.skipped, correct: attempt.correct }
  const pct = attempt.max ? Math.max(0, (attempt.score / attempt.max) * 100) : 0
  const weak = weakAreas(attempt)

  return (
    <div className="fade-in space-y-4">
      <div className="card">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <Ring value={pct} size={120} stroke={11} label={`${attempt.score}/${attempt.max}`} sub="Score" color={pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#e11d48'} />
          <div className="w-full flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="h2">{attempt.title}</h2>
              {attempt.auto_submitted && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Auto-submitted (time up)</span>}
            </div>
            {attempt.negative > 0 && <p className="muted mb-2">Negative marking applied: −{attempt.negative} × {attempt.wrong} wrong = −{(attempt.negative * attempt.wrong).toFixed(2)}</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Mini icon={Target} label="Accuracy" value={`${attempt.accuracy}%`} cls={accColor(attempt.accuracy)} />
              <Mini icon={CheckCircle2} label="Correct" value={attempt.correct} cls="text-emerald-600" />
              <Mini icon={XCircle} label="Wrong" value={attempt.wrong} cls="text-rose-600" />
              <Mini icon={MinusCircle} label="Skipped" value={attempt.skipped} cls="text-slate-500" />
              <Mini icon={Clock} label="Time taken" value={fmtDuration(attempt.time_taken_sec)} />
            </div>
          </div>
        </div>
        {attempt.kind === 'revision-quiz' && attempt.session_id && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">✅ Revision Quiz saved — the topic is marked completed in Today’s Plan and its spaced revisions are scheduled.</p>
        )}
        {actionsSlot && <div className="mt-4 flex flex-wrap gap-2">{actionsSlot}</div>}
      </div>

      <div className="card">
        <h3 className="h2 mb-2">Weak areas</h3>
        {weak.length === 0 ? <p className="muted">{attempt.correct + attempt.wrong ? 'No weak areas in this test — every sub-topic scored 60% or more. 🎉' : 'You did not answer any question, so weak areas cannot be identified.'}</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">{weak.map((w) => (
            <li key={w.topic + w.subtopic} className="flex items-center gap-3 rounded-xl border border-rose-200 p-3 text-sm dark:border-rose-900">
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{w.subtopic}</div><div className="truncate text-xs text-slate-500">{topicName(w.topic)}</div></div>
              <span className="font-bold text-rose-600">{w.correct}/{w.total}</span>
              <Link to={`/topic/${w.topic}`} className="btn-secondary !px-2 !py-1 text-xs">Shortcuts</Link>
            </li>))}</ul>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="h2 mb-3">Subject-wise performance</h3>
          <div className="space-y-3">
            {Object.entries(subj).map(([k, s]) => {
              const acc = s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0
              return (
                <div key={k}>
                  <div className="mb-1 flex items-center justify-between text-sm"><SubjectChip subject={k} />
                    <span className="font-semibold">{Math.round(s.score * 100) / 100}/{Math.round((s.max ?? s.total) * 100) / 100} · <span className={accColor(acc)}>{acc}%</span></span></div>
                  <ProgressBar value={(s.correct / s.total) * 100} color={accBar(acc)} />
                  <div className="mt-1 text-xs text-slate-500">✔ {s.correct} · ✘ {s.wrong} · — {s.skipped} · ⏱ {fmtDuration(s.time)} ({s.attempted ? Math.round(s.time / Math.max(1, s.attempted + s.skipped)) : 0}s/question)</div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="card">
          <h3 className="h2 mb-3">Topic-wise performance</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {topics.map(([t, s]) => {
              const acc = s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0
              return (
                <div key={t} className="flex items-center gap-3 text-sm">
                  <span className="w-40 truncate">{topicName(t)}</span>
                  <ProgressBar value={acc} color={accBar(acc)} className="flex-1" />
                  <span className={cx('w-24 text-right text-xs font-semibold tabular-nums', accColor(acc))}>{s.correct}/{s.total} · {acc}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="h2 mb-3">Question-by-question analysis</h3>
        <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'wrong', label: 'Wrong', count: counts.wrong }, { value: 'skipped', label: 'Skipped', count: counts.skipped }, { value: 'correct', label: 'Correct', count: counts.correct }, { value: 'all', label: 'All', count: counts.all }]} />
        {list.length === 0 && <p className="muted py-6 text-center">Nothing here. {filter === 'wrong' && 'No wrong answers — excellent! 🎉'}</p>}
        <div className="space-y-3">
          {list.map(({ q, i, st }) => <ReviewItem key={q.id} q={q} i={i} st={st} attempt={attempt} state={state} actions={actions} />)}
        </div>
      </div>
    </div>
  )
}

function Mini({ icon: Icon, label, value, cls = '' }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase"><Icon size={12} />{label}</div>
      <div className={cx('text-lg font-bold', cls)}>{value}</div>
    </div>
  )
}

function ReviewItem({ q, i, st, attempt, state, actions }) {
  const ans = attempt.answers?.[q.id] || {}
  const mid = `m-${attempt.id}-${q.id}`.slice(0, 180)
  const existing = state.mistakes[mid]
  const [type, setType] = useState(existing?.mistake_type || (st === 'skipped' ? 'Time Pressure' : 'Concept Error'))
  const [open, setOpen] = useState(st !== 'correct')
  return (
    <div className={cx('rounded-xl border p-3', st === 'correct' ? 'border-emerald-200 dark:border-emerald-900' : st === 'wrong' ? 'border-rose-200 dark:border-rose-900' : 'border-slate-200 dark:border-slate-700')}>
      <button className="flex w-full items-center gap-2 text-left text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>
        {st === 'correct' ? <CheckCircle2 size={16} className="text-emerald-600" /> : st === 'wrong' ? <XCircle size={16} className="text-rose-600" /> : <MinusCircle size={16} className="text-slate-400" />}
        <span className="font-semibold">Q{i + 1}</span><span className="truncate text-slate-500">{topicName(q.topic)} · {q.difficulty} · {Math.round(ans.time_sec || 0)}s</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <QuestionBody q={q} />
          <div className="grid gap-1.5">
            {q.options.map((o, k) => (
              <div key={k} className={cx('rounded-lg px-3 py-1.5', k === q.answer ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : k === ans.choice ? 'bg-rose-50 text-rose-800 line-through dark:bg-rose-950 dark:text-rose-200' : 'text-slate-600 dark:text-slate-400')}>
                {String.fromCharCode(65 + k)}. {o} {k === q.answer && '✓'} {k === ans.choice && k !== q.answer && '(your answer)'}
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-blue-50 p-3 whitespace-pre-line text-slate-700 dark:bg-blue-950/50 dark:text-slate-200"><span className="font-semibold">Explanation: </span>{q.explanation}</div>
          {st !== 'correct' && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-40 flex-1"><span className="label">Mistake type</span>
                <select className="input" value={type} onChange={(e) => { setType(e.target.value); if (existing) actions.updateMistake(mid, { mistake_type: e.target.value }) }}>
                  {MISTAKE_TYPES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              {existing ? <span className="btn bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Check size={16} />In Mistake Book</span>
                : <button className="btn-primary" onClick={() => actions.addMistake({ question: q, attempt, choice: ans.choice, type })}><BookPlus size={16} />Add to Mistake Book</button>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
