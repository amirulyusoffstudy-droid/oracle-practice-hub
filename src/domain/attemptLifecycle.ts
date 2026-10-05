import type { PersistedAttempt, AttemptMode } from './attemptStore'
import { buildAttemptQuestions, scoreAttempt } from './examEngine'
import type { ExamSet, Question, ScoreResult } from './types'

export interface CreateAttemptConfig {
  id: string
  mode: AttemptMode
  title: string
  seed: string
  sets: ExamSet[]
  count: number
  balanceSets: boolean
  recentlySeenIds: string[]
  priorityIds?: string[]
  startedAt: string
  durationSeconds: number | null
}

export interface SubmittedAttemptResult {
  attempt: PersistedAttempt
  score: ScoreResult
}

function requireActiveAttempt(attempt: PersistedAttempt): void {
  if (attempt.submittedAt !== null) {
    throw new Error('Attempt has already been submitted')
  }
}

export function createAttempt(
  bank: readonly Question[],
  config: CreateAttemptConfig,
): PersistedAttempt {
  const questions = buildAttemptQuestions(bank, {
    sets: config.sets,
    count: config.count,
    seed: config.seed,
    balanceSets: config.balanceSets,
    recentlySeenIds: config.recentlySeenIds,
    priorityIds: config.priorityIds,
  })

  return {
    id: config.id,
    mode: config.mode,
    title: config.title,
    seed: config.seed,
    questionIds: questions.map((question) => question.id),
    responses: {},
    flaggedIds: [],
    currentIndex: 0,
    startedAt: config.startedAt,
    durationSeconds: config.durationSeconds,
    submittedAt: null,
  }
}

export function setResponse(
  attempt: PersistedAttempt,
  questionId: string,
  optionIds: readonly string[],
): PersistedAttempt {
  requireActiveAttempt(attempt)
  if (!attempt.questionIds.includes(questionId)) {
    throw new Error(`Question ${questionId} is not part of this attempt`)
  }

  const uniqueOptionIds = [...new Set(optionIds)]
  const responses = { ...attempt.responses }
  if (uniqueOptionIds.length === 0) delete responses[questionId]
  else responses[questionId] = uniqueOptionIds

  return { ...attempt, responses }
}

export function toggleFlag(
  attempt: PersistedAttempt,
  questionId: string,
): PersistedAttempt {
  requireActiveAttempt(attempt)
  if (!attempt.questionIds.includes(questionId)) {
    throw new Error(`Question ${questionId} is not part of this attempt`)
  }

  const flagged = new Set(attempt.flaggedIds)
  if (flagged.has(questionId)) flagged.delete(questionId)
  else flagged.add(questionId)

  return { ...attempt, flaggedIds: [...flagged] }
}

export function goToQuestion(
  attempt: PersistedAttempt,
  requestedIndex: number,
): PersistedAttempt {
  requireActiveAttempt(attempt)
  const lastIndex = Math.max(0, attempt.questionIds.length - 1)
  const currentIndex = Math.min(lastIndex, Math.max(0, Math.trunc(requestedIndex)))
  return { ...attempt, currentIndex }
}

export function getRemainingSeconds(
  attempt: PersistedAttempt,
  now: Date = new Date(),
): number | null {
  if (attempt.durationSeconds === null) return null

  const startedAt = Date.parse(attempt.startedAt)
  if (!Number.isFinite(startedAt)) return attempt.durationSeconds

  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startedAt) / 1000))
  return Math.max(0, attempt.durationSeconds - elapsedSeconds)
}

export function submitAttempt(
  attempt: PersistedAttempt,
  questionLookup: ReadonlyMap<string, Question>,
  submittedAt: string,
): SubmittedAttemptResult {
  requireActiveAttempt(attempt)

  const questions = attempt.questionIds.map((questionId) => {
    const question = questionLookup.get(questionId)
    if (!question) throw new Error(`Question ${questionId} could not be found`)
    return question
  })
  const submittedAttempt = { ...attempt, submittedAt }

  return {
    attempt: submittedAttempt,
    score: scoreAttempt(questions, attempt.responses),
  }
}
