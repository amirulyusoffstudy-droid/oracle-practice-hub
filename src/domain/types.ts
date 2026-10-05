export type ExamSet = 'A' | 'B' | 'C' | 'D'
export type QuestionType = 'single' | 'multiple'
export type Confidence = 'high' | 'medium' | 'needs-review'

export interface OracleReference {
  title: string
  url: string
}

export interface Question {
  id: string
  set: ExamSet
  number: number
  topic: string
  type: QuestionType
  stem: string
  options: Record<string, string>
  answers: string[]
  explanation: string
  references?: OracleReference[]
  confidence?: Confidence
  version?: string
  shuffleOptions?: boolean
}

export interface AttemptBuildConfig {
  sets: ExamSet[]
  count: number
  seed: string
  balanceSets: boolean
  recentlySeenIds: string[]
  priorityIds?: string[]
}

export interface DisplayOption {
  id: string
  text: string
}

export interface TopicScore {
  correct: number
  total: number
}

export interface ScoreResult {
  total: number
  correct: number
  incorrect: number
  unanswered: number
  percentage: number
  byTopic: Record<string, TopicScore>
  bySet: Record<string, TopicScore>
}
