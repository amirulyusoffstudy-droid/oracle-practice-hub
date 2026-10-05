import { useEffect, useMemo, useState } from 'react'
import { QuestionContent } from './QuestionContent'
import { optionUsesCodeStyle } from './questionFormatting'
import { questionsById } from '../data/questionBank'
import { getRemainingSeconds, type SubmittedAttemptResult } from '../domain/attemptLifecycle'
import { isExactAnswer, shuffleQuestionOptions } from '../domain/examEngine'
import type { PersistedAttempt } from '../domain/attemptStore'
import {
  answerCurrentAttempt,
  flagCurrentQuestion,
  navigateCurrentAttempt,
  submitCurrentAttempt,
} from '../domain/attemptSession'

interface QuestionRunnerProps {
  attempt: PersistedAttempt
  onAttemptChange: (attempt: PersistedAttempt) => void
  onExit: () => void
  onSubmitted: (result: SubmittedAttemptResult) => void
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')
}

export function QuestionRunner({
  attempt,
  onAttemptChange,
  onExit,
  onSubmitted,
}: QuestionRunnerProps) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set())
  const [confirmSubmission, setConfirmSubmission] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() =>
    getRemainingSeconds(attempt),
  )
  const questionId = attempt.questionIds[attempt.currentIndex]
  const question = questionsById.get(questionId)
  const options = useMemo(
    () => (question ? shuffleQuestionOptions(question, attempt.seed) : []),
    [attempt.seed, question],
  )

  useEffect(() => {
    if (attempt.durationSeconds === null) return undefined

    const updateTimer = () => setRemainingSeconds(getRemainingSeconds(attempt))
    updateTimer()
    const timer = window.setInterval(updateTimer, 1_000)
    return () => window.clearInterval(timer)
  }, [attempt])

  if (!question) {
    return (
      <main className="app-shell">
        <section className="runner-card">
          <h1>Question unavailable</h1>
          <p>The saved question could not be found in the local question bank.</p>
        </section>
      </main>
    )
  }

  const currentQuestion = question
  const selectedIds = attempt.responses[question.id] ?? []
  const isFlagged = attempt.flaggedIds.includes(question.id)
  const feedbackRevealed = revealedIds.has(question.id)
  const answerIsCorrect = isExactAnswer(selectedIds, question.answers)
  const answeredCount = Object.values(attempt.responses).filter((answer) => answer.length > 0).length

  function handleOption(optionId: string) {
    const nextSelection = currentQuestion.type === 'single'
      ? [optionId]
      : selectedIds.includes(optionId)
        ? selectedIds.filter((id) => id !== optionId)
        : [...selectedIds, optionId]
    onAttemptChange(answerCurrentAttempt(currentQuestion.id, nextSelection))
  }

  function handleNavigation(index: number) {
    setConfirmSubmission(false)
    onAttemptChange(navigateCurrentAttempt(index))
  }

  function handleFlag() {
    onAttemptChange(flagCurrentQuestion(currentQuestion.id))
  }

  function revealAnswer() {
    if (selectedIds.length === 0) return
    setRevealedIds((current) => new Set(current).add(currentQuestion.id))
  }

  function confirmSubmit() {
    onSubmitted(submitCurrentAttempt(questionsById, new Date().toISOString()))
  }

  return (
    <main className="runner-shell">
      <header className="runner-header">
        <div>
          <span className="eyebrow">{attempt.title}</span>
          <strong>Question {attempt.currentIndex + 1} of {attempt.questionIds.length}</strong>
        </div>
        <div className="runner-status">
          <span>{answeredCount} answered</span>
          {remainingSeconds !== null && (
            <time className={remainingSeconds <= 300 ? 'timer timer-warning' : 'timer'} aria-label="Time remaining">
              {formatTime(remainingSeconds)}
            </time>
          )}
          <button aria-label="Home" className="runner-home-button" onClick={onExit} type="button">
            ← Home
          </button>
        </div>
      </header>

      <div className="runner-layout">
        <section className="question-card" aria-labelledby="question-title">
          <div className="question-meta">
            <span>Set {question.set} · {question.topic}</span>
            <span>{question.type === 'multiple' ? 'Select all that apply' : 'Select one answer'}</span>
          </div>
          <QuestionContent stem={question.stem} />

          <fieldset className="options-list">
            <legend className="sr-only">Answer options</legend>
            {options.map((option) => {
              const selected = selectedIds.includes(option.id)
              const showCorrect = feedbackRevealed && question.answers.includes(option.id)
              const showIncorrect = feedbackRevealed && selected && !question.answers.includes(option.id)
              return (
                <label
                  className={`option-card${selected ? ' option-selected' : ''}${showCorrect ? ' option-correct' : ''}${showIncorrect ? ' option-incorrect' : ''}`}
                  key={option.id}
                >
                  <input
                    aria-label={option.text}
                    checked={selected}
                    disabled={feedbackRevealed}
                    name={`question-${question.id}`}
                    onChange={() => handleOption(option.id)}
                    type={question.type === 'multiple' ? 'checkbox' : 'radio'}
                  />
                  <span className="option-id">{option.id}</span>
                  <span className={optionUsesCodeStyle(option.text) ? 'option-content-code' : undefined}>
                    {option.text}
                  </span>
                </label>
              )
            })}
          </fieldset>

          {feedbackRevealed && (
            <aside className={answerIsCorrect ? 'feedback feedback-correct' : 'feedback feedback-incorrect'} aria-live="polite">
              <strong>{answerIsCorrect ? 'Correct answer' : 'Not quite'}</strong>
              <p>{question.explanation}</p>
              {question.references && question.references.length > 0 && (
                <ul>
                  {question.references.map((reference) => (
                    <li key={reference.url}>
                      <a href={reference.url} rel="noreferrer" target="_blank">{reference.title}</a>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}

          <div className="question-actions">
            <button
              className="secondary-button"
              disabled={attempt.currentIndex === 0}
              onClick={() => handleNavigation(attempt.currentIndex - 1)}
              type="button"
            >
              Previous question
            </button>
            <button className="flag-button" onClick={handleFlag} type="button">
              {isFlagged ? 'Unflag question' : 'Flag question'}
            </button>
            {attempt.mode !== 'exam' && (
              <button
                className="secondary-button"
                disabled={selectedIds.length === 0 || feedbackRevealed}
                onClick={revealAnswer}
                type="button"
              >
                Check answer
              </button>
            )}
            {attempt.currentIndex < attempt.questionIds.length - 1 ? (
              <button
                className="primary-button"
                onClick={() => handleNavigation(attempt.currentIndex + 1)}
                type="button"
              >
                Next question
              </button>
            ) : (
              <button className="primary-button" onClick={() => setConfirmSubmission(true)} type="button">
                Submit attempt
              </button>
            )}
          </div>
        </section>

        <aside className="navigator-card" aria-label="Question navigator">
          <div className="navigator-heading">
            <h2>Questions</h2>
            <span>{answeredCount}/{attempt.questionIds.length}</span>
          </div>
          <div className="question-grid">
            {attempt.questionIds.map((id, index) => {
              const classes = [
                'question-number',
                index === attempt.currentIndex ? 'question-current' : '',
                attempt.responses[id]?.length ? 'question-answered' : '',
                attempt.flaggedIds.includes(id) ? 'question-flagged' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  aria-label={`Go to question ${index + 1}`}
                  className={classes}
                  key={id}
                  onClick={() => handleNavigation(index)}
                  type="button"
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
          <button className="submit-link" onClick={() => setConfirmSubmission(true)} type="button">
            Review and submit
          </button>
        </aside>
      </div>

      {confirmSubmission && (
        <div className="modal-backdrop" role="presentation">
          <section aria-labelledby="submit-title" aria-modal="true" className="confirm-dialog" role="dialog">
            <span className="eyebrow">Final check</span>
            <h2 id="submit-title">Submit this attempt?</h2>
            <p>
              You answered {answeredCount} of {attempt.questionIds.length} questions.
              Submission cannot be undone.
            </p>
            <div className="dialog-actions">
              <button className="secondary-button" onClick={() => setConfirmSubmission(false)} type="button">Keep working</button>
              <button className="primary-button" onClick={confirmSubmit} type="button">Confirm submission</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
