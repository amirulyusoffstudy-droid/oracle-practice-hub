import { useState, type FormEvent } from 'react'
import { AttemptResults } from './components/AttemptResults'
import { DashboardProgress } from './components/DashboardProgress'
import { QuestionRunner } from './components/QuestionRunner'
import { questionBank } from './data/questionBank'
import { createAttempt, type SubmittedAttemptResult } from './domain/attemptLifecycle'
import {
  loadActiveAttempt,
  loadHistory,
  type AttemptMode,
  type PersistedAttempt,
} from './domain/attemptStore'
import { startAttemptSession } from './domain/attemptSession'
import {
  getPriorityQuestionIds,
  loadQuestionPerformance,
} from './domain/questionPerformanceStore'
import type { ExamSet } from './domain/types'

const allSets: ExamSet[] = ['A', 'B', 'C', 'D']
type QuestionSource = ExamSet | 'SMART'

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function titleFor(source: QuestionSource, mode: AttemptMode): string {
  const sourceTitle = source === 'SMART' ? 'Smart Mixed Mock' : `Set ${source}`
  const modeTitle = mode.charAt(0).toUpperCase() + mode.slice(1)
  return `${sourceTitle} · ${modeTitle}`
}

export function App() {
  const [mode, setMode] = useState<AttemptMode>('practice')
  const [source, setSource] = useState<QuestionSource>('SMART')
  const [count, setCount] = useState(72)
  const [activeAttempt, setActiveAttempt] = useState<PersistedAttempt | null>(() =>
    loadActiveAttempt(),
  )
  const [attemptReady, setAttemptReady] = useState(false)
  const [submittedResult, setSubmittedResult] = useState<SubmittedAttemptResult | null>(null)
  const [history, setHistory] = useState(() => loadHistory())
  const [performance, setPerformance] = useState(() => loadQuestionPerformance())
  const bestScore = history.length === 0 ? null : Math.max(...history.map((entry) => entry.percentage))

  function handleReturnToDashboard() {
    setHistory(loadHistory())
    setPerformance(loadQuestionPerformance())
    setSubmittedResult(null)
  }

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const now = new Date().toISOString()
    const performance = loadQuestionPerformance()
    const recentlySeenIds = Object.entries(performance)
      .sort(([, left], [, right]) => right.lastSeenAt.localeCompare(left.lastSeenAt))
      .slice(0, 72)
      .map(([questionId]) => questionId)
    const attempt = createAttempt(questionBank, {
      id: createId(),
      mode,
      title: titleFor(source, mode),
      seed: createId(),
      sets: source === 'SMART' ? allSets : [source],
      count,
      balanceSets: source === 'SMART',
      recentlySeenIds,
      priorityIds: getPriorityQuestionIds(performance),
      startedAt: now,
      durationSeconds: mode === 'exam' ? 7_200 : null,
    })

    startAttemptSession(attempt)
    setActiveAttempt(attempt)
    setAttemptReady(true)
  }

  if (submittedResult) {
    return (
      <AttemptResults
        result={submittedResult}
        onDone={handleReturnToDashboard}
      />
    )
  }

  if (attemptReady && activeAttempt) {
    return (
      <QuestionRunner
        attempt={activeAttempt}
        onAttemptChange={setActiveAttempt}
        onExit={() => setAttemptReady(false)}
        onSubmitted={(result) => {
          setActiveAttempt(null)
          setSubmittedResult(result)
        }}
      />
    )
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Oracle Database Administration I · 1Z0-082</span>
          <h1>Oracle Practice Hub</h1>
          <p className="hero-copy">
            Focused, offline exam practice with deterministic shuffling, explanations, and local progress.
          </p>
        </div>
        <div className="library-badge" aria-label="Question library size">
          <strong>288 questions</strong>
          <span>4 reviewed sets</span>
        </div>
      </header>

      <section className="stats-grid" aria-label="Progress summary">
        <article className="stat-card">
          <span>Attempts completed</span>
          <strong>{history.length}</strong>
        </article>
        <article className="stat-card">
          <span>Best score</span>
          <strong>{bestScore === null ? '—' : `${bestScore}%`}</strong>
        </article>
        <article className="stat-card accent-card">
          <span>Study mode</span>
          <strong>Local & offline</strong>
        </article>
      </section>

      {activeAttempt && (
        <section className="resume-card" aria-labelledby="resume-title">
          <div>
            <span className="eyebrow">In progress</span>
            <h2 id="resume-title">Resume active attempt</h2>
            <p>{activeAttempt.title}</p>
            <span>
              Question {activeAttempt.currentIndex + 1} of {activeAttempt.questionIds.length}
            </span>
          </div>
          <button className="secondary-button" type="button" onClick={() => setAttemptReady(true)}>
            Resume attempt
          </button>
        </section>
      )}

      <section className="setup-layout">
        <div className="setup-copy">
          <span className="eyebrow">New session</span>
          <h2>Build your next attempt</h2>
          <p>
            Smart Mixed balances questions across all four sets and prioritises topics that need another look.
          </p>
          <ul>
            <li>Exact-match scoring for multi-answer questions</li>
            <li>Stable shuffle after refresh or resume</li>
            <li>Answers and explanations remain on this device</li>
          </ul>
        </div>

        <form className="setup-form" onSubmit={handleStart}>
          <label>
            <span>Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as AttemptMode)}>
              <option value="practice">Practice</option>
              <option value="exam">Exam</option>
              <option value="review">Review</option>
            </select>
          </label>

          <label>
            <span>Question source</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as QuestionSource)}
            >
              <option value="SMART">Smart Mixed · Sets A–D</option>
              {allSets.map((set) => (
                <option key={set} value={set}>Set {set}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Question count</span>
            <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
              {[10, 18, 36, 72].map((option) => (
                <option key={option} value={option}>{option} questions</option>
              ))}
            </select>
          </label>

          <div className="setup-note">
            {mode === 'exam'
              ? 'Exam mode uses a 2-hour countdown and reveals results after submission.'
              : 'Practice and review modes have no countdown timer.'}
          </div>

          <button className="primary-button" type="submit">Start attempt</button>
        </form>
      </section>

      <DashboardProgress history={history} performance={performance} />

      <footer>
        Independent practice material · Not affiliated with or endorsed by Oracle Corporation.
      </footer>
    </main>
  )
}
