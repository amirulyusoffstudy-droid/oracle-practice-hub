import { questionsById } from '../data/questionBank'
import type { AttemptHistoryEntry } from '../domain/attemptStore'
import type { QuestionPerformanceRecord } from '../domain/questionPerformanceStore'

interface DashboardProgressProps {
  history: AttemptHistoryEntry[]
  performance: QuestionPerformanceRecord
}

interface TopicMastery {
  topic: string
  correct: number
  seen: number
  percentage: number
  needsReview: number
}

function buildTopicMastery(performance: QuestionPerformanceRecord): TopicMastery[] {
  const totals = new Map<string, Omit<TopicMastery, 'topic' | 'percentage'>>()

  for (const [questionId, result] of Object.entries(performance)) {
    const question = questionsById.get(questionId)
    if (!question) continue

    const current = totals.get(question.topic) ?? { correct: 0, seen: 0, needsReview: 0 }
    current.correct += result.timesCorrect
    current.seen += result.timesSeen
    current.needsReview += result.timesIncorrect + result.timesUnanswered
    totals.set(question.topic, current)
  }

  return [...totals.entries()]
    .map(([topic, total]) => ({
      topic,
      ...total,
      percentage: total.seen === 0 ? 0 : Math.round((total.correct / total.seen) * 100),
    }))
    .filter((topic) => topic.needsReview > 0)
    .sort((left, right) =>
      left.percentage - right.percentage ||
      right.needsReview - left.needsReview ||
      left.topic.localeCompare(right.topic),
    )
    .slice(0, 4)
}

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function DashboardProgress({ history, performance }: DashboardProgressProps) {
  const weakTopics = buildTopicMastery(performance)

  if (history.length === 0 && weakTopics.length === 0) return null

  return (
    <section className="dashboard-progress" aria-label="Learning progress">
      {weakTopics.length > 0 && (
        <article className="progress-panel" aria-labelledby="weak-topics-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Focus next</span>
              <h2 id="weak-topics-title">Topics to revisit</h2>
            </div>
          </div>
          <div className="topic-mastery-list">
            {weakTopics.map((topic) => (
              <div className="topic-mastery-row" key={topic.topic}>
                <div>
                  <strong>{topic.topic}</strong>
                  <span>{topic.needsReview} answer{topic.needsReview === 1 ? '' : 's'} to revisit</span>
                </div>
                <div className="progress-track" aria-label={`${topic.topic} mastery ${topic.percentage}%`}>
                  <span style={{ width: `${topic.percentage}%` }} />
                </div>
                <strong>{topic.percentage}%</strong>
              </div>
            ))}
          </div>
        </article>
      )}

      {history.length > 0 && (
        <article className="progress-panel" aria-labelledby="history-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Saved locally</span>
              <h2 id="history-title">Attempt history</h2>
            </div>
          </div>
          <ol className="attempt-history-list">
            {history.map((attempt) => (
              <li key={attempt.id}>
                <div>
                  <strong>{attempt.title}</strong>
                  <span>{formatSubmittedAt(attempt.submittedAt)} · {attempt.mode}</span>
                </div>
                <div className="history-score" aria-label={`${attempt.title} score ${attempt.percentage}%`}>
                  <strong>{attempt.percentage}%</strong>
                  <span>{attempt.score} / {attempt.total}</span>
                </div>
              </li>
            ))}
          </ol>
        </article>
      )}
    </section>
  )
}
