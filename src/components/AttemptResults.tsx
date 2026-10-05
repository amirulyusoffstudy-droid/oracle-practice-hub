import { useState } from 'react'
import { questionsById } from '../data/questionBank'
import type { SubmittedAttemptResult } from '../domain/attemptLifecycle'
import { isExactAnswer } from '../domain/examEngine'
import { QuestionContent } from './QuestionContent'

type ReviewFilter = 'all' | 'incorrect' | 'unanswered' | 'flagged'

interface AttemptResultsProps {
  result: SubmittedAttemptResult
  onDone: () => void
}

export function AttemptResults({ result, onDone }: AttemptResultsProps) {
  const { score } = result
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const reviewItems = result.attempt.questionIds.flatMap((questionId) => {
    const question = questionsById.get(questionId)
    if (!question) return []
    const selectedIds = result.attempt.responses[questionId] ?? []
    const isAnswered = selectedIds.length > 0
    const isCorrect = isAnswered && isExactAnswer(selectedIds, question.answers)
    const isFlagged = result.attempt.flaggedIds.includes(questionId)
    return [{ question, selectedIds, isAnswered, isCorrect, isFlagged }]
  })
  const visibleReviewItems = reviewItems.filter((item) => {
    if (reviewFilter === 'incorrect') return item.isAnswered && !item.isCorrect
    if (reviewFilter === 'unanswered') return !item.isAnswered
    if (reviewFilter === 'flagged') return item.isFlagged
    return true
  })

  return (
    <main className="results-shell">
      <header className="results-hero">
        <div>
          <span className="eyebrow">Attempt submitted</span>
          <h1>Attempt results</h1>
          <p>{result.attempt.title}</p>
        </div>
        <div className="score-ring" aria-label={`Score ${score.percentage}%`}>
          <strong>{score.percentage}%</strong>
          <span>{score.correct} / {score.total}</span>
        </div>
      </header>

      <section className="result-stats" aria-label="Score summary">
        <article>
          <span>Correct</span>
          <strong>{score.correct} correct</strong>
        </article>
        <article>
          <span>Incorrect</span>
          <strong>{score.incorrect} incorrect</strong>
        </article>
        <article>
          <span>Not answered</span>
          <strong>{score.unanswered} unanswered</strong>
        </article>
      </section>

      <section className="breakdown-card" aria-labelledby="set-breakdown-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Breakdown</span>
            <h2 id="set-breakdown-title">Performance by set</h2>
          </div>
        </div>
        <div className="breakdown-list">
          {Object.entries(score.bySet).map(([set, setScore]) => {
            const percentage = setScore.total === 0
              ? 0
              : Math.round((setScore.correct / setScore.total) * 100)
            const setLabel = set.startsWith('Set ') ? set : `Set ${set}`
            return (
              <article className="breakdown-row" key={set}>
                <div>
                  <strong>{setLabel}</strong>
                  <span>{setScore.correct} / {setScore.total}</span>
                </div>
                <div className="progress-track" aria-label={`${setLabel}: ${percentage}%`}>
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <strong>{percentage}%</strong>
              </article>
            )
          })}
        </div>
      </section>

      <section className="breakdown-card result-section" aria-labelledby="topic-breakdown-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Knowledge areas</span>
            <h2 id="topic-breakdown-title">Performance by topic</h2>
          </div>
        </div>
        <div className="breakdown-list">
          {Object.entries(score.byTopic).map(([topic, topicScore]) => {
            const percentage = topicScore.total === 0
              ? 0
              : Math.round((topicScore.correct / topicScore.total) * 100)
            return (
              <article className="breakdown-row" key={topic}>
                <div>
                  <strong>{topic}</strong>
                  <span>{topicScore.correct} / {topicScore.total}</span>
                </div>
                <div className="progress-track" aria-label={`${topic}: ${percentage}%`}>
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <strong>{percentage}%</strong>
              </article>
            )
          })}
        </div>
      </section>

      <section className="review-card result-section" aria-labelledby="review-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Learn from this attempt</span>
            <h2 id="review-title">Review questions</h2>
          </div>
        </div>
        <div className="review-filters" aria-label="Review filters">
          {(['all', 'incorrect', 'unanswered', 'flagged'] as const).map((filter) => (
            <button
              aria-pressed={reviewFilter === filter}
              className={reviewFilter === filter ? 'filter-active' : ''}
              key={filter}
              onClick={() => setReviewFilter(filter)}
              type="button"
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <div className="review-list">
          {visibleReviewItems.length === 0 ? (
            <p className="empty-review">No questions match this filter.</p>
          ) : visibleReviewItems.map(({ question, selectedIds, isAnswered, isCorrect, isFlagged }, index) => (
            <article className="review-item" key={question.id}>
              <div className="review-item-meta">
                <span>Question {result.attempt.questionIds.indexOf(question.id) + 1} · Set {question.set} · {question.topic}</span>
                <strong className={isCorrect ? 'status-correct' : 'status-attention'}>
                  {isCorrect ? 'Correct' : isAnswered ? 'Incorrect' : 'Unanswered'}{isFlagged ? ' · Flagged' : ''}
                </strong>
              </div>
              <QuestionContent compact headingId={null} headingLevel="h3" stem={question.stem} />
              <p><strong>Your answer:</strong> {selectedIds.length > 0 ? selectedIds.map((id) => question.options[id]).join('; ') : 'No answer selected'}</p>
              <p><strong>Correct answer:</strong> {question.answers.map((id) => question.options[id]).join('; ')}</p>
              <details open={index === 0}>
                <summary>Explanation</summary>
                <p>{question.explanation}</p>
              </details>
            </article>
          ))}
        </div>
      </section>

      <div className="results-actions">
        <button className="primary-button" onClick={onDone} type="button">
          Return to dashboard
        </button>
      </div>
    </main>
  )
}
