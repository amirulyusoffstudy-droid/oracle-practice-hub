import {
  clearActiveAttempt,
  loadActiveAttempt,
  saveActiveAttempt,
  saveHistoryEntry,
  type PersistedAttempt,
} from './attemptStore'
import {
  goToQuestion,
  setResponse,
  submitAttempt,
  toggleFlag,
  type SubmittedAttemptResult,
} from './attemptLifecycle'
import { recordQuestionPerformance } from './questionPerformanceStore'
import type { Question } from './types'

function requireActiveAttempt(): PersistedAttempt {
  const attempt = loadActiveAttempt()
  if (!attempt) throw new Error('No active attempt')
  return attempt
}

function updateAndSave(
  update: (attempt: PersistedAttempt) => PersistedAttempt,
): PersistedAttempt {
  const updatedAttempt = update(requireActiveAttempt())
  saveActiveAttempt(updatedAttempt)
  return updatedAttempt
}

export function startAttemptSession(attempt: PersistedAttempt): void {
  if (attempt.submittedAt !== null) {
    throw new Error('Cannot start a submitted attempt')
  }
  saveActiveAttempt(attempt)
}

export function answerCurrentAttempt(
  questionId: string,
  optionIds: readonly string[],
): PersistedAttempt {
  return updateAndSave((attempt) => setResponse(attempt, questionId, optionIds))
}

export function flagCurrentQuestion(questionId: string): PersistedAttempt {
  return updateAndSave((attempt) => toggleFlag(attempt, questionId))
}

export function navigateCurrentAttempt(index: number): PersistedAttempt {
  return updateAndSave((attempt) => goToQuestion(attempt, index))
}

export function submitCurrentAttempt(
  questionLookup: ReadonlyMap<string, Question>,
  submittedAt: string,
): SubmittedAttemptResult {
  const result = submitAttempt(requireActiveAttempt(), questionLookup, submittedAt)

  recordQuestionPerformance(result.attempt, questionLookup)
  saveHistoryEntry({
    id: result.attempt.id,
    title: result.attempt.title,
    mode: result.attempt.mode,
    submittedAt,
    score: result.score.correct,
    total: result.score.total,
    percentage: result.score.percentage,
  })
  clearActiveAttempt()

  return result
}
