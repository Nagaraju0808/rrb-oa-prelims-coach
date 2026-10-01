import { makeRng } from './rng.js'
import { NUMERICAL_GENERATORS } from './numerical.js'
import { REASONING_GENERATORS } from './reasoning.js'
import { PUZZLE_GENERATORS } from './puzzles.js'
import { TOPICS, topicById } from '../syllabus.js'

export const GENERATORS = { ...NUMERICAL_GENERATORS, ...REASONING_GENERATORS, ...PUZZLE_GENERATORS }
export const DIFFICULTIES = ['easy', 'medium', 'hard']

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Generate one question deterministically. id format: g|topic|difficulty|seed */
export function generateQuestion(topicId, difficulty, seed) {
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
    id: `g|${topicId}|${difficulty}|${seed}`,
    subject: topicById[topicId]?.subject,
    topic: topicId,
    subtopic: q.subtopic,
    difficulty,
    stem: q.stem,
    data: q.data || null,
    options,
    answer: options.indexOf(q.correct),
    explanation: q.explanation,
    source: 'generated',
  }
}

export function questionFromId(id, customQuestions = []) {
  if (id.startsWith('g|')) {
    const [, topic, diff, seed] = id.split('|')
    return generateQuestion(topic, diff, seed)
  }
  return customQuestions.find((q) => q.id === id) || null
}

/** Distribute `count` across difficulties by percentage mix {easy, medium, hard}. */
export function difficultyPlan(count, mix = { easy: 30, medium: 50, hard: 20 }) {
  const total = mix.easy + mix.medium + mix.hard || 1
  const e = Math.round((count * mix.easy) / total), h = Math.round((count * mix.hard) / total)
  return [...Array(e).fill('easy'), ...Array(Math.max(0, count - e - h)).fill('medium'), ...Array(h).fill('hard')]
}

/**
 * Build a question set.
 * topics: topic ids to draw from (round-robin), weights optional { topicId: weight }
 * custom: admin-authored questions (eligible when their topic is in `topics`)
 * exclude: set of question ids to avoid (recently seen)
 */
export function buildQuestionSet({ topics, count, mix, seed = Date.now(), custom = [], weights = {}, exclude = new Set(), difficulties = null }) {
  const usable = topics.filter((t) => GENERATORS[t] || custom.some((q) => q.topic === t))
  if (!usable.length) return []
  const r = makeRng(hashStr(String(seed)))
  const diffs = r.shuffle(difficulties || difficultyPlan(count, mix))
  // Weighted topic sequence
  const bag = []
  usable.forEach((t) => { for (let k = 0; k < (weights[t] || 1); k++) bag.push(t) })
  const order = r.shuffle(bag)
  const out = []
  const used = new Set()
  const customPool = r.shuffle(custom.filter((q) => usable.includes(q.topic) && !exclude.has(q.id)))
  for (let i = 0; i < count; i++) {
    const diff = diffs[i]
    // ~25% custom questions when available, matching difficulty if possible
    const ci = customPool.findIndex((q) => q.difficulty === diff && !used.has(q.id))
    if (ci >= 0 && r.chance(0.25)) {
      const q = customPool.splice(ci, 1)[0]
      used.add(q.id); out.push(q); continue
    }
    const topic = order[i % order.length]
    if (!GENERATORS[topic]) {
      const c = customPool.find((q) => q.topic === topic && !used.has(q.id))
      if (c) { used.add(c.id); out.push(c); continue }
    }
    let q = null
    for (let k = 0; k < 6 && !q; k++) {
      const cand = generateQuestion(GENERATORS[topic] ? topic : r.pick(usable.filter((t) => GENERATORS[t])), diff, `${seed}-${i}-${k}`)
      if (cand && !used.has(cand.id) && !exclude.has(cand.id)) q = cand
    }
    if (q) { used.add(q.id); out.push(q) }
  }
  return out
}

export const ALL_TOPIC_IDS = TOPICS.map((t) => t.id)
export const topicIdsBySubject = (subject) => TOPICS.filter((t) => t.subject === subject).map((t) => t.id)
