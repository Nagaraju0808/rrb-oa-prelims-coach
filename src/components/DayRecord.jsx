import { Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { resolveDay, daySessions, dayStatus, dailyTestId, accuracy } from '../lib/engine.js'
import { slotTimes, phaseOf, DEFAULT_START_MIN } from '../lib/plan.js'
import { fmtDate, fmtTime } from '../lib/dates.js'
import { topicName } from '../lib/syllabus.js'
import { Modal, StatusBadge, SubjectChip } from './ui.jsx'

export default function DayRecord({ day, onClose }) {
  const { state, stats, plan, today } = useStore()
  if (!day) return null
  const rday = resolveDay(state, day, stats, plan)
  const sessions = daySessions(state, rday)
  const st = dayStatus(state, day, today)
  const test = state.attempts[dailyTestId(day.day_no)]
  const startMin = state.profile?.study_start_min ?? DEFAULT_START_MIN
  const phase = phaseOf(day.day_no)
  const mins = sessions.reduce((s, x) => s + (x.elapsed_sec || 0), 0)
  const qs = sessions.reduce((s, x) => s + (x.attempted || 0), 0), cs = sessions.reduce((s, x) => s + (x.correct || 0), 0)
  const mistakes = Object.values(state.mistakes).filter((m) => m.date === day.date)
  return (
    <Modal open onClose={onClose} wide title={`Day ${day.day_no} · ${fmtDate(day.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      footer={day.date === today ? <Link to="/today" className="btn-primary" onClick={onClose}>Open Today’s Plan</Link> : null}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={st.status === 'in_progress' ? 'in_progress' : st.status} />
        <span className="chip bg-slate-100 dark:bg-slate-800">Phase {phase.id}: {phase.name}</span>
        <span className="muted">{day.focus}</span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><div className="text-xs text-slate-500">Units done</div><b>{st.completedUnits}/{st.total}</b></div>
        <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><div className="text-xs text-slate-500">Study time</div><b>{Math.floor(mins / 3600)}h {Math.round((mins % 3600) / 60)}m</b></div>
        <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><div className="text-xs text-slate-500">Session questions</div><b>{qs} · {accuracy(cs, qs)}%</b></div>
        <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><div className="text-xs text-slate-500">Daily Test</div><b>{test?.submitted_at ? `${test.score}/${test.max} · ${test.accuracy}%` : '—'}</b></div>
      </div>
      <div className="space-y-2">
        {sessions.map((s) => {
          const t = slotTimes(s.slot, startMin)
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <span className="w-32 shrink-0 text-xs text-slate-500">{fmtTime(t.start)} – {fmtTime(t.end)}</span>
              <SubjectChip subject={s.slot.subject} />
              <span className="min-w-0 flex-1 truncate font-medium">{s.slot.label.split(' — ').pop()}: {s.slot.key === 'revision' ? 'Revision' : topicName(s.topic_id)}</span>
              {s.attempted > 0 && <span className="text-xs text-slate-500">{s.correct}/{s.attempted}</span>}
              <StatusBadge status={s.status} />
            </div>
          )
        })}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
          <span className="w-32 shrink-0 text-xs text-slate-500">{fmtTime(startMin + 450)} – {fmtTime(startMin + 480)}</span>
          <span className="flex-1 font-bold">📝 Daily Test</span>
          {test?.submitted_at ? <Link to={`/test/${test.id}`} onClick={onClose} className="text-sm font-semibold text-brand-600 hover:underline">View analysis →</Link> : <StatusBadge status={day.date < today ? 'missed' : 'upcoming'} label={day.date < today ? 'Not taken' : 'Pending'} />}
        </div>
      </div>
      {mistakes.length > 0 && <p className="mt-3 text-sm">📕 {mistakes.length} question(s) added to the Mistake Book on this day.</p>}
    </Modal>
  )
}
