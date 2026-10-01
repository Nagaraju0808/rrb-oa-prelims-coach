// Deterministic RNG so a generated question can be re-created from its id (topic + seed + difficulty).
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed) {
  const next = mulberry32(seed)
  const r = {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
    sample: (arr, n) => r.shuffle(arr).slice(0, n),
  }
  return r
}

export const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b))
export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b)

export function fmt(n) {
  if (typeof n === 'string') return n
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 100) / 100)
}

export function ratioStr(a, b) {
  const g = gcd(a, b)
  return `${a / g} : ${b / g}`
}

/** Numeric distractors close to the answer. */
export function numOptions(r, ans, { step, suffix = '', prefix = '', allowNegative = false } = {}) {
  const base = Math.abs(ans)
  const s = step ?? Math.max(1, Math.round(base * 0.08))
  const seen = new Set([fmt(ans)])
  const wrong = []
  const ks = r.shuffle([-3, -2, -1, 1, 2, 3, 4, -4, 5])
  for (const k of ks) {
    const v = ans + k * s
    if (!allowNegative && v <= 0) continue
    const f = fmt(v)
    if (seen.has(f)) continue
    seen.add(f)
    wrong.push(prefix + f + suffix)
    if (wrong.length === 3) break
  }
  let k = 6
  while (wrong.length < 3) {
    const f = fmt(ans + k++ * s)
    if (!seen.has(f)) { seen.add(f); wrong.push(prefix + f + suffix) }
  }
  return { correct: prefix + fmt(ans) + suffix, wrong }
}
