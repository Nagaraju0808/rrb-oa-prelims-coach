import { guideFor } from '../lib/guides/index.js'
import { cx } from './ui.jsx'

/** Concept section of a topic guide. */
export function ConceptView({ topic }) {
  const g = guideFor(topic)
  return (
    <div className="space-y-3 text-sm">
      <p className="leading-relaxed">{g.concept}</p>
      {topic?.subtopics?.length > 0 && (
        <div><div className="mb-1 text-xs font-bold text-slate-500 uppercase">Sub-topics</div>
          <div className="flex flex-wrap gap-1.5">{topic.subtopics.map((x) => <span key={x} className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{x}</span>)}</div></div>
      )}
      {topic?.notes?.length > 0 && (
        <div><div className="mb-1 text-xs font-bold text-slate-500 uppercase">Key points</div>
          <ul className="list-disc space-y-1 pl-5">{topic.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>
      )}
    </div>
  )
}

/** Shortcuts / tricks as scannable cards. Falls back to the Quick Approach when a topic has no genuine shortcut. */
export function ShortcutsView({ topic, compact = false }) {
  const g = guideFor(topic)
  if (!g.shortcuts.length) {
    return (
      <div className="text-sm">
        <p className="mb-2 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">This topic has no reliable shortcut — use the quick approach below.</p>
        <QuickView topic={topic} />
      </div>
    )
  }
  const items = compact ? g.shortcuts.slice(0, 3) : g.shortcuts
  return (
    <div className={cx('grid gap-2', !compact && 'sm:grid-cols-2')}>
      {items.map(([title, detail], i) => (
        <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <div className="mb-0.5 flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200"><span aria-hidden>💡</span>{title}</div>
          <div className="leading-relaxed text-slate-700 dark:text-slate-300">{detail}</div>
        </div>
      ))}
    </div>
  )
}

/** Important formulas / rules + common traps. */
export function RulesView({ topic }) {
  const g = guideFor(topic)
  return (
    <div className="space-y-3 text-sm">
      {g.formulas.length > 0 && (
        <ul className="space-y-1.5">{g.formulas.map((f, i) => (
          <li key={i} className="rounded-lg bg-blue-50 px-3 py-2 font-medium text-slate-800 dark:bg-blue-950/40 dark:text-slate-100">📌 {f}</li>))}</ul>
      )}
      {g.traps.length > 0 && (
        <div><div className="mb-1 text-xs font-bold text-rose-600 uppercase">Common traps</div>
          <ul className="space-y-1">{g.traps.map((t, i) => <li key={i} className="flex gap-2"><span aria-hidden>⚠️</span>{t}</li>)}</ul></div>
      )}
      <QuickView topic={topic} />
    </div>
  )
}

export function QuickView({ topic }) {
  const g = guideFor(topic)
  if (!g.quick.length) return null
  return (
    <div><div className="mb-1 text-xs font-bold text-slate-500 uppercase">Quick approach</div>
      <ol className="space-y-1">{g.quick.map((q, i) => (
        <li key={i} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>{q}</li>))}</ol></div>
  )
}
