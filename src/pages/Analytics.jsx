import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useStore } from '../lib/store.jsx'
import { dayStatus, speedStats, weakTopics, strongTopics } from '../lib/engine.js'
import { STUDY_SLOTS } from '../lib/plan.js'
import { weekStart, fmtDate } from '../lib/dates.js'
import { PageHeader, Empty, ProgressBar, accColor, cx } from '../components/ui.jsx'
import { SUBJECT_IDS, subjectById } from '../lib/syllabus.js'

const AX = { fontSize: 11, stroke: '#94a3b8' }
const GRID = <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
const TT = { contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 } }

function ChartCard({ title, children, empty, h = 'h-60' }) {
  return (
    <div className="card">
      <h3 className="mb-3 font-bold">{title}</h3>
      {empty ? <p className="muted py-8 text-center">{empty}</p> : <div className={h}><ResponsiveContainer>{children}</ResponsiveContainer></div>}
    </div>
  )
}

export default function Analytics() {
  const { state, plan, today, stats } = useStore()
  const past = plan.filter((d) => d.date <= today)
  const data = useMemo(() => {
    const days = past.map((d) => {
      const st = dayStatus(state, d, today)
      const secs = STUDY_SLOTS.reduce((s, sl) => s + (state.sessions[`s-${d.day_no}-${sl.key}`]?.elapsed_sec || 0), 0)
      const missed = STUDY_SLOTS.filter((sl) => state.sessions[`s-${d.day_no}-${sl.key}`]?.status === 'missed').length
      return { name: `D${d.day_no}`, date: d.date, hours: Math.round((secs / 3600) * 10) / 10, done: st.done, missed, status: st.status }
    })
    const weeks = {}
    for (const d of days) { const w = weekStart(d.date); (weeks[w] ||= { name: fmtDate(w, { day: 'numeric', month: 'short' }), hours: 0 }).hours += d.hours }
    const tests = Object.values(state.attempts).filter((a) => a.kind === 'daily' && a.submitted_at).sort((a, b) => a.day_no - b.day_no)
      .map((a) => ({ name: `D${a.day_no}`, accuracy: a.accuracy, score: a.score, correct: a.correct, wrong: a.wrong, skipped: a.skipped, minutes: Math.round(a.time_taken_sec / 6) / 10 }))
    const mocks = Object.values(state.attempts).filter((a) => a.kind === 'mock' && a.submitted_at).sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1))
      .map((a, i) => ({ name: `M${i + 1}`, score: a.score, accuracy: a.accuracy, speed: Math.round(a.time_taken_sec / Math.max(1, a.correct + a.wrong)) }))
    const totalSessions = days.length * STUDY_SLOTS.length
    return { days, weeks: Object.values(weeks).map((w) => ({ ...w, hours: Math.round(w.hours * 10) / 10 })), tests, mocks,
      completion: totalSessions ? Math.round((days.reduce((s, d) => s + d.done, 0) / totalSessions) * 100) : 0,
      missed: days.reduce((s, d) => s + d.missed, 0) }
  }, [state, past, today])
  const sp = speedStats(state)
  const weak = weakTopics(stats), strong = strongTopics(stats)
  const needRevision = Object.values(stats).filter((s) => s.learned && ((s.revisionDue && s.revisionDue <= today) || (s.daysSince != null && s.daysSince > 7))).sort((a, b) => (b.daysSince || 0) - (a.daysSince || 0))
  const avgTest = data.tests.length ? Math.round((data.tests.reduce((s, t) => s + t.accuracy, 0) / data.tests.length) * 10) / 10 : 0

  return (
    <div className="fade-in space-y-6">
      <PageHeader title="Analytics" subtitle="Updated automatically from your sessions and tests" />

      <section>
        <h2 className="h2 mb-3">Speed tracker</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SUBJECT_IDS.map((k) => {
            const s = sp[k]
            const pct = s.avgSec ? Math.min(100, (s.targetSec / s.avgSec) * 100) : 0
            return (
              <div key={k} className="card">
                <div className="mb-2 font-bold">{subjectById[k].icon} {subjectById[k].name}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><div className="text-xs text-slate-500">Questions / min</div><b>{s.qpm || '—'}</b> <span className="text-xs text-slate-500">target {s.targetQpm}</span></div>
                  <div><div className="text-xs text-slate-500">Avg time / Q</div><b>{s.avgSec ? `${s.avgSec}s` : '—'}</b> <span className="text-xs text-slate-500">target {s.targetSec}s</span></div>
                  <div><div className="text-xs text-slate-500">Accuracy</div><b className={s.attempted ? accColor(s.accuracy) : ''}>{s.attempted ? `${s.accuracy}%` : '—'}</b> <span className="text-xs text-slate-500">target 85%</span></div>
                </div>
                <div className="mt-3 text-xs text-slate-500">Speed vs exam target</div>
                <ProgressBar value={pct} color={pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-rose-500'} />
                <p className="mt-1 text-xs text-slate-500">Based on your last 60 answered questions. Exam pace: {s.targetSec}s per question (official sectional time ÷ 40).</p>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="h2 mb-3">Study analytics</h2>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card !p-4"><div className="text-xs text-slate-500 uppercase">Session completion</div><div className="text-xl font-bold">{data.completion}%</div></div>
          <div className="card !p-4"><div className="text-xs text-slate-500 uppercase">Missed sessions</div><div className="text-xl font-bold text-rose-600">{data.missed}</div></div>
          <div className="card !p-4"><div className="text-xs text-slate-500 uppercase">Total hours</div><div className="text-xl font-bold">{Math.round(data.days.reduce((s, d) => s + d.hours, 0) * 10) / 10}</div></div>
          <div className="card !p-4"><div className="text-xs text-slate-500 uppercase">Days completed</div><div className="text-xl font-bold">{data.days.filter((d) => d.status === 'completed').length}/{data.days.length}</div></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartCard title="Daily study hours" empty={!data.days.length && 'No study days yet.'}>
            <BarChart data={data.days.slice(-24)} margin={{ left: -24 }}>{GRID}<XAxis dataKey="name" {...AX} /><YAxis {...AX} domain={[0, 8]} /><Tooltip {...TT} /><Bar dataKey="hours" name="Hours" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart>
          </ChartCard>
          <ChartCard title="Weekly study hours (target 36–42h)" empty={!data.weeks.length && 'No data yet.'}>
            <BarChart data={data.weeks} margin={{ left: -24 }}>{GRID}<XAxis dataKey="name" {...AX} /><YAxis {...AX} /><Tooltip {...TT} /><Bar dataKey="hours" name="Hours" fill="#7c3aed" radius={[4, 4, 0, 0]} /></BarChart>
          </ChartCard>
        </div>
      </section>

      <section>
        <h2 className="h2 mb-3">Test analytics <span className="text-sm font-normal text-slate-500">· {data.tests.length} Daily Tests · average accuracy {avgTest}%</span></h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartCard title="Daily Test accuracy (%)" empty={!data.tests.length && 'Take your first Daily Test to see trends.'}>
            <LineChart data={data.tests} margin={{ left: -24, right: 8 }}>{GRID}<XAxis dataKey="name" {...AX} /><YAxis {...AX} domain={[0, 100]} /><Tooltip {...TT} /><Line dataKey="accuracy" name="Accuracy %" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
          </ChartCard>
          <ChartCard title="Correct / wrong / skipped" empty={!data.tests.length && 'No Daily Tests yet.'}>
            <BarChart data={data.tests} margin={{ left: -24 }}>{GRID}<XAxis dataKey="name" {...AX} /><YAxis {...AX} /><Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="correct" stackId="a" name="Correct" fill="#059669" /><Bar dataKey="wrong" stackId="a" name="Wrong" fill="#e11d48" /><Bar dataKey="skipped" stackId="a" name="Skipped" fill="#94a3b8" radius={[4, 4, 0, 0]} /></BarChart>
          </ChartCard>
          <ChartCard title="Time taken (minutes)" empty={!data.tests.length && 'No Daily Tests yet.'}>
            <BarChart data={data.tests} margin={{ left: -24 }}>{GRID}<XAxis dataKey="name" {...AX} /><YAxis {...AX} /><Tooltip {...TT} /><Bar dataKey="minutes" name="Minutes" fill="#0284c7" radius={[4, 4, 0, 0]} /></BarChart>
          </ChartCard>
        </div>
      </section>

      <section>
        <h2 className="h2 mb-3">Topic analytics</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <TopicList title="⚠️ Weak topics" items={weak} empty="No weak topics detected." />
          <TopicList title="💪 Strong topics" items={strong} empty="Strong topics appear at 85%+ recent accuracy (10+ questions)." />
          <TopicList title="📘 Need revision" items={needRevision} empty="Nothing needs revision." sub={(s) => (s.daysSince != null ? `${s.daysSince}d ago` : 'due')} />
        </div>
      </section>

      <section>
        <h2 className="h2 mb-3">Mock analytics</h2>
        {data.mocks.length === 0 ? <div className="card"><Empty icon="🏆" title="No mocks yet"><Link className="text-brand-600 underline" to="/mock-tests">Take a full mock</Link> to see score, accuracy and speed trends.</Empty></div> : (
          <div className="grid gap-3 lg:grid-cols-3">
            <ChartCard title="Score trend (/80)"><LineChart data={data.mocks} margin={{ left: -24, right: 8 }}>{GRID}<XAxis dataKey="name" {...AX} /><YAxis {...AX} domain={[0, 80]} /><Tooltip {...TT} /><Line dataKey="score" stroke="#2563eb" strokeWidth={2} /></LineChart></ChartCard>
            <ChartCard title="Accuracy trend (%)"><LineChart data={data.mocks} margin={{ left: -24, right: 8 }}>{GRID}<XAxis dataKey="name" {...AX} /><YAxis {...AX} domain={[0, 100]} /><Tooltip {...TT} /><Line dataKey="accuracy" stroke="#059669" strokeWidth={2} /></LineChart></ChartCard>
            <ChartCard title="Speed trend (sec / attempted Q)"><LineChart data={data.mocks} margin={{ left: -24, right: 8 }}>{GRID}<XAxis dataKey="name" {...AX} /><YAxis {...AX} /><Tooltip {...TT} /><Line dataKey="speed" stroke="#d97706" strokeWidth={2} /></LineChart></ChartCard>
          </div>
        )}
      </section>
    </div>
  )
}

function TopicList({ title, items, empty, sub }) {
  return (
    <div className="card">
      <h3 className="mb-3 font-bold">{title}</h3>
      {items.length === 0 ? <p className="muted">{empty}</p> : (
        <ul className="space-y-2 text-sm">{items.slice(0, 8).map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <Link to={`/topic/${s.id}`} className="min-w-0 flex-1 truncate hover:underline">{s.name}</Link>
            <span className={cx('text-xs font-bold', accColor(s.recentAccuracy))}>{s.totalAttempted ? `${s.recentAccuracy}%` : '—'}</span>
            {sub && <span className="w-14 text-right text-xs text-slate-500">{sub(s)}</span>}
          </li>))}</ul>
      )}
    </div>
  )
}
