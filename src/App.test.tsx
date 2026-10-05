import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { loadActiveAttempt, saveActiveAttempt } from './domain/attemptStore'

afterEach(cleanup)

describe('dashboard and exam setup', () => {
  beforeEach(() => localStorage.clear())

  it('shows the complete local question library and setup controls', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Oracle Practice Hub' })).toBeTruthy()
    expect(screen.getByText('288 questions')).toBeTruthy()
    expect(screen.getByLabelText('Mode')).toBeTruthy()
    expect(screen.getByLabelText('Question source')).toBeTruthy()
    expect(screen.getByLabelText('Question count')).toBeTruthy()
  })

  it('starts and persists a configured Set A exam', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Mode'), 'exam')
    await user.selectOptions(screen.getByLabelText('Question source'), 'A')
    await user.selectOptions(screen.getByLabelText('Question count'), '18')
    await user.click(screen.getByRole('button', { name: 'Start attempt' }))

    const attempt = loadActiveAttempt()
    expect(attempt).not.toBeNull()
    expect(attempt?.mode).toBe('exam')
    expect(attempt?.questionIds).toHaveLength(18)
    expect(attempt?.questionIds.every((id) => id.startsWith('A-'))).toBe(true)
    expect(screen.getByText('Question 1 of 18')).toBeTruthy()
  })

  it('shows a resume card when an active attempt exists', () => {
    saveActiveAttempt({
      id: 'attempt-1',
      mode: 'practice',
      title: 'Set B Practice',
      seed: 'seed-1',
      questionIds: ['B-01', 'B-02'],
      responses: { 'B-01': ['A'] },
      flaggedIds: [],
      currentIndex: 1,
      startedAt: '2026-10-02T00:00:00.000Z',
      durationSeconds: null,
      submittedAt: null,
    })

    render(<App />)
    expect(screen.getByRole('heading', { name: 'Resume active attempt' })).toBeTruthy()
    expect(screen.getByText('Question 2 of 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Resume attempt' })).toBeTruthy()
  })

  it('shows newly completed attempt history and weak topics without a refresh', async () => {
    const user = userEvent.setup()
    saveActiveAttempt({
      id: 'history-attempt',
      mode: 'practice',
      title: 'Set A practice',
      seed: 'history-seed',
      questionIds: ['A-01', 'A-02'],
      responses: {},
      flaggedIds: [],
      currentIndex: 0,
      startedAt: '2026-10-04T10:00:00.000Z',
      durationSeconds: null,
      submittedAt: null,
    })

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Resume attempt' }))
    await user.click(screen.getByRole('radio', { name: 'Datafiles' }))
    await user.click(screen.getByRole('button', { name: 'Review and submit' }))
    await user.click(screen.getByRole('button', { name: 'Confirm submission' }))
    await user.click(screen.getByRole('button', { name: 'Return to dashboard' }))

    expect(screen.getByRole('heading', { name: 'Attempt history' })).toBeTruthy()
    expect(screen.getByText('Set A practice')).toBeTruthy()
    expect(screen.getByLabelText('Set A practice score 0%')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Topics to revisit' })).toBeTruthy()
    expect(screen.getByLabelText('Architecture mastery 0%')).toBeTruthy()
  })
})

describe('question runner', () => {
  beforeEach(() => localStorage.clear())

  function saveRunnerAttempt(
    questionIds: string[],
    mode: 'practice' | 'exam' = 'practice',
  ) {
    saveActiveAttempt({
      id: 'runner-attempt',
      mode,
      title: `Set A ${mode}`,
      seed: 'runner-seed',
      questionIds,
      responses: {},
      flaggedIds: [],
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      durationSeconds: mode === 'exam' ? 7_200 : null,
      submittedAt: null,
    })
  }

  it('autosaves a single answer, flag, and navigation', async () => {
    const user = userEvent.setup()
    saveRunnerAttempt(['A-01', 'A-02'])
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Resume attempt' }))
    expect(screen.getByRole('heading', { name: /Which Oracle Database component/ })).toBeTruthy()

    await user.click(screen.getByRole('radio', { name: 'System Global Area' }))
    await user.click(screen.getByRole('button', { name: 'Flag question' }))
    await user.click(screen.getByRole('button', { name: 'Next question' }))

    const attempt = loadActiveAttempt()
    expect(attempt?.responses['A-01']).toEqual(['B'])
    expect(attempt?.flaggedIds).toEqual(['A-01'])
    expect(attempt?.currentIndex).toBe(1)
    expect(screen.getByText('Question 2 of 2')).toBeTruthy()
  })

  it('returns home without discarding the autosaved attempt', async () => {
    const user = userEvent.setup()
    saveRunnerAttempt(['A-01', 'A-02'])
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Resume attempt' }))
    await user.click(screen.getByRole('radio', { name: 'System Global Area' }))
    await user.click(screen.getByRole('button', { name: 'Home' }))

    expect(screen.getByRole('heading', { name: 'Oracle Practice Hub' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Resume active attempt' })).toBeTruthy()
    expect(loadActiveAttempt()?.responses['A-01']).toEqual(['B'])
  })

  it('uses checkboxes for multiple answers and reveals practice feedback', async () => {
    const user = userEvent.setup()
    saveRunnerAttempt(['A-51'])
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Resume attempt' }))

    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    await user.click(screen.getByRole('checkbox', { name: 'SMON performs instance recovery when needed' }))
    await user.click(screen.getByRole('checkbox', { name: 'LGWR writes redo from the redo log buffer' }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))

    expect(screen.getByText('Correct answer')).toBeTruthy()
    expect(screen.getByText(/SMON performs instance recovery and LGWR writes redo/)).toBeTruthy()
  })

  it('separates SQL from prose and formats query answer choices', async () => {
    const user = userEvent.setup()
    saveRunnerAttempt(['D-03'])
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Resume attempt' }))

    const sqlBlock = screen.getByLabelText('SQL statement')
    expect(sqlBlock.tagName).toBe('PRE')
    expect(sqlBlock.textContent).toContain('SELECT cust_id')
    expect(sqlBlock.textContent).toContain('\nFROM customers')
    expect(screen.getByRole('heading', { name: /Identify three ORDER BY clauses/ })).toBeTruthy()
    expect(screen.getByText('ORDER BY "Last Name"').classList.contains('option-content-code')).toBe(true)
  })

  it('shows an exam timer and asks for confirmation before submission', async () => {
    const user = userEvent.setup()
    saveRunnerAttempt(['A-01'], 'exam')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Resume attempt' }))

    expect(screen.getByLabelText('Time remaining')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Check answer' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Submit attempt' }))
    expect(screen.getByRole('heading', { name: 'Submit this attempt?' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm submission' })).toBeTruthy()
  })

  it('shows a detailed score and set breakdown after submission', async () => {
    const user = userEvent.setup()
    saveRunnerAttempt(['A-01', 'A-02'])
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Resume attempt' }))
    await user.click(screen.getByRole('radio', { name: 'System Global Area' }))
    await user.click(screen.getByRole('button', { name: 'Review and submit' }))
    await user.click(screen.getByRole('button', { name: 'Confirm submission' }))

    expect(screen.getByRole('heading', { name: 'Attempt results' })).toBeTruthy()
    expect(screen.getByLabelText('Score 50%')).toBeTruthy()
    expect(screen.getByText('1 correct')).toBeTruthy()
    expect(screen.getByText('0 incorrect')).toBeTruthy()
    expect(screen.getByText('1 unanswered')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Performance by set' })).toBeTruthy()
    expect(screen.getByLabelText('Set A: 50%')).toBeTruthy()
  })

  it('filters submitted questions for focused review', async () => {
    const user = userEvent.setup()
    saveRunnerAttempt(['A-01', 'A-02'])
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Resume attempt' }))
    await user.click(screen.getByRole('radio', { name: 'System Global Area' }))
    await user.click(screen.getByRole('button', { name: 'Review and submit' }))
    await user.click(screen.getByRole('button', { name: 'Confirm submission' }))

    expect(screen.getByRole('heading', { name: 'Performance by topic' })).toBeTruthy()
    expect(screen.getByLabelText('Architecture: 50%')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Review questions' })).toBeTruthy()
    expect(screen.getByText(/Which Oracle Database component/)).toBeTruthy()
    expect(screen.getByText(/In a dedicated server configuration/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Unanswered' }))
    expect(screen.queryByText(/Which Oracle Database component/)).toBeNull()
    expect(screen.getByText(/In a dedicated server configuration/)).toBeTruthy()
  })
})
