import { beforeEach, describe, expect, it } from 'vitest'
import type { PersistedAttempt } from './attemptStore'
import {
  getPriorityQuestionIds,
  loadQuestionPerformance,
  recordQuestionPerformance,
} from './questionPerformanceStore'
import type { Question } from './types'

const questions: Question[] = [
  {
    id: 'A-1',
    set: 'A',
    number: 1,
    topic: 'SQL',
    type: 'single',
    stem: 'Question one',
    options: { A: 'Wrong', B: 'Correct' },
    answers: ['B'],
    explanation: 'Explanation one.',
  },
  {
    id: 'A-2',
    set: 'A',
    number: 2,
    topic: 'SQL',
    type: 'single',
    stem: 'Question two',
    options: { A: 'Wrong', B: 'Correct' },
    answers: ['B'],
    explanation: 'Explanation two.',
  },
  {
    id: 'A-3',
    set: 'A',
    number: 3,
    topic: 'Architecture',
    type: 'single',
    stem: 'Question three',
    options: { A: 'Wrong', B: 'Correct' },
    answers: ['B'],
    explanation: 'Explanation three.',
  },
]

const attempt: PersistedAttempt = {
  id: 'attempt-1',
  mode: 'exam',
  title: 'Set A',
  seed: 'seed-1',
  questionIds: ['A-1', 'A-2', 'A-3'],
  responses: { 'A-1': ['B'], 'A-2': ['A'] },
  flaggedIds: [],
  currentIndex: 2,
  startedAt: '2026-10-02T00:00:00.000Z',
  durationSeconds: 120,
  submittedAt: '2026-10-02T00:02:00.000Z',
}

const lookup = new Map(questions.map((question) => [question.id, question]))

describe('question performance store', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty record for malformed storage', () => {
    localStorage.setItem('oracle-practice.question-performance.v1', '{bad json')
    expect(loadQuestionPerformance()).toEqual({})
  })

  it('records correct, incorrect, and unanswered outcomes', () => {
    const performance = recordQuestionPerformance(attempt, lookup)

    expect(performance['A-1']).toMatchObject({
      timesSeen: 1,
      timesCorrect: 1,
      timesIncorrect: 0,
      timesUnanswered: 0,
      lastAttemptId: 'attempt-1',
    })
    expect(performance['A-2'].timesIncorrect).toBe(1)
    expect(performance['A-3'].timesUnanswered).toBe(1)
    expect(loadQuestionPerformance()).toEqual(performance)
  })

  it('accumulates outcomes and prioritizes incorrect or unanswered questions', () => {
    recordQuestionPerformance(attempt, lookup)
    const secondAttempt: PersistedAttempt = {
      ...attempt,
      id: 'attempt-2',
      responses: { 'A-1': ['B'], 'A-2': ['B'], 'A-3': ['A'] },
      submittedAt: '2026-10-03T00:02:00.000Z',
    }
    const performance = recordQuestionPerformance(secondAttempt, lookup)

    expect(performance['A-1'].timesCorrect).toBe(2)
    expect(performance['A-2']).toMatchObject({ timesCorrect: 1, timesIncorrect: 1 })
    expect(getPriorityQuestionIds(performance)).toEqual(expect.arrayContaining(['A-2', 'A-3']))
    expect(getPriorityQuestionIds(performance)).not.toContain('A-1')
  })

  it('rejects attempts that have not been submitted', () => {
    expect(() =>
      recordQuestionPerformance({ ...attempt, submittedAt: null }, lookup),
    ).toThrow('Attempt must be submitted before recording performance')
  })
})
