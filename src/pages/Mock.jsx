import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trophy, Play } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useStore } from '../lib/store.jsx'
import { createMock } from '../lib/tests.js'
import { EXAM, MAINS } from '../lib/syllabus.js'
import { fmtDate, fmtDuration } from '../lib/dates.js'
import { PageHeader, Modal, accColor, Tabs } from '../components/ui.jsx'

const PATTERNS = { prelims: EXAM, mains: MAINS }

export default function Mock() {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const [confirm, setConfirm] = useState(null)
  const [view, setView] = useState('prelims')
  const all = Object.values(state.attempts).filter((a) => a.kind === 'mock')
  const typeOf = (a) => a.mock_type || 'prelims'
  const pending = (type) => all.find((a) => !a.submitted_at && typeOf(a) === type)
  const done = all.filter((a) => a.submitted_at && typeOf(a) === view).sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1))
  const pattern = PATTERNS[view]
  const trend = done.map((a, i) => ({ name: `M${i + 1}`, score: a.score,
    ...Object.fromEntries(pattern.sections.map((s) => [s.name, Math.round((a.by_subject?.[s.subject]?.score || 0) * 100) / 100])) }))
  const colors = ['#7c3aed', '#0284c7', '#059669', '#d97706', '#e11d48']
  const total = (p) => ({ q: p.sections.reduce((s, x) => s + x.questions, 0), m: p.sections.reduce((s, x) => s + x.marks, 0), t: p.sections.reduce((s, x) => s + x.minutes, 0) })

  return (
    <div className="fade-in space-y-5">
      <PageHeader title="Full Mock Tests" subtitle="Official CRP RRBs XV patterns — sectional timing, 0.25 negative marking" />
      <div className="grid gap-4 lg:grid-cols-2">
        {['prelims', 'mains'].map((type) => {
          const p = PATTERNS[type], tt = total(p), pend = pending(type)
          return (
            <div key={type} className="card">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950"><Trophy size={24} /></div>
                <div><h2 className="h2">{type === 'mains' ? 'Mains-pattern Mock' : 'Prelims-pattern Mock'}</h2><p className="muted">{tt.q} Q · {tt.m} marks · {tt.t} min</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 uppercase"><th>Section</th><th>Q</th><th>Marks</th><th>Time</th></tr></thead>
                  <tbody>{p.sections.map((s) => <tr key={s.subject}><td className="py-0.5 pr-3">{s.name}</td><td>{s.questions}</td><td>{s.marks}</td><td>{s.minutes} min</td></tr>)}</tbody></table>
              </div>
              <div className="mt-4">{pend ? <Link className="btn-primary" to={`/test/${pend.id}`}><Play size={16} />Resume Mock</Link>
                : <button className="btn-primary" onClick={() => setConfirm(type)}><Play size={16} />Start {type === 'mains' ? 'Mains' : 'Prelims'} Mock</button>}</div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <Tabs value={view} onChange={setView} tabs={[{ value: 'prelims', label: 'Prelims mocks' }, { value: 'mains', label: 'Mains mocks' }]} />
        {trend.length > 1 && (
          <div className="mb-4 h-64">
            <ResponsiveContainer><LineChart data={trend} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
              <Line dataKey="score" name={`Total (/${total(pattern).m})`} stroke="#2563eb" strokeWidth={2} />
              {pattern.sections.map((s, i) => <Line key={s.subject} dataKey={s.name} stroke={colors[i]} />)}
            </LineChart></ResponsiveContainer>
          </div>
        )}
        {done.length === 0 ? <p className="muted">No {view} mocks yet. Phase 5 (Days 51–60) alternates Prelims and Mains mocks — you can start earlier.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
            <thead><tr className="text-left text-xs text-slate-500 uppercase"><th className="py-2">Mock</th><th>Date</th><th>Score</th><th>Attempted</th><th>Accuracy</th>{pattern.sections.map((s) => <th key={s.subject}>{s.name.split(' ')[0]}</th>)}<th>Time</th><th /></tr></thead>
            <tbody>{[...done].reverse().map((a, i) => (
              <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2 font-semibold">#{done.length - i}</td><td>{fmtDate(a.date)}</td><td className="font-bold">{a.score}/{a.max}</td><td>{a.correct + a.wrong}</td>
                <td className={accColor(a.accuracy)}>{a.accuracy}%</td>
                {pattern.sections.map((s) => <td key={s.subject}>{a.by_subject?.[s.subject]?.score ?? '—'} · {fmtDuration(a.by_subject?.[s.subject]?.time || 0)}</td>)}
                <td>{fmtDuration(a.time_taken_sec)}</td>
                <td className="text-right"><Link className="text-brand-600 hover:underline" to={`/test/${a.id}`}>Analysis</Link></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Start a full ${confirm === 'mains' ? 'Mains' : 'Prelims'} mock?`}
        footer={<><button className="btn-secondary" onClick={() => setConfirm(null)}>Not now</button><button className="btn-primary" onClick={() => nav(`/test/${createMock({ state, actions, type: confirm })}`)}>Start — {confirm && total(PATTERNS[confirm]).t} minutes</button></>}>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Sections run one after another: {confirm && PATTERNS[confirm].sections.map((s) => `${s.name} (${s.minutes} min)`).join(' → ')}.</li>
          <li>When a section’s time ends it closes automatically; you cannot go back.</li>
          <li>Wrong answers cost 0.25 of the question’s marks. Unanswered questions cost nothing.</li>
          <li>Find a quiet place — the timer keeps running even if you close the page.</li>
        </ul>
      </Modal>
    </div>
  )
}
