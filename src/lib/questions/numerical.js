import { fmt, gcd, lcm, numOptions, ratioStr } from './rng.js'

// Each generator: (r, difficulty) => { subtopic, stem, correct, wrong[3], explanation, data? }
const lvl = (d) => (d === 'easy' ? 0 : d === 'medium' ? 1 : 2)
const PCTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75]
const sq = (n) => n * n

function simplification(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['a', 'b'] : L === 1 ? ['b', 'c', 'd'] : ['c', 'd', 'e'])
  if (type === 'a') {
    const a = r.int(12, 35), b = r.int(6, 19), c = r.int(50, 300), e = r.int(20, 150)
    const ans = a * b + c - e
    return { subtopic: 'BODMAS', stem: `${a} × ${b} + ${c} − ${e} = ?`, ...numOptions(r, ans, { step: r.pick([2, 5, 10]) }),
      explanation: `Multiply first: ${a} × ${b} = ${a * b}. Then ${a * b} + ${c} − ${e} = ${ans}.` }
  }
  if (type === 'b') {
    const p = r.pick(PCTS), X = 20 * r.int(5, 60), y = r.int(11, 29), z = r.int(30, 200)
    const ans = (p * X) / 100 + y * y - z
    return { subtopic: 'Percentage-Based Calculations', stem: `${p}% of ${X} + ${y}² − ${z} = ?`, ...numOptions(r, ans, { step: r.pick([3, 5, 10]) }),
      explanation: `${p}% of ${X} = ${(p * X) / 100}; ${y}² = ${y * y}. So ${(p * X) / 100} + ${y * y} − ${z} = ${ans}.` }
  }
  if (type === 'c') {
    const s = r.int(12, 35), a = r.int(4, 15), c = r.int(4, 16), q = r.int(5, 25), b = c * q
    const ans = s * a + q
    return { subtopic: 'Square/Square Root', stem: `√${s * s} × ${a} + ${b} ÷ ${c} = ?`, ...numOptions(r, ans, { step: r.pick([2, 4, 5]) }),
      explanation: `√${s * s} = ${s}; ${s} × ${a} = ${s * a}; ${b} ÷ ${c} = ${q}. Total = ${ans}.` }
  }
  if (type === 'd') {
    const den = r.pick([3, 4, 5, 7, 8]), num = r.pick([...Array(den - 1).keys()].map((k) => k + 1).filter((k) => gcd(k, den) === 1)), X = den * r.int(10, 60), c = r.int(4, 12), q = r.int(20, 150)
    const res = (num * X) / den + c ** 3 - q
    return { subtopic: 'Fractions', stem: `${num}/${den} of ${X} + ${c}³ − ? = ${res}`, ...numOptions(r, q, { step: r.pick([3, 5, 7]) }),
      explanation: `${num}/${den} × ${X} = ${(num * X) / den}; ${c}³ = ${c ** 3}. So ? = ${(num * X) / den} + ${c ** 3} − ${res} = ${q}.` }
  }
  // e: find the missing square
  const k = r.int(8, 30), p = r.pick(PCTS), X = 20 * r.int(5, 40), m = r.int(10, 80)
  const rhs = k * k + (p * X) / 100 - m
  return { subtopic: 'Square/Square Root', stem: `?² + ${p}% of ${X} − ${m} = ${rhs}`, ...numOptions(r, k, { step: 1 }),
    explanation: `?² = ${rhs} − ${(p * X) / 100} + ${m} = ${k * k}, so ? = ${k}.` }
}

const jitter = (r, n) => (n + (r.chance(0.5) ? 1 : -1) * r.int(1, 19) / 100).toFixed(2)

function approximation(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['a', 'b'] : ['a', 'b', 'c'])
  let ans, stem, exp
  if (type === 'a') {
    const p = r.pick(PCTS), X = 20 * r.int(10, 60), a = r.int(11, 30), b = r.int(5, 20), c = r.int(20, 150)
    ans = (p * X) / 100 + a * b - c
    stem = `${jitter(r, p)}% of ${jitter(r, X)} + ${jitter(r, a)} × ${jitter(r, b)} − ${jitter(r, c)} ≈ ?`
    exp = `Round: ${p}% of ${X} = ${(p * X) / 100}; ${a} × ${b} = ${a * b}; ${(p * X) / 100} + ${a * b} − ${c} ≈ ${ans}.`
  } else if (type === 'b') {
    const s = r.int(11, 30), a = r.int(5, 20), B = r.int(5, 15), q = r.int(8, 30), C = B * q
    ans = s * a + q
    stem = `√${s * s + r.pick([-2, -1, 1, 2])} × ${jitter(r, a)} + ${jitter(r, C)} ÷ ${jitter(r, B)} ≈ ?`
    exp = `√${s * s} ≈ ${s}; ${s} × ${a} = ${s * a}; ${C} ÷ ${B} = ${q}. Total ≈ ${ans}.`
  } else {
    const y = r.int(12, 32), den = r.pick([4, 5, 8]), X = den * r.int(20, 80), c = r.int(50, 300)
    ans = y * y + X / den - c
    stem = `${jitter(r, y)}² + ${jitter(r, X)} ÷ ${den}.0${r.int(1, 9)} − ${jitter(r, c)} ≈ ?`
    exp = `${y}² = ${y * y}; ${X} ÷ ${den} = ${X / den}; ${y * y} + ${X / den} − ${c} ≈ ${ans}.`
  }
  return { subtopic: 'Approximation', stem, ...numOptions(r, ans, { step: Math.max(8, Math.round(Math.abs(ans) * 0.12)) }), explanation: exp }
}

function seriesPattern(r, L) {
  const kinds = L === 0 ? ['ap2', 'mulAdd', 'sq'] : L === 1 ? ['ap2', 'mulAdd', 'sq', 'alt', 'mulInc'] : ['mulAdd', 'sq', 'alt', 'mulInc', 'cube', 'half']
  const kind = r.pick(kinds)
  const n = 7
  let s = [], desc
  if (kind === 'ap2') {
    let x = r.int(5, 60), dd = r.int(2, 9), k = r.int(1, 6)
    s.push(x)
    for (let i = 0; i < n - 1; i++) { x += dd + i * k; s.push(x) }
    desc = `Differences increase by ${k}: +${dd}, +${dd + k}, +${dd + 2 * k}, …`
  } else if (kind === 'mulAdd') {
    const m = r.pick([2, 2, 3]), c = r.pick([-2, -1, 1, 2, 3]); let x = r.int(2, 9)
    s.push(x)
    for (let i = 0; i < n - 1; i++) { x = x * m + c; s.push(x) }
    s = s.slice(0, m === 3 ? 6 : 7)
    desc = `Each term = previous × ${m} ${c >= 0 ? '+' : '−'} ${Math.abs(c)}.`
  } else if (kind === 'sq') {
    let x = r.int(3, 40); const o = r.int(1, 4)
    s.push(x)
    for (let i = 0; i < n - 1; i++) { x += sq(i + o); s.push(x) }
    desc = `Differences are consecutive squares: ${o}², ${o + 1}², ${o + 2}², …`
  } else if (kind === 'alt') {
    let x = r.int(4, 20); const a = r.int(3, 12), m = r.pick([2, 3])
    s.push(x)
    for (let i = 0; i < n - 1; i++) { x = i % 2 === 0 ? x + a : x * m; s.push(x) }
    s = s.slice(0, 7)
    desc = `Alternating operations: +${a}, ×${m}, +${a}, ×${m}, …`
  } else if (kind === 'mulInc') {
    let x = r.int(1, 5)
    s.push(x)
    for (let i = 1; i <= 5; i++) { x *= i; s.push(x) }
    desc = 'Multiply by 1, 2, 3, 4, 5 successively.'
  } else if (kind === 'cube') {
    let x = r.int(2, 20)
    s.push(x)
    for (let i = 1; i <= 5; i++) { x += i ** 3; s.push(x) }
    desc = 'Differences are cubes: 1³, 2³, 3³, 4³, 5³.'
  } else {
    let x = 8 * r.int(2, 12)
    s.push(x)
    const ms = [0.5, 1, 1.5, 2, 2.5]
    for (const m of ms) { x *= m; s.push(x) }
    desc = 'Multiply by 0.5, 1, 1.5, 2, 2.5 successively.'
  }
  return { s, desc }
}

function numberSeries(r, d) {
  const L = lvl(d)
  const { s, desc } = seriesPattern(r, L)
  if (L === 2 && r.chance(0.5)) {
    const idx = r.int(1, s.length - 2)
    const wrongVal = s[idx] + r.pick([-3, -2, -1, 1, 2, 3, 4]) * Math.max(1, Math.round(Math.abs(s[idx]) * 0.02))
    const shown = [...s]; shown[idx] = wrongVal
    const others = r.sample(shown.filter((_, i) => i !== idx), 3)
    return { subtopic: 'Wrong Number Series', stem: `Find the wrong number in the series:\n${shown.join(', ')}`,
      correct: String(wrongVal), wrong: others.map(String), explanation: `${desc} The correct term is ${s[idx]}, not ${wrongVal}.` }
  }
  const idx = L === 0 ? s.length - 1 : r.int(1, s.length - 1)
  const shown = s.map((v, i) => (i === idx ? '?' : v))
  return { subtopic: 'Missing Number Series', stem: `What should come in place of the question mark (?)\n${shown.join(', ')}`,
    ...numOptions(r, s[idx], { step: Math.max(1, Math.round(Math.abs(s[idx]) * 0.04)) }), explanation: `${desc} So ? = ${s[idx]}.` }
}

function quadTerm(coef, v, first) {
  if (coef === 0) return ''
  const sign = coef < 0 ? ' − ' : first ? '' : ' + '
  const a = Math.abs(coef)
  return `${sign}${a === 1 && v ? '' : a}${v}`
}
function quadStr(v, a, b, c) {
  return `${quadTerm(a, v + '²', true)}${quadTerm(b, v, false)}${quadTerm(c, '', false)} = 0`
}
const REL = ['x > y', 'x < y', 'x ≥ y', 'x ≤ y', 'x = y or relationship cannot be established']
function quadratic(r, d) {
  const L = lvl(d)
  const roots = () => {
    const a = r.int(-12, 12) || 3, b = r.int(-12, 12) || -4
    return [a, b]
  }
  let x = roots(), y = roots()
  // Bias towards establishable relationships (as in real papers).
  if (r.chance(0.6)) {
    const shift = r.int(1, 8) * (r.chance(0.5) ? 1 : -1)
    const base = Math.min(...x)
    y = shift > 0 ? [Math.max(...x) + shift, Math.max(...x) + shift + r.int(0, 6)] : [base + shift, base + shift - r.int(0, 6)]
    if (r.chance(0.2)) y[0] = shift > 0 ? Math.max(...x) : base
  }
  let eqX, eqY
  if (L === 2) {
    const p = r.pick([-9, -7, -5, -3, 3, 5, 7, 9]), q = x[1]
    x = [p / 2, q]
    eqX = quadStr('x', 2, -(p + 2 * q), p * q)
  } else eqX = quadStr('x', 1, -(x[0] + x[1]), x[0] * x[1])
  eqY = quadStr('y', 1, -(y[0] + y[1]), y[0] * y[1])
  const pairs = x.flatMap((a) => y.map((b) => Math.sign(a - b)))
  let ans
  if (pairs.every((s) => s > 0)) ans = 'x > y'
  else if (pairs.every((s) => s < 0)) ans = 'x < y'
  else if (pairs.every((s) => s >= 0)) ans = 'x ≥ y'
  else if (pairs.every((s) => s <= 0)) ans = 'x ≤ y'
  else ans = REL[4]
  const wrong = r.sample(REL.filter((z) => z !== ans), 3)
  const fx = x.map(fmt).join(', '), fy = y.map(fmt).join(', ')
  return { subtopic: 'Comparing roots of x and y', stem: `Solve the equations and find the relationship between x and y.\nI. ${eqX}\nII. ${eqY}`,
    correct: ans, wrong, explanation: `Roots of I: x = ${fx}. Roots of II: y = ${fy}. Comparing every pair gives: ${ans}.` }
}

function numberSystem(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['lcm', 'hcf', 'unit'] : ['lcm', 'hcf', 'unit', 'rem', 'lcmrem'])
  if (type === 'lcm' || type === 'hcf') {
    const g = r.int(2, 12), a = g * r.int(2, 9), b = g * r.int(2, 9)
    const ans = type === 'lcm' ? lcm(a, b) : gcd(a, b)
    return { subtopic: 'LCM & HCF', stem: `What is the ${type.toUpperCase()} of ${a} and ${b}?`, ...numOptions(r, ans, { step: type === 'lcm' ? gcd(a, b) : 1 }),
      explanation: `HCF(${a}, ${b}) = ${gcd(a, b)}; LCM = ${a} × ${b} ÷ HCF = ${lcm(a, b)}.` }
  }
  if (type === 'unit') {
    const base = r.int(12, 99), e = r.int(20, 150)
    const cyc = []; let u = base % 10
    for (let i = 1; i <= 4; i++) cyc.push(Number(BigInt(u) ** BigInt(i) % 10n))
    const ans = cyc[(e - 1) % 4]
    const wrong = r.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((z) => z !== ans), 3).map(String)
    return { subtopic: 'Unit Digit', stem: `What is the unit digit of ${base}^${e}?`, correct: String(ans), wrong,
      explanation: `Unit digit of ${u}^n cycles as ${cyc.join(', ')}. ${e} mod 4 = ${e % 4 || 4} → unit digit ${ans}.` }
  }
  if (type === 'rem') {
    const dv = r.int(7, 19), q = r.int(20, 300), rem = r.int(1, dv - 1), N = dv * q + rem
    return { subtopic: 'Remainders', stem: `What is the remainder when ${N} is divided by ${dv}?`, correct: String(rem),
      wrong: r.sample([...Array(dv).keys()].filter((z) => z !== rem), 3).map(String), explanation: `${dv} × ${q} = ${dv * q}; ${N} − ${dv * q} = ${rem}.` }
  }
  const set = r.pick([[4, 6, 8], [6, 9, 12], [5, 6, 8], [8, 12, 16], [10, 12, 15], [6, 8, 10]]), rem = r.int(1, 3)
  const L2 = set.reduce(lcm)
  return { subtopic: 'LCM & HCF', stem: `What is the smallest number which, when divided by ${set.join(', ')}, leaves remainder ${rem} in each case?`,
    ...numOptions(r, L2 + rem, { step: r.pick([2, 6, 12]) }), explanation: `LCM(${set.join(', ')}) = ${L2}. Required number = ${L2} + ${rem} = ${L2 + rem}.` }
}

function percentage(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['of', 'find', 'inc'] : ['less', 'succ', 'pass', 'find', 'pop'])
  if (type === 'of') {
    const p = r.pick(PCTS), X = 20 * r.int(5, 80)
    return { subtopic: 'Basic Percentage', stem: `What is ${p}% of ${X}?`, ...numOptions(r, (p * X) / 100), explanation: `${p}/100 × ${X} = ${(p * X) / 100}.` }
  }
  if (type === 'find') {
    const p = r.pick([10, 20, 25, 40, 50, 75]), N = 20 * r.int(5, 60), y = (p * N) / 100
    return { subtopic: 'Basic Percentage', stem: `${p}% of a number is ${y}. What is the number?`, ...numOptions(r, N, { step: 20 }),
      explanation: `Number = ${y} × 100 / ${p} = ${N}.` }
  }
  if (type === 'inc') {
    const P = 100 * r.int(2, 20), p = r.pick([10, 20, 25, 30, 40]), ans = (P * (100 + p)) / 100
    return { subtopic: 'Percentage Increase/Decrease', stem: `The price of an article is ₹${P}. If it increases by ${p}%, what is the new price (in ₹)?`,
      ...numOptions(r, ans), explanation: `New price = ${P} × ${100 + p}/100 = ${ans}.` }
  }
  if (type === 'less') {
    const p = r.pick([20, 25, 50, 60, 100, 150]), ans = (p * 100) / (100 + p)
    return { subtopic: 'Comparison Using Percentage', stem: `A's salary is ${p}% more than B's salary. By what percent is B's salary less than A's salary?`,
      ...numOptions(r, ans, { step: 4, suffix: '%' }), explanation: `Required % = ${p}/(100 + ${p}) × 100 = ${fmt(ans)}%.` }
  }
  if (type === 'succ') {
    const a = r.pick([10, 20, 25, 30]), b = r.pick([10, 20, -10, -20]), ans = a + b + (a * b) / 100
    return { subtopic: 'Successive Percentage', stem: `A number is first ${a > 0 ? 'increased' : 'decreased'} by ${Math.abs(a)}% and then ${b > 0 ? 'increased' : 'decreased'} by ${Math.abs(b)}%. What is the net percentage change?`,
      ...numOptions(r, ans, { step: 2, suffix: '%', allowNegative: true }),
      explanation: `Net change = a + b + ab/100 = ${a} + (${b}) + (${a} × ${b})/100 = ${fmt(ans)}% (${ans >= 0 ? 'increase' : 'decrease'}).` }
  }
  if (type === 'pass') {
    const M = 50 * r.int(4, 16), q = r.pick([33, 35, 40, 45]), p = q - r.pick([5, 8, 10, 12]), m = (M * (q - p)) / 100
    if (!Number.isInteger(m)) return percentage(r, d)
    return { subtopic: 'Basic Percentage', stem: `A student scores ${p}% marks and fails by ${m} marks. The pass mark is ${q}%. What are the maximum marks?`,
      ...numOptions(r, M, { step: 50 }), explanation: `${q}% − ${p}% = ${q - p}% of maximum = ${m} ⇒ maximum = ${m} × 100/${q - p} = ${M}.` }
  }
  const P = 1000 * r.int(5, 40), p = r.pick([5, 10, 20]), ans = (P * (100 + p) ** 2) / 10000
  return { subtopic: 'Successive Percentage', stem: `The population of a town is ${P}. It increases by ${p}% every year. What will it be after 2 years?`,
    ...numOptions(r, ans, { step: Math.round(P * 0.02) }), explanation: `${P} × (1 + ${p}/100)² = ${ans}.` }
}

function ratio(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['divide', 'combine'] : ['divide', 'combine', 'addk', 'income'])
  if (type === 'divide') {
    const [a, b, c] = [r.int(1, 7), r.int(1, 7), r.int(1, 7)], u = r.int(5, 60) * 10, T = (a + b + c) * u
    return { subtopic: 'Basic Ratio', stem: `₹${T} is divided among A, B and C in the ratio ${a} : ${b} : ${c}. What is B's share (in ₹)?`,
      ...numOptions(r, b * u, { step: u }), explanation: `One part = ${T} ÷ ${a + b + c} = ${u}. B = ${b} × ${u} = ${b * u}.` }
  }
  if (type === 'combine') {
    const a = r.int(2, 7), b = r.int(2, 7), b2 = r.int(2, 7), c = r.int(2, 9)
    const A = a * b2, C = b * c
    const correct = ratioStr(A, C)
    const wrong = [ratioStr(a, c), ratioStr(A + 1, C), ratioStr(C, A)].filter((x) => x !== correct)
    while (wrong.length < 3) wrong.push(ratioStr(A, C + wrong.length + 1))
    return { subtopic: 'Proportion', stem: `If A : B = ${a} : ${b} and B : C = ${b2} : ${c}, what is A : C?`, correct, wrong: [...new Set(wrong)].slice(0, 3),
      explanation: `Make B common: A : B : C = ${a * b2} : ${b * b2} : ${b * c}. So A : C = ${correct}.` }
  }
  if (type === 'addk') {
    const a = r.int(2, 5), b = a + r.int(1, 4), x = r.int(3, 12), k = r.int(2, 10)
    const nr = ratioStr(a * x + k, b * x + k)
    return { subtopic: 'Ratio-Based Word Problems', stem: `Two numbers are in the ratio ${a} : ${b}. If ${k} is added to each, the ratio becomes ${nr}. What is the larger number?`,
      ...numOptions(r, b * x, { step: b }), explanation: `Let numbers be ${a}x and ${b}x. Solving (${a}x + ${k})/(${b}x + ${k}) = ${nr.replace(' : ', '/')} gives x = ${x}. Larger = ${b * x}.` }
  }
  const a = r.int(3, 7), b = r.int(2, 6), e1 = r.int(2, 5), e2 = r.int(2, 5), s = 1000 * r.int(1, 4)
  // incomes a:b, expenditures e1:e2, both save s -> a x - e1 y = s, b x - e2 y = s
  const det = a * -e2 - -e1 * b
  if (det === 0) return ratio(r, d)
  const x = (s * -e2 - -e1 * s) / det, y = (a * s - s * b) / det
  if (!(x > 0 && y > 0 && Number.isInteger(x) && Number.isInteger(y))) return ratio(r, 'medium')
  return { subtopic: 'Ratio-Based Word Problems', stem: `The incomes of A and B are in the ratio ${a} : ${b} and their expenditures are in the ratio ${e1} : ${e2}. If each saves ₹${s}, what is A's income?`,
    ...numOptions(r, a * x, { step: a * 100 }), explanation: `${a}x − ${e1}y = ${s} and ${b}x − ${e2}y = ${s} ⇒ x = ${x}, y = ${y}. A's income = ${a * x}.` }
}

function average(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['simple', 'consec'] : ['remove', 'weighted', 'consec', 'captain'])
  if (type === 'simple') {
    const n = r.int(5, 7), avg = r.int(20, 80), nums = Array.from({ length: n - 1 }, () => avg + r.int(-15, 15))
    nums.push(avg * n - nums.reduce((a, b) => a + b, 0))
    return { subtopic: 'Simple Average', stem: `Find the average of ${nums.join(', ')}.`, ...numOptions(r, avg, { step: 2 }),
      explanation: `Sum = ${avg * n}; average = ${avg * n} ÷ ${n} = ${avg}.` }
  }
  if (type === 'consec') {
    const n = r.pick([5, 7, 9]), A = 2 * r.int(10, 60) + 1, largest = A + (n - 1)
    return { subtopic: 'Average-Based Word Problems', stem: `The average of ${n} consecutive odd numbers is ${A}. What is the largest number?`, ...numOptions(r, largest, { step: 2 }),
      explanation: `Middle number = average = ${A}. Largest = ${A} + 2 × ${(n - 1) / 2} = ${largest}.` }
  }
  if (type === 'remove') {
    const n = r.int(8, 15), A = r.int(30, 70), B = A + r.int(-4, 4) || A - 2, X = n * A - B * (n - 1)
    if (X <= 0) return average(r, d)
    return { subtopic: 'Average-Based Word Problems', stem: `The average of ${n} numbers is ${A}. When one number is removed, the average becomes ${B}. What is the removed number?`,
      ...numOptions(r, X, { step: Math.max(2, Math.round(X * 0.1)) }), explanation: `Removed = ${n} × ${A} − ${n - 1} × ${B} = ${n * A} − ${(n - 1) * B} = ${X}.` }
  }
  if (type === 'weighted') {
    const n1 = r.int(10, 40), n2 = r.int(10, 40), a1 = r.int(40, 70), a2 = r.int(50, 90), ans = (n1 * a1 + n2 * a2) / (n1 + n2)
    return { subtopic: 'Weighted Average', stem: `Section A has ${n1} students with an average of ${a1} marks, and section B has ${n2} students with an average of ${a2} marks. What is the overall average?`,
      ...numOptions(r, ans, { step: 1.5 }), explanation: `(${n1} × ${a1} + ${n2} × ${a2}) ÷ ${n1 + n2} = ${n1 * a1 + n2 * a2} ÷ ${n1 + n2} = ${fmt(ans)}.` }
  }
  const n = r.int(10, 15), A = r.int(20, 28), inc = r.int(1, 3), C = A + inc * (n + 1)
  return { subtopic: 'Average-Based Word Problems', stem: `The average age of ${n} players is ${A} years. When the coach's age is included, the average increases by ${inc}. What is the coach's age?`,
    ...numOptions(r, C, { step: 2 }), explanation: `Coach = new average × ${n + 1} − ${n} × ${A} = ${A + inc} × ${n + 1} − ${n * A} = ${C}.` }
}

function profitLoss(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['sp', 'pct'] : ['mpd', 'more', 'succ', 'pct'])
  if (type === 'sp') {
    const CP = 100 * r.int(2, 30), p = r.pick([10, 15, 20, 25, -10, -20]), SP = (CP * (100 + p)) / 100
    return { subtopic: 'Selling Price', stem: `An article costing ₹${CP} is sold at a ${p > 0 ? 'profit' : 'loss'} of ${Math.abs(p)}%. What is the selling price (in ₹)?`,
      ...numOptions(r, SP), explanation: `SP = ${CP} × ${100 + p}/100 = ${SP}.` }
  }
  if (type === 'pct') {
    const CP = 20 * r.int(5, 50), p = r.pick([5, 10, 12.5, 20, 25, 40]), SP = (CP * (100 + p)) / 100
    if (!Number.isInteger(SP)) return profitLoss(r, 'easy')
    return { subtopic: 'Profit/Loss Percentage', stem: `A shopkeeper buys an item for ₹${CP} and sells it for ₹${SP}. What is the profit percentage?`,
      ...numOptions(r, p, { step: 2.5, suffix: '%' }), explanation: `Profit = ${SP - CP}; profit% = ${SP - CP}/${CP} × 100 = ${p}%.` }
  }
  if (type === 'mpd') {
    const x = r.pick([20, 25, 40, 50, 60]), dd = r.pick([10, 20, 25]), ans = ((100 + x) * (100 - dd)) / 100 - 100
    return { subtopic: 'Discount', stem: `A shopkeeper marks an item ${x}% above its cost price and allows a discount of ${dd}%. What is his profit/loss percentage?`,
      ...numOptions(r, ans, { step: 2, suffix: '%', allowNegative: true }),
      explanation: `Take CP = 100. MP = ${100 + x}; SP = ${100 + x} × ${100 - dd}/100 = ${fmt(((100 + x) * (100 - dd)) / 100)}. ${ans >= 0 ? 'Profit' : 'Loss'} = ${fmt(Math.abs(ans))}%.` }
  }
  if (type === 'more') {
    const CP = 100 * r.int(4, 30), p = r.pick([5, 8, 10, 12]), q = p + r.pick([5, 8, 10]), x = (CP * (q - p)) / 100
    return { subtopic: 'Cost Price', stem: `An article is sold at ${p}% profit. Had it been sold for ₹${x} more, the profit would have been ${q}%. What is the cost price (in ₹)?`,
      ...numOptions(r, CP, { step: 100 }), explanation: `${q - p}% of CP = ${x} ⇒ CP = ${x} × 100/${q - p} = ${CP}.` }
  }
  const a = r.pick([10, 20, 25]), b = r.pick([10, 15, 20]), MP = 100 * r.int(5, 40), SP = (MP * (100 - a) * (100 - b)) / 10000
  return { subtopic: 'Successive Discount', stem: `The marked price of a watch is ₹${MP}. Two successive discounts of ${a}% and ${b}% are given. What is the selling price (in ₹)?`,
    ...numOptions(r, SP, { step: Math.round(MP * 0.03) }), explanation: `SP = ${MP} × ${(100 - a) / 100} × ${(100 - b) / 100} = ${fmt(SP)}.` }
}

function simpleInterest(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['si', 'amt'] : ['rate', 'time', 'principal', 'double'])
  const P = 1000 * r.int(2, 25), R = r.pick([4, 5, 6, 8, 10, 12]), T = r.int(2, 6), SI = (P * R * T) / 100
  if (type === 'si') return { subtopic: 'Simple Interest', stem: `Find the simple interest on ₹${P} at ${R}% per annum for ${T} years.`, ...numOptions(r, SI, { step: Math.round(SI * 0.1) || 50 }), explanation: `SI = ${P} × ${R} × ${T}/100 = ${SI}.` }
  if (type === 'amt') return { subtopic: 'Amount', stem: `What amount will ₹${P} become at ${R}% simple interest per annum after ${T} years?`, ...numOptions(r, P + SI, { step: Math.round(SI * 0.1) || 50 }), explanation: `SI = ${SI}; Amount = ${P} + ${SI} = ${P + SI}.` }
  if (type === 'rate') return { subtopic: 'Rate', stem: `A sum of ₹${P} gives a simple interest of ₹${SI} in ${T} years. What is the rate of interest per annum?`, ...numOptions(r, R, { step: 1, suffix: '%' }), explanation: `R = SI × 100/(P × T) = ${SI * 100}/${P * T} = ${R}%.` }
  if (type === 'time') return { subtopic: 'Time', stem: `In how many years will ₹${P} earn ₹${SI} as simple interest at ${R}% per annum?`, ...numOptions(r, T, { step: 1 }), explanation: `T = SI × 100/(P × R) = ${SI * 100}/${P * R} = ${T} years.` }
  if (type === 'principal') return { subtopic: 'Principal', stem: `A sum amounts to ₹${P + SI} in ${T} years at ${R}% simple interest per annum. Find the sum (in ₹).`, ...numOptions(r, P, { step: 500 }), explanation: `Amount = P(1 + RT/100) = P × ${100 + R * T}/100 ⇒ P = ${P + SI} × 100/${100 + R * T} = ${P}.` }
  const rr = r.pick([5, 8, 10, 12.5, 20, 25])
  return { subtopic: 'Rate', stem: `At what rate of simple interest will a sum double itself in ${100 / rr} years?`, ...numOptions(r, rr, { step: 2.5, suffix: '%' }), explanation: `Doubling ⇒ SI = P ⇒ R × T = 100 ⇒ R = 100/${100 / rr} = ${rr}%.` }
}

function compoundInterest(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['ci2'] : ['ci2', 'diff', 'amt3', 'half'])
  if (type === 'ci2') {
    const P = 1000 * r.int(2, 30), R = r.pick([5, 10, 20]), ci = (P * ((100 + R) ** 2 - 10000)) / 10000
    return { subtopic: 'Compound Interest', stem: `Find the compound interest on ₹${P} at ${R}% per annum for 2 years, compounded annually.`, ...numOptions(r, ci, { step: Math.round(ci * 0.06) }),
      explanation: `A = ${P} × (1 + ${R}/100)² = ${(P * (100 + R) ** 2) / 10000}; CI = A − P = ${fmt(ci)}.` }
  }
  if (type === 'diff') {
    const R = r.pick([4, 5, 8, 10, 12]), P = 100 * r.int(10, 80), dd = (P * R * R) / 10000
    return { subtopic: 'Difference between SI and CI', stem: `What is the difference between compound interest and simple interest on ₹${P} for 2 years at ${R}% per annum?`,
      ...numOptions(r, dd, { step: Math.max(1, Math.round(dd * 0.15)) }), explanation: `Difference = P(R/100)² = ${P} × (${R}/100)² = ${fmt(dd)}.` }
  }
  if (type === 'amt3') {
    const P = 1000 * r.int(1, 20), A = (P * 1331) / 1000
    return { subtopic: 'Amount', stem: `What will ₹${P} amount to in 3 years at 10% per annum compound interest?`, ...numOptions(r, A, { step: Math.round(P * 0.03) }),
      explanation: `A = ${P} × (1.1)³ = ${P} × 1.331 = ${fmt(A)}.` }
  }
  const P = 2000 * r.int(2, 20), R = r.pick([10, 20]), h = R / 2, A = (P * (100 + h) ** 2) / 10000
  return { subtopic: 'Compound Interest', stem: `Find the compound interest on ₹${P} for 1 year at ${R}% per annum, compounded half-yearly.`, ...numOptions(r, A - P, { step: Math.round(P * 0.01) }),
    explanation: `Half-yearly ⇒ rate ${h}% per half-year, 2 periods. A = ${P} × (1 + ${h}/100)² = ${fmt(A)}; CI = ${fmt(A - P)}.` }
}

const WORK_PAIRS = [[10, 15], [12, 24], [20, 30], [12, 36], [6, 12], [15, 30], [18, 36], [20, 60], [24, 40], [30, 45], [40, 60], [28, 21], [10, 40], [36, 45]]
const PIPE_PAIRS = [[10, 15], [12, 20], [20, 30], [6, 10], [8, 12], [15, 20], [12, 18], [9, 12], [10, 30]]
function timeWork(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['together', 'pipes'] : ['together', 'alone', 'pipes', 'wages', 'leaves'])
  const [a, b] = r.pick(WORK_PAIRS)
  const tog = (a * b) / (a + b)
  if (type === 'together') return { subtopic: 'Combined Work', stem: `A can do a piece of work in ${a} days and B can do it in ${b} days. In how many days can they finish it working together?`,
    ...numOptions(r, tog, { step: 2 }), explanation: `Total work = LCM(${a}, ${b}) = ${lcm(a, b)}. Efficiencies: A = ${lcm(a, b) / a}, B = ${lcm(a, b) / b}. Time = ${lcm(a, b)}/${lcm(a, b) / a + lcm(a, b) / b} = ${fmt(tog)} days.` }
  if (type === 'alone') return { subtopic: 'Individual Work', stem: `A and B together can complete a work in ${fmt(tog)} days. A alone can complete it in ${a} days. In how many days can B alone complete it?`,
    ...numOptions(r, b, { step: 3 }), explanation: `B's 1-day work = 1/${fmt(tog)} − 1/${a} = 1/${b}. So B takes ${b} days.` }
  if (type === 'pipes') {
    const [f, e] = r.pick(PIPE_PAIRS), t = (f * e) / (e - f)
    return { subtopic: 'Pipes and Cisterns', stem: `Pipe A can fill a tank in ${f} hours and pipe B can empty it in ${e} hours. If both are opened together, in how many hours will the empty tank be filled?`,
      ...numOptions(r, t, { step: Math.max(2, Math.round(t * 0.15)) }), explanation: `Net rate = 1/${f} − 1/${e} = 1/${fmt(t)}. Time = ${fmt(t)} hours.` }
  }
  if (type === 'wages') {
    const W = (a + b) * 10 * r.int(5, 30), share = (W * b) / (a + b)
    return { subtopic: 'Work and Wages', stem: `A can do a work in ${a} days and B in ${b} days. They complete it together and receive ₹${W}. What is A's share (in ₹)?`,
      ...numOptions(r, share, { step: Math.round(W * 0.05) }), explanation: `Shares are in the ratio of efficiencies 1/${a} : 1/${b} = ${b} : ${a}. A = ${W} × ${b}/${a + b} = ${fmt(share)}.` }
  }
  // A and B work together for x days, then A leaves.
  const T = lcm(a, b), ea = T / a, eb = T / b, x = Math.max(1, Math.floor(tog / 2)), rem = T - x * (ea + eb), t = rem / eb
  return { subtopic: 'Combined Work', stem: `A and B can do a work in ${a} and ${b} days respectively. They work together for ${x} days, after which A leaves. In how many more days will B finish the remaining work?`,
    ...numOptions(r, t, { step: 2 }), explanation: `Total = ${T} units; A = ${ea}/day, B = ${eb}/day. In ${x} days: ${x * (ea + eb)} units. Remaining ${rem} ÷ ${eb} = ${fmt(t)} days.` }
}

function timeDistance(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['basic', 'pole'] : ['pole', 'platform', 'boat', 'relative', 'avg'])
  if (type === 'basic') {
    const s = r.int(30, 90), t = r.int(2, 8)
    return { subtopic: 'Basic Speed/Distance/Time', stem: `A car travels at ${s} km/h for ${t} hours. How much distance (in km) does it cover?`, ...numOptions(r, s * t, { step: 10 }), explanation: `Distance = ${s} × ${t} = ${s * t} km.` }
  }
  const S = 18 * r.int(2, 7), ms = (S * 5) / 18
  if (type === 'pole') {
    const t = r.int(6, 20), Lg = ms * t
    return { subtopic: 'Trains', stem: `A train running at ${S} km/h crosses a pole in ${t} seconds. What is the length of the train (in metres)?`, ...numOptions(r, Lg, { step: 10 }),
      explanation: `${S} km/h = ${S} × 5/18 = ${ms} m/s. Length = ${ms} × ${t} = ${Lg} m.` }
  }
  if (type === 'platform') {
    const t = r.int(15, 40), total = ms * t, Lg = 10 * r.int(8, Math.max(9, Math.floor(total / 20))), P = total - Lg
    if (P <= 0) return timeDistance(r, d)
    return { subtopic: 'Trains', stem: `A ${Lg} m long train running at ${S} km/h crosses a platform in ${t} seconds. What is the length of the platform (in metres)?`,
      ...numOptions(r, P, { step: 10 }), explanation: `Speed = ${ms} m/s; distance in ${t} s = ${total} m = train + platform. Platform = ${total} − ${Lg} = ${P} m.` }
  }
  if (type === 'boat') {
    const B = r.int(8, 20), s = r.int(2, Math.min(6, B - 2)), D = (B + s) * (B - s) * r.int(1, 2)
    const t1 = D / (B + s), t2 = D / (B - s)
    return { subtopic: 'Boats and Streams', stem: `A boat covers ${D} km downstream in ${t1} hours and the same distance upstream in ${t2} hours. What is the speed of the boat in still water (km/h)?`,
      ...numOptions(r, B, { step: 1 }), explanation: `Downstream = ${D}/${t1} = ${B + s}; upstream = ${D}/${t2} = ${B - s}. Boat = (${B + s} + ${B - s})/2 = ${B} km/h.` }
  }
  if (type === 'relative') {
    const s1 = 18 * r.int(2, 4), s2 = 18 * r.int(1, 3), l1 = 10 * r.int(10, 25), l2 = 10 * r.int(10, 25), rel = ((s1 + s2) * 5) / 18, t = (l1 + l2) / rel
    return { subtopic: 'Relative Speed', stem: `Two trains of lengths ${l1} m and ${l2} m run in opposite directions at ${s1} km/h and ${s2} km/h. How long (in seconds) will they take to cross each other?`,
      ...numOptions(r, t, { step: 2 }), explanation: `Relative speed = ${s1 + s2} km/h = ${fmt(rel)} m/s. Time = (${l1} + ${l2})/${fmt(rel)} = ${fmt(t)} s.` }
  }
  const [x, y] = r.pick([[40, 60], [30, 60], [60, 90], [20, 30], [45, 90], [36, 45]]), avg = (2 * x * y) / (x + y)
  return { subtopic: 'Basic Speed/Distance/Time', stem: `A person goes from A to B at ${x} km/h and returns at ${y} km/h. What is the average speed for the whole journey (km/h)?`,
    ...numOptions(r, avg, { step: 3 }), explanation: `Average speed = 2xy/(x + y) = 2 × ${x} × ${y}/${x + y} = ${fmt(avg)} km/h.` }
}

function ages(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['ratio'] : ['ratio', 'times', 'sum'])
  if (type === 'ratio') {
    const a = r.int(2, 5), b = a + r.int(1, 4), x = r.int(3, 9), n = r.int(3, 10)
    return { subtopic: 'Age Ratios', stem: `The present ages of A and B are in the ratio ${a} : ${b}. After ${n} years, the ratio will be ${ratioStr(a * x + n, b * x + n)}. What is B's present age (in years)?`,
      ...numOptions(r, b * x, { step: b }), explanation: `Let ages be ${a}x and ${b}x. (${a}x + ${n})/(${b}x + ${n}) = ${ratioStr(a * x + n, b * x + n).replace(' : ', '/')} ⇒ x = ${x}. B = ${b * x} years.` }
  }
  if (type === 'times') {
    const son = r.int(8, 20), k = r.pick([2, 3, 4]), n = r.int(3, 8), sonPast = son - n, fatherPast = k * sonPast, father = fatherPast + n
    if (sonPast <= 1) return ages(r, d)
    return { subtopic: 'Past Age', stem: `The sum of the present ages of a father and his son is ${father + son} years. ${n} years ago, the father's age was ${k} times the son's age. What is the son's present age?`,
      ...numOptions(r, son, { step: 2 }), explanation: `${n} years ago the sum was ${father + son - 2 * n} = ${k + 1} × son's age then ⇒ son was ${sonPast}. Present = ${son} years.` }
  }
  const a = r.int(20, 40), b = a - r.int(3, 12), c = r.int(5, 15)
  return { subtopic: 'Future Age', stem: `The average age of A and B is ${(a + b) / 2} years and A is ${a - b} years older than B. What will be B's age after ${c} years?`,
    ...numOptions(r, b + c, { step: 2 }), explanation: `A + B = ${a + b}, A − B = ${a - b} ⇒ B = ${b}. After ${c} years: ${b + c}.` }
}

function mixture(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['add'] : ['add', 'allig', 'replace'])
  if (type === 'add') {
    const a = r.int(3, 7), b = r.int(1, 3), k = r.int(4, 12), V = (a + b) * k, c = a, dd = b + r.int(1, 3), w = (a * k * dd) / c - b * k
    if (!Number.isInteger(w) || w <= 0) return mixture(r, 'medium')
    return { subtopic: 'Basic Mixtures', stem: `A ${V}-litre mixture contains milk and water in the ratio ${a} : ${b}. How much water (in litres) must be added to make the ratio ${ratioStr(c, dd)}?`,
      ...numOptions(r, w, { step: 2 }), explanation: `Milk = ${a * k} L, water = ${b * k} L. Required water = ${a * k} × ${dd}/${c} = ${(a * k * dd) / c} L. Add ${w} L.` }
  }
  if (type === 'allig') {
    const p = r.int(20, 40), q = p + r.int(10, 30), m = r.int(p + 2, q - 2)
    const correct = ratioStr(q - m, m - p), wrong = [...new Set([ratioStr(m - p, q - m), ratioStr(q - m + 1, m - p), ratioStr(q - p, m - p)].filter((x) => x !== correct))]
    while (wrong.length < 3) wrong.push(ratioStr(q - m, m - p + wrong.length + 2))
    return { subtopic: 'Alligation', stem: `In what ratio must rice at ₹${p}/kg be mixed with rice at ₹${q}/kg so that the mixture costs ₹${m}/kg?`, correct, wrong: wrong.slice(0, 3),
      explanation: `Alligation: (${q} − ${m}) : (${m} − ${p}) = ${q - m} : ${m - p} = ${correct}.` }
  }
  const V = r.pick([40, 50, 60, 80, 100]), x = r.pick([5, 10, 20].filter((z) => z < V / 2)), ans = V * ((V - x) / V) ** 2
  return { subtopic: 'Replacement Problems', stem: `A vessel contains ${V} litres of milk. ${x} litres are removed and replaced with water. This is done once more. How much milk (in litres) is left?`,
    ...numOptions(r, ans, { step: 2.5 }), explanation: `Milk = ${V} × (1 − ${x}/${V})² = ${fmt(ans)} L.` }
}

function partnership(r, d) {
  const L = lvl(d)
  const A = 1000 * r.int(2, 12), B = 1000 * r.int(2, 12), mA = 12, mB = L === 0 ? 12 : r.int(4, 11)
  const wa = A * mA, wb = B * mB, g = gcd(wa, wb), parts = wa / g + wb / g, P = parts * 100 * r.int(1, 8), bs = (P * (wb / g)) / parts
  return { subtopic: L === 0 ? 'Investment Ratio' : 'Time-Based Investment',
    stem: L === 0 ? `A and B invest ₹${A} and ₹${B} in a business for a year. Out of a profit of ₹${P}, what is B's share (in ₹)?`
      : `A starts a business with ₹${A}. After ${12 - mB} months, B joins with ₹${B}. At the end of the year, the profit is ₹${P}. What is B's share (in ₹)?`,
    ...numOptions(r, bs, { step: Math.round(P * 0.05) || 100 }), explanation: `Ratio = ${A} × ${mA} : ${B} × ${mB} = ${wa / g} : ${wb / g}. B's share = ${P} × ${wb / g}/${parts} = ${fmt(bs)}.` }
}

const DI_LABELS = [['2019', '2020', '2021', '2022', '2023'], ['P', 'Q', 'R', 'S', 'T'], ['Jan', 'Feb', 'Mar', 'Apr', 'May']]
function dataInterpretation(r, d) {
  const L = lvl(d)
  const labels = r.pick(DI_LABELS), cols = ['Laptops sold', 'Mobiles sold']
  const rows = labels.map((l) => [l, 10 * r.int(12, 60), 10 * r.int(12, 60)])
  const kind = r.chance(0.5) ? 'bar' : 'table'
  const data = { type: kind, caption: 'Units sold by a store', headers: ['', ...cols], rows }
  const type = r.pick(L === 0 ? ['sum', 'diff'] : ['ratio', 'avg', 'pct', 'pctInc'])
  const [i, j] = r.sample([0, 1, 2, 3, 4], 2)
  const ri = rows[i], rj = rows[j]
  if (type === 'sum') return { subtopic: kind === 'bar' ? 'Bar Graph' : 'Table DI', data, stem: `What is the total number of laptops and mobiles sold in ${ri[0]}?`, ...numOptions(r, ri[1] + ri[2], { step: 10 }), explanation: `${ri[1]} + ${ri[2]} = ${ri[1] + ri[2]}.` }
  if (type === 'diff') return { subtopic: kind === 'bar' ? 'Bar Graph' : 'Table DI', data, stem: `What is the difference between mobiles sold in ${ri[0]} and laptops sold in ${rj[0]}?`, ...numOptions(r, Math.abs(ri[2] - rj[1]) || 10, { step: 10 }), explanation: `|${ri[2]} − ${rj[1]}| = ${Math.abs(ri[2] - rj[1])}.` }
  if (type === 'ratio') {
    const correct = ratioStr(ri[1] + ri[2], rj[1] + rj[2]), wrong = [...new Set([ratioStr(rj[1] + rj[2], ri[1] + ri[2]), ratioStr(ri[1], rj[1]), ratioStr(ri[2], rj[2]), ratioStr(ri[1] + ri[2] + 10, rj[1] + rj[2])].filter((x) => x !== correct))].slice(0, 3)
    return { subtopic: kind === 'bar' ? 'Bar Graph' : 'Table DI', data, stem: `What is the ratio of total units sold in ${ri[0]} to total units sold in ${rj[0]}?`, correct, wrong,
      explanation: `${ri[0]}: ${ri[1] + ri[2]}; ${rj[0]}: ${rj[1] + rj[2]}. Ratio = ${correct}.` }
  }
  if (type === 'avg') {
    const avg = rows.reduce((s, x) => s + x[1], 0) / 5
    return { subtopic: 'Basic Comparison DI', data, stem: 'What is the average number of laptops sold per period?', ...numOptions(r, avg, { step: 6 }), explanation: `Sum of laptops = ${rows.reduce((s, x) => s + x[1], 0)}; ÷ 5 = ${fmt(avg)}.` }
  }
  if (type === 'pct') {
    const p = (ri[1] / ri[2]) * 100
    return { subtopic: 'Basic Comparison DI', data, stem: `Laptops sold in ${ri[0]} are what percent of mobiles sold in ${ri[0]}?`, ...numOptions(r, Math.round(p * 100) / 100, { step: 7, suffix: '%' }), explanation: `${ri[1]}/${ri[2]} × 100 = ${fmt(p)}%.` }
  }
  const a = ri[2], b = rj[2], p = ((b - a) / a) * 100
  return { subtopic: 'Basic Comparison DI', data, stem: `What is the percentage change in mobiles sold from ${ri[0]} to ${rj[0]}?`, ...numOptions(r, Math.round(p * 100) / 100, { step: 6, suffix: '%', allowNegative: true }),
    explanation: `(${b} − ${a})/${a} × 100 = ${fmt(p)}% (${p >= 0 ? 'increase' : 'decrease'}).` }
}

function mensuration(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['rect', 'circle'] : ['circle', 'sqrect', 'cuboid', 'tri', 'circ'])
  if (type === 'rect') {
    const l = r.int(8, 40), b = r.int(5, l)
    return { subtopic: 'Rectangle', stem: `The length and breadth of a rectangle are ${l} m and ${b} m. What is its area (in m²)?`, ...numOptions(r, l * b, { step: Math.max(4, b) }), explanation: `Area = ${l} × ${b} = ${l * b} m².` }
  }
  if (type === 'circle') {
    const rad = 7 * r.int(1, 6), A = (22 / 7) * rad * rad
    return { subtopic: 'Circle', stem: `What is the area of a circle of radius ${rad} cm? (π = 22/7)`, ...numOptions(r, A, { step: 22 }), explanation: `Area = 22/7 × ${rad}² = ${fmt(A)} cm².` }
  }
  if (type === 'circ') {
    const rad = 7 * r.int(1, 8), C = 2 * (22 / 7) * rad
    return { subtopic: 'Circle', stem: `The circumference of a circle is ${C} cm. What is its radius (cm)? (π = 22/7)`, ...numOptions(r, rad, { step: 7 }), explanation: `r = C/(2π) = ${C} × 7/44 = ${rad} cm.` }
  }
  if (type === 'sqrect') {
    const s = r.int(6, 24), l = s * 2, b = s / 2
    if (!Number.isInteger(b)) return mensuration(r, d)
    return { subtopic: 'Square', stem: `The area of a square equals the area of a rectangle of length ${l} m and breadth ${b} m. What is the perimeter of the square (m)?`, ...numOptions(r, 4 * s, { step: 4 }),
      explanation: `Area = ${l * b} m² ⇒ side = √${l * b} = ${s} m. Perimeter = 4 × ${s} = ${4 * s} m.` }
  }
  if (type === 'cuboid') {
    const l = r.int(4, 20), b = r.int(3, 12), h = r.int(2, 10)
    return { subtopic: 'Basic Volume', stem: `Find the volume of a cuboid of dimensions ${l} cm × ${b} cm × ${h} cm (in cm³).`, ...numOptions(r, l * b * h, { step: b * h }), explanation: `V = ${l} × ${b} × ${h} = ${l * b * h} cm³.` }
  }
  const base = 2 * r.int(4, 20), ht = r.int(5, 25)
  return { subtopic: 'Triangle', stem: `What is the area of a triangle with base ${base} cm and height ${ht} cm (in cm²)?`, ...numOptions(r, (base * ht) / 2, { step: Math.max(3, base / 2) }), explanation: `Area = ½ × ${base} × ${ht} = ${(base * ht) / 2} cm².` }
}

export const NUMERICAL_GENERATORS = {
  simplification, approximation, 'number-series': numberSeries, 'quadratic-equations': quadratic, 'number-system': numberSystem,
  percentage, 'ratio-proportion': ratio, average, 'profit-loss': profitLoss, 'simple-interest': simpleInterest,
  'compound-interest': compoundInterest, 'time-work': timeWork, 'time-distance': timeDistance, ages,
  'mixture-alligation': mixture, partnership, 'data-interpretation': dataInterpretation, mensuration,
}
