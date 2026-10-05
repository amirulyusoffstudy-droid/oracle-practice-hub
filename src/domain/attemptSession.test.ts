import { beforeEach, describe, expect, it } from 'vitest'
import { loadActiveAttempt, loadHistory, type PersistedAttempt } from './attemptStore'
import {
  answerCurrentAttempt,
  flagCurrentQuestion,
  navigateCurrentAttempt,
  startAttemptSession,
  submitCurrentAttempt,
} from './attemptSession'
import { loadQuestionPerformance } from './questionPerformanceStore'
import type { Question } from './types'

const question: Question = {
  id: 'A-1',
  set: 'A',
  number: 1,
  topic: 'SQL',
  type: 'single',
  stem: 'Question one',
  options: { A: 'Wrong', B: 'Correct' },
  answers: ['B'],
  explanation: 'Explanation.',
}

const attempt: PersistedAttempt = {
  id: 'attempt-1',
  mode: 'practice',
  title: 'Set A practice',
  seed: 'seed-1',
  questionIds: ['A-1'],
  responses: {},
  flaggedIds: [],
  currentIndex: 0,
  startedAt: '2026-10-02T00:00:00.000Z',
  durationSeconds: null,
  submittedAt: null,
}

describe('attempt session orchestration', () => {
  beforeEach(() => localStorage.clear())

  it('autosaves start, answer, flag, and navigation changes', () => {
    startAttemptSession(attempt)
    answerCurrentAttempt('A-1', ['B'])
    flagCurrentQuestion('A-1')
    navigateCurrentAttempt(9)

    expect(loadActiveAttempt()).toMatchObject({
      responses: { 'A-1': ['B'] },
      flaggedIds: ['A-1'],
      currentIndex: 0,
    })
  })

  it('submits to history and performance, then clears the active attempt', () => {
    const lookup = new Map([[question.id, question]])
    startAttemptSession(attempt)
    answerCurrentAttempt('A-1', ['B'])
    const result = submitCurrentAttempt(lookup, '2026-10-02T00:01:00.000Z')

    expect(result.score.correct).toBe(1)
    expect(loadActiveAttempt()).toBeNull()
    expect(loadHistory()[0]).toMatchObject({
      id: 'attempt-1',
      score: 1,
      total: 1,
      percentage: 100,
    })
    expect(loadQuestionPerformance()['A-1'].timesCorrect).toBe(1)
  })

  it('fails clearly when no active attempt exists', () => {
    expect(() => answerCurrentAttempt('A-1', ['B'])).toThrow('No active attempt')
  })
})
