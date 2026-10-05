import { describe, expect, it } from 'vitest'
import type { Question } from './types'
import {
  buildAttemptQuestions,
  isExactAnswer,
  scoreAttempt,
  seededShuffle,
  shuffleQuestionOptions,
} from './examEngine'

const bank: Question[] = (['A', 'B', 'C', 'D'] as const).flatMap((set) =>
  Array.from({ length: 24 }, (_, index) => ({
    id: `${set}-${index + 1}`,
    set,
    number: index + 1,
    topic: index % 2 === 0 ? 'Architecture' : 'SQL',
    type: 'single' as const,
    stem: `Question ${set}-${index + 1}`,
    options: { A: 'Wrong', B: 'Correct', C: 'Wrong', D: 'Wrong' },
    answers: ['B'],
    explanation: 'A sufficiently detailed explanation for this deterministic test fixture.',
  })),
)

describe('seededShuffle', () => {
  it('returns the same order for the same seed without mutating input', () => {
    const input = ['A', 'B', 'C', 'D', 'E']
    const original = [...input]
    expect(seededShuffle(input, 'stable-seed')).toEqual(seededShuffle(input, 'stable-seed'))
    expect(input).toEqual(original)
  })
})

describe('buildAttemptQuestions', () => {
  it('builds a balanced mixed attempt with an equal number from each set', () => {
    const selected = buildAttemptQuestions(bank, {
      sets: ['A', 'B', 'C', 'D'],
      count: 72,
      seed: 'attempt-one',
      balanceSets: true,
      recentlySeenIds: [],
    })
    expect(selected).toHaveLength(72)
    for (const set of ['A', 'B', 'C', 'D']) {
      expect(selected.filter((question) => question.set === set)).toHaveLength(18)
    }
  })

  it('prefers unseen questions when enough are available', () => {
    const seen = bank.slice(0, 12).map((question) => question.id)
    const selected = buildAttemptQuestions(bank, {
      sets: ['A'],
      count: 12,
      seed: 'avoid-recent',
      balanceSets: false,
      recentlySeenIds: seen,
    })
    expect(selected.every((question) => !seen.includes(question.id))).toBe(true)
  })
})

describe('answers and option shuffling', () => {
  it('scores multiple-answer questions only by exact match', () => {
    expect(isExactAnswer(['A', 'C'], ['C', 'A'])).toBe(true)
    expect(isExactAnswer(['A'], ['A', 'C'])).toBe(false)
    expect(isExactAnswer(['A', 'B', 'C'], ['A', 'C'])).toBe(false)
  })

  it('preserves option IDs and correct answers while shuffling display order', () => {
    const question = bank[0]
    const shuffled = shuffleQuestionOptions(question, 'option-seed')
    expect(new Set(shuffled.map((option) => option.id))).toEqual(new Set(['A', 'B', 'C', 'D']))
    expect(shuffled.find((option) => option.id === 'B')?.text).toBe('Correct')
  })

  it('calculates total and topic breakdown', () => {
    const result = scoreAttempt(bank.slice(0, 4), {
      'A-1': ['B'],
      'A-2': ['A'],
      'A-3': ['B'],
    })
    expect(result.correct).toBe(2)
    expect(result.incorrect).toBe(1)
    expect(result.unanswered).toBe(1)
    expect(result.total).toBe(4)
    expect(result.percentage).toBe(50)
  })
})
