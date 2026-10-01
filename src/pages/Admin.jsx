import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { TOPICS } from '../lib/syllabus.js'
import { allTopics } from '../lib/engine.js'
import { generatePlan } from '../lib/plan.js'
import { GENERATORS } from '../lib/questions/index.js'
import { fmtDate } from '../lib/dates.js'
import { PageHeader, Tabs, Modal, Field, Segmented, SubjectChip, Empty, StatusBadge } from '../components/ui.jsx'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const newId = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

export default function Admin() {
  const [tab, setTab] = useState('questions')
  return (
    <div className="fade-in">
      <PageHeader title="Admin Panel" subtitle="Manage topics, questions, test templates, the 60-day plan and resources. Changes apply immediately." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'questions', label: 'Questions' }, { value: 'topics', label: 'Topics' }, { value: 'tests', label: 'Tests' }, { value: 'plan', label: 'Study Plan' }, { value: 'resources', label: 'Resources' }]} />
      {tab === 'questions' && <Questions />}
      {tab === 'topics' && <Topics />}
      {tab === 'tests' && <Templates />}
      {tab === 'plan' && <PlanEditor />}
      {tab === 'resources' && <Resources />}
    </div>
  )
}

function TopicSelect({ value, onChange, subject, allowAll }) {
  const { state } = useStore()
  const ts = allTopics(state.content).filter((t) => !subject || t.subject === subject)
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {allowAll && <option value="">All topics</option>}
      {['reasoning', 'numerical'].map((s) => ts.some((t) => t.subject === s) && <optgroup key={s} label={s === 'reasoning' ? 'Reasoning' : 'Numerical Ability'}>{ts.filter((t) => t.subject === s).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>)}
    </select>
  )
}

// ---------------- Questions ----------------
const blankQ = () => ({ id: newId('cq'), subject: 'reasoning', topic: 'inequality', subtopic: '', difficulty: 'medium', stem: '', options: ['', '', '', ''], answer: 0, explanation: '', source: 'custom' })
function Questions() {
  const { state, actions } = useStore()
  const [filter, setFilter] = useState('')
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')
  const qs = (state.content.questions || []).filter((q) => !filter || q.topic === filter)
  const save = () => {
    const q = edit
    if (!q.stem.trim() || q.options.some((o) => !o.trim())) return setErr('Question text and all four options are required.')
    if (new Set(q.options.map((o) => o.trim())).size < 4) return setErr('Options must be different from each other.')
    const topic = allTopics(state.content).find((t) => t.id === q.topic)
    actions.setContent((c) => { const clean = { ...q, subject: topic?.subject || q.subject, stem: q.stem.trim(), options: q.options.map((o) => o.trim()) }; const i = c.questions.findIndex((x) => x.id === q.id); if (i >= 0) c.questions[i] = clean; else c.questions.push(clean) })
    setEdit(null); setErr('')
  }
  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1"><Field label="Filter by topic"><TopicSelect value={filter} onChange={setFilter} allowAll /></Field></div>
        <button className="btn-primary" onClick={() => { setErr(''); setEdit({ ...blankQ(), topic: filter || 'inequality' }) }}><Plus size={16} />Add question</button>
      </div>
      <p className="muted mb-3">{qs.length} custom question(s). Custom questions are mixed into Daily Tests, practice tests and mocks for their topic{filter && GENERATORS[filter] ? ', alongside the built-in question generator for this topic' : ''}.</p>
      {qs.length === 0 ? <Empty icon="❓" title="No custom questions yet">Add questions from previous papers or your coaching material.</Empty> : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">{qs.map((q) => (
          <li key={q.id} className="flex items-start gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap gap-1.5 text-xs"><SubjectChip subject={q.subject} /><span className="chip bg-slate-100 dark:bg-slate-800">{allTopics(state.content).find((t) => t.id === q.topic)?.name}</span><span className="chip bg-slate-100 capitalize dark:bg-slate-800">{q.difficulty}</span></div>
              <p className="line-clamp-2 whitespace-pre-line">{q.stem}</p><p className="text-xs text-emerald-600">✓ {q.options[q.answer]}</p></div>
            <button className="btn-ghost !p-2" aria-label="Edit question" onClick={() => { setErr(''); setEdit(structuredClone(q)) }}><Pencil size={16} /></button>
            <button className="btn-ghost !p-2 text-rose-600" aria-label="Delete question" onClick={() => actions.setContent((c) => { c.questions = c.questions.filter((x) => x.id !== q.id) })}><Trash2 size={16} /></button>
          </li>))}</ul>
      )}
      {edit && (
        <Modal open wide onClose={() => setEdit(null)} title={(state.content.questions || []).some((x) => x.id === edit.id) ? 'Edit question' : 'Add question'}
          footer={<><button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save question</button></>}>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Topic"><TopicSelect value={edit.topic} onChange={(v) => setEdit({ ...edit, topic: v })} /></Field>
              <Field label="Sub-topic (optional)"><input className="input" value={edit.subtopic} onChange={(e) => setEdit({ ...edit, subtopic: e.target.value })} /></Field>
              <Field label="Difficulty"><select className="input" value={edit.difficulty} onChange={(e) => setEdit({ ...edit, difficulty: e.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></Field>
            </div>
            <Field label="Question"><textarea className="input" rows={5} value={edit.stem} onChange={(e) => setEdit({ ...edit, stem: e.target.value })} /></Field>
            <div className="grid gap-2 sm:grid-cols-2">
              {edit.options.map((o, k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="radio" name="correct" className="h-4 w-4 accent-emerald-600" checked={edit.answer === k} onChange={() => setEdit({ ...edit, answer: k })} aria-label={`Option ${String.fromCharCode(65 + k)} is correct`} />
                  <input className="input" placeholder={`Option ${String.fromCharCode(65 + k)}`} value={o} onChange={(e) => { const opts = [...edit.options]; opts[k] = e.target.value; setEdit({ ...edit, options: opts }) }} />
                </label>))}
            </div>
            <p className="text-xs text-slate-500">Select the radio button next to the correct option.</p>
            <Field label="Explanation"><textarea className="input" rows={3} value={edit.explanation} onChange={(e) => setEdit({ ...edit, explanation: e.target.value })} /></Field>
            {err && <p className="text-sm text-rose-600">{err}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------------- Topics ----------------
function Topics() {
  const { state, actions } = useStore()
  const [edit, setEdit] = useState(null)
  const hidden = new Set(state.content.hiddenTopics || [])
  const custom = state.content.topics || []
  const save = () => {
    if (!edit.name.trim()) return
    const t = { ...edit, id: edit.id || `custom-${slug(edit.name)}-${Date.now().toString(36).slice(-3)}`, name: edit.name.trim(),
      subtopics: edit.subtopicsText.split(',').map((x) => x.trim()).filter(Boolean), notes: edit.notesText.split('\n').map((x) => x.trim()).filter(Boolean), custom: true }
    delete t.subtopicsText; delete t.notesText
    actions.setContent((c) => { const i = c.topics.findIndex((x) => x.id === t.id); if (i >= 0) c.topics[i] = t; else c.topics.push(t) })
    setEdit(null)
  }
  const Row = ({ t, builtIn }) => (
    <li className="flex items-center gap-3 py-2 text-sm">
      <SubjectChip subject={t.subject} /><span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
      {builtIn ? (hidden.has(t.id) ? <StatusBadge status="missed" label="Hidden" /> : <span className="text-xs text-slate-500">built-in</span>) : <span className="text-xs text-slate-500">custom</span>}
      {builtIn ? <button className="btn-ghost !p-2" aria-label={hidden.has(t.id) ? 'Show topic' : 'Hide topic'} title={hidden.has(t.id) ? 'Show' : 'Hide from the app'}
        onClick={() => actions.setContent((c) => { c.hiddenTopics = hidden.has(t.id) ? c.hiddenTopics.filter((x) => x !== t.id) : [...(c.hiddenTopics || []), t.id] })}>{hidden.has(t.id) ? <Eye size={16} /> : <EyeOff size={16} />}</button>
        : <>
          <button className="btn-ghost !p-2" aria-label="Edit topic" onClick={() => setEdit({ ...t, subtopicsText: (t.subtopics || []).join(', '), notesText: (t.notes || []).join('\n') })}><Pencil size={16} /></button>
          <button className="btn-ghost !p-2 text-rose-600" aria-label="Delete topic" onClick={() => actions.setContent((c) => { c.topics = c.topics.filter((x) => x.id !== t.id) })}><Trash2 size={16} /></button>
        </>}
    </li>
  )
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between"><p className="muted">Built-in syllabus topics can be hidden; custom topics can be edited or deleted.</p>
        <button className="btn-primary" onClick={() => setEdit({ id: '', subject: 'reasoning', name: '', priority: 'medium', subtopicsText: '', notesText: '' })}><Plus size={16} />Add topic</button></div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {custom.map((t) => <Row key={t.id} t={t} />)}
        {TOPICS.map((t) => <Row key={t.id} t={t} builtIn />)}
      </ul>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit topic' : 'Add topic'} footer={<><button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={save} disabled={!edit.name.trim()}>Save</button></>}>
          <div className="space-y-3">
            <Field label="Name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Subject"><Segmented value={edit.subject} onChange={(v) => setEdit({ ...edit, subject: v })} options={[{ value: 'reasoning', label: 'Reasoning' }, { value: 'numerical', label: 'Numerical' }]} /></Field>
            <Field label="Priority"><Segmented value={edit.priority} onChange={(v) => setEdit({ ...edit, priority: v })} options={['high', 'medium', 'low'].map((x) => ({ value: x, label: x }))} /></Field>
            <Field label="Sub-topics (comma separated)"><input className="input" value={edit.subtopicsText} onChange={(e) => setEdit({ ...edit, subtopicsText: e.target.value })} /></Field>
            <Field label="Key notes (one per line)"><textarea className="input" rows={4} value={edit.notesText} onChange={(e) => setEdit({ ...edit, notesText: e.target.value })} /></Field>
            <p className="muted">Custom topics use the questions you add in the Questions tab.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------------- Test templates ----------------
function Templates() {
  const { state, actions } = useStore()
  const [edit, setEdit] = useState(null)
  const list = state.content.templates || []
  const save = () => {
    const t = { ...edit, count: Math.max(5, Math.min(100, +edit.count || 20)), minutes: Math.max(5, Math.min(180, +edit.minutes || 20)) }
    if (!t.name.trim() || t.mix.easy + t.mix.medium + t.mix.hard !== 100) return
    actions.setContent((c) => { const i = c.templates.findIndex((x) => x.id === t.id); if (i >= 0) c.templates[i] = t; else c.templates.push(t) })
    setEdit(null)
  }
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between"><p className="muted">Templates appear on the Practice Tests page. The Daily Test uses the count & difficulty set in Settings.</p>
        <button className="btn-primary" onClick={() => setEdit({ id: newId('tpl'), name: '', kind: 'topic', subject: 'numerical', topics: [], count: 20, minutes: 15, mix: { easy: 30, medium: 50, hard: 20 } })}><Plus size={16} />New template</button></div>
      {list.length === 0 ? <Empty icon="🧪" title="No templates yet" /> : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">{list.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2 text-sm"><span className="flex-1 font-medium">{t.name}</span><span className="text-xs text-slate-500">{t.kind} · {t.count} Q · {t.minutes} min · {t.mix.easy}/{t.mix.medium}/{t.mix.hard}</span>
            <button className="btn-ghost !p-2" aria-label="Edit template" onClick={() => setEdit(structuredClone(t))}><Pencil size={16} /></button>
            <button className="btn-ghost !p-2 text-rose-600" aria-label="Delete template" onClick={() => actions.setContent((c) => { c.templates = c.templates.filter((x) => x.id !== t.id) })}><Trash2 size={16} /></button></li>))}</ul>
      )}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title="Test template" footer={<><button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}>
          <div className="space-y-3">
            <Field label="Name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Arithmetic speed set" /></Field>
            <Field label="Type"><Segmented value={edit.kind} onChange={(v) => setEdit({ ...edit, kind: v })} options={[{ value: 'topic', label: 'Topic(s)' }, { value: 'subject', label: 'Subject' }, { value: 'mixed', label: 'Mixed' }]} /></Field>
            {edit.kind === 'subject' && <Field label="Subject"><Segmented value={edit.subject} onChange={(v) => setEdit({ ...edit, subject: v })} options={[{ value: 'reasoning', label: 'Reasoning' }, { value: 'numerical', label: 'Numerical' }]} /></Field>}
            {edit.kind === 'topic' && <Field label="Topics (Ctrl/Cmd-click for several)">
              <select multiple className="input h-40" value={edit.topics} onChange={(e) => setEdit({ ...edit, topics: [...e.target.selectedOptions].map((o) => o.value) })}>
                {allTopics(state.content).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Questions"><input className="input" type="number" value={edit.count} onChange={(e) => setEdit({ ...edit, count: e.target.value })} /></Field>
              <Field label="Minutes"><input className="input" type="number" value={edit.minutes} onChange={(e) => setEdit({ ...edit, minutes: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">{['easy', 'medium', 'hard'].map((k) => <Field key={k} label={`${k} %`}><input className="input" type="number" value={edit.mix[k]} onChange={(e) => setEdit({ ...edit, mix: { ...edit.mix, [k]: +e.target.value || 0 } })} /></Field>)}</div>
            {edit.mix.easy + edit.mix.medium + edit.mix.hard !== 100 && <p className="text-sm text-rose-600">Difficulty must add up to 100%.</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------------- Study plan ----------------
function PlanEditor() {
  const { state, actions, today } = useStore()
  const o = state.content.planOverrides || {}
  const base = generatePlan({ startDate: state.profile.start_date, reasoningConfidence: state.profile.reasoning_confidence, numericalConfidence: state.profile.numerical_confidence })
  const set = (dayNo, patch) => actions.setContent((c) => { c.planOverrides = c.planOverrides || {}; c.planOverrides[dayNo] = { ...(c.planOverrides[dayNo] || {}), ...patch } })
  const topics = allTopics(state.content)
  const opt = (subject) => [<option key="mixed" value="mixed">Mixed (mock day)</option>, ...topics.filter((t) => t.subject === subject).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)]
  return (
    <div className="card">
      <p className="muted mb-3">Change which topics are studied on Day 1–60. Days that are already finished keep their recorded history; only future days use the new topics.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-xs text-slate-500 uppercase"><th className="py-2">Day</th><th>Date</th><th>Reasoning</th><th>Numerical</th><th>Focus</th><th /></tr></thead>
          <tbody>{base.map((d) => {
            const ov = o[d.day_no] || {}
            const past = d.date < today
            return (
              <tr key={d.day_no} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 font-semibold">{d.day_no}</td><td className="text-xs text-slate-500">{fmtDate(d.date)}</td>
                <td><select disabled={past} className="input !py-1" value={ov.reasoning || d.reasoning_topic} onChange={(e) => set(d.day_no, { reasoning: e.target.value })}>{opt('reasoning')}</select></td>
                <td><select disabled={past} className="input !py-1" value={ov.numerical || d.numerical_topic} onChange={(e) => set(d.day_no, { numerical: e.target.value })}>{opt('numerical')}</select></td>
                <td><input disabled={past} className="input !py-1" value={ov.focus ?? d.focus} onChange={(e) => set(d.day_no, { focus: e.target.value })} /></td>
                <td>{o[d.day_no] && !past && <button className="btn-ghost !p-1.5" title="Reset to default" aria-label={`Reset Day ${d.day_no}`} onClick={() => actions.setContent((c) => { delete c.planOverrides[d.day_no] })}><RotateCcw size={14} /></button>}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- Resources ----------------
function Resources() {
  const { state, actions } = useStore()
  const [edit, setEdit] = useState(null)
  const list = state.content.resources || []
  const valid = edit && edit.title.trim() && /^https?:\/\//.test(edit.url.trim())
  const save = () => { if (!valid) return; actions.setContent((c) => { const r = { ...edit, url: edit.url.trim(), title: edit.title.trim() }; const i = c.resources.findIndex((x) => x.id === r.id); if (i >= 0) c.resources[i] = r; else c.resources.push(r) }); setEdit(null) }
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between"><p className="muted">Link PDFs, notes, videos and practice sets (e.g. Google Drive or YouTube links). They show on each topic’s page.</p>
        <button className="btn-primary" onClick={() => setEdit({ id: newId('res'), title: '', type: 'pdf', url: '', topic: 'inequality', description: '' })}><Plus size={16} />Add resource</button></div>
      {list.length === 0 ? <Empty icon="📎" title="No resources yet" /> : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">{list.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2 text-sm"><span className="chip bg-slate-100 uppercase dark:bg-slate-800">{r.type}</span>
            <a href={r.url} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 truncate text-brand-600 hover:underline">{r.title}</a>
            <span className="text-xs text-slate-500">{allTopics(state.content).find((t) => t.id === r.topic)?.name}</span>
            <button className="btn-ghost !p-2" aria-label="Edit resource" onClick={() => setEdit({ ...r })}><Pencil size={16} /></button>
            <button className="btn-ghost !p-2 text-rose-600" aria-label="Delete resource" onClick={() => actions.setContent((c) => { c.resources = c.resources.filter((x) => x.id !== r.id) })}><Trash2 size={16} /></button></li>))}</ul>
      )}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title="Resource" footer={<><button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" disabled={!valid} onClick={save}>Save</button></>}>
          <div className="space-y-3">
            <Field label="Title"><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Type"><Segmented value={edit.type} onChange={(v) => setEdit({ ...edit, type: v })} options={[{ value: 'pdf', label: 'PDF' }, { value: 'notes', label: 'Notes' }, { value: 'video', label: 'Video' }, { value: 'practice', label: 'Practice set' }]} /></Field>
            <Field label="Link (https://…)"><input className="input" type="url" value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} /></Field>
            <Field label="Topic"><TopicSelect value={edit.topic} onChange={(v) => setEdit({ ...edit, topic: v })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
