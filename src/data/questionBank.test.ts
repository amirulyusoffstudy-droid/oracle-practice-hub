import { describe, expect, it } from 'vitest'
import { questionBank } from './questionBank'

describe('questionBank', () => {
  it('contains exactly 72 valid questions in each of Sets A-D', () => {
    for (const set of ['A', 'B', 'C', 'D'] as const) {
      const questions = questionBank.filter((question) => question.set === set)
      expect(questions).toHaveLength(72)
      expect(questions.map((question) => question.number)).toEqual(
        Array.from({ length: 72 }, (_, index) => index + 1),
      )
    }
  })

  it('uses globally unique IDs and valid answer option IDs', () => {
    expect(new Set(questionBank.map((question) => question.id)).size).toBe(288)
    for (const question of questionBank) {
      expect(question.answers.length).toBeGreaterThan(0)
      expect(question.answers.every((answer) => answer in question.options)).toBe(true)
      expect(question.explanation.trim().length).toBeGreaterThan(20)
    }
  })
})
