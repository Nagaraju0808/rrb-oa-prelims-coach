import { Link, useNavigate } from 'react-router-dom'
import { Lock, Play, CheckCircle2, Clock } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useTodayInfo } from '../lib/hooks.js'
import { createDailyTest } from '../lib/tests.js'
import { fmtTime, fmtDate, minutesOfDay, now } from '../lib/dates.js'
import { topicName } from '../lib/syllabus.js'
import { PageHeader, Empty, accColor, cx } from '../components/ui.jsx'

export default function DailyTest() {
  const { state, plan, stats, actions, today } = useStore()
  const info = useTodayInfo()
  const nav = useNavigate()
  const cfg = state.profile.daily_test || { count: 30, mix: { easy: 30, medium: 50, hard: 20 } }
  const history = Object.values(state.attempts).filter((a) => a.kind === 'daily' && a.submitted_at).sort((a, b) => b.day_no - a.day_no)
  const t = info.testAttempt

  const start = () => {
    const id = t?.id || createDailyTest({ state, plan, rday: info.rday, stats, actions })
    nav(`/test/${id}`)
  }
  const d = now()
  const secsLeft = (info.unlockMin - minutesOfDay(d)) * 60 - d.getSeconds()

  return (
    <div className="fade-in space-y-5">
      <PageHeader title="Daily Test" subtitle="Always the final session of the study day · unlocks at the start of the last slot" />
      {!info.day ? (
        <div className="card"><Empty icon="🗓️" title="No Daily Test today">Daily Tests run on study days (Monday–Saturday) only.</Empty></div>
      ) : (
        <div className="card">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className={cx('flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl', t?.submitted_at ? 'bg-emerald-100 dark:bg-emerald-950' : info.testUnlocked ? 'bg-blue-100 dark:bg-blue-950' : 'bg-slate-100 dark:bg-slate-800')}>
              {t?.submitted_at ? '✅' : info.testUnlocked ? '📝' : '🔒'}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-500 uppercase">Day {info.day.day_no} · {fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })} · {fmtTime(info.unlockMin)} – {fmtTime(info.unlockMin + 30)}</div>
              <h2 className="mt-1 text-xl font-bold">Today’s Test</h2>
              <p className="muted">{cfg.count} questions · {cfg.count} minutes · {Math.ceil(cfg.count / 2)} Reasoning + {Math.floor(cfg.count / 2)} Numerical · Easy {cfg.mix.easy}% / Medium {cfg.mix.medium}% / Hard {cfg.mix.hard}%</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">🧠 {info.rday.reasoning_topic === 'mixed' ? 'All reasoning topics studied so far' : topicName(info.rday.reasoning_topic)}</span>
                <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">🔢 {info.rday.numerical_topic === 'mixed' ? 'All numerical topics studied so far' : topicName(info.rday.numerical_topic)}</span>
                {info.rday.weak_topic && ![info.rday.reasoning_topic, info.rday.numerical_topic, 'mixed'].includes(info.rday.weak_topic) && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">🎯 + {topicName(info.rday.weak_topic)} (today’s weak-topic slot)</span>}
              </div>
            </div>
            <div className="shrink-0">
              {t?.submitted_at ? <Link to={`/test/${t.id}`} className="btn-success"><CheckCircle2 size={16} />View result ({t.score}/{t.max})</Link>
                : info.testUnlocked ? <button className="btn-primary !py-3" onClick={start}><Play size={16} />{t ? 'Resume Test' : 'Start Daily Test'}</button>
                  : <div className="text-center"><span className="btn bg-slate-100 text-slate-500 dark:bg-slate-800"><Lock size={16} />Locked</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500"><Clock size={12} />🔒 Unlocks at {fmtTime(info.unlockMin)}{secsLeft > 0 && secsLeft < 3 * 3600 && ` (in ${Math.floor(secsLeft / 3600)}h ${Math.floor((secsLeft % 3600) / 60)}m)`}</div></div>}
            </div>
          </div>
          {!info.testUnlocked && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">The Daily Test stays locked until the final slot so it always measures what you studied today. Finish your sessions and today’s revision first.</p>}
        </div>
      )}
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
    </div>
  )
}
