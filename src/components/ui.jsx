import { useEffect } from 'react'
import { X } from 'lucide-react'

export const cx = (...a) => a.filter(Boolean).join(' ')

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function ProgressBar({ value, className = '', color = 'bg-brand-600', label }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <div className={className}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

export function Ring({ value, size = 88, stroke = 9, label, sub, color = '#2563eb' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-slate-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={color} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div className="absolute text-center leading-tight">
        <div className="text-lg font-bold text-slate-900 dark:text-white">{label ?? `${Math.round(v)}%`}</div>
        {sub && <div className="text-[10px] font-medium text-slate-500 uppercase">{sub}</div>}
      </div>
    </div>
  )
}

export function Stat({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = { brand: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300', sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' }
  return (
    <div className="card flex items-center gap-3 !p-4">
      {Icon && <div className={cx('rounded-xl p-2.5', tones[tone])}><Icon size={20} /></div>}
      <div className="min-w-0">
        <div className="text-[11px] leading-tight font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{label}</div>
        <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
        {sub && <div className="truncate text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  )
}

const STATUS = {
  not_started: ['Not Started', 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'],
  in_progress: ['In Progress', 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'],
  paused: ['Paused', 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'],
  completed: ['Completed', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'],
  missed: ['Missed', 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'],
  partial: ['Partial', 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'],
  upcoming: ['Upcoming', 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'],
  today: ['Today', 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'],
  weak: ['Weak', 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'],
  strong: ['Strong', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'],
  average: ['Average', 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'],
  new: ['Not enough data', 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'],
  pending: ['Pending', 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'],
  done: ['Done', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'],
}
export function StatusBadge({ status, label }) {
  const [l, c] = STATUS[status] || [status, STATUS.not_started[1]]
  return <span className={cx('chip', c)}>{label || l}</span>
}

export function SubjectChip({ subject }) {
  if (subject === 'reasoning') return <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">🧠 Reasoning</span>
  if (subject === 'numerical') return <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">🔢 Numerical</span>
  return <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">🎯 Mixed</span>
}

export function Modal({ open, onClose, title, children, wide = false, footer }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('fade-in flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-slate-900', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="h2">{title}</h2>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}

export function Empty({ icon = '📭', title, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-semibold text-slate-800 dark:text-slate-100">{title}</div>
      {children && <div className="muted max-w-md">{children}</div>}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors', value === t.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')}>
          {t.label}{t.count != null && <span className="ml-1.5 text-xs opacity-70">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className={cx('flex cursor-pointer items-center justify-between gap-3 py-2', disabled && 'opacity-50')}>
      <span className="text-sm font-medium">{label}</span>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700')}>
        <span className={cx('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </label>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button type="button" key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={cx('rounded-xl border px-3 py-2 text-sm font-semibold transition-colors', value === o.value ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-blue-950 dark:text-blue-300' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const accColor = (a) => (a >= 85 ? 'text-emerald-600 dark:text-emerald-400' : a >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')
export const accBar = (a) => (a >= 85 ? 'bg-emerald-500' : a >= 70 ? 'bg-amber-500' : 'bg-rose-500')
