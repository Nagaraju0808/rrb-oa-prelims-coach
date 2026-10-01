import { numOptions } from './rng.js'

const lvl = (d) => (d === 'easy' ? 0 : d === 'medium' ? 1 : 2)
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const pos = (ch) => LETTERS.indexOf(ch) + 1
const chr = (n) => LETTERS[(((n - 1) % 26) + 26) % 26]
const ordinal = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th')

const IOPTS = ['Only I is true', 'Only II is true', 'Either I or II is true', 'Neither I nor II is true', 'Both I and II are true']
const pickWrong = (r, all, correct) => r.sample(all.filter((x) => x !== correct), 3)

// ---------------- Inequality ----------------
const GE = new Set(['>', '≥', '=']), LE = new Set(['<', '≤', '='])
function chainRel(sym, i, j) {
  // relation of element i to element j (i < j) along a chain
  const path = sym.slice(i, j)
  if (path.every((s) => GE.has(s))) return path.includes('>') ? '>' : path.every((s) => s === '=') ? '=' : '≥'
  if (path.every((s) => LE.has(s))) return path.includes('<') ? '<' : path.every((s) => s === '=') ? '=' : '≤'
  return null
}
const flip = { '>': '<', '<': '>', '≥': '≤', '≤': '≥', '=': '=' }
const implies = (rel, op) => rel && (rel === op || (rel === '>' && op === '≥') || (rel === '<' && op === '≤') || (rel === '=' && (op === '≥' || op === '≤')))

function inequality(r, d) {
  const L = lvl(d)
  const n = L === 0 ? 4 : 5 + (L === 2 ? 1 : 0)
  const el = r.sample('ABDEFGHJKLMNPQRSTUVWZ'.split(''), n)
  const dir = r.chance(0.5)
  const sym = Array.from({ length: n - 1 }, () => (r.chance(0.8) ? r.pick(dir ? ['>', '≥', '=', '>', '≥'] : ['<', '≤', '=', '<', '≤']) : r.pick(['>', '<', '≥', '≤'])))
  const rel = (i, j) => (i < j ? chainRel(sym, i, j) : i > j ? (chainRel(sym, j, i) ? flip[chainRel(sym, j, i)] : null) : '=')
  const concl = () => {
    let i = r.int(0, n - 1), j = r.int(0, n - 1)
    while (j === i) j = r.int(0, n - 1)
    const actual = rel(i, j)
    const op = actual && r.chance(0.55) ? (r.chance(0.5) ? actual : r.pick(['>', '<', '≥', '≤', '='])) : r.pick(['>', '<', '≥', '≤'])
    return { i, j, op }
  }
  let c1 = concl(), c2 = concl()
  // Either-or case
  if (r.chance(0.25)) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const rr = i !== j && rel(i, j)
      if (rr === '≥' || rr === '≤') { c1 = { i, j, op: rr === '≥' ? '>' : '<' }; c2 = { i, j, op: '=' } }
    }
  }
  const t1 = implies(rel(c1.i, c1.j), c1.op), t2 = implies(rel(c2.i, c2.j), c2.op)
  const eitherOr = !t1 && !t2 && c1.i === c2.i && c1.j === c2.j && ['≥', '≤'].includes(rel(c1.i, c1.j)) && [c1.op, c2.op].includes('=')
  const ans = t1 && t2 ? IOPTS[4] : t1 ? IOPTS[0] : t2 ? IOPTS[1] : eitherOr ? IOPTS[2] : IOPTS[3]
  // Statement — split the chain into two parts for harder levels.
  const parts = el.map((e, k) => (k < n - 1 ? `${e} ${sym[k]} ` : e)).join('')
  let statement = parts
  let codeNote = ''
  if (L >= 1) {
    const cut = r.int(2, n - 2)
    statement = `${el.slice(0, cut + 1).map((e, k) => (k < cut ? `${e} ${sym[k]} ` : e)).join('')}; ${el.slice(cut).map((e, k) => (k < n - 1 - cut ? `${e} ${sym[cut + k]} ` : e)).join('')}`
  }
  const cs = (c) => `${el[c.i]} ${c.op} ${el[c.j]}`
  let cText1 = cs(c1), cText2 = cs(c2)
  if (L === 2) {
    const codes = r.shuffle(['@', '#', '$', '%', '&'])
    const map = { '>': codes[0], '<': codes[1], '≥': codes[2], '≤': codes[3], '=': codes[4] }
    const enc = (s) => s.replace(/[>≥=<≤]/g, (m) => map[m])
    codeNote = `In the following question, the symbols ${codes[0]}, ${codes[1]}, ${codes[2]}, ${codes[3]} and ${codes[4]} are used with the following meaning:\n‘P ${map['>']} Q’ means P is greater than Q; ‘P ${map['<']} Q’ means P is smaller than Q; ‘P ${map['≥']} Q’ means P is either greater than or equal to Q; ‘P ${map['≤']} Q’ means P is either smaller than or equal to Q; ‘P ${map['=']} Q’ means P is equal to Q.\n\n`
    statement = enc(statement); cText1 = enc(cText1); cText2 = enc(cText2)
  }
  const why = (c, t) => `${cs(c)}: relation between ${el[c.i]} and ${el[c.j]} is ${rel(c.i, c.j) ? `"${el[c.i]} ${rel(c.i, c.j)} ${el[c.j]}"` : 'not definite (opposite signs)'} ⇒ ${t ? 'true' : 'false'}.`
  return {
    subtopic: L === 2 ? 'Coded Inequality' : 'Direct Inequality',
    stem: `${codeNote}Statement: ${statement}\nConclusions:\nI. ${cText1}\nII. ${cText2}`,
    correct: ans, wrong: pickWrong(r, IOPTS, ans),
    explanation: `Combined chain: ${parts}. ${why(c1, t1)} ${why(c2, t2)}${eitherOr ? ' Since one of the two must hold (≥/≤ case), Either I or II is true.' : ''}`,
  }
}

// ---------------- Syllogism (exact Venn model checking) ----------------
const NOUNS = ['Pens', 'Books', 'Chairs', 'Tables', 'Cups', 'Bottles', 'Phones', 'Bags', 'Keys', 'Doors', 'Lamps', 'Shirts', 'Rings', 'Coins', 'Stars', 'Trees', 'Birds', 'Clouds', 'Rivers', 'Papers']
function evalStmt(model, regions, s) {
  // regions: array of bitmasks (term membership); model: bitmask of non-empty regions
  let some = false, someNot = false
  for (let k = 0; k < regions.length; k++) {
    if (!(model & (1 << k))) continue
    const m = regions[k]
    if (m & (1 << s.x)) { if (m & (1 << s.y)) some = true; else someNot = true }
  }
  if (s.t === 'all') return !someNot
  if (s.t === 'some') return some
  if (s.t === 'no') return !some
  return someNot // somenot
}
function validModels(nTerms, stmts) {
  const regions = []
  for (let m = 1; m < 1 << nTerms; m++) regions.push(m)
  const out = []
  const total = 1 << regions.length
  for (let model = 1; model < total; model++) {
    let ok = true
    for (let t = 0; t < nTerms && ok; t++) {
      let has = false
      for (let k = 0; k < regions.length; k++) if (model & (1 << k) && regions[k] & (1 << t)) { has = true; break }
      ok = has
    }
    if (!ok) continue
    if (stmts.every((s) => evalStmt(model, regions, s))) out.push(model)
  }
  return { regions, models: out }
}
const stmtText = (s, T) => (s.t === 'all' ? `All ${T[s.x]} are ${T[s.y]}.` : s.t === 'some' ? `Some ${T[s.x]} are ${T[s.y]}.` : s.t === 'no' ? `No ${T[s.x].replace(/s$/, '')} is a ${T[s.y].replace(/s$/, '')}.` : `Some ${T[s.x]} are not ${T[s.y]}.`)
const conclText = (c, T) => (c.poss ? (c.t === 'all' ? `All ${T[c.x]} being ${T[c.y]} is a possibility.` : `Some ${T[c.x]} being ${T[c.y]} is a possibility.`) : stmtText(c, T))

function syllogism(r, d, depth = 0) {
  const L = lvl(d)
  const nT = L === 2 ? 4 : 3
  const T = r.sample(NOUNS, nT)
  const types = ['all', 'all', 'some', 'some', 'no', ...(L === 0 ? [] : ['somenot'])]
  const stmts = []
  for (let k = 0; k < nT - 1; k++) {
    const t = r.pick(types)
    stmts.push(r.chance(0.5) || t === 'all' ? { t, x: k, y: k + 1 } : { t, x: k + 1, y: k })
  }
  const { regions, models } = validModels(nT, stmts)
  const truth = (c) => models.map((m) => evalStmt(m, regions, c))
  const mk = () => {
    let x = r.int(0, nT - 1), y = r.int(0, nT - 1)
    while (y === x) y = r.int(0, nT - 1)
    const poss = L > 0 && r.chance(0.25)
    return { t: poss ? r.pick(['all', 'some']) : r.pick(['all', 'some', 'no', 'somenot']), x, y, poss }
  }
  let c1 = mk(), c2 = mk()
  if (r.chance(0.2)) { // either-or pair
    c1 = { t: 'some', x: c1.x, y: c1.y, poss: false }; c2 = { t: 'no', x: c1.x, y: c1.y, poss: false }
    if (r.chance(0.5)) [c1, c2] = [c2, c1]
  }
  const status = (c) => {
    const tv = truth(c)
    const all = tv.every(Boolean), any = tv.some(Boolean)
    if (c.poss) return { follows: any && !all, ambiguous: all }
    return { follows: all, ambiguous: false }
  }
  const s1 = status(c1), s2 = status(c2)
  if ((s1.ambiguous || s2.ambiguous) && depth < 30) return syllogism(r, d, depth + 1)
  const complementary = !c1.poss && !c2.poss && c1.x === c2.x && c1.y === c2.y &&
    ((new Set([c1.t, c2.t]).has('some') && new Set([c1.t, c2.t]).has('no')) || (new Set([c1.t, c2.t]).has('all') && new Set([c1.t, c2.t]).has('somenot')))
  const opts = ['Only I follows', 'Only II follows', 'Either I or II follows', 'Neither I nor II follows', 'Both I and II follow']
  const ans = s1.follows && s2.follows ? opts[4] : s1.follows ? opts[0] : s2.follows ? opts[1] : complementary ? opts[2] : opts[3]
  const why = (c, s, k) => `Conclusion ${k} (${conclText(c, T)}) ${s.follows ? 'follows — it is true in every possible Venn diagram' + (c.poss ? ' case where it is possible' : '') : 'does not follow — at least one valid diagram contradicts it'}.`
  return {
    subtopic: c1.poss || c2.poss ? 'Possibility Cases' : complementary ? 'Either/Or Cases' : 'Basic Syllogism',
    stem: `Statements:\n${stmts.map((s) => stmtText(s, T)).join('\n')}\nConclusions:\nI. ${conclText(c1, T)}\nII. ${conclText(c2, T)}`,
    correct: ans, wrong: pickWrong(r, opts, ans),
    explanation: `${why(c1, s1, 'I').replace(' case where it is possible', '')} ${why(c2, s2, 'II').replace(' case where it is possible', '')}${ans === opts[2] ? ' Neither is definite, but they form a complementary pair, so Either I or II follows.' : ''}`,
  }
}

// ---------------- Coding-Decoding ----------------
const WORDS = ['BRAIN', 'MONEY', 'PLANT', 'CLERK', 'BANKS', 'RIVER', 'MANGO', 'TABLE', 'CHAIR', 'LIGHT', 'WATER', 'STONE', 'GREEN', 'FRUIT', 'SMART', 'QUICK', 'WORLD', 'PRIME', 'CROWN', 'HOUSE']
const SENT_WORDS = ['study', 'daily', 'test', 'pass', 'exam', 'hard', 'work', 'goal', 'rank', 'bank', 'clerk', 'plan', 'win', 'focus', 'time']
const CODES = ['ka', 'zo', 'mi', 'pu', 'te', 'ri', 'lo', 'bu', 'ne', 'xa', 'qi', 'yo']
function codingDecoding(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['shift', 'num'] : L === 1 ? ['shift', 'opp', 'num', 'sentence'] : ['revshift', 'sentence', 'opp', 'num'])
  const [w1, w2] = r.sample(WORDS, 2)
  if (type === 'shift' || type === 'revshift') {
    const k = r.pick([1, 2, 3, -1, -2])
    const enc = (w) => (type === 'revshift' ? [...w].reverse() : [...w]).map((c) => chr(pos(c) + k)).join('')
    const correct = enc(w2)
    const wrongs = [...new Set([[...w2].map((c) => chr(pos(c) + k + 1)).join(''), [...w2].map((c) => chr(pos(c) - k)).join(''),
      (type === 'revshift' ? [...w2] : [...w2].reverse()).map((c) => chr(pos(c) + k)).join(''), [...w2].map((c) => chr(pos(c) + k - 1)).join('')])].filter((x) => x !== correct)
    return { subtopic: 'Letter Coding', stem: `In a certain code language, ${w1} is written as ${enc(w1)}. How is ${w2} written in that code language?`,
      correct, wrong: wrongs.slice(0, 3),
      explanation: `${type === 'revshift' ? 'The word is reversed and then e' : 'E'}ach letter is shifted ${k > 0 ? '+' : ''}${k} in the alphabet. ${w2} → ${correct}.` }
  }
  if (type === 'opp') {
    const enc = (w) => [...w].map((c) => chr(27 - pos(c))).join('')
    const correct = enc(w2)
    const wrongs = [[...w2].map((c) => chr(28 - pos(c))).join(''), [...correct].reverse().join(''), [...w2].map((c) => chr(26 - pos(c))).join('')].filter((x) => x !== correct)
    return { subtopic: 'Letter Coding', stem: `In a certain code, ${w1} is written as ${enc(w1)}. How will ${w2} be written in that code?`, correct, wrong: [...new Set(wrongs)].slice(0, 3),
      explanation: `Each letter is replaced by its opposite letter (A↔Z, B↔Y …; positions add up to 27). ${w2} → ${correct}.` }
  }
  if (type === 'num') {
    const sum = (w) => [...w].reduce((s, c) => s + pos(c), 0)
    return { subtopic: 'Number Coding', stem: `If ${w1} is coded as ${sum(w1)}, then what is the code for ${w2}?`, ...numOptions(r, sum(w2), { step: r.pick([1, 2, 3]) }),
      explanation: `Code = sum of alphabet positions. ${w2}: ${[...w2].map((c) => `${c}=${pos(c)}`).join(', ')} ⇒ ${sum(w2)}.` }
  }
  // sentence coding: S1={a,b,c}, S2={b,c,d}, S3={a,c,e} -> c is common to all
  const W = r.sample(SENT_WORDS, 5), C = r.sample(CODES, 5)
  const sent = (ids) => ({ w: ids.map((i) => W[i]).join(' '), c: r.shuffle(ids.map((i) => C[i])).join(' ') })
  const s1 = sent([0, 1, 2]), s2 = sent([1, 2, 3]), s3 = sent([0, 2, 4])
  const target = r.pick([2, 1, 0])
  const correct = C[target]
  const tExp = target === 2 ? `“${W[2]}” is the only word common to all three sentences, and “${C[2]}” is the only code common to all three.`
    : target === 1 ? `From I and II the common words are ${W[1]}, ${W[2]} (codes ${C[1]}, ${C[2]}). From all three, ${W[2]} = ${C[2]}. So ${W[1]} = ${C[1]}.`
      : `From I and III common words are ${W[0]}, ${W[2]} (codes ${C[0]}, ${C[2]}). ${W[2]} = ${C[2]} (common to all), so ${W[0]} = ${C[0]}.`
  return { subtopic: 'Coded Relationships', stem: `In a certain code language:\n“${s1.w}” is written as “${s1.c}”\n“${s2.w}” is written as “${s2.c}”\n“${s3.w}” is written as “${s3.c}”\nWhat is the code for “${W[target]}”?`,
    correct, wrong: r.sample(C.filter((c) => c !== correct), 3), explanation: tExp }
}

// ---------------- Blood Relations ----------------
const REL_POOL = ['Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Cousin', 'Husband', 'Wife', 'Grandfather', 'Grandson', 'Granddaughter', 'Father-in-law', 'Son-in-law', 'Brother-in-law', 'Nephew', 'Great-grandfather', 'Sister-in-law']
const BR = [
  (A, B, C, D) => [`${A} is the mother of ${B}. ${B} is the brother of ${C}. ${C} is the daughter of ${D}. How is ${D} related to ${A}?`, 'Husband', `${A} and ${D} are the parents of ${B} and ${C}; ${A} is the mother, so ${D} is the father, i.e. ${A}'s husband.`],
  (A, B, C, D) => [`${A} is the son of ${B}. ${B} is the sister of ${C}. ${C} is the father of ${D}. How is ${A} related to ${D}?`, 'Cousin', `${A}'s mother ${B} is the sister of ${D}'s father ${C}, so ${A} and ${D} are cousins.`],
  (A, B, C, D) => [`${A} is the brother of ${B}. ${B} is the daughter of ${C}. ${C} is the wife of ${D}. How is ${A} related to ${D}?`, 'Son', `${B} is the daughter of ${C} and ${D}; ${A} is ${B}'s brother, so ${A} is ${D}'s son.`],
  (A, B, C, D) => [`${A} is the father of ${B}. ${B} is the father of ${C}. ${C} is the sister of ${D}. How is ${A} related to ${D}?`, 'Grandfather', `${D} is a child of ${B}, and ${A} is ${B}'s father, so ${A} is ${D}'s grandfather.`],
  (A, B, C, D) => [`${A} is the wife of ${B}. ${B} is the brother of ${C}. ${C} is the mother of ${D}. How is ${A} related to ${D}?`, 'Aunt', `${B} is ${D}'s maternal uncle; ${A} is ${B}'s wife, so ${A} is ${D}'s aunt.`],
  (A, B, C, D) => [`${A} is the sister of ${B}. ${B} is the son of ${C}. ${C} is the son of ${D}. How is ${A} related to ${D}?`, 'Granddaughter', `${A} is a daughter of ${C}, who is ${D}'s son. So ${A} is ${D}'s granddaughter.`],
  (A, B, C, D, E) => [`${A} is the husband of ${B}. ${B} is the mother of ${C}. ${C} is the brother of ${D}. ${D} is the wife of ${E}. How is ${E} related to ${A}?`, 'Son-in-law', `${D} is the daughter of ${A} and ${B}; ${E} is ${D}'s husband, so ${E} is ${A}'s son-in-law.`],
  (A, B, C, D) => [`${A} is the mother of ${B}. ${B} is the father of ${C}. ${D} is the brother of ${B}. How is ${D} related to ${C}?`, 'Uncle', `${D} is the brother of ${C}'s father, so ${D} is ${C}'s (paternal) uncle.`],
  (A) => [`Pointing to a photograph of a girl, ${A}, a man, said, “She is the daughter of the only son of my grandfather.” How is the girl related to ${A}?`, 'Sister', `The only son of ${A}'s grandfather is ${A}'s father. His daughter is ${A}'s sister.`],
  (A, B, C, D) => [`${A} is the son of ${B}. ${C} is the daughter of ${B}. ${D} is the husband of ${C}. How is ${D} related to ${A}?`, 'Brother-in-law', `${C} is ${A}'s sister; her husband ${D} is ${A}'s brother-in-law.`],
  (A, B, C, D) => [`${A} is the father of ${B}. ${C} is the mother of ${A}. ${D} is the father of ${C}. How is ${D} related to ${B}?`, 'Great-grandfather', `${D} is ${A}'s maternal grandfather and ${A} is ${B}'s father, so ${D} is ${B}'s great-grandfather.`],
]
const BR_CODED = [
  (A, B, C, D) => [`${A} + ${B} × ${C} − ${D}`, `${A}`, `${D}`, 'Father-in-law', `${A} is the father of ${B}; ${B} is the brother of ${C}, so ${A} is also ${C}'s father; ${C} is the wife of ${D}. Hence ${A} is ${D}'s father-in-law.`],
  (A, B, C, D) => [`${A} ÷ ${B} + ${C} × ${D}`, `${A}`, `${D}`, 'Sister', `${A} is the daughter of ${B}; ${B} is the father of ${C}; ${C} is the brother of ${D}. So ${A}, ${C}, ${D} are siblings and ${A} (female) is ${D}'s sister.`],
  (A, B, C, D) => [`${A} − ${B} + ${C} ÷ ${D}`, `${A}`, `${C}`, 'Mother', `${A} is the wife of ${B}; ${B} is the father of ${C}, so ${A} is ${C}'s mother.`],
]
function bloodRelations(r, d) {
  const L = lvl(d)
  const N = r.sample('PQRSTUVWJKLMN'.split(''), 5)
  if (L === 2 && r.chance(0.6)) {
    const [expr, x, y, ans, exp] = r.pick(BR_CODED)(...N)
    return { subtopic: 'Coded Blood Relations', stem: `‘P + Q’ means P is the father of Q; ‘P − Q’ means P is the wife of Q; ‘P × Q’ means P is the brother of Q; ‘P ÷ Q’ means P is the daughter of Q.\nIf ${expr}, how is ${x} related to ${y}?`,
      correct: ans, wrong: r.sample(REL_POOL.filter((z) => z !== ans), 3), explanation: exp }
  }
  const [stem, ans, exp] = r.pick(BR)(...N)
  return { subtopic: stem.includes('Pointing') ? 'Generation-Based Questions' : 'Direct Blood Relations', stem, correct: ans, wrong: r.sample(REL_POOL.filter((z) => z !== ans), 3), explanation: exp }
}

// ---------------- Direction Sense ----------------
const DIRS = ['North', 'East', 'South', 'West']
const VEC = [[0, 1], [1, 0], [0, -1], [-1, 0]]
function dirName(dx, dy) {
  const ns = dy > 0 ? 'North' : dy < 0 ? 'South' : '', ew = dx > 0 ? 'East' : dx < 0 ? 'West' : ''
  return ns && ew ? `${ns}-${ew}` : ns || ew
}
function directionSense(r, d, depth = 0) {
  const L = lvl(d)
  const moves = L === 0 ? 3 : L === 1 ? 4 : 5
  let face = r.int(0, 3), x = 0, y = 0
  const steps = []
  for (let k = 0; k < moves; k++) {
    const dist = r.pick([2, 3, 4, 5, 6, 8, 10, 12, 15])
    if (k > 0) {
      const t = r.pick(['right', 'left'])
      face = (face + (t === 'right' ? 1 : 3)) % 4
      steps.push(`turns ${t} and walks ${dist} m`)
    } else steps.push(`walks ${dist} m towards ${DIRS[face]}`)
    x += VEC[face][0] * dist; y += VEC[face][1] * dist
  }
  const dist = Math.sqrt(x * x + y * y)
  if ((!Number.isInteger(dist) || dist === 0) && depth < 60) return directionSense(r, d, depth + 1)
  const ask = r.pick(L === 0 ? ['dir', 'dist'] : ['dist', 'both', 'facing'])
  const text = `A person starts from point P, ${steps.join(', then ')}, and stops at point Q.`
  const dn = dirName(x, y)
  const exp = `Net East–West displacement = ${x} m, North–South = ${y} m. Distance PQ = √(${x}² + ${y}²) = ${dist} m; Q is ${dn} of P. Final facing direction: ${DIRS[face]}.`
  if (ask === 'dir') {
    const all = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']
    return { subtopic: 'North, South, East, West', stem: `${text}\nIn which direction is Q with respect to P?`, correct: dn, wrong: r.sample(all.filter((z) => z !== dn), 3), explanation: exp }
  }
  if (ask === 'facing') return { subtopic: 'Left/Right Turns', stem: `${text}\nWhich direction is the person facing at the end?`, correct: DIRS[face], wrong: DIRS.filter((z) => z !== DIRS[face]), explanation: exp }
  if (ask === 'dist') return { subtopic: 'Shortest Distance', stem: `${text}\nWhat is the shortest distance between P and Q?`, ...numOptions(r, dist, { step: r.pick([1, 2, 3]), suffix: ' m' }), explanation: exp }
  const opp = dirName(-x, -y), alt = dirName(x, -y) || dirName(-x, y)
  const correct = `${dist} m, ${dn}`
  const wrong = [...new Set([`${dist} m, ${opp}`, `${dist + 2} m, ${dn}`, `${dist} m, ${alt}`, `${dist + 4} m, ${opp}`])].filter((z) => z !== correct)
  return { subtopic: 'Distance Calculation', stem: `${text}\nHow far and in which direction is Q from P?`, correct, wrong: wrong.slice(0, 3), explanation: exp }
}

// ---------------- Order & Ranking ----------------
function orderRanking(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['total', 'between'] : ['total', 'between', 'interchange', 'class'])
  if (type === 'total') {
    const a = r.int(5, 30), b = r.int(5, 30)
    return { subtopic: 'Total Number of Persons', stem: `In a row of students, Kiran is ${ordinal(a)} from the left end and ${ordinal(b)} from the right end. How many students are there in the row?`,
      ...numOptions(r, a + b - 1, { step: 1 }), explanation: `Total = ${a} + ${b} − 1 = ${a + b - 1}.` }
  }
  if (type === 'between') {
    const N = r.int(30, 60), p = r.int(5, 20), q = r.int(5, N - p - 3)
    return { subtopic: 'Rank from Left/Right', stem: `In a row of ${N} persons, A is ${ordinal(p)} from the left and B is ${ordinal(q)} from the right. How many persons sit between A and B?`,
      ...numOptions(r, N - p - q, { step: 1 }), explanation: `Persons between = ${N} − (${p} + ${q}) = ${N - p - q}.` }
  }
  if (type === 'interchange') {
    const a = r.int(5, 20), b = r.int(5, 20), newA = r.int(a + 3, a + 20)
    return { subtopic: 'Position Interchange', stem: `In a row, A is ${ordinal(a)} from the left and B is ${ordinal(b)} from the right. When they interchange their positions, A becomes ${ordinal(newA)} from the left. How many persons are there in the row?`,
      ...numOptions(r, newA + b - 1, { step: 1 }), explanation: `A's new position is B's old position: ${newA} from left and ${b} from right. Total = ${newA} + ${b} − 1 = ${newA + b - 1}.` }
  }
  const t = r.int(5, 20), bo = r.int(10, 30), f = r.int(2, 8), ab = r.int(1, 5), tot = t + bo - 1 + f + ab
  return { subtopic: 'Rank from Top/Bottom', stem: `Among the students who passed, Meena ranks ${ordinal(t)} from the top and ${ordinal(bo)} from the bottom. If ${f} students failed and ${ab} were absent, how many students are there in the class?`,
    ...numOptions(r, tot, { step: 1 }), explanation: `Passed = ${t} + ${bo} − 1 = ${t + bo - 1}. Total = ${t + bo - 1} + ${f} + ${ab} = ${tot}.` }
}

// ---------------- Alphanumeric Series ----------------
const SYM = ['@', '#', '$', '%', '&', '*', '©']
const isNum = (c) => /[0-9]/.test(c), isSym = (c) => SYM.includes(c), isLet = (c) => /[A-Z]/.test(c)
function alphanumericSeries(r, d) {
  const L = lvl(d)
  const len = L === 0 ? 16 : 20
  const s = Array.from({ length: len }, () => { const k = r.next(); return k < 0.45 ? r.pick('BCDEFGHIKLMNPRTUW'.split('')) : k < 0.75 ? String(r.int(1, 9)) : r.pick(SYM) })
  const show = `${s.join(' ')}`
  const type = r.pick(L === 0 ? ['pos', 'count'] : ['pos', 'count', 'removed'])
  if (type === 'pos') {
    const m = r.int(3, len - 6), k = r.int(2, Math.min(6, len - m))
    const ans = s[m + k - 1]
    const wrong = [...new Set([s[m - k - 1], s[m + k - 2], s[m + k], s[len - m]].filter((z) => z && z !== ans))]
    while (wrong.length < 3) wrong.push(r.pick(SYM.filter((z) => z !== ans && !wrong.includes(z))))
    return { subtopic: 'Position-Based Questions', stem: `Study the series:\n${show}\nWhich element is ${ordinal(k)} to the right of the ${ordinal(m)} element from the left end?`,
      correct: ans, wrong: wrong.slice(0, 3), explanation: `${k}th to the right of ${m}th from left = ${m + k}th from left = ${ans}.` }
  }
  if (type === 'count') {
    const v = r.pick([['symbol', isSym, 'number', isNum, 'letter', isLet], ['number', isNum, 'letter', isLet, 'symbol', isSym], ['letter', isLet, 'symbol', isSym, 'number', isNum]])
    let cnt = 0
    for (let i = 1; i < len - 1; i++) if (v[1](s[i]) && v[3](s[i - 1]) && v[5](s[i + 1])) cnt++
    return { subtopic: 'Counting/Arrangement Questions', stem: `Study the series:\n${show}\nHow many such ${v[0]}s are there, each of which is immediately preceded by a ${v[2]} and immediately followed by a ${v[4]}?`,
      correct: String(cnt), wrong: r.sample([0, 1, 2, 3, 4, 5].filter((z) => z !== cnt), 3).map(String),
      explanation: `Scan each ${v[0]} and check both neighbours: ${cnt} such ${v[0]}(s) found.` }
  }
  const rest = s.filter((c) => !isSym(c)), k = r.int(2, Math.min(8, rest.length))
  const ans = rest[rest.length - k]
  const wrong = [...new Set([s[len - k], rest[rest.length - k - 1], rest[rest.length - k + 1]].filter((z) => z && z !== ans))]
  while (wrong.length < 3) wrong.push(String(r.int(1, 9)))
  return { subtopic: 'Alpha-Numeric Series', stem: `Study the series:\n${show}\nIf all the symbols are removed, which element will be ${ordinal(k)} from the right end?`,
    correct: ans, wrong: [...new Set(wrong)].filter((z) => z !== ans).slice(0, 3), explanation: `After removing symbols: ${rest.join(' ')}. ${ordinal(k)} from the right = ${ans}.` }
}

// ---------------- Miscellaneous Reasoning ----------------
const PAIR_WORDS = ['PLANET', 'GARDEN', 'MONKEY', 'FORMAT', 'BRIDGE', 'CASTLE', 'DOCTOR', 'JUNGLE', 'SPRING', 'MARKET', 'WINTER', 'BANKER', 'STREAM', 'SILVER']
function miscReasoning(r, d) {
  const L = lvl(d)
  const type = r.pick(L === 0 ? ['letterSeries', 'oddGroup', 'analogy'] : ['letterSeries', 'oddGroup', 'analogy', 'pairs', 'oddNumber'])
  if (type === 'letterSeries') {
    const st = r.int(1, 8), g = r.int(2, 4), inc = L === 0 ? 0 : r.int(0, 1)
    const seq = []; let p = st, gg = g
    for (let i = 0; i < 6; i++) { seq.push(chr(p)); p += gg; gg += inc }
    const ans = seq.pop()
    return { subtopic: 'Letter Series', stem: `Find the next term: ${seq.join(', ')}, ?`, correct: ans, wrong: [chr(pos(ans) + 1), chr(pos(ans) - 1), chr(pos(ans) + 2)],
      explanation: `Gaps: +${g}${inc ? ' increasing by 1 each step' : ' each time'}. Next = ${ans}.` }
  }
  if (type === 'oddGroup') {
    const g = r.int(1, 3), groups = []
    const starts = r.sample([1, 3, 5, 7, 9, 11, 13, 15, 17], 4)
    for (const s of starts) groups.push(chr(s) + chr(s + g) + chr(s + 2 * g))
    const oddIdx = r.int(0, 3), s = starts[oddIdx]
    groups[oddIdx] = chr(s) + chr(s + g) + chr(s + 2 * g + 1)
    return { subtopic: 'Odd One Out', stem: 'Three of the following four letter groups are alike in a certain way. Which one does not belong to the group?',
      correct: groups[oddIdx], wrong: groups.filter((_, i) => i !== oddIdx).slice(0, 3),
      explanation: `In each group the letters move by +${g}, +${g}. In ${groups[oddIdx]} the second gap is +${g + 1}.` }
  }
  if (type === 'analogy') {
    const rule = r.pick([['n²+1', (n) => n * n + 1], ['n³', (n) => n ** 3], ['n² − 1', (n) => n * n - 1], ['n × (n + 1)', (n) => n * (n + 1)], ['n³ + 1', (n) => n ** 3 + 1]])
    const a = r.int(2, 6), b = r.int(7, 12)
    return { subtopic: 'Analogy', stem: `${a} : ${rule[1](a)} :: ${b} : ?`, ...numOptions(r, rule[1](b), { step: r.pick([1, 2, b]) }),
      explanation: `Rule: ${rule[0]}. ${a} → ${rule[1](a)}; ${b} → ${rule[1](b)}.` }
  }
  if (type === 'pairs') {
    const w = r.pick(PAIR_WORDS)
    let cnt = 0
    for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) if (Math.abs(pos(w[j]) - pos(w[i])) === j - i) cnt++
    return { subtopic: 'Word-Based Questions', stem: `How many pairs of letters are there in the word “${w}” which have as many letters between them in the word as in the English alphabet (both forward and backward)?`,
      correct: String(cnt), wrong: r.sample([0, 1, 2, 3, 4, 5].filter((z) => z !== cnt), 3).map(String),
      explanation: `Check every pair (i, j): count pairs where |alphabet gap| equals the gap in the word. Total = ${cnt}.` }
  }
  const base = r.sample([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 4).map((n) => n * n)
  const odd = base[0] + r.pick([1, 2, 3, -1, -2])
  const all = r.shuffle([odd, ...base.slice(1)])
  return { subtopic: 'Number-Based Questions', stem: `Find the odd one out: ${all.join(', ')}`, correct: String(odd), wrong: base.slice(1).map(String),
    explanation: `All others are perfect squares; ${odd} is not.` }
}

export const REASONING_GENERATORS = {
  inequality, syllogism, 'coding-decoding': codingDecoding, 'blood-relations': bloodRelations, 'direction-sense': directionSense,
  'order-ranking': orderRanking, 'alphanumeric-series': alphanumericSeries, 'misc-reasoning': miscReasoning,
}
export { ordinal }
