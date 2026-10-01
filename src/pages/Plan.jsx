import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { PHASES } from '../lib/plan.js'
import { dayStatus, resolveDay } from '../lib/engine.js'
import { fmtDate } from '../lib/dates.js'
import { topicName, SUBJECTS } from '../lib/syllabus.js'
import { PageHeader, StatusBadge, ProgressBar, cx } from '../components/ui.jsx'
import DayRecord from '../components/DayRecord.jsx'

const PHASE_CLS = { emerald: 'border-l-emerald-500', sky: 'border-l-sky-500', violet: 'border-l-violet-500', amber: 'border-l-amber-500', rose: 'border-l-rose-500' }

export default function PlanPage() {
  const { state, plan, stats, today } = useStore()
  const [open, setOpen] = useState(null)
  const [phase, setPhase] = useState(0)
  return (
    <div className="fade-in">
      <PageHeader title="60-Day Preparation Plan" subtitle={`${fmtDate(plan[0].date, { day: 'numeric', month: 'short' })} → ${fmtDate(plan[59].date, { day: 'numeric', month: 'short', year: 'numeric' })} · Monday–Saturday · Sundays excluded (weekly review)`} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button className={cx('chip !px-3 !py-1.5', phase === 0 ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700')} onClick={() => setPhase(0)}>All phases</button>
        {PHASES.map((p) => <button key={p.id} className={cx('chip !px-3 !py-1.5 whitespace-nowrap', phase === p.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700')} onClick={() => setPhase(p.id)}>P{p.id} · {p.name}</button>)}
      </div>
      <div className="space-y-6">
        {PHASES.filter((p) => !phase || p.id === phase).map((p) => {
          const days = plan.filter((d) => d.phase === p.id)
          const sts = days.map((d) => dayStatus(state, d, today))
          const pct = Math.round((sts.filter((s) => s.status === 'completed').length / days.length) * 100)
          return (
            <section key={p.id}>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div><h2 className="h2">Phase {p.id} — {p.name} <span className="text-sm font-normal text-slate-500">· Days {p.from}–{p.to}</span></h2><p className="muted">{p.goal}</p></div>
                <div className="w-40"><div className="mb-1 text-right text-xs text-slate-500">{pct}% complete</div><ProgressBar value={pct} color="bg-emerald-500" /></div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {days.map((d, i) => {
                  const r = resolveDay(state, d, stats, plan)
                  const st = sts[i]
                  return (
                    <button key={d.day_no} onClick={() => setOpen(d)} className={cx('card border-l-4 !p-3 text-left transition hover:shadow-md', PHASE_CLS[p.color], d.date === today && 'ring-2 ring-brand-500')}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">Day {d.day_no}</span>
                        <span className="text-xs text-slate-500">{fmtDate(d.date)}</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-sm">
                        {d.is_mock_day && <div className="font-semibold">🏆 Full {d.mock_type === 'mains' ? 'Mains' : 'Prelims'} Mock + analysis</div>}
                        {SUBJECTS.filter((sb) => !(d.is_mock_day && (sb.id === 'reasoning' || sb.id === 'numerical'))).map((sb) => <div key={sb.id} className="truncate">{sb.icon} {topicName(r[`${sb.id}_topic`])}</div>)}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={st.status === 'in_progress' ? 'in_progress' : st.status} />
                        {st.testDone && <span className="chip bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Test {st.testAccuracy}%</span>}
                        {d.adaptive && !d.is_mock_day && d.date > today && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" title="Future revision days adapt to your weak topics">adaptive</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
      <DayRecord day={open} onClose={() => setOpen(null)} />
    </div>
  )
}
