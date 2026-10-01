import { describe, it, expect } from 'vitest'
import { generateQuestion, hasQuestions, buildQuestionSet, difficultyPlan, questionFromId } from '../lib/questions/index.js'
import { TOPICS } from '../lib/syllabus.js'

describe('question generators', () => {
  // Current Affairs has no built-in source (no live news feed) — questions come from the Admin panel.
  const covered = TOPICS.filter((t) => t.id !== 'current-affairs')
  it('every syllabus topic except Current Affairs has a generator or a question bank', () => {
    for (const t of covered) expect(hasQuestions(t.id), t.id).toBe(true)
  })
  for (const t of covered) {
    it(`${t.id} produces valid questions`, () => {
      for (const d of ['easy', 'medium', 'hard']) {
        for (let s = 0; s < 120; s++) {
          const q = generateQuestion(t.id, d, s)
          const ctx = `${t.id}/${d}/${s}: ${q.stem}\n${JSON.stringify(q.options)}`
          expect(q.options.length, ctx).toBe(4)
          expect(new Set(q.options).size, ctx).toBe(4)
          expect(q.answer, ctx).toBeGreaterThanOrEqual(0)
          const blob = q.stem + q.options.join('|') + q.explanation
          expect(blob, ctx).not.toMatch(/NaN|undefined|Infinity|null/)
          expect(q.subject).toBe(t.subject)
        }
      }
    })
  }
  it('is deterministic by id', () => {
    const a = generateQuestion('percentage', 'medium', 'x1')
    expect(questionFromId(a.id)).toEqual(a)
  })
  it('difficulty plan follows 30/50/20 by default', () => {
    const p = difficultyPlan(30)
    expect(p.filter((x) => x === 'easy').length).toBe(9)
    expect(p.filter((x) => x === 'medium').length).toBe(15)
    expect(p.filter((x) => x === 'hard').length).toBe(6)
  })
  it('builds a set with unique questions from the given topics only', () => {
    const qs = buildQuestionSet({ topics: ['syllogism', 'linear-seating'], count: 15, seed: 7 })
    expect(qs.length).toBe(15)
    expect(new Set(qs.map((q) => q.id)).size).toBe(15)
    expect(qs.every((q) => ['syllogism', 'linear-seating'].includes(q.topic))).toBe(true)
  })
})
