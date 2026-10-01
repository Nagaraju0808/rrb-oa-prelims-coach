// All dates are handled as local "YYYY-MM-DD" strings to avoid timezone drift.

export const pad = (n) => String(n).padStart(2, '0')

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, n) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const isSunday = (iso) => parseISO(iso).getDay() === 0

export function diffDays(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 86400000)
}

// Clock with a test hook: in development builds, window.__RRB_NOW__ (ISO datetime) overrides "now".
export function now() {
  if (import.meta.env?.DEV && typeof window !== 'undefined' && window.__RRB_NOW__) return new Date(window.__RRB_NOW__)
  return new Date()
}
export const todayISO = () => toISO(now())

export const minutesOfDay = (d = now()) => d.getHours() * 60 + d.getMinutes()

export function fmtTime(mins) {
  const h = Math.floor(mins / 60), m = mins % 60
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`
}

export function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return parseISO(iso).toLocaleDateString('en-IN', opts)
}

export function weekStart(iso) {
  // Monday of the week containing iso (Sunday belongs to the week that just ended).
  const d = parseISO(iso)
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - (dow - 1))
  return toISO(d)
}

export function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec))
  const m = Math.floor(sec / 60), s = sec % 60
  return `${pad(m)}:${pad(s)}`
}
