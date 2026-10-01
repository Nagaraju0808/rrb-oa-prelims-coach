import { useNavigate, Link } from 'react-router-dom'
import { Check, RotateCcw, PenLine, Undo2 } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { dueRevisions, dueMistakes, weakTopics, REVISION_OFFSETS } from '../lib/engine.js'
import { createPractice, createMistakeQuiz } from '../lib/tests.js'
import { fmtDate, addDays } from '../lib/dates.js'
import { topicName } from '../lib/syllabus.js'
import { PageHeader, Empty, SubjectChip, accColor, cx } from '../components/ui.jsx'

export default function Revision() {
  const { state, today, stats, actions } = useStore()
  const nav = useNavigate()
  const due = dueRevisions(state, today)
  const mistakes = dueMistakes(state, today)
  const upcoming = Object.values(state.revisions).filter((r) => r.status === 'pending' && r.due_date > today && r.due_date <= addDays(today, 14)).sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
  const doneToday = Object.values(state.revisions).filter((r) => r.status === 'done' && r.completed_at?.slice(0, 10) === today)
  const weak = weakTopics(stats).slice(0, 4)
  const practice = (topicId) => nav(`/test/${createPractice({ state, actions, topics: [topicId], count: 10, title: `Revision — ${topicName(topicId)}` })}`)

  return (
    <div className="fade-in space-y-5">
      <PageHeader title="Revision" subtitle={`Spaced repetition: Learning Day → Day ${REVISION_OFFSETS.map((o) => `+${o}`).join(' → Day ')} (Sundays roll to Monday)`} />
      <div className="card">
        <h2 className="h2 mb-3">Revision Due Today <span className="text-sm font-normal text-slate-500">({due.length})</span></h2>
        {due.length === 0 ? <Empty icon="✅" title="All caught up">Nothing due today.{doneToday.length > 0 && ` You completed ${doneToday.length} revision(s) today.`}</Empty> : (
          <ul className="space-y-2">{due.map((r) => {
            const s = stats[r.topic_id]
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <SubjectChip subject={s?.subject} />
                <Link to={`/topic/${r.topic_id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{topicName(r.topic_id)}</Link>
                <span className="text-xs text-slate-500">{r.label}</span>
                {r.due_date < today && <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Overdue since {fmtDate(r.due_date, { day: 'numeric', month: 'short' })}</span>}
                {s?.totalAttempted > 0 && <span className={cx('text-xs font-bold', accColor(s.recentAccuracy))}>{s.recentAccuracy}%</span>}
                <button className="btn-secondary !py-1.5" onClick={() => practice(r.topic_id)}><PenLine size={14} />10 Q</button>
                <button className="btn-success !py-1.5" onClick={() => actions.completeRevision(r.id)}><Check size={14} />Mark revised</button>
              </li>
            )
          })}</ul>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="h2">Mistake Book revision</h2>
            {mistakes.length > 0 && <button className="btn-primary !py-1.5" onClick={() => { const id = createMistakeQuiz({ state, actions, mistakes }); if (id) nav(`/test/${id}`) }}><RotateCcw size={14} />Re-attempt {mistakes.length}</button>}</div>
          {mistakes.length === 0 ? <p className="muted">No Mistake Book questions are due. Mistakes come back on Day +1, +4 and +7 after you add them; wrong re-attempts are rescheduled.</p>
            : <ul className="space-y-1 text-sm">{mistakes.slice(0, 8).map((m) => <li key={m.id} className="truncate">• {topicName(m.topic_id)} — {m.mistake_type}</li>)}</ul>}
        </div>
        <div className="card">
          <h2 className="h2 mb-3">Weak topics — extra revision</h2>
          {weak.length === 0 ? <p className="muted">No weak topics right now.</p> : (
            <ul className="space-y-2 text-sm">{weak.map((w) => {
              const has = Object.values(state.revisions).some((r) => r.topic_id === w.id && r.status === 'pending' && r.due_date <= addDays(today, 2))
              return (
                <li key={w.id} className="flex items-center gap-2"><span className="flex-1 truncate">{w.name}</span><span className={cx('font-bold', accColor(w.recentAccuracy))}>{w.recentAccuracy}%</span>
                  {has ? <span className="text-xs text-slate-500">Revision scheduled</span> : <button className="btn-secondary !py-1 text-xs" onClick={() => actions.addExtraRevision(w.id, today)}>Add revision today</button>}</li>
              )
            })}</ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="h2 mb-3">Upcoming (next 14 days)</h2>
        {upcoming.length === 0 ? <p className="muted">No upcoming revisions.</p> : (
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">{upcoming.map((r) => (
            <li key={r.id} className="flex gap-3"><span className="w-24 shrink-0 text-slate-500">{fmtDate(r.due_date)}</span><span className="truncate">{topicName(r.topic_id)} · <span className="text-slate-500">{r.label.split(' (')[0]}</span></span></li>))}</ul>
        )}
        {doneToday.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="mb-1 text-xs font-semibold text-slate-500 uppercase">Completed today</div>
            {doneToday.map((r) => <div key={r.id} className="flex items-center gap-2 text-sm"><Check size={14} className="text-emerald-600" />{topicName(r.topic_id)}<button className="ml-auto text-xs text-slate-500 hover:underline" onClick={() => actions.undoRevision(r.id)}><Undo2 size={12} className="inline" /> Undo</button></div>)}
          </div>
        )}
      </div>
    </div>
  )
}
