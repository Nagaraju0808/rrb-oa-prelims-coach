import { makeRng } from './rng.js'
import { NUMERICAL_GENERATORS } from './numerical.js'
import { REASONING_GENERATORS } from './reasoning.js'
import { PUZZLE_GENERATORS } from './puzzles.js'
import { COMPUTER_GENERATORS } from './computer.js'
import BANK_EN from './banks/english.js'
import BANK_HI from './banks/hindi.js'
import BANK_GA from './banks/ga.js'
import BANK_CS from './banks/computer.js'
import { TOPICS, topicById } from '../syllabus.js'

// Formula-based generators (unlimited questions) and curated banks (English, Hindi, GA, Computer).
// A topic may have both: then roughly one in three questions comes from the generator.
export const GENERATORS = { ...NUMERICAL_GENERATORS, ...REASONING_GENERATORS, ...PUZZLE_GENERATORS, ...COMPUTER_GENERATORS }
export const BANKS = { ...BANK_EN, ...BANK_HI, ...BANK_GA, ...BANK_CS }
export const DIFFICULTIES = ['easy', 'medium', 'hard']
export const hasQuestions = (topicId) => !!(GENERATORS[topicId] || BANKS[topicId]?.length)

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Run a formula generator deterministically. id format: g|topic|difficulty|seed */
function runGenerator(topicId, difficulty, seed) {
  const gen = GENERATORS[topicId]
  if (!gen) return null
  const r = makeRng(hashStr(`${topicId}|${difficulty}|${seed}`))
  // Regenerate (deterministically, same rng stream) until there are 4 distinct options.
  let q
  for (let k = 0; k < 20; k++) {
    q = gen(r, difficulty)
    const wrong = [...new Set(q.wrong.map(String))].filter((w) => w !== String(q.correct))
    if (wrong.length >= 3) { q = { ...q, correct: String(q.correct), wrong }; break }
  }
  const options = r.shuffle([q.correct, ...q.wrong.slice(0, 3)])
  return {
    id: `g|${topicId}|${difficulty}|${seed}`, subject: topicById[topicId]?.subject, topic: topicId, subtopic: q.subtopic, difficulty,
    stem: q.stem, data: q.data || null, options, answer: options.indexOf(q.correct), explanation: q.explanation, source: 'generated',
  }
}

/** A curated bank question. id format: b|topic|rowId (option order is fixed per question). */
function fromRow(topicId, row) {
  const [rid, difficulty, stem, correct, wrong, explanation, subtopic] = row
  const options = makeRng(hashStr(`b|${topicId}|${rid}`)).shuffle([correct, ...wrong.slice(0, 3)])
  return { id: `b|${topicId}|${rid}`, subject: topicById[topicId]?.subject, topic: topicId, subtopic, difficulty, stem, data: null, options,
    answer: options.indexOf(correct), explanation, source: 'bank' }
}

/** One question for a topic, chosen deterministically from the seed. */
export function generateQuestion(topicId, difficulty, seed) {
  const bank = BANKS[topicId]
  if (bank?.length && (!GENERATORS[topicId] || hashStr(`${topicId}|${seed}`) % 3 !== 0)) {
    const r = makeRng(hashStr(`pick|${topicId}|${difficulty}|${seed}`))
    const same = bank.filter((x) => x[1] === difficulty)
    return fromRow(topicId, r.pick(same.length ? same : bank))
  }
  return runGenerator(topicId, difficulty, seed)
}

export function questionFromId(id, customQuestions = []) {
  if (id.startsWith('g|')) {
    const [, topic, diff, seed] = id.split('|')
    return runGenerator(topic, diff, seed)
  }
  if (id.startsWith('b|')) {
    const [, topic, rid] = id.split('|')
    const row = BANKS[topic]?.find((x) => x[0] === rid)
    return row ? fromRow(topic, row) : null
  }
  return customQuestions.find((q) => q.id === id) || null
}

/** Every bank question of a topic (used for small banks and for validation). */
export const bankQuestions = (topicId) => (BANKS[topicId] || []).map((row) => fromRow(topicId, row))

/** Distribute `count` across difficulties by percentage mix {easy, medium, hard}. */
export function difficultyPlan(count, mix = { easy: 30, medium: 50, hard: 20 }) {
  const total = mix.easy + mix.medium + mix.hard || 1
  const e = Math.round((count * mix.easy) / total), h = Math.round((count * mix.hard) / total)
  return [...Array(e).fill('easy'), ...Array(Math.max(0, count - e - h)).fill('medium'), ...Array(h).fill('hard')]
}

/** Topics of the same subject (and same language) used when a small bank runs out of fresh questions. */
function siblings(topicId) {
  const t = topicById[topicId]
  if (!t) return []
  return TOPICS.filter((x) => x.subject === t.subject && (x.lang || 'en') === (t.lang || 'en') && x.id !== topicId && hasQuestions(x.id)).map((x) => x.id)
}

/**
 * Build a question set.
 * topics: topic ids to draw from, weights optional { topicId: weight }
 * custom: admin-authored questions (eligible when their topic is in `topics`)
 * exclude: question ids to avoid if possible (recently seen) — relaxed when a topic has too few questions
 */
export function buildQuestionSet({ topics, count, mix, seed = Date.now(), custom = [], weights = {}, exclude = new Set(), difficulties = null }) {
  const usable = topics.filter((t) => hasQuestions(t) || custom.some((q) => q.topic === t))
  if (!usable.length) return []
  const r = makeRng(hashStr(String(seed)))
  const diffs = r.shuffle(difficulties || difficultyPlan(count, mix))
  const bag = []
  usable.forEach((t) => { for (let k = 0; k < (weights[t] || 1); k++) bag.push(t) })
  const order = r.shuffle(bag)
  const out = []
  const used = new Set()
  const customPool = r.shuffle(custom.filter((q) => usable.includes(q.topic) && !exclude.has(q.id)))
  const tryTopic = (topic, diff, i, strict) => {
    for (let k = 0; k < 8; k++) {
      const cand = generateQuestion(topic, diff, `${seed}-${i}-${k}`)
      if (cand && !used.has(cand.id) && (!strict || !exclude.has(cand.id))) return cand
    }
    // Small bank: walk it in order so every unused question can still be picked.
    if (BANKS[topic]) return bankQuestions(topic).find((q) => !used.has(q.id) && (!strict || !exclude.has(q.id))) || null
    return null
  }
  for (let i = 0; i < count; i++) {
    const diff = diffs[i]
    // ~25% custom questions when available, matching difficulty if possible
    const ci = customPool.findIndex((q) => q.difficulty === diff && !used.has(q.id))
    if (ci >= 0 && r.chance(0.25)) {
      const q = customPool.splice(ci, 1)[0]
      used.add(q.id); out.push(q); continue
    }
    const topic = order[i % order.length]
    if (!hasQuestions(topic)) {
      const c = customPool.find((q) => q.topic === topic && !used.has(q.id))
      if (c) { used.add(c.id); out.push(c); continue }
    }
    const q = (hasQuestions(topic) && (tryTopic(topic, diff, i, true) || tryTopic(topic, diff, i, false)))
      || siblings(topic).map((s) => tryTopic(s, diff, i, true)).find(Boolean)
    if (q) { used.add(q.id); out.push(q) }
  }
  return out
}

export const ALL_TOPIC_IDS = TOPICS.map((t) => t.id)
export const topicIdsBySubject = (subject) => TOPICS.filter((t) => t.subject === subject).map((t) => t.id)
