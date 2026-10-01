import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { dayStatus, weeklyReport } from '../lib/engine.js'
import { toISO, addDays, isSunday, fmtDate, parseISO } from '../lib/dates.js'
import { PageHeader, Modal, cx, accColor, SubjectChip } from '../components/ui.jsx'
import { SUBJECT_IDS } from '../lib/syllabus.js'
import DayRecord from '../components/DayRecord.jsx'

const CELL = {
  completed: 'bg-emerald-500 text-white', partial: 'bg-amber-400 text-white', in_progress: 'bg-blue-500 text-white', missed: 'bg-rose-500 text-white',
  today: 'bg-white ring-2 ring-brand-500 dark:bg-slate-900', upcoming: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export default function CalendarPage() {
  const { state, plan, today, stats } = useStore()
  const [params, setParams] = useSearchParams()
  const [month, setMonth] = useState(() => { const d = parseISO(today); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [open, setOpen] = useState(null)
  const [week, setWeek] = useState(null)
  useEffect(() => {
    if (params.get('weekly')) { setWeek(isSunday(today) ? addDays(today, -1) : today); setParams({}, { replace: true }) }
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  const first = new Date(month)
  const offset = (first.getDay() + 6) % 7 // Monday-first grid
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => toISO(new Date(month.getFullYear(), month.getMonth(), i + 1)))]
  const byDate = Object.fromEntries(plan.map((d) => [d.date, d]))
  const report = week ? weeklyReport({ ...state, _today: today }, plan, week, stats) : null

  return (
    <div className="fade-in">
      <PageHeader title="Calendar" subtitle="Click a study day for its full record, or a Sunday for that week’s report">
        <button className="btn-secondary" onClick={() => setWeek(isSunday(today) ? addDays(today, -1) : today)}>This week’s report</button>
      </PageHeader>
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <button className="btn-ghost !p-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <h2 className="h2">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
          <button className="btn-ghost !p-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 sm:gap-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`x${i}`} />
            const d = byDate[iso]
            const sun = isSunday(iso)
            const st = d ? dayStatus(state, d, today) : null
            const inPlan = plan.length && iso >= plan[0].date && iso <= plan[plan.length - 1].date
            return (
              <button key={iso} disabled={!d && !(sun && inPlan)} onClick={() => (d ? setOpen(d) : setWeek(addDays(iso, -1)))}
                className={cx('relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition hover:opacity-90 disabled:cursor-default sm:aspect-[4/3]',
                  d ? CELL[st.status] : sun && inPlan ? 'bg-slate-50 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800' : 'text-slate-300 dark:text-slate-700',
                  iso === today && 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900')}
                aria-label={`${fmtDate(iso)}${d ? ` Day ${d.day_no} ${st.status}` : sun ? ' rest day' : ''}`}>
                <span className="font-bold">{parseISO(iso).getDate()}</span>
                {d && <span className="text-[9px] leading-none opacity-80 sm:text-[10px]">Day {d.day_no}</span>}
                {sun && inPlan && <span className="text-[9px] leading-none sm:text-[10px]">Review</span>}
                {st?.testDone && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600 ring-1 ring-white" title="Daily Test completed" />}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
          {[['bg-emerald-500', 'Completed study day'], ['bg-amber-400', 'Partially completed'], ['bg-rose-500', 'Missed'], ['bg-slate-200 dark:bg-slate-700', 'Upcoming'], ['bg-slate-50 ring-1 ring-slate-300', 'Sunday / rest day']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><i className={cx('h-3 w-3 rounded', c)} />{l}</span>)}
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-600" />Daily Test completed</span>
        </div>
      </div>
      <DayRecord day={open} onClose={() => setOpen(null)} />
      {report && (
        <Modal open wide onClose={() => setWeek(null)} title={`Weekly Report · ${fmtDate(report.start, { day: 'numeric', month: 'short' })} – ${fmtDate(report.end, { day: 'numeric', month: 'short' })}`}>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {[['Study days completed', `${report.studyDays}/${report.days.length || 6}`], ['Study hours', `${report.hours}h`], ['Questions solved', report.questions], ['Daily Tests', `${report.dailyTests}/${report.days.length || 6}`], ['Avg accuracy', `${report.accuracy}%`]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><div className="text-xs text-slate-500">{l}</div><div className="text-lg font-bold">{v}</div></div>))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {SUBJECT_IDS.map((k) => (
              <div key={k} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><SubjectChip subject={k} />
                <div className="mt-2 text-sm">{report.subjects[k].attempted} questions · <b className={accColor(report.subjects[k].accuracy)}>{report.subjects[k].attempted ? `${report.subjects[k].accuracy}%` : '—'}</b> accuracy</div></div>))}
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><div className="mb-1 font-bold">⚠️ Weak topics</div>{report.weak.length ? report.weak.map((w) => <div key={w.id}>{w.name} — {w.recentAccuracy}%</div>) : <span className="muted">None detected</span>}</div>
            <div><div className="mb-1 font-bold">💪 Strong topics</div>{report.strong.length ? report.strong.map((w) => <div key={w.id}>{w.name} — {w.recentAccuracy}%</div>) : <span className="muted">Keep practising to build strengths</span>}</div>
          </div>
          <Link to="/daily-test" className="btn-primary mt-4" onClick={() => setWeek(null)}>Take this week’s Weekly Test</Link>
          <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm dark:bg-blue-950/50"><b>Next week’s recommended focus:</b> {report.nextFocus.length ? report.nextFocus.join(', ') : 'Follow the plan and keep your streak.'}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">{report.days.map(({ day, st }) => <span key={day.day_no} className={cx('chip', CELL[st.status])}>Day {day.day_no}: {st.status.replace('_', ' ')}</span>)}</div>
        </Modal>
      )}
    </div>
  )
}
