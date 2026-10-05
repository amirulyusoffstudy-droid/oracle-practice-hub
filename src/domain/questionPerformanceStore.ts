import type { PersistedAttempt } from './attemptStore'
import { isExactAnswer } from './examEngine'
import type { Question } from './types'

const QUESTION_PERFORMANCE_KEY = 'oracle-practice.question-performance.v1'

export interface QuestionPerformance {
  timesSeen: number
  timesCorrect: number
  timesIncorrect: number
  timesUnanswered: number
  lastSeenAt: string
  lastAttemptId: string
}

export type QuestionPerformanceRecord = Record<string, QuestionPerformance>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function isQuestionPerformance(value: unknown): value is QuestionPerformance {
  if (!isRecord(value)) return false

  return (
    isNonNegativeInteger(value.timesSeen) &&
    isNonNegativeInteger(value.timesCorrect) &&
    isNonNegativeInteger(value.timesIncorrect) &&
    isNonNegativeInteger(value.timesUnanswered) &&
    typeof value.lastSeenAt === 'string' &&
    typeof value.lastAttemptId === 'string'
  )
}

export function loadQuestionPerformance(): QuestionPerformanceRecord {
  const storedValue = localStorage.getItem(QUESTION_PERFORMANCE_KEY)
  if (storedValue === null) return {}

  try {
    const parsed = JSON.parse(storedValue) as unknown
    if (!isRecord(parsed)) throw new Error('Invalid performance data')

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, QuestionPerformance] =>
        isQuestionPerformance(entry[1]),
      ),
    )
  } catch {
    localStorage.removeItem(QUESTION_PERFORMANCE_KEY)
    return {}
  }
}

export function recordQuestionPerformance(
  attempt: PersistedAttempt,
  questionLookup: ReadonlyMap<string, Question>,
): QuestionPerformanceRecord {
  if (attempt.submittedAt === null) {
    throw new Error('Attempt must be submitted before recording performance')
  }

  const performance = loadQuestionPerformance()
  for (const questionId of attempt.questionIds) {
    const question = questionLookup.get(questionId)
    if (!question) throw new Error(`Question ${questionId} could not be found`)

    const selectedOptions = attempt.responses[questionId] ?? []
    const answered = selectedOptions.length > 0
    const correct = answered && isExactAnswer(selectedOptions, question.answers)
    const previous = performance[questionId] ?? {
      timesSeen: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      timesUnanswered: 0,
      lastSeenAt: attempt.submittedAt,
      lastAttemptId: attempt.id,
    }

    performance[questionId] = {
      timesSeen: previous.timesSeen + 1,
      timesCorrect: previous.timesCorrect + (correct ? 1 : 0),
      timesIncorrect: previous.timesIncorrect + (answered && !correct ? 1 : 0),
      timesUnanswered: previous.timesUnanswered + (!answered ? 1 : 0),
      lastSeenAt: attempt.submittedAt,
      lastAttemptId: attempt.id,
    }
  }

  localStorage.setItem(QUESTION_PERFORMANCE_KEY, JSON.stringify(performance))
  return performance
}

export function getPriorityQuestionIds(
  performance: QuestionPerformanceRecord,
): string[] {
  return Object.entries(performance)
    .filter(([, value]) => value.timesIncorrect > 0 || value.timesUnanswered > 0)
    .sort(([, left], [, right]) => {
      const leftPriority = left.timesIncorrect * 2 + left.timesUnanswered
      const rightPriority = right.timesIncorrect * 2 + right.timesUnanswered
      return rightPriority - leftPriority || left.lastSeenAt.localeCompare(right.lastSeenAt)
    })
    .map(([questionId]) => questionId)
}
