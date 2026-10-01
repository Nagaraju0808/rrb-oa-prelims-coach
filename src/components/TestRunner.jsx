import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Flag, Eraser, Send, Clock, LayoutGrid } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { fmtDuration, now } from '../lib/dates.js'
import { Modal, cx, SubjectChip } from './ui.jsx'
import { topicName } from '../lib/syllabus.js'

/** Render **bold** markers used in sentence-improvement questions. */
export const rich = (text) => String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i} className="underline decoration-2 underline-offset-2">{part.slice(2, -2)}</b> : part))

export function QuestionBody({ q }) {
  return (
    <div>
      {q.data && <DataView data={q.data} />}
      <p className="text-[15px] leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-100">{rich(q.stem)}</p>
    </div>
  )
}

function DataView({ data }) {
  if (data.type === 'bar') {
    const max = Math.max(...data.rows.flatMap((r) => r.slice(1)))
    return (
      <figure className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <figcaption className="mb-2 text-xs font-semibold text-slate-500">{data.caption}</figcaption>
        <div className="mb-2 flex gap-4 text-xs"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-blue-500" />{data.headers[1]}</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-amber-500" />{data.headers[2]}</span></div>
        <div className="space-y-2">
          {data.rows.map((r) => (
            <div key={r[0]} className="grid grid-cols-[3rem_1fr] items-center gap-2 text-xs">
              <span className="font-semibold">{r[0]}</span>
              <div className="space-y-1">
                {[1, 2].map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className={cx('h-3 rounded-r', k === 1 ? 'bg-blue-500' : 'bg-amber-500')} style={{ width: `${(r[k] / max) * 80}%` }} />
                    <span className="tabular-nums">{r[k]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </figure>
    )
  }
  return (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full min-w-[280px] border-collapse text-sm">
        <caption className="mb-1 text-left text-xs font-semibold text-slate-500">{data.caption}</caption>
        <thead><tr>{data.headers.map((h, i) => <th key={i} className="border border-slate-200 bg-slate-50 px-2 py-1 text-left dark:border-slate-700 dark:bg-slate-800">{h}</th>)}</tr></thead>
        <tbody>{data.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className="border border-slate-200 px-2 py-1 tabular-nums dark:border-slate-700">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

/**
 * Full exam-style test interface.
 * sections: optional [{ subject, name, minutes, from, to }] — sequential, separately timed (official prelims pattern).
 */
export default function TestRunner({ attempt, questions, onSubmitted, sections = null }) {
  const { actions } = useStore()
  const [answers, setAnswers] = useState(() => attempt.answers || {})
  const [secState, setSecState] = useState(() => attempt.section_state || (sections ? { current: 0, started: [attempt.started_at] } : null))
  const [idx, setIdx] = useState(() => (sections && attempt.section_state ? sections[attempt.section_state.current].from : 0))
  const [confirm, setConfirm] = useState(false)
  const [palette, setPalette] = useState(false)
  const [, force] = useState(0)
  const enteredAt = useRef(Date.now())
  const submitted = useRef(false)
  const answersRef = useRef(answers)
  answersRef.current = answers

  const range = sections && secState ? sections[secState.current] : { from: 0, to: questions.length - 1 }
  const q = questions[idx]

  // Remaining time (derived from timestamps so a page refresh doesn't reset the clock)
  const remaining = (() => {
    const t = now().getTime()
    if (sections && secState) return sections[secState.current].minutes * 60 - (t - Date.parse(secState.started[secState.current])) / 1000
    return attempt.duration_sec - (t - Date.parse(attempt.started_at)) / 1000
  })()

  const flushTime = useCallback((base) => {
    const qid = questions[idx]?.id
    if (!qid) return base
    const dt = (Date.now() - enteredAt.current) / 1000
    enteredAt.current = Date.now()
    const cur = base[qid] || {}
    return { ...base, [qid]: { ...cur, visited: true, time_sec: Math.round(((cur.time_sec || 0) + dt) * 10) / 10 } }
  }, [idx, questions])

  const persist = useCallback((next, extra) => actions.saveAnswers(attempt.id, next, extra), [actions, attempt.id])

  const doSubmit = useCallback((auto) => {
    if (submitted.current) return
    submitted.current = true
    const final = flushTime(answersRef.current)
    const taken = (now().getTime() - Date.parse(attempt.started_at)) / 1000
    actions.submitAttempt(attempt.id, questions, { auto, answers: final, timeTaken: Math.min(taken, attempt.duration_sec) })
    onSubmitted?.()
  }, [actions, attempt, questions, flushTime, onSubmitted])

  // Ticking timer + auto submit / auto section switch
  useEffect(() => {
    const t = setInterval(() => {
      force((x) => x + 1)
      const rem = sections && secState ? sections[secState.current].minutes * 60 - (now().getTime() - Date.parse(secState.started[secState.current])) / 1000
        : attempt.duration_sec - (now().getTime() - Date.parse(attempt.started_at)) / 1000
      if (rem <= 0) {
        if (sections && secState && secState.current < sections.length - 1) nextSection(true)
        else doSubmit(true)
      }
    }, 1000)
    return () => clearInterval(t)
  })

  // Mark visited on open
  useEffect(() => {
    enteredAt.current = Date.now()
    setAnswers((a) => (a[q?.id]?.visited ? a : { ...a, [q.id]: { ...(a[q.id] || {}), visited: true } }))
  }, [q?.id])

  // Periodic save of time spent
  useEffect(() => {
    const t = setInterval(() => { const n = flushTime(answersRef.current); setAnswers(n); persist(n) }, 10000)
    return () => clearInterval(t)
  }, [flushTime, persist])

  const go = (i) => {
    if (i < range.from || i > range.to) return
    const n = flushTime(answers)
    setAnswers(n); persist(n); setIdx(i); setPalette(false)
  }
  const choose = (k) => { const n = { ...answers, [q.id]: { ...(answers[q.id] || {}), choice: k, visited: true } }; setAnswers(n); persist(n) }
  const clear = () => { const n = { ...answers, [q.id]: { ...(answers[q.id] || {}), choice: null } }; setAnswers(n); persist(n) }
  const mark = () => {
    const n = flushTime({ ...answers, [q.id]: { ...(answers[q.id] || {}), marked: !answers[q.id]?.marked } })
    setAnswers(n); persist(n)
    if (idx < range.to) setIdx(idx + 1)
  }
  function nextSection(auto = false) {
    const n = flushTime(answersRef.current)
    const ns = { current: secState.current + 1, started: [...secState.started, now().toISOString()] }
    setAnswers(n); setSecState(ns); persist(n, { section_state: ns })
    setIdx(sections[ns.current].from)
    setConfirm(false)
    if (auto) actions.notify('⏱️ Section time over', `${sections[secState.current].name} closed automatically. ${sections[ns.current].name} has started.`)
  }

  const counts = useMemo(() => {
    const ids = questions.slice(range.from, range.to + 1).map((x) => x.id)
    const c = { answered: 0, marked: 0, notAnswered: 0, notVisited: 0 }
    for (const id of ids) {
      const a = answers[id]
      if (a?.choice != null) c.answered++
      else if (a?.visited) c.notAnswered++
      else c.notVisited++
      if (a?.marked) c.marked++
    }
    return c
  }, [answers, questions, range.from, range.to])

  const isLastSection = !sections || secState.current === sections.length - 1
  const low = remaining < 60
  const a = answers[q.id] || {}

  const Palette = (
    <div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
        {questions.slice(range.from, range.to + 1).map((x, j) => {
          const i = range.from + j, s = answers[x.id] || {}
          return (
            <button key={x.id} onClick={() => go(i)} aria-label={`Question ${i + 1}`} aria-current={i === idx}
              className={cx('relative h-9 rounded-lg text-xs font-bold tabular-nums transition-colors',
                s.marked ? 'bg-violet-600 text-white' : s.choice != null ? 'bg-emerald-600 text-white' : s.visited ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                i === idx && 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900')}>
              {i + 1}
              {s.marked && s.choice != null && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />}
            </button>
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-600" />Answered ({counts.answered})</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-rose-500" />Not answered ({counts.notAnswered})</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />Not visited ({counts.notVisited})</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-violet-600" />Marked ({counts.marked})</span>
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      <div className="sticky top-[57px] z-20 -mx-4 mb-4 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 dark:border-slate-800 dark:bg-slate-950/95">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{attempt.title}</div>
          {sections && <div className="flex gap-1 pt-1">{sections.map((s, i) => <span key={s.name} className={cx('chip', i === secState.current ? 'bg-brand-600 text-white' : i < secState.current ? 'bg-slate-200 text-slate-500 line-through dark:bg-slate-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>{s.name} · {s.minutes}m</span>)}</div>}
        </div>
        <div className={cx('flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-base font-bold tabular-nums', low ? 'animate-pulse bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800')} role="timer" aria-label="Time remaining">
          <Clock size={16} />{fmtDuration(Math.max(0, remaining))}
        </div>
        <button className="btn-secondary !px-2.5 lg:hidden" onClick={() => setPalette(true)} aria-label="Question palette"><LayoutGrid size={18} /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-white">Question {idx + 1} of {questions.length}</span>
            <SubjectChip subject={q.subject} />
            <span className="chip bg-slate-100 text-slate-500 dark:bg-slate-800">{topicName(q.topic)}</span>
            {a.marked && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">Marked for review</span>}
          </div>
          <QuestionBody q={q} />
          <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Options">
            {q.options.map((o, k) => (
              <button key={k} role="radio" aria-checked={a.choice === k} onClick={() => choose(k)}
                className={cx('flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                  a.choice === k ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700 dark:bg-blue-950 dark:text-blue-200' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')}>
                <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold', a.choice === k ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-600')}>{String.fromCharCode(65 + k)}</span>
                <span className="pt-0.5 whitespace-pre-line">{o}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={() => go(idx - 1)} disabled={idx <= range.from}><ChevronLeft size={16} />Previous</button>
            <button className="btn-secondary" onClick={mark}><Flag size={16} />{a.marked ? 'Unmark' : 'Mark for Review'}</button>
            <button className="btn-ghost" onClick={clear} disabled={a.choice == null}><Eraser size={16} />Clear</button>
            <div className="flex-1" />
            {idx < range.to ? <button className="btn-primary" onClick={() => go(idx + 1)}>Save & Next<ChevronRight size={16} /></button>
              : <button className="btn-success" onClick={() => setConfirm(true)}><Send size={16} />{isLastSection ? 'Submit Test' : 'Finish Section'}</button>}
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className="card sticky top-[120px]">
            <div className="mb-3 text-sm font-bold">Question Navigation</div>
            {Palette}
            <button className="btn-success mt-4 w-full" onClick={() => setConfirm(true)}><Send size={16} />{isLastSection ? 'Submit Test' : `Finish ${sections[secState.current].name}`}</button>
          </div>
        </aside>
      </div>

      <Modal open={palette} onClose={() => setPalette(false)} title="Question Navigation"
        footer={<button className="btn-success" onClick={() => { setPalette(false); setConfirm(true) }}><Send size={16} />{isLastSection ? 'Submit Test' : 'Finish Section'}</button>}>
        {Palette}
      </Modal>
      <Modal open={confirm} onClose={() => setConfirm(false)} title={isLastSection ? 'Submit test?' : `Finish ${sections[secState.current].name}?`}
        footer={<><button className="btn-secondary" onClick={() => setConfirm(false)}>Keep working</button>
          <button className="btn-success" onClick={() => (isLastSection ? doSubmit(false) : nextSection())}>{isLastSection ? 'Yes, submit' : 'Yes, go to next section'}</button></>}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950"><div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{counts.answered}</div>Answered</div>
          <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950"><div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{counts.notAnswered + counts.notVisited}</div>Unanswered</div>
          <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-950"><div className="text-2xl font-bold text-violet-700 dark:text-violet-300">{counts.marked}</div>Marked for review</div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><div className="text-2xl font-bold">{fmtDuration(Math.max(0, remaining))}</div>Time left</div>
        </div>
        {!isLastSection && <p className="muted mt-3">You cannot return to this section after moving on — just like the real exam.</p>}
        {attempt.negative > 0 && <p className="muted mt-3">Negative marking: −{attempt.negative} for each wrong answer.</p>}
      </Modal>
    </div>
  )
}
