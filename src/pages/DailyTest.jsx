import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, CheckCircle2, CalendarRange } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useTodayInfo } from '../lib/hooks.js'
import { createDailyTest, createWeeklyTest, dailySplit } from '../lib/tests.js'
import { weeklyReport } from '../lib/engine.js'
import { fmtTime, fmtDate } from '../lib/dates.js'
import { topicName, subjectById, SUBJECT_IDS } from '../lib/syllabus.js'
import { topicField } from '../lib/plan.js'
import { PageHeader, Empty, accColor, cx, ProgressBar, Modal } from '../components/ui.jsx'

export default function DailyTest() {
  const { state, plan, stats, actions, today } = useStore()
  const info = useTodayInfo()
  const nav = useNavigate()
  const [early, setEarly] = useState(false)
  const cfg = state.profile.daily_test || { count: 30, mix: { easy: 30, medium: 50, hard: 20 } }
  const history = Object.values(state.attempts).filter((a) => a.kind === 'daily' && a.submitted_at).sort((a, b) => b.day_no - a.day_no)
  const weeklies = Object.values(state.attempts).filter((a) => a.kind === 'weekly').sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
  const t = info.testAttempt
  const ready = info.ready

  const start = () => nav(`/test/${t?.id || createDailyTest({ state, plan, rday: info.rday, stats, actions })}`)
  const startWeekly = () => {
    const wr = weeklyReport({ ...state, _today: today }, plan, today, stats)
    nav(`/test/${createWeeklyTest({ state, actions, weekTopics: wr.weekTopics, title: `Weekly Test — week of ${fmtDate(wr.start, { day: 'numeric', month: 'short' })}` })}`)
  }
  const split = info.day ? dailySplit(cfg.count || 30, info.day.day_no, state) : null

  return (
    <div className="fade-in space-y-5">
      <PageHeader title="Daily Test" subtitle="The last item of each study day — available as soon as today’s preparation is complete (no fixed unlock time)" />
      {!info.day ? (
        <div className="card"><Empty icon="🗓️" title="No Daily Test today">Daily Tests run on study days (Monday–Saturday). Take the Weekly Test below on Sundays.</Empty></div>
      ) : (
        <div className="card">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className={cx('flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl', t?.submitted_at ? 'bg-emerald-100 dark:bg-emerald-950' : ready.ready ? 'bg-blue-100 dark:bg-blue-950' : 'bg-slate-100 dark:bg-slate-800')}>
              {t?.submitted_at ? '✅' : ready.ready ? '🎯' : '📝'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-500 uppercase">Day {info.day.day_no} · {fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })} · suggested from {fmtTime(info.suggestedMin)}</div>
              <h2 className="mt-1 text-xl font-bold">{t?.submitted_at ? 'Today’s Test — completed' : ready.ready ? '🎯 Daily Test Ready' : 'Today’s Test'}</h2>
              <p className="muted">{cfg.count} questions · {cfg.count} minutes · {SUBJECT_IDS.map((k) => `${subjectById[k].short} ${split[k]}`).join(' · ')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {SUBJECT_IDS.map((k) => { const tp = info.rday[topicField(k)]; return (
                  <span key={k} className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{subjectById[k].icon} {tp === 'mixed' ? `All ${subjectById[k].short} topics so far` : topicName(tp)}</span>) })}
              </div>
              {!t?.submitted_at && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">Today’s Preparation</span><span>{ready.pct}%</span></div>
                  <ProgressBar value={ready.pct} color={ready.ready ? 'bg-emerald-500' : 'bg-brand-600'} label="Today's preparation" />
                  {!ready.ready && (
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div><div className="mb-1 font-semibold text-emerald-700 dark:text-emerald-400">Completed</div>{ready.completed.length ? ready.completed.map((x) => <div key={x.key}>✓ {x.label}</div>) : <div className="text-slate-400">Nothing yet</div>}</div>
                      <div><div className="mb-1 font-semibold text-slate-600 dark:text-slate-300">Remaining</div>{ready.remaining.map((x) => <div key={x.key}>○ {x.label}</div>)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {t?.submitted_at ? <Link to={`/test/${t.id}`} className="btn-success"><CheckCircle2 size={16} />View result ({t.score}/{t.max})</Link>
              : ready.ready || t ? <button className="btn-primary !py-3" onClick={start}><Play size={16} />{t ? 'RESUME DAILY TEST' : 'START DAILY TEST'}</button>
                : <>
                  <p className="w-full text-sm font-semibold">Today’s preparation is not complete.</p>
                  <Link to="/today" className="btn-primary">Continue Today’s Plan</Link>
                  <button className="btn-secondary" onClick={() => setEarly(true)}>Start test early</button>
                </>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="h2">📊 Weekly Test</h2><p className="muted">50 questions · 50 minutes · all five subjects from this week’s topics · 0.25 negative marking. Best taken on Sunday.</p></div>
          <button className="btn-secondary" onClick={startWeekly}><CalendarRange size={16} />Start Weekly Test</button>
        </div>
        {weeklies.length > 0 && <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">{weeklies.slice(0, 6).map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-2"><span className="flex-1 truncate">{a.title}</span>
            {a.submitted_at ? <><span className={accColor(a.accuracy)}>{a.accuracy}%</span><span>{a.score}/{a.max}</span></> : <span className="text-amber-600">in progress</span>}
            <Link className="text-brand-600 hover:underline" to={`/test/${a.id}`}>{a.submitted_at ? 'Analysis' : 'Resume'}</Link></li>))}</ul>}
      </div>

      <div className="card">
        <h2 className="h2 mb-3">Daily Test history</h2>
        {history.length === 0 ? <p className="muted">No Daily Tests taken yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500 uppercase"><th className="py-2">Day</th><th>Date</th><th>Score</th><th>Accuracy</th><th>Correct / Wrong / Skipped</th><th /></tr></thead>
              <tbody>{history.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 font-semibold">Day {a.day_no}</td><td>{fmtDate(a.date)}</td><td>{a.score}/{a.max}</td>
                  <td className={accColor(a.accuracy)}>{a.accuracy}%</td><td>{a.correct} / {a.wrong} / {a.skipped}</td>
                  <td className="text-right"><Link className="text-brand-600 hover:underline" to={`/test/${a.id}`}>Analysis</Link></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={early} onClose={() => setEarly(false)} title="Start the Daily Test early?"
        footer={<><button className="btn-secondary" onClick={() => setEarly(false)}>Continue preparing</button><button className="btn-primary" onClick={() => { setEarly(false); start() }}>Start now</button></>}>
        <p className="text-sm">You still have {ready?.remaining.length} item(s) left today. The test covers all of today’s topics — you can take it now if you want to.</p>
      </Modal>
    </div>
  )
}
