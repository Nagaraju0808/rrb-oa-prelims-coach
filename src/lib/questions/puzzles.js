// Puzzle generator: builds a hidden arrangement, then adds true clues until exactly one arrangement
// satisfies them (verified by brute force over all permutations). Questions are therefore always solvable.
import { ordinal } from './reasoning.js'

const lvl = (d) => (d === 'easy' ? 0 : d === 'medium' ? 1 : 2)
const permCache = {}
function perms(n) {
  if (permCache[n]) return permCache[n]
  const out = []
  const a = [...Array(n).keys()]
  const rec = (k) => {
    if (k === n) { out.push(Int8Array.from(a)); return }
    for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]] }
  }
  rec(0)
  return (permCache[n] = out)
}
// A candidate is p[person] = position.
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const COLOURS = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Black', 'White']
const PEOPLE = 'ABCDEFGHJKLMPQRSTUVW'.split('')
const plural = (m, one, many) => (m === 1 ? one : many)

const LINEAR_MODES = {
  'linear-seating': {
    intro: (n) => `${n} persons sit in a straight row facing North.`,
    nm: (x) => x,
    abs: (X, i, n) => (i === 0 ? `${X} sits at the extreme left end.` : i === n - 1 ? `${X} sits at the extreme right end.` : i < n / 2 ? `${X} sits ${ordinal(i + 1)} from the left end.` : `${X} sits ${ordinal(n - i)} from the right end.`),
    off: (X, Y, k) => (k === 1 ? `${X} sits immediately to the right of ${Y}.` : k === -1 ? `${X} sits immediately to the left of ${Y}.` : `${X} sits ${ordinal(Math.abs(k))} to the ${k > 0 ? 'right' : 'left'} of ${Y}.`),
    gap: (X, Y, m) => `Only ${m} ${plural(m, 'person sits', 'persons sit')} between ${X} and ${Y}.`,
    end: (X) => `${X} sits at one of the extreme ends.`,
    notEnd: (X) => `${X} does not sit at an extreme end.`,
    order: (X, Y) => `${X} sits somewhere to the left of ${Y}.`,
    notAdj: (X, Y) => `${X} is not an immediate neighbour of ${Y}.`,
    qPos: (i, n) => `Who sits ${i === 0 ? 'at the extreme left end' : i === n - 1 ? 'at the extreme right end' : `${ordinal(i + 1)} from the left end`}?`,
    qRel: (X, k) => `Who sits ${k === 1 ? 'immediately to the right' : k === -1 ? 'immediately to the left' : `${ordinal(Math.abs(k))} to the ${k > 0 ? 'right' : 'left'}`} of ${X}?`,
    qGap: (X, Y) => `How many persons sit between ${X} and ${Y}?`,
    show: (arr) => `Left → ${arr.join('  ')} ← Right`,
  },
  'floor-puzzle': {
    intro: (n) => `${n} persons live on ${n} different floors of a building. The lowermost floor is numbered 1 and the topmost floor is numbered ${n}.`,
    nm: (x) => x,
    abs: (X, i) => `${X} lives on floor number ${i + 1}.`,
    off: (X, Y, k) => (k === 1 ? `${X} lives on the floor immediately above ${Y}.` : k === -1 ? `${X} lives on the floor immediately below ${Y}.` : `${X} lives ${Math.abs(k)} floors ${k > 0 ? 'above' : 'below'} ${Y}.`),
    gap: (X, Y, m) => `Only ${m} ${plural(m, 'person lives', 'persons live')} between ${X} and ${Y}.`,
    end: (X) => `${X} lives either on the topmost floor or on the lowermost floor.`,
    notEnd: (X) => `${X} lives neither on the topmost nor on the lowermost floor.`,
    order: (X, Y) => `${X} lives on a floor above ${Y}.`,
    notAdj: (X, Y) => `${X} does not live on a floor adjacent to ${Y}'s floor.`,
    parity: (X, odd) => `${X} lives on an ${odd ? 'odd' : 'even'}-numbered floor.`,
    qPos: (i) => `Who lives on floor number ${i + 1}?`,
    qRel: (X, k) => (k === 1 ? `Who lives immediately above ${X}?` : k === -1 ? `Who lives immediately below ${X}?` : `Who lives ${Math.abs(k)} floors ${k > 0 ? 'above' : 'below'} ${X}?`),
    qGap: (X, Y) => `How many persons live between ${X} and ${Y}?`,
    qWhere: (X) => `On which floor does ${X} live?`, whereLabel: (i) => `Floor ${i + 1}`,
    show: (arr) => arr.map((p, i) => `Floor ${i + 1}: ${p}`).reverse().join('\n'),
  },
  'box-puzzle': {
    intro: (n) => `${n} boxes of different colours are kept one above another. The bottom-most box is numbered 1 and the top-most box is numbered ${n}.`,
    nm: (x) => `the ${x} box`,
    abs: (X, i) => `The ${X} box is the ${ordinal(i + 1)} box from the bottom.`,
    off: (X, Y, k) => (k === 1 ? `The ${X} box is kept immediately above the ${Y} box.` : k === -1 ? `The ${X} box is kept immediately below the ${Y} box.` : `The ${X} box is kept ${Math.abs(k)} positions ${k > 0 ? 'above' : 'below'} the ${Y} box.`),
    gap: (X, Y, m) => `Only ${m} ${plural(m, 'box is', 'boxes are')} kept between the ${X} box and the ${Y} box.`,
    end: (X) => `The ${X} box is kept either at the top or at the bottom.`,
    notEnd: (X) => `The ${X} box is kept neither at the top nor at the bottom.`,
    order: (X, Y) => `The ${X} box is kept somewhere above the ${Y} box.`,
    notAdj: (X, Y) => `The ${X} box is not kept adjacent to the ${Y} box.`,
    parity: (X, odd) => `The ${X} box is at an ${odd ? 'odd' : 'even'}-numbered position.`,
    qPos: (i) => `Which box is kept at position ${i + 1} from the bottom?`,
    qRel: (X, k) => (k === 1 ? `Which box is kept immediately above the ${X} box?` : k === -1 ? `Which box is kept immediately below the ${X} box?` : `Which box is kept ${Math.abs(k)} positions ${k > 0 ? 'above' : 'below'} the ${X} box?`),
    qGap: (X, Y) => `How many boxes are kept between the ${X} box and the ${Y} box?`,
    qWhere: (X) => `At which position from the bottom is the ${X} box kept?`, whereLabel: (i) => `${ordinal(i + 1)}`,
    show: (arr) => arr.map((p, i) => `${i + 1}: ${p}`).reverse().join('\n'),
  },
  'scheduling-puzzle': {
    intro: (n) => `${n} persons attend a training programme on ${n} different days of the same week, starting on Monday and ending on ${DAYS[n - 1]}.`,
    nm: (x) => x,
    abs: (X, i) => `${X} attends on ${DAYS[i]}.`,
    off: (X, Y, k) => (k === 1 ? `${X} attends on the day immediately after ${Y}.` : k === -1 ? `${X} attends on the day immediately before ${Y}.` : `${X} attends ${Math.abs(k)} days ${k > 0 ? 'after' : 'before'} ${Y}.`),
    gap: (X, Y, m) => `Only ${m} ${plural(m, 'person attends', 'persons attend')} between ${X} and ${Y}.`,
    end: (X, n) => `${X} attends either on Monday or on ${DAYS[n - 1]}.`,
    notEnd: (X, n) => `${X} attends neither on Monday nor on ${DAYS[n - 1]}.`,
    order: (X, Y) => `${X} attends on some day before ${Y}.`,
    notAdj: (X, Y) => `${X} and ${Y} do not attend on consecutive days.`,
    qPos: (i) => `Who attends on ${DAYS[i]}?`,
    qRel: (X, k) => (k === 1 ? `Who attends immediately after ${X}?` : k === -1 ? `Who attends immediately before ${X}?` : `Who attends ${Math.abs(k)} days ${k > 0 ? 'after' : 'before'} ${X}?`),
    qGap: (X, Y) => `How many persons attend between ${X} and ${Y}?`,
    qWhere: (X) => `On which day does ${X} attend?`, whereLabel: (i) => DAYS[i],
    show: (arr) => arr.map((p, i) => `${DAYS[i]}: ${p}`).join('\n'),
  },
  'misc-puzzles': {
    // comparison puzzle; position 0 = tallest
    intro: (n) => `${n} persons have different heights.`,
    nm: (x) => x,
    abs: (X, i) => (i === 0 ? `${X} is the tallest.` : `Only ${i} ${plural(i, 'person is', 'persons are')} taller than ${X}.`),
    off: (X, Y, k) => (k === -1 ? `${X} is just taller than ${Y} (no one's height lies between them).` : `${Y} is just taller than ${X} (no one's height lies between them).`),
    gap: (X, Y, m) => `Exactly ${m} ${plural(m, 'person has a height', 'persons have heights')} between those of ${X} and ${Y}.`,
    end: (X) => `${X} is either the tallest or the shortest.`,
    notEnd: (X) => `${X} is neither the tallest nor the shortest.`,
    order: (X, Y) => `${X} is taller than ${Y}.`,
    notAdj: (X, Y) => `There is at least one person whose height lies between those of ${X} and ${Y}.`,
    qPos: (i, n) => (i === 0 ? 'Who is the tallest?' : i === n - 1 ? 'Who is the shortest?' : `Who is the ${ordinal(i + 1)} tallest?`),
    qRel: (X, k) => (k === -1 ? `Who is just taller than ${X}?` : `Who is just shorter than ${X}?`),
    qGap: (X, Y) => `How many persons have heights between those of ${X} and ${Y}?`,
    qWhere: (X) => `How many persons are taller than ${X}?`, whereLabel: (i) => String(i),
    show: (arr) => arr.join(' > '),
    onlyUnit: true,
  },
}

function linearPuzzle(topic, r, d, depth = 0) {
  const M = LINEAR_MODES[topic]
  const L = lvl(d)
  const n = topic === 'misc-puzzles' ? (L === 0 ? 5 : 6) : L === 0 ? 5 : L === 1 ? 6 : 7
  const names = topic === 'box-puzzle' ? r.sample(COLOURS, n) : r.sample(PEOPLE, n).sort()
  const truth = r.shuffle([...Array(n).keys()]) // truth[person] = position
  const arr = []
  truth.forEach((p, person) => (arr[p] = names[person]))
  let cand = perms(n)
  const clues = []
  const propose = () => {
    const X = r.int(0, n - 1); let Y = r.int(0, n - 1); while (Y === X) Y = r.int(0, n - 1)
    const px = truth[X], py = truth[Y], diff = px - py
    const kinds = ['off', 'off', 'gap', 'gap', 'end', 'notEnd', 'order', 'notAdj', 'abs']
    if (M.parity) kinds.push('parity')
    const kind = r.pick(kinds)
    switch (kind) {
      case 'off': if (Math.abs(diff) > 3 || (M.onlyUnit && Math.abs(diff) !== 1)) return null
        return { text: M.off(names[X], names[Y], diff), test: (c) => c[X] - c[Y] === diff }
      case 'gap': if (Math.abs(diff) < 2) return null
        return { text: M.gap(names[X], names[Y], Math.abs(diff) - 1), test: (c) => Math.abs(c[X] - c[Y]) === Math.abs(diff) }
      case 'end': if (px !== 0 && px !== n - 1) return null
        return { text: M.end(names[X], n), test: (c) => c[X] === 0 || c[X] === n - 1 }
      case 'notEnd': if (px === 0 || px === n - 1) return null
        return { text: M.notEnd(names[X], n), test: (c) => c[X] !== 0 && c[X] !== n - 1 }
      case 'order': {
        // linear: "X left of Y" ⇒ smaller index; floors/boxes/days: "X above/before Y" semantic matches index order
        const lt = topic === 'linear-seating' || topic === 'misc-puzzles' || topic === 'scheduling-puzzle'
        const [A, B] = lt ? (px < py ? [X, Y] : [Y, X]) : px > py ? [X, Y] : [Y, X]
        return { text: M.order(names[A], names[B]), test: lt ? (c) => c[A] < c[B] : (c) => c[A] > c[B] }
      }
      case 'notAdj': if (Math.abs(diff) === 1) return null
        return { text: M.notAdj(names[X], names[Y]), test: (c) => Math.abs(c[X] - c[Y]) !== 1 }
      case 'parity': return { text: M.parity(names[X], (px + 1) % 2 === 1), test: (c) => (c[X] + 1) % 2 === (px + 1) % 2 }
      default: return { text: M.abs(names[X], px, n), test: (c) => c[X] === px }
    }
  }
  let tries = 0
  while (cand.length > 1 && tries < 400) {
    tries++
    const c = propose()
    if (!c) continue
    const next = cand.filter(c.test)
    if (next.length === cand.length) continue
    // Avoid making the puzzle trivial with too many absolute clues early.
    if (c.text.match(/floor number|from the (left|right) end\.|attends on [A-Z]|box from the bottom|is the tallest|taller than [A-Z]\.$/) && clues.length < 2 && r.chance(0.6) && L > 0) continue
    clues.push(c.text)
    cand = next
  }
  if (cand.length !== 1 || clues.length > 11) {
    if (depth < 8) return linearPuzzle(topic, r, d, depth + 1)
  }
  // Question
  const qType = r.pick(M.qWhere ? ['pos', 'rel', 'gap', 'where'] : ['pos', 'rel', 'gap'])
  const opt = (correct, pool) => ({ correct, wrong: r.sample(pool.filter((z) => z !== correct), 3) })
  const nameOpts = names.map((x) => x)
  let q, o
  if (qType === 'pos') {
    const i = r.int(0, n - 1); q = M.qPos(i, n); o = opt(arr[i], nameOpts)
  } else if (qType === 'rel') {
    let X, k, tgt
    for (let g = 0; g < 30; g++) {
      X = r.int(0, n - 1); k = M.onlyUnit ? r.pick([1, -1]) : r.pick([1, -1, 2, -2, 3])
      tgt = truth[X] + k
      if (tgt >= 0 && tgt < n) break
    }
    if (tgt < 0 || tgt >= n) { k = truth[X] < n - 1 ? 1 : -1; tgt = truth[X] + k }
    q = M.qRel(names[X], k); o = opt(arr[tgt], nameOpts.filter((z) => z !== names[X]))
  } else if (qType === 'gap') {
    const [X, Y] = r.sample([...Array(n).keys()], 2)
    const g = Math.abs(truth[X] - truth[Y]) - 1
    q = M.qGap(names[X], names[Y]); o = opt(String(g), [...Array(n - 1).keys()].map(String))
  } else {
    const X = r.int(0, n - 1)
    q = M.qWhere(names[X]); o = opt(M.whereLabel(truth[X]), [...Array(n).keys()].map(M.whereLabel))
  }
  return {
    subtopic: topic === 'misc-puzzles' ? 'Comparison-Based Puzzles' : topic === 'linear-seating' ? 'Single row facing North' : topic === 'scheduling-puzzle' ? 'Day/Date-Based Puzzles' : topic === 'box-puzzle' ? 'Box-Based Puzzles' : 'Floor-Based Puzzles',
    stem: `Study the following information carefully and answer the question.\n${M.intro(n)} ${clues.join(' ')}\n\n${q}`,
    ...o,
    explanation: `Combining all the clues gives exactly one arrangement:\n${M.show(arr)}`,
  }
}

// Circular seating — positions clockwise; persons face the centre, so LEFT = clockwise (+), RIGHT = anticlockwise (−).
function circularPuzzle(r, d, depth = 0) {
  const L = lvl(d)
  const n = L === 0 ? 6 : 8
  const names = r.sample(PEOPLE, n).sort()
  const truth = [0, ...r.shuffle([...Array(n - 1).keys()].map((x) => x + 1))]
  const arr = []
  truth.forEach((p, person) => (arr[p] = names[person]))
  // candidates with person 0 fixed at seat 0
  let cand = perms(n - 1).map((p) => Int8Array.from([0, ...Array.from(p, (x) => x + 1)]))
  const cw = (a, b) => (((b - a) % n) + n) % n // clockwise steps from a to b
  const clues = []
  const propose = () => {
    const X = r.int(0, n - 1); let Y = r.int(0, n - 1); while (Y === X) Y = r.int(0, n - 1)
    const s = cw(truth[Y], truth[X]) // X is s seats clockwise (to the left) of Y
    const kind = r.pick(['left', 'right', 'opp', 'gapL', 'notAdj', 'adj'])
    if (kind === 'left' && s <= 3) return { text: s === 1 ? `${names[X]} sits immediately to the left of ${names[Y]}.` : `${names[X]} sits ${ordinal(s)} to the left of ${names[Y]}.`, test: (c) => cw(c[Y], c[X]) === s }
    if (kind === 'right' && n - s <= 3) return { text: n - s === 1 ? `${names[X]} sits immediately to the right of ${names[Y]}.` : `${names[X]} sits ${ordinal(n - s)} to the right of ${names[Y]}.`, test: (c) => cw(c[Y], c[X]) === s }
    if (kind === 'opp' && s === n / 2) return { text: `${names[X]} sits opposite to ${names[Y]}.`, test: (c) => cw(c[Y], c[X]) === s }
    if (kind === 'gapL' && s >= 2 && s <= n - 2) return { text: `Only ${s - 1} ${plural(s - 1, 'person sits', 'persons sit')} between ${names[Y]} and ${names[X]} when counted from the left of ${names[Y]}.`, test: (c) => cw(c[Y], c[X]) === s }
    if (kind === 'notAdj' && s !== 1 && s !== n - 1) return { text: `${names[X]} is not an immediate neighbour of ${names[Y]}.`, test: (c) => { const z = cw(c[Y], c[X]); return z !== 1 && z !== n - 1 } }
    if (kind === 'adj' && (s === 1 || s === n - 1)) return { text: `${names[X]} is an immediate neighbour of ${names[Y]}.`, test: (c) => { const z = cw(c[Y], c[X]); return z === 1 || z === n - 1 } }
    return null
  }
  let tries = 0
  while (cand.length > 1 && tries < 500) {
    tries++
    const c = propose()
    if (!c) continue
    const next = cand.filter(c.test)
    if (next.length === cand.length || next.length === 0) continue
    clues.push(c.text); cand = next
  }
  if ((cand.length !== 1 || clues.length > 11) && depth < 8) return circularPuzzle(r, d, depth + 1)
  const X = r.int(0, n - 1)
  const qType = r.pick(['left', 'right', 'opp', 'gap'])
  let q, correct
  if (qType === 'opp' && n % 2 === 0) { q = `Who sits opposite to ${names[X]}?`; correct = arr[(truth[X] + n / 2) % n] }
  else if (qType === 'gap') {
    let Y = r.int(0, n - 1); while (Y === X) Y = r.int(0, n - 1)
    q = `How many persons sit between ${names[X]} and ${names[Y]} when counted from the left of ${names[X]}?`
    correct = String(cw(truth[X], truth[Y]) - 1)
    return { subtopic: 'Facing centre', stem: `Study the following information carefully and answer the question.\n${n} persons sit around a circular table facing the centre. ${clues.join(' ')}\n\n${q}`,
      correct, wrong: r.sample([...Array(n - 1).keys()].map(String).filter((z) => z !== correct), 3), explanation: `Clockwise (= left for persons facing the centre) from ${arr[0]}: ${arr.join(' → ')} → ${arr[0]}.` }
  } else {
    const k = r.int(1, 3), left = qType === 'left'
    q = `Who sits ${k === 1 ? 'immediately' : ordinal(k)} to the ${left ? 'left' : 'right'} of ${names[X]}?`
    correct = arr[(((truth[X] + (left ? k : -k)) % n) + n) % n]
  }
  return { subtopic: 'Facing centre', stem: `Study the following information carefully and answer the question.\n${n} persons sit around a circular table facing the centre. ${clues.join(' ')}\n\n${q}`,
    correct, wrong: r.sample(names.filter((z) => z !== correct && z !== names[X]), 3),
    explanation: `For persons facing the centre, left = clockwise. Clockwise order from ${arr[0]}: ${arr.join(' → ')} → ${arr[0]}.` }
}

export const PUZZLE_GENERATORS = {
  'linear-seating': (r, d) => linearPuzzle('linear-seating', r, d),
  'floor-puzzle': (r, d) => linearPuzzle('floor-puzzle', r, d),
  'box-puzzle': (r, d) => linearPuzzle('box-puzzle', r, d),
  'scheduling-puzzle': (r, d) => linearPuzzle('scheduling-puzzle', r, d),
  'misc-puzzles': (r, d) => linearPuzzle('misc-puzzles', r, d),
  'circular-seating': circularPuzzle,
}
