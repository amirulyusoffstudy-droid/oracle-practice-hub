import { describe, expect, it } from 'vitest'
import type { Question } from './types'
import {
  createAttempt,
  getRemainingSeconds,
  goToQuestion,
  setResponse,
  submitAttempt,
  toggleFlag,
} from './attemptLifecycle'

const bank: Question[] = (['A', 'B'] as const).flatMap((set) =>
  Array.from({ length: 4 }, (_, index) => ({
    id: `${set}-${index + 1}`,
    set,
    number: index + 1,
    topic: index % 2 === 0 ? 'Architecture' : 'SQL',
    type: 'single' as const,
    stem: `Question ${set}-${index + 1}`,
    options: { A: 'Wrong', B: 'Correct', C: 'Wrong', D: 'Wrong' },
    answers: ['B'],
    explanation: 'Test explanation.',
  })),
)

const startedAt = '2026-10-02T00:00:00.000Z'

function buildAttempt() {
  return createAttempt(bank, {
    id: 'attempt-1',
    mode: 'exam',
    title: 'Mixed test',
    seed: 'stable-seed',
    sets: ['A', 'B'],
    count: 4,
    balanceSets: true,
    recentlySeenIds: [],
    startedAt,
    durationSeconds: 120,
  })
}

describe('attempt lifecycle', () => {
  it('creates a deterministic balanced attempt with empty progress', () => {
    const first = buildAttempt()
    const second = buildAttempt()

    expect(first).toEqual(second)
    expect(first.questionIds).toHaveLength(4)
    expect(first.questionIds.filter((id) => id.startsWith('A-'))).toHaveLength(2)
    expect(first.questionIds.filter((id) => id.startsWith('B-'))).toHaveLength(2)
    expect(first.responses).toEqual({})
    expect(first.flaggedIds).toEqual([])
    expect(first.currentIndex).toBe(0)
    expect(first.submittedAt).toBeNull()
  })

  it('updates responses and flags without mutating the original attempt', () => {
    const attempt = buildAttempt()
    const questionId = attempt.questionIds[0]
    const answered = setResponse(attempt, questionId, ['B'])
    const flagged = toggleFlag(answered, questionId)

    expect(attempt.responses).toEqual({})
    expect(answered.responses[questionId]).toEqual(['B'])
    expect(flagged.flaggedIds).toEqual([questionId])
    expect(toggleFlag(flagged, questionId).flaggedIds).toEqual([])
  })

  it('clamps navigation to the valid question range', () => {
    const attempt = buildAttempt()
    expect(goToQuestion(attempt, -4).currentIndex).toBe(0)
    expect(goToQuestion(attempt, 99).currentIndex).toBe(3)
  })

  it('calculates a non-negative timer from the start time', () => {
    const attempt = buildAttempt()
    expect(getRemainingSeconds(attempt, new Date('2026-10-02T00:00:30.000Z'))).toBe(90)
    expect(getRemainingSeconds(attempt, new Date('2026-10-02T00:03:00.000Z'))).toBe(0)
  })

  it('submits once and returns exact-match scoring', () => {
    const attempt = buildAttempt()
    const answered = setResponse(attempt, attempt.questionIds[0], ['B'])
    const submitted = submitAttempt(
      answered,
      new Map(bank.map((question) => [question.id, question])),
      '2026-10-02T00:01:00.000Z',
    )

    expect(submitted.attempt.submittedAt).toBe('2026-10-02T00:01:00.000Z')
    expect(submitted.score.correct).toBe(1)
    expect(submitted.score.unanswered).toBe(3)
    expect(() =>
      submitAttempt(
        submitted.attempt,
        new Map(bank.map((question) => [question.id, question])),
        '2026-10-02T00:02:00.000Z',
      ),
    ).toThrow('Attempt has already been submitted')
  })
})
