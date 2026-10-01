import { numOptions } from './rng.js'

// Number-system conversions for Computer Fundamentals (mixed with the curated bank).
function numberConversion(r, d) {
  const n = d === 'easy' ? r.int(5, 31) : r.int(32, 255)
  const type = d === 'hard' ? r.pick(['hex', 'dec2bin']) : r.pick(['bin2dec', 'dec2bin'])
  const bin = n.toString(2)
  if (type === 'bin2dec') {
    const parts = [...bin].reverse().map((b, i) => (b === '1' ? 2 ** i : 0)).filter(Boolean).reverse()
    return { subtopic: 'Number systems', stem: `What is the decimal value of the binary number ${bin}?`, ...numOptions(r, n, { step: r.pick([1, 2, 4]) }),
      explanation: `Add the place values of the 1-bits: ${parts.join(' + ')} = ${n}.` }
  }
  if (type === 'dec2bin') {
    const wrong = [n + 1, n - 1, n ^ 2, n + 2, n ^ 4].filter((x) => x > 0 && x !== n).map((x) => x.toString(2))
    return { subtopic: 'Number systems', stem: `What is the binary equivalent of the decimal number ${n}?`, correct: bin, wrong: r.shuffle([...new Set(wrong)]).slice(0, 3),
      explanation: `Divide ${n} by 2 repeatedly and read the remainders from bottom to top: ${bin}.` }
  }
  const hex = n.toString(16).toUpperCase()
  const wrong = [n + 1, n - 1, n + 16, n - 16].filter((x) => x > 0).map((x) => x.toString(16).toUpperCase())
  return { subtopic: 'Number systems', stem: `What is the hexadecimal equivalent of the decimal number ${n}?`, correct: hex, wrong: r.shuffle(wrong).slice(0, 3),
    explanation: `${n} ÷ 16 = ${Math.floor(n / 16)} remainder ${n % 16}, so the hex value is ${hex} (A = 10 … F = 15).` }
}

export const COMPUTER_GENERATORS = { 'computer-fundamentals': numberConversion }
