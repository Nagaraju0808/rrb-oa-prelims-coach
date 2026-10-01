import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trophy, Play } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useStore } from '../lib/store.jsx'
import { createMock } from '../lib/tests.js'
import { EXAM } from '../lib/syllabus.js'
import { fmtDate, fmtDuration } from '../lib/dates.js'
import { PageHeader, Modal, accColor } from '../components/ui.jsx'

export default function Mock() {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const all = Object.values(state.attempts).filter((a) => a.kind === 'mock')
  const pending = all.find((a) => !a.submitted_at)
  const done = all.filter((a) => a.submitted_at).sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1))
  const trend = done.map((a, i) => ({ name: `M${i + 1}`, score: a.score, accuracy: a.accuracy,
    R: Math.round((a.by_subject?.reasoning?.score || 0) * 100) / 100, N: Math.round((a.by_subject?.numerical?.score || 0) * 100) / 100 }))

  return (
    <div className="fade-in space-y-5">
      <PageHeader title="Full Prelims Mock Tests" subtitle="Real exam pattern from the official IBPS CRP RRBs XV notification" />
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950"><Trophy size={30} /></div>
          <div className="flex-1">
            <h2 className="h2">Office Assistant Prelims Mock</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="text-sm"><thead><tr className="text-left text-xs text-slate-500 uppercase"><th className="pr-6">Section</th><th className="pr-6">Questions</th><th className="pr-6">Marks</th><th>Time</th></tr></thead>
                <tbody>{EXAM.sections.map((s) => <tr key={s.subject}><td className="pr-6">{s.name}</td><td className="pr-6">{s.questions}</td><td className="pr-6">{s.marks}</td><td>{s.minutes} min</td></tr>)}
                  <tr className="font-bold"><td>Total</td><td>80</td><td>80</td><td>45 min</td></tr></tbody></table>
            </div>
            <p className="muted mt-2">Sections are separately timed and sequential. −{EXAM.negativeMark} for each wrong answer. You must clear both sections’ cut-offs.</p>
          </div>
          {pending ? <Link className="btn-primary !py-3" to={`/test/${pending.id}`}><Play size={16} />Resume Mock</Link>
            : <button className="btn-primary !py-3" onClick={() => setConfirm(true)}><Play size={16} />Start Full Mock</button>}
        </div>
      </div>

      {trend.length > 1 && (
        <div className="card">
          <h2 className="h2 mb-3">Score trend</h2>
          <div className="h-64">
            <ResponsiveContainer><LineChart data={trend} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} domain={[0, 80]} /><Tooltip /><Legend />
              <Line dataKey="score" name="Total (/80)" stroke="#2563eb" strokeWidth={2} />
              <Line dataKey="R" name="Reasoning (/40)" stroke="#7c3aed" />
              <Line dataKey="N" name="Numerical (/40)" stroke="#0284c7" />
            </LineChart></ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="h2 mb-3">Mock history</h2>
        {done.length === 0 ? <p className="muted">No mocks yet. Phase 5 (Days 51–60) schedules one every study day — you can start earlier.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
            <thead><tr className="text-left text-xs text-slate-500 uppercase"><th className="py-2">Mock</th><th>Date</th><th>Score</th><th>Attempted</th><th>Accuracy</th><th>Reasoning</th><th>Numerical</th><th>Time</th><th /></tr></thead>
            <tbody>{[...done].reverse().map((a, i) => (
              <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2 font-semibold">#{done.length - i}</td><td>{fmtDate(a.date)}</td><td className="font-bold">{a.score}/80</td><td>{a.correct + a.wrong}</td>
                <td className={accColor(a.accuracy)}>{a.accuracy}%</td>
                <td>{a.by_subject?.reasoning?.score ?? '—'}/40 · {fmtDuration(a.by_subject?.reasoning?.time || 0)}</td>
                <td>{a.by_subject?.numerical?.score ?? '—'}/40 · {fmtDuration(a.by_subject?.numerical?.time || 0)}</td>
                <td>{fmtDuration(a.time_taken_sec)}</td>
                <td className="text-right"><Link className="text-brand-600 hover:underline" to={`/test/${a.id}`}>Analysis</Link></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Start a full mock?"
        footer={<><button className="btn-secondary" onClick={() => setConfirm(false)}>Not now</button><button className="btn-primary" onClick={() => nav(`/test/${createMock({ state, actions })}`)}>Start — 45 minutes</button></>}>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Reasoning (40 Q, 25 min) first, then Numerical Ability (40 Q, 20 min).</li>
          <li>When a section’s time ends it closes automatically; you cannot go back.</li>
          <li>Wrong answers cost 0.25 marks. Unanswered questions cost nothing.</li>
          <li>Find a quiet place — the timer keeps running even if you close the page.</li>
        </ul>
      </Modal>
    </div>
  )
}
