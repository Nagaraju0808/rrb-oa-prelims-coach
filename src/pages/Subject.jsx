import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { allTopics, speedStats } from '../lib/engine.js'
import { fmtDate } from '../lib/dates.js'
import { EXAM, MAINS, subjectById } from '../lib/syllabus.js'
import { PageHeader, ProgressBar, StatusBadge, accColor, cx } from '../components/ui.jsx'

const STAGES = [['learned', 'Learning'], ['practiced', 'Practice'], ['revised', 'Revision'], ['tested', 'Test']]

export function StageTrack({ s }) {
  return (
    <div className="flex items-center gap-1" aria-label="Learning → Practice → Revision → Test">
      {STAGES.map(([k, l], i) => (
        <div key={k} className="flex items-center gap-1">
          <span title={l} className={cx('flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[10px] font-bold', s[k] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
            {s[k] && <Check size={10} />}{l}
          </span>
          {i < 3 && <span className="text-slate-300 dark:text-slate-600">→</span>}
        </div>
      ))}
    </div>
  )
}

export default function SubjectPage({ subject }) {
  const { state, stats } = useStore()
  const topics = allTopics(state.content, state.profile?.language).filter((t) => t.subject === subject)
  const sp = speedStats(state)[subject]
  const pre = EXAM.sections.find((s) => s.subject === subject), mains = MAINS.sections.find((s) => s.subject === subject)
  const info = [pre && `Prelims ${pre.questions} Q · ${pre.marks} marks · ${pre.minutes} min`, mains && `Mains ${mains.questions} Q · ${mains.marks} marks · ${mains.minutes} min`].filter(Boolean).join('  |  ')
  const rows = topics.map((t) => stats[t.id]).filter(Boolean)
  const overall = Math.round(rows.reduce((s, r) => s + r.completion, 0) / (rows.length || 1))
  return (
    <div className="fade-in">
      <PageHeader title={`${subjectById[subject].icon} ${subjectById[subject].name}`} subtitle={`${info} · target ${Math.round(sp.targetSec)}s per question`}>
        <Link to={`/practice?subject=${subject}`} className="btn-primary">Subject Test (40 Q)</Link>
      </PageHeader>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card !p-4"><div className="text-xs font-semibold text-slate-500 uppercase">Syllabus progress</div><div className="text-xl font-bold">{overall}%</div><ProgressBar value={overall} className="mt-2" /></div>
        <div className="card !p-4"><div className="text-xs font-semibold text-slate-500 uppercase">Questions solved</div><div className="text-xl font-bold">{rows.reduce((s, r) => s + r.totalAttempted, 0)}</div></div>
        <div className="card !p-4"><div className="text-xs font-semibold text-slate-500 uppercase">Recent accuracy</div><div className={cx('text-xl font-bold', accColor(sp.accuracy))}>{sp.attempted ? `${sp.accuracy}%` : '—'}</div></div>
        <div className="card !p-4"><div className="text-xs font-semibold text-slate-500 uppercase">Speed</div><div className="text-xl font-bold">{sp.avgSec ? `${sp.avgSec}s/Q` : '—'}</div><div className="text-xs text-slate-500">Target {Math.round(sp.targetSec)}s/Q</div></div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((s) => (
          <Link key={s.id} to={`/topic/${s.id}`} className="card block !p-4 transition hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="truncate font-bold text-slate-900 dark:text-white">{s.name}</div>
                <div className="text-xs text-slate-500">{s.firstPlannedDay ? `Planned from Day ${s.firstPlannedDay}` : 'Not in default plan'}</div></div>
              <StatusBadge status={s.status} />
            </div>
            <div className="mt-3"><StageTrack s={s} /></div>
            <div className="mt-3 flex items-center gap-2"><ProgressBar value={s.completion} className="flex-1" color="bg-emerald-500" /><span className="text-xs font-semibold">{s.completion}%</span></div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 sm:grid-cols-4 dark:text-slate-400">
              <span>Solved: <b>{s.totalAttempted}</b></span>
              <span>Accuracy: <b className={s.totalAttempted ? accColor(s.accuracy) : ''}>{s.totalAttempted ? `${s.accuracy}%` : '—'}</b></span>
              <span>Last: <b>{s.lastPracticed ? fmtDate(s.lastPracticed, { day: 'numeric', month: 'short' }) : '—'}</b></span>
              <span>Revision: <b>{s.revisionDue ? fmtDate(s.revisionDue, { day: 'numeric', month: 'short' }) : '—'}</b></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
