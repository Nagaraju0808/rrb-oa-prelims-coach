// Structured topic guides: concept → shortcuts/tricks → important formulas/rules → quick approach → common traps.
// One file per subject so content is easy to update. Topics with no genuine shortcut leave `shortcuts` empty and rely on `quick`.
import reasoning from './reasoning.js'
import numerical from './numerical.js'
import language from './language.js'
import ga from './ga.js'
import computer from './computer.js'

export const GUIDES = { ...reasoning, ...numerical, ...language, ...ga, ...computer }

const EMPTY = { concept: '', shortcuts: [], formulas: [], quick: [], traps: [] }

/** Guide for a topic; custom (admin) topics fall back to their own notes. */
export function guideFor(topic) {
  if (!topic) return EMPTY
  const g = GUIDES[topic.id]
  if (g) return { ...EMPTY, ...g }
  return { ...EMPTY, concept: (topic.notes || []).join(' '), quick: topic.notes || [] }
}
