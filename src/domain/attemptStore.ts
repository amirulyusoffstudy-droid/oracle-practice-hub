const ACTIVE_ATTEMPT_KEY = 'oracle-practice.active-attempt.v1'
const ATTEMPT_HISTORY_KEY = 'oracle-practice.attempt-history.v1'
const HISTORY_LIMIT = 30

export type AttemptMode = 'practice' | 'exam' | 'review'

export interface PersistedAttempt {
  id: string
  mode: AttemptMode
  title: string
  seed: string
  questionIds: string[]
  responses: Record<string, string[]>
  flaggedIds: string[]
  currentIndex: number
  startedAt: string
  durationSeconds: number | null
  submittedAt: string | null
}

export interface AttemptHistoryEntry {
  id: string
  title: string
  mode: AttemptMode
  submittedAt: string
  score: number
  total: number
  percentage: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isAttemptMode(value: unknown): value is AttemptMode {
  return value === 'practice' || value === 'exam' || value === 'review'
}

function isResponses(value: unknown): value is Record<string, string[]> {
  return isRecord(value) && Object.values(value).every(isStringArray)
}

function isPersistedAttempt(value: unknown): value is PersistedAttempt {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    isAttemptMode(value.mode) &&
    typeof value.title === 'string' &&
    typeof value.seed === 'string' &&
    isStringArray(value.questionIds) &&
    isResponses(value.responses) &&
    isStringArray(value.flaggedIds) &&
    Number.isInteger(value.currentIndex) &&
    typeof value.startedAt === 'string' &&
    (value.durationSeconds === null || typeof value.durationSeconds === 'number') &&
    (value.submittedAt === null || typeof value.submittedAt === 'string')
  )
}

function isHistoryEntry(value: unknown): value is AttemptHistoryEntry {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    isAttemptMode(value.mode) &&
    typeof value.submittedAt === 'string' &&
    typeof value.score === 'number' &&
    typeof value.total === 'number' &&
    typeof value.percentage === 'number'
  )
}

function parseStoredValue(key: string): unknown {
  const rawValue = localStorage.getItem(key)
  if (rawValue === null) return null

  try {
    return JSON.parse(rawValue) as unknown
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function saveActiveAttempt(attempt: PersistedAttempt): void {
  localStorage.setItem(ACTIVE_ATTEMPT_KEY, JSON.stringify(attempt))
}

export function loadActiveAttempt(): PersistedAttempt | null {
  const storedAttempt = parseStoredValue(ACTIVE_ATTEMPT_KEY)
  if (!isPersistedAttempt(storedAttempt)) {
    if (storedAttempt !== null) localStorage.removeItem(ACTIVE_ATTEMPT_KEY)
    return null
  }

  return storedAttempt
}

export function clearActiveAttempt(): void {
  localStorage.removeItem(ACTIVE_ATTEMPT_KEY)
}

export function loadHistory(): AttemptHistoryEntry[] {
  const storedHistory = parseStoredValue(ATTEMPT_HISTORY_KEY)
  if (!Array.isArray(storedHistory)) return []

  return storedHistory.filter(isHistoryEntry).slice(0, HISTORY_LIMIT)
}

export function saveHistoryEntry(entry: AttemptHistoryEntry): void {
  const existingEntries = loadHistory().filter(
    (existingEntry) => existingEntry.id !== entry.id,
  )
  const updatedHistory = [entry, ...existingEntries].slice(0, HISTORY_LIMIT)
  localStorage.setItem(ATTEMPT_HISTORY_KEY, JSON.stringify(updatedHistory))
}
