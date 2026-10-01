import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PenLine, ClipboardList, Eye, ExternalLink } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { allTopics } from '../lib/engine.js'
import { fmtDate } from '../lib/dates.js'
import { generateQuestion, GENERATORS } from '../lib/questions/index.js'
import { createPractice } from '../lib/tests.js'
import { QuestionBody } from '../components/TestRunner.jsx'
import { PageHeader, StatusBadge, SubjectChip, accColor, Empty } from '../components/ui.jsx'
import { StageTrack } from './Subject.jsx'

export default function TopicPage() {
  const { id } = useParams()
  const { state, stats, actions } = useStore()
  const nav = useNavigate()
  const [show, setShow] = useState(false)
  const [seed, setSeed] = useState(1)
  const topic = allTopics(state.content).find((t) => t.id === id)
  const sample = useMemo(() => (GENERATORS[id] ? generateQuestion(id, 'medium', `sample-${seed}`) : (state.content.questions || []).find((q) => q.topic === id)), [id, seed, state.content.questions])
  if (!topic) return <Empty icon="🔎" title="Topic not found"><Link to="/" className="text-brand-600 underline">Go to Dashboard</Link></Empty>
  const s = stats[id]
  const revs = Object.values(state.revisions).filter((r) => r.topic_id === id).sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
  const resources = (state.content.resources || []).filter((r) => r.topic === id)
  const start = (count, kind, title) => { const aid = createPractice({ state, actions, topics: [id], count, kind, title }); nav(`/test/${aid}`) }

  return (
    <div className="fade-in space-y-4">
      <PageHeader title={topic.name} subtitle={<span className="flex flex-wrap items-center gap-2"><SubjectChip subject={topic.subject} /><span className="capitalize">{topic.priority} priority</span>{s && <StatusBadge status={s.status} />}</span>}>
        <button className="btn-primary" onClick={() => start(10, 'practice', `${topic.name} — Quick practice`)}><PenLine size={16} />Practice 10</button>
        <button className="btn-secondary" onClick={() => start(20, 'topic', `Topic Test — ${topic.name}`)}><ClipboardList size={16} />Topic Test (20 Q)</button>
      </PageHeader>
      {s && (
        <div className="card">
          <StageTrack s={s} />
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div><div className="text-xs text-slate-500">Completion</div><b>{s.completion}%</b></div>
            <div><div className="text-xs text-slate-500">Questions solved</div><b>{s.totalAttempted}</b></div>
            <div><div className="text-xs text-slate-500">Accuracy (recent)</div><b className={accColor(s.recentAccuracy)}>{s.totalAttempted ? `${s.accuracy}% (${s.recentAccuracy}%)` : '—'}</b></div>
            <div><div className="text-xs text-slate-500">Avg time / Q</div><b>{s.avgTime ? `${s.avgTime}s` : '—'}</b></div>
            <div><div className="text-xs text-slate-500">Mistakes logged</div><b>{s.mistakes}</b></div>
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="h2 mb-2">Key concepts & shortcuts</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{(topic.notes || []).map((n, i) => <li key={i}>{n}</li>)}</ul>
          <h3 className="mt-4 mb-2 text-sm font-bold">Sub-topics covered</h3>
          <div className="flex flex-wrap gap-1.5">{(topic.subtopics || []).map((x) => <span key={x} className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{x}</span>)}</div>
        </div>
        <div className="card">
          <h2 className="h2 mb-2">Revision schedule</h2>
          {revs.length === 0 ? <p className="muted">Revisions are scheduled automatically (Day +1, +4, +7, +14, +30) when you complete this topic’s concept session.</p> : (
            <ul className="space-y-1.5 text-sm">{revs.map((r) => (
              <li key={r.id} className="flex items-center gap-2"><span className="w-28 text-slate-500">{fmtDate(r.due_date)}</span><span className="flex-1">{r.label}</span><StatusBadge status={r.status} /></li>))}</ul>
          )}
          {resources.length > 0 && (<>
            <h3 className="mt-4 mb-2 text-sm font-bold">Resources</h3>
            <ul className="space-y-1.5 text-sm">{resources.map((r) => <li key={r.id}><a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={r.url} target="_blank" rel="noreferrer noopener">{r.title}<ExternalLink size={12} /></a> <span className="text-xs text-slate-500 uppercase">{r.type}</span></li>)}</ul>
          </>)}
        </div>
      </div>
      {sample && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="h2">Worked example</h2><button className="btn-ghost text-sm" onClick={() => { setSeed((x) => x + 1); setShow(false) }}>Another example</button></div>
          <QuestionBody q={sample} />
          <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">{sample.options.map((o, k) => <li key={k} className={show && k === sample.answer ? 'rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800/60'}>{String.fromCharCode(65 + k)}. {o}</li>)}</ol>
          {show ? <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm whitespace-pre-line dark:bg-blue-950/50"><b>Solution: </b>{sample.explanation}</div>
            : <button className="btn-secondary mt-3" onClick={() => setShow(true)}><Eye size={16} />Show solution</button>}
        </div>
      )}
    </div>
  )
}
