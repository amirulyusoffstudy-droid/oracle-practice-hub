import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearActiveAttempt,
  loadActiveAttempt,
  loadHistory,
  saveActiveAttempt,
  saveHistoryEntry,
  type PersistedAttempt,
} from './attemptStore'

const attempt: PersistedAttempt = {
  id: 'attempt-1',
  mode: 'exam',
  title: 'Smart Mixed Mock',
  seed: 'seed-1',
  questionIds: ['A-01', 'B-01'],
  responses: { 'A-01': ['B'] },
  flaggedIds: ['B-01'],
  currentIndex: 1,
  startedAt: '2026-10-02T00:00:00.000Z',
  durationSeconds: 7200,
  submittedAt: null,
}

describe('attemptStore', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips the active attempt and clears it', () => {
    saveActiveAttempt(attempt)
    expect(loadActiveAttempt()).toEqual(attempt)
    clearActiveAttempt()
    expect(loadActiveAttempt()).toBeNull()
  })

  it('returns null instead of throwing for corrupted storage', () => {
    localStorage.setItem('oracle-practice.active-attempt.v1', '{bad json')
    expect(loadActiveAttempt()).toBeNull()
  })

  it('stores newest history first and caps history at 30 entries', () => {
    for (let index = 0; index < 35; index += 1) {
      saveHistoryEntry({
        id: `attempt-${index}`,
        title: `Attempt ${index}`,
        mode: 'practice',
        submittedAt: new Date(2026, 0, index + 1).toISOString(),
        score: index,
        total: 35,
        percentage: index,
      })
    }
    const history = loadHistory()
    expect(history).toHaveLength(30)
    expect(history[0].id).toBe('attempt-34')
    expect(history.at(-1)?.id).toBe('attempt-5')
  })
})
