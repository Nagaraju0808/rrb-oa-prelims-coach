import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Play, Clock, BookOpen, Target, FileClock, Trophy, Flame, CalendarCheck, ListChecks, Unlock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useTodayInfo } from '../lib/hooks.js'
import { recommend, weeklyReport, TOPIC_STEPS } from '../lib/engine.js'
import { fmtTime, isSunday, fmtDate } from '../lib/dates.js'
import { topicName, subjectById, SUBJECT_IDS } from '../lib/syllabus.js'
import { phaseOf, TOTAL_STUDY_DAYS } from '../lib/plan.js'
import { Stat, ProgressBar, Ring, Modal, StatusBadge, accColor, cx } from '../components/ui.jsx'

const greeting = (h) => (h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening')

export default function Dashboard() {
  const { state, ov, stats, plan, today, nowMin, nowDate, actions } = useStore()
  const info = useTodayInfo()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [rec, setRec] = useState(null)
  const openStudyNow = () => setRec(recommend(state, plan, today, nowMin, stats))
  useEffect(() => { if (params.get('studynow')) { openStudyNow(); setParams({}, { replace: true }) } }, [params]) // eslint-disable-line react-hooks/exhaustive-deps
  const due = info.due || []
  const sunday = isSunday(today)
  const weekly = useMemo(() => (sunday ? weeklyReport(state, plan, today, stats) : null), [sunday, state, plan, today, stats])
  const s = info.sessions || []
  const prog = (key) => { const x = s.find((y) => y.slot.key === key); if (!x) return 0; if (x.status === 'completed') return 100; return Math.round((TOPIC_STEPS.filter((st) => x.steps?.[st.key]).length / TOPIC_STEPS.length) * 100) }
  const phase = info.day ? phaseOf(info.day.day_no) : null

  const startNext = () => {
    const n = info.next
    if (!n) return
    if (n.status === 'not_started') actions.startSession({ ...n, goal: n.goal })
    else if (n.status === 'paused') actions.resumeSession(n.id)
    nav('/today')
  }

  return (
    <div className="fade-in space-y-5">
      {/* Coach card */}
      <section className="card relative overflow-hidden !p-0">
        <div className="bg-gradient-to-br from-brand-600 to-violet-600 p-5 text-white sm:p-6">
          <div className="text-sm font-medium opacity-90">{greeting(nowDate.getHours())} 👋 {state.profile.name.split(' ')[0]}</div>
          {info.day ? (
            <>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Today is Day {info.day.day_no}</h1>
              <p className="mt-1 text-sm opacity-90">Phase {phase.id} · {phase.name} — {info.day.focus}. You have <b>{s.length} study sessions</b> + the Daily Test.</p>
            </>
          ) : sunday ? (
            <><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Sunday — Weekly Review</h1><p className="mt-1 text-sm opacity-90">No study sessions today. Review your week and plan the next one.</p></>
          ) : plan.length && today < plan[0].date ? (
            <><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Your plan starts {fmtDate(plan[0].date, { weekday: 'long', day: 'numeric', month: 'short' })}</h1><p className="mt-1 text-sm opacity-90">Get familiar with the syllabus and take a practice test meanwhile.</p></>
          ) : (
            <><h1 className="mt-1 text-2xl font-bold sm:text-3xl">All 60 study days complete 🎓</h1><p className="mt-1 text-sm opacity-90">Keep taking mocks and revising weak topics until the exam.</p></>
          )}
          <button onClick={openStudyNow} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-base font-bold text-brand-700 shadow-lg transition hover:bg-blue-50">
            <Play size={20} fill="currentColor" /> STUDY NOW
          </button>
        </div>
        {info.day && (
          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            {info.next ? (
              <div>
                {info.lastDone && <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} />{info.lastDone.slot.label} completed.</div>}
                <div className="text-xs font-bold tracking-wide text-slate-500 uppercase">{info.lastDone ? 'Next' : 'Next Task'}</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{subjectById[info.next.slot.subject]?.icon || '🎯'} {info.next.slot.label} — {info.next.slot.key === 'revision' ? 'Revision' : topicName(info.next.topic_id)}</div>
                <div className="text-sm text-slate-500">{fmtTime(info.next.times.start)} – {fmtTime(info.next.times.end)} · {info.next.goal}</div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold tracking-wide text-slate-500 uppercase">🎯 Today’s Test</div>
                <div className="mt-1 text-lg font-bold">{info.testAttempt?.submitted_at ? 'Completed — great work!' : info.ready.ready ? 'Daily Test Ready — start whenever you like' : 'Finish today’s plan, then take the test'}</div>
                <div className="text-sm text-slate-500">Based on today’s topics · suggested from {fmtTime(info.suggestedMin)}</div>
              </div>
            )}
            {info.next ? <button className="btn-primary !py-3" onClick={startNext}><Play size={16} />{info.next.status === 'not_started' ? 'START SESSION' : 'RESUME SESSION'}</button>
              : <Link to="/daily-test" className="btn-primary !py-3"><FileClock size={16} />{info.testAttempt?.submitted_at ? 'View Result' : 'Go to Daily Test'}</Link>}
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="card col-span-2 flex items-center gap-4 !p-4">
          <Ring value={ov.progressPct} label={`${ov.currentDay}/${TOTAL_STUDY_DAYS}`} sub="Day" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-500 uppercase">Overall 60-day progress</div>
            <div className="text-2xl font-bold">{ov.progressPct}%</div>
            <ProgressBar value={ov.completionPct} className="mt-2" color="bg-emerald-500" label="Study days completed" />
            <div className="mt-1 text-xs text-slate-500">{ov.daysCompleted} study days fully completed ({ov.completionPct}%)</div>
          </div>
        </div>
        <Stat icon={Clock} label="Study hours" value={ov.studyHours} tone="sky" />
        <Stat icon={BookOpen} label="Questions solved" value={ov.questions.toLocaleString('en-IN')} tone="violet" />
        <Stat icon={Target} label="Avg accuracy" value={ov.questions ? <span className={accColor(ov.accuracy)}>{ov.accuracy}%</span> : '—'} tone="green" />
        <Stat icon={FileClock} label="Daily Tests" value={ov.dailyTests} tone="brand" />
        <Stat icon={Trophy} label="Mock Tests" value={ov.mocks} tone="amber" />
        <Stat icon={Flame} label="Current streak" value={`${ov.streak.current} days`} sub={`Best: ${ov.streak.best}`} tone="rose" />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Today's progress */}
        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="h2">Today’s Progress</h2><Link to="/today" className="text-sm font-semibold text-brand-600 hover:underline">Open plan →</Link></div>
          {info.day ? (
            <div className="space-y-3">
              {[...SUBJECT_IDS.map((k) => [`${subjectById[k].icon} ${subjectById[k].short}`, k, 'bg-brand-600']), ['🔄 Revision', 'revision', 'bg-emerald-500'], ['🎯 Practice / weak topics', 'weak', 'bg-amber-500']].map(([l, k, c]) => (
                <div key={l}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{l}</span><span className="text-slate-500">{prog(k)}%</span></div><ProgressBar value={prog(k)} color={c} /></div>
              ))}
              <div className={cx('mt-2 flex items-center gap-3 rounded-xl p-3 text-sm font-semibold', info.testAttempt?.submitted_at ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : info.ready.ready ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
                {info.testAttempt?.submitted_at ? <><CheckCircle2 size={18} />Daily Test completed — {info.testAttempt.score}/{info.testAttempt.max} ({info.testAttempt.accuracy}%)</>
                  : info.ready.ready ? <><Unlock size={18} />🎯 Daily Test Ready<Link to="/daily-test" className="ml-auto btn-success !py-1">Start</Link></>
                    : <><ListChecks size={18} />Today’s preparation {info.ready.pct}% — the Daily Test is ready once you finish ({info.ready.remaining.length} left)<Link to="/daily-test" className="ml-auto btn-secondary !py-1">Details</Link></>}
              </div>
            </div>
          ) : <p className="muted">No study sessions today.</p>}
        </section>

        {/* Revision due */}
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="h2">Revision Due Today</h2><Link to="/revision" className="text-sm font-semibold text-brand-600 hover:underline">All →</Link></div>
          {due.length === 0 ? <p className="muted">Nothing due. Revisions appear automatically after you complete a topic’s concept session.</p> : (
            <ul className="space-y-2">{due.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <button className="h-5 w-5 shrink-0 rounded border border-slate-300 hover:border-emerald-500 dark:border-slate-600" aria-label={`Mark ${topicName(r.topic_id)} revised`} onClick={() => actions.completeRevision(r.id)} />
                <span className="flex-1 truncate">{topicName(r.topic_id)}</span>
                {r.due_date < today ? <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Overdue</span> : <span className="text-xs text-slate-400">{r.label.split(' (')[0]}</span>}
              </li>))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="h2">Weak Areas</h2><Link to="/analytics" className="text-sm font-semibold text-brand-600 hover:underline">Analytics →</Link></div>
          {ov.weak.length === 0 ? <p className="muted">No weak topics detected yet. They’re identified automatically from recent accuracy, speed and mistakes (minimum 5 questions per topic).</p> : (
            <ol className="space-y-2">{ov.weak.map((w, i) => (
              <li key={w.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-slate-400">{i + 1}.</span><Link to={`/topic/${w.id}`} className="flex-1 truncate font-medium hover:underline">{w.name}</Link>
                <span className={cx('font-bold', accColor(w.recentAccuracy))}>{w.recentAccuracy}%</span>
                <Link to={`/practice?topic=${w.id}&count=20`} className="btn-secondary !px-2 !py-1 text-xs">Practice</Link>
              </li>))}
            </ol>
          )}
        </section>
        {weekly ? (
          <section className="card">
            <div className="mb-3 flex items-center justify-between"><h2 className="h2">📊 Weekly Report</h2><Link to="/calendar?weekly=1" className="text-sm font-semibold text-brand-600 hover:underline">Full report →</Link></div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-xl font-bold">{weekly.activeDays}/6</div>Active days</div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-xl font-bold">{weekly.hours}h</div>Studied</div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"><div className={cx('text-xl font-bold', accColor(weekly.accuracy))}>{weekly.accuracy}%</div>Accuracy</div>
            </div>
            {weekly.nextFocus.length > 0 && <p className="mt-3 text-sm"><b>Next week’s focus:</b> {weekly.nextFocus.join(', ')}</p>}
          </section>
        ) : (
          <section className="card">
            <h2 className="h2 mb-3">Upcoming</h2>
            <ul className="space-y-2 text-sm">
              {plan.filter((d) => d.date > today).slice(0, 4).map((d) => (
                <li key={d.day_no} className="flex items-center gap-3"><CalendarCheck size={16} className="text-slate-400" />
                  <span className="w-24 shrink-0 text-slate-500">{fmtDate(d.date)}</span>
                  <span className="truncate">Day {d.day_no}: {d.is_mock_day ? 'Full Mock + analysis' : SUBJECT_IDS.map((k) => topicName(d[`${k}_topic`])).join(' · ')}</span>
                </li>))}
            </ul>
          </section>
        )}
      </div>

      <Modal open={!!rec} onClose={() => setRec(null)} title="What should I study now?"
        footer={rec && <><button className="btn-secondary" onClick={() => setRec(null)}>Later</button>
          <button className="btn-primary" onClick={() => {
            if (rec.sessionId) { const ses = info.sessions.find((x) => x.id === rec.sessionId); if (ses?.status === 'not_started') actions.startSession(ses); else if (ses?.status === 'paused') actions.resumeSession(ses.id) }
            setRec(null); nav(rec.action.to)
          }}>{rec.action.label}<ArrowRight size={16} /></button></>}>
        {rec && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/50">
              <Sparkles className="mt-0.5 shrink-0 text-brand-600" size={22} />
              <div><div className="text-lg font-bold text-slate-900 dark:text-white">{rec.title}</div>
                <div className="mt-1 text-sm"><b>Reason:</b> {rec.reason}</div>
                {rec.detail && <div className="mt-1 text-sm"><b>Recommended:</b> {rec.kind === 'session' && /^\d+-\d+$/.test(rec.detail) ? rec.detail.split('-').map((m) => fmtTime(+m)).join(' – ') : rec.detail}</div>}
              </div>
            </div>
            <p className="muted">Checked: today’s schedule, incomplete sessions, weak areas, revisions due and recent mistakes.</p>
            {info.sessions?.length > 0 && <div className="flex flex-wrap gap-1.5">{info.sessions.map((x) => <StatusBadge key={x.id} status={x.status} label={`${x.slot.label.split(' — ')[0].replace("Today's ", '')}${x.slot.mode === 'concept' || x.slot.mode === 'practice' ? ' ' + x.slot.mode : ''}`} />)}</div>}
          </div>
        )}
      </Modal>
    </div>
  )
}
