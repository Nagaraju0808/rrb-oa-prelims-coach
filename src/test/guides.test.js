import { describe, it, expect } from 'vitest'
import { TOPICS } from '../lib/syllabus.js'
import { GUIDES, guideFor } from '../lib/guides/index.js'
import { BANKS, bankQuestions, questionFromId, hasQuestions, buildQuestionSet } from '../lib/questions/index.js'

describe('topic guides', () => {
  it('every syllabus topic has a guide with a concept and either shortcuts or a quick approach', () => {
    for (const t of TOPICS) {
      const g = GUIDES[t.id]
      expect(g, t.id).toBeTruthy()
      expect(g.concept.length, t.id).toBeGreaterThan(20)
      expect(g.shortcuts.length + g.quick.length, t.id).toBeGreaterThan(0)
      for (const s of g.shortcuts) { expect(s.length, t.id).toBe(2); expect(s[1].length, t.id).toBeGreaterThan(5) }
    }
  })
  it('custom topics fall back to their notes', () => {
    expect(guideFor({ id: 'x', notes: ['note one'] }).quick).toEqual(['note one'])
  })
})

describe('curated question banks', () => {
  it('every non-generated topic (except Current Affairs) has questions', () => {
    for (const t of TOPICS) if (t.id !== 'current-affairs') expect(hasQuestions(t.id), t.id).toBe(true)
  })
  for (const [topic, rows] of Object.entries(BANKS)) {
    it(`${topic}: well-formed questions with unique ids`, () => {
      expect(TOPICS.some((t) => t.id === topic), `unknown topic ${topic}`).toBe(true)
      expect(new Set(rows.map((r) => r[0])).size).toBe(rows.length)
      for (const q of bankQuestions(topic)) {
        expect(q.options.length, q.id).toBe(4)
        expect(new Set(q.options).size, q.id).toBe(4)
        expect(q.answer, q.id).toBeGreaterThanOrEqual(0)
        expect(['easy', 'medium', 'hard']).toContain(q.difficulty)
        expect(q.explanation.length, q.id).toBeGreaterThan(5)
        expect(questionFromId(q.id)).toEqual(q)
      }
    })
  }
  it('a revision quiz on a small bank still returns the requested count without duplicates', () => {
    const qs = buildQuestionSet({ topics: ['dbms-basics'], count: 10, seed: 3 })
    expect(qs.length).toBe(10)
    expect(new Set(qs.map((q) => q.id)).size).toBe(10)
    expect(qs.every((q) => q.subject === 'computer')).toBe(true)
  })
})

// Numerical checks of the formulas quoted in the Numerical Ability guide.
describe('guide formulas are mathematically correct', () => {
  const close = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-9)
  it('successive percentage a + b + ab/100', () => {
    for (const [a, b] of [[20, -20], [10, 20], [-15, 30]]) close((1 + a / 100) * (1 + b / 100) * 100 - 100, a + b + (a * b) / 100)
  })
  it('“r% more” ⇒ “r/(100+r)% less” and price-rise consumption cut', () => {
    for (const r of [20, 25, 50]) close((((100 + r) - 100) / (100 + r)) * 100, (r / (100 + r)) * 100)
  })
  it('CI − SI for 2 and 3 years', () => {
    for (const [P, R] of [[10000, 10], [5000, 8], [2500, 20]]) {
      const r = R / 100
      close(P * (1 + r) ** 2 - P - P * r * 2, P * r * r)
      close(P * (1 + r) ** 3 - P - P * r * 3, P * r * r * (3 + r))
      close(((1 + r) ** 2 - 1) * 100, 2 * R + (R * R) / 100)
    }
  })
  it('same SP with x% profit and x% loss gives x²/100 % loss', () => {
    for (const x of [10, 20, 25]) {
      const sp = 100, cp1 = sp / (1 + x / 100), cp2 = sp / (1 - x / 100)
      close(((2 * sp - (cp1 + cp2)) / (cp1 + cp2)) * 100, -(x * x) / 100)
    }
  })
  it('successive discounts and buy-x-get-y-free', () => {
    close(100 - 100 * 0.8 * 0.9, 20 + 10 - (20 * 10) / 100)
    close((1 / (3 + 1)) * 100, 25) // buy 3 get 1 free
  })
  it('average speed 2xy/(x+y), combined work ab/(a+b), boats', () => {
    const d = 120; close((2 * d) / (d / 40 + d / 60), (2 * 40 * 60) / 100)
    close(1 / (1 / 12 + 1 / 24), (12 * 24) / 36)
    const B = 12, S = 3; close(((B + S) + (B - S)) / 2, B); close(((B + S) - (B - S)) / 2, S)
  })
  it('alligation and repeated replacement', () => {
    const c = 20, dd = 50, m = 30 // mix ratio cheaper:dearer = (50-30):(30-20) = 2:1
    close((2 * c + 1 * dd) / 3, m)
    let milk = 80; for (let k = 0; k < 2; k++) milk -= milk * (8 / 80); close(milk, 80 * (1 - 8 / 80) ** 2)
  })
  it('area change 2x + x²/100, ranking overlap and ages formula', () => {
    close(((1.1 * 1.1) - 1) * 100, 2 * 10 + 100 / 100)
    // row of 20: A 12th from left, B 11th from right (= 10th from left) → overlap; between = |12 − 10| − 1 = 1 = (12 + 11) − 20 − 2
    expect((12 + 11) - 20 - 2).toBe(1)
    const [a, b, c2, d2, n] = [3, 5, 2, 3, 6] // (3x+6)/(5x+6) = 2/3 → x = 6(3−2)/(10−9) = 6
    expect(n * (d2 - c2) / (b * c2 - a * d2)).toBe(6); expect((a * 6 + n) * d2).toBe((b * 6 + n) * c2)
  })
  it('number system facts', () => {
    expect([1, 2, 3, 4, 5, 6].map((k) => (2 ** k) % 10)).toEqual([2, 4, 8, 6, 2, 4]) // cycle of 4
    expect([...Array(72).keys()].map((x) => x + 1).filter((x) => 72 % x === 0).length).toBe((3 + 1) * (2 + 1)) // 72 = 2³ × 3²
    close((50 + 3) ** 2, 2500 + 300 + 9); expect(65 ** 2).toBe(4225); expect(47 * 11).toBe(517)
  })
})
