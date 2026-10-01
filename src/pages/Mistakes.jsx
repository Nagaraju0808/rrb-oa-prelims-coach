import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RotateCcw, Trash2, ChevronDown } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { MISTAKE_TYPES, dueMistakes } from '../lib/engine.js'
import { createMistakeQuiz } from '../lib/tests.js'
import { fmtDate, weekStart } from '../lib/dates.js'
import { topicName } from '../lib/syllabus.js'
import { PageHeader, Empty, SubjectChip, cx } from '../components/ui.jsx'

const FILTERS = [
  ['all', 'All'], ['reasoning', 'Reasoning'], ['numerical', 'Numerical Ability'], ['today', 'Today'], ['week', 'This Week'],
  ['Concept Error', 'Concept Mistakes'], ['Calculation Error', 'Calculation Mistakes'], ['Silly Mistake', 'Silly Mistakes'], ['Time Pressure', 'Time Pressure'], ['due', 'Due for revision'],
]

export default function Mistakes() {
  const { state, today, actions } = useStore()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [f, setF] = useState(params.get('due') ? 'due' : 'all')
  const [open, setOpen] = useState(null)
  const all = Object.values(state.mistakes).sort((a, b) => (a.date < b.date ? 1 : -1))
  const due = useMemo(() => new Set(dueMistakes(state, today).map((m) => m.id)), [state, today])
  const ws = weekStart(today)
  const list = all.filter((m) => f === 'all' || m.subject === f || (f === 'today' && m.date === today) || (f === 'week' && m.date >= ws) || m.mistake_type === f || (f === 'due' && due.has(m.id)))
  const count = (k) => all.filter((m) => k === 'all' || m.subject === k || (k === 'today' && m.date === today) || (k === 'week' && m.date >= ws) || m.mistake_type === k || (k === 'due' && due.has(m.id))).length
  const quiz = (ms) => { const id = createMistakeQuiz({ state, actions, mistakes: ms }); if (id) nav(`/test/${id}`) }

  return (
    <div className="fade-in">
      <PageHeader title="Mistake Book" subtitle={`${all.length} mistakes · ${all.filter((m) => m.mastered).length} mastered · ${due.size} due for revision`}>
        {list.length > 0 && <button className="btn-primary" onClick={() => quiz(list.filter((m) => !m.mastered).slice(0, 30))}><RotateCcw size={16} />Re-attempt {Math.min(30, list.filter((m) => !m.mastered).length)} shown</button>}
      </PageHeader>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setF(k)} className={cx('chip !px-3 !py-1.5 whitespace-nowrap', f === k ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700')}>
            {l} <span className="opacity-70">{count(k)}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card"><Empty icon="📕" title={all.length ? 'No mistakes match this filter' : 'Your Mistake Book is empty'}>After any test, open the analysis and press “Add to Mistake Book” on wrong or skipped questions.</Empty></div>
      ) : (
        <div className="space-y-2">
          {list.map((m) => (
            <div key={m.id} className="card !p-0">
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <SubjectChip subject={m.subject} /><span className="font-semibold">{topicName(m.topic_id)}</span>
                    <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">{m.mistake_type}</span>
                    {m.mastered ? <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Mastered</span> : due.has(m.id) && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Revise today</span>}
                    <span className="text-slate-400">{fmtDate(m.date)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">{m.question_text.split('\n').slice(-3).join(' ')}</p>
                </div>
                <ChevronDown size={18} className={cx('shrink-0 transition', open === m.id && 'rotate-180')} />
              </button>
              {open === m.id && (
                <div className="space-y-3 border-t border-slate-100 p-4 text-sm dark:border-slate-800">
                  <p className="whitespace-pre-line">{m.question_text}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-950"><span className="text-xs font-semibold text-rose-600 uppercase">Your answer</span><div>{m.wrong_answer}</div></div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950"><span className="text-xs font-semibold text-emerald-600 uppercase">Correct answer</span><div>{m.correct_answer}</div></div>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 whitespace-pre-line dark:bg-blue-950/50"><b>Explanation: </b>{m.explanation}</div>
                  <div className="text-xs text-slate-500">Revision dates: {(m.revision_dates || []).map((d) => <span key={d} className={cx('mr-2', (m.revised_dates || []).includes(d) && 'text-emerald-600 line-through')}>{fmtDate(d, { day: 'numeric', month: 'short' })}</span>)}
                    {m.last_result && <> · Last re-attempt: <b>{m.last_result}</b></>}</div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-40"><span className="label">Mistake type</span>
                      <select className="input" value={m.mistake_type} onChange={(e) => actions.updateMistake(m.id, { mistake_type: e.target.value })}>{MISTAKE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
                    <label className="min-w-48 flex-1"><span className="label">My note</span>
                      <input className="input" defaultValue={m.note} onBlur={(e) => e.target.value !== m.note && actions.updateMistake(m.id, { note: e.target.value })} placeholder="Why did I get it wrong?" /></label>
                    <button className="btn-secondary" onClick={() => quiz([m])}><RotateCcw size={16} />Re-attempt</button>
                    <button className="btn-ghost text-rose-600" onClick={() => actions.deleteMistake(m.id)} aria-label="Delete mistake"><Trash2 size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
