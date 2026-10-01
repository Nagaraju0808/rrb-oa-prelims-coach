import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { allTopics } from '../lib/engine.js'
import { createPractice } from '../lib/tests.js'
import { fmtDate } from '../lib/dates.js'
import { EXAM, MAINS, SUBJECTS, subjectById, topicName } from '../lib/syllabus.js'
import { PageHeader, Tabs, Field, Segmented, accColor } from '../components/ui.jsx'

const MIXES = { easy: { easy: 60, medium: 30, hard: 10 }, standard: { easy: 30, medium: 50, hard: 20 }, hard: { easy: 10, medium: 50, hard: 40 } }

export default function Practice() {
  const { state, actions } = useStore()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const topics = allTopics(state.content, state.profile?.language)
  const [tab, setTab] = useState(params.get('subject') ? 'subject' : params.get('mixed') ? 'mixed' : 'topic')
  const [topic, setTopic] = useState(params.get('topic') || topics[0].id)
  const [count, setCount] = useState(+params.get('count') || 20)
  const [subject, setSubject] = useState(params.get('subject') || 'numerical')
  const [level, setLevel] = useState('standard')
  const history = Object.values(state.attempts).filter((a) => ['topic', 'subject', 'mixed', 'practice'].includes(a.kind) && a.submitted_at).sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1)).slice(0, 25)
  const templates = state.content.templates || []

  const go = (opts) => nav(`/test/${createPractice({ state, actions, mix: MIXES[level], ...opts })}`)
  const start = () => {
    if (tab === 'topic') go({ topics: [topic], count, kind: 'topic', title: `Topic Test — ${topicName(topic)}` })
    else if (tab === 'subject') {
      const sec = EXAM.sections.find((s) => s.subject === subject) || MAINS.sections.find((s) => s.subject === subject)
      go({ topics: topics.filter((t) => t.subject === subject).map((t) => t.id), count: 40, kind: 'subject', title: `Subject Test — ${subjectById[subject].name}`, minutes: sec.minutes })
    } else go({ topics: topics.map((t) => t.id), count: 40, kind: 'mixed', title: 'Mixed Test — all five subjects', minutes: 40 })
  }

  return (
    <div className="fade-in space-y-5">
      <PageHeader title="Practice Tests" subtitle="Separate from the Daily Test. Use them any time for extra practice." />
      <div className="card">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'topic', label: 'Topic Test' }, { value: 'subject', label: 'Subject Test' }, { value: 'mixed', label: 'Mixed Test' }]} />
        <div className="grid gap-4 sm:grid-cols-2">
          {tab === 'topic' && <>
            <Field label="Topic">
              <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
{SUBJECTS.map((sb) => topics.some((t) => t.subject === sb.id) && <optgroup key={sb.id} label={sb.name}>{topics.filter((t) => t.subject === sb.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>)}
              </select>
            </Field>
            <Field label="Questions"><Segmented value={count} onChange={setCount} options={[10, 20, 30].map((n) => ({ value: n, label: `${n} Q` }))} /></Field>
          </>}
          {tab === 'subject' && <Field label="Subject" hint="40 questions in the official sectional time (Prelims for Reasoning/Numerical, Mains for the others).">
            <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((sb) => <option key={sb.id} value={sb.id}>{sb.name}</option>)}</select></Field>}
          {tab === 'mixed' && <p className="muted sm:col-span-2">40 questions drawn from every topic of all five subjects, 40 minutes.</p>}
          <Field label="Difficulty"><Segmented value={level} onChange={setLevel} options={[{ value: 'easy', label: 'Easier' }, { value: 'standard', label: 'Standard' }, { value: 'hard', label: 'Harder' }]} /></Field>
        </div>
        <button className="btn-primary mt-5" onClick={start}><Play size={16} />Start {tab === 'topic' ? `${count}-question Topic Test` : tab === 'subject' ? 'Subject Test' : 'Mixed Test'}</button>
      </div>

      {templates.length > 0 && (
        <div className="card">
          <h2 className="h2 mb-3">Tests from your Admin templates</h2>
          <div className="grid gap-2 sm:grid-cols-2">{templates.map((t) => (
            <button key={t.id} className="rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              onClick={() => go({ topics: t.topics?.length ? t.topics : topics.filter((x) => !t.subject || x.subject === t.subject).map((x) => x.id), count: t.count, kind: t.kind === 'mixed' ? 'mixed' : t.kind === 'subject' ? 'subject' : 'topic', title: t.name, minutes: t.minutes, mix: t.mix })}>
              <div className="font-semibold">{t.name}</div><div className="text-xs text-slate-500">{t.count} Q · {t.minutes} min · {t.kind}</div>
            </button>))}</div>
        </div>
      )}

      <div className="card">
        <h2 className="h2 mb-3">Recent practice</h2>
        {history.length === 0 ? <p className="muted">No practice tests yet.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">{history.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-20 shrink-0 text-slate-500">{fmtDate(a.date, { day: 'numeric', month: 'short' })}</span>
              <span className="min-w-0 flex-1 truncate">{a.title}</span>
              <span className={accColor(a.accuracy)}>{a.accuracy}%</span><span className="w-14 text-right">{a.score}/{a.max}</span>
              <Link to={`/test/${a.id}`} className="text-brand-600 hover:underline">View</Link>
            </li>))}</ul>
        )}
      </div>
    </div>
  )
}
