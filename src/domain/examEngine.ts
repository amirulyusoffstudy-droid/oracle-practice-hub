import type {
  AttemptBuildConfig,
  DisplayOption,
  Question,
  ScoreResult,
  TopicScore,
} from './types'

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(values: readonly T[], seed: string): T[] {
  const result = [...values]
  const random = mulberry32(hashSeed(seed))
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function takeTopicBalanced(pool: Question[], count: number, seed: string): Question[] {
  const groups = new Map<string, Question[]>()
  for (const question of pool) {
    const group = groups.get(question.topic) ?? []
    group.push(question)
    groups.set(question.topic, group)
  }

  const topics = seededShuffle([...groups.keys()], `${seed}:topics`)
  const queues = new Map(
    topics.map((topic) => [topic, seededShuffle(groups.get(topic) ?? [], `${seed}:${topic}`)]),
  )
  const selected: Question[] = []
  while (selected.length < count) {
    let added = false
    for (const topic of topics) {
      const next = queues.get(topic)?.shift()
      if (next) {
        selected.push(next)
        added = true
        if (selected.length === count) break
      }
    }
    if (!added) break
  }
  return selected
}

function pickQuestions(
  pool: Question[],
  count: number,
  seed: string,
  recent: Set<string>,
  priority: Set<string>,
): Question[] {
  const preferred = pool.filter((question) => priority.has(question.id) && !recent.has(question.id))
  const unseen = pool.filter((question) => !priority.has(question.id) && !recent.has(question.id))
  const recycled = pool.filter((question) => recent.has(question.id))
  const orderedTiers = [preferred, unseen, recycled]
  const selected: Question[] = []
  for (let tier = 0; tier < orderedTiers.length && selected.length < count; tier += 1) {
    selected.push(
      ...takeTopicBalanced(
        orderedTiers[tier],
        count - selected.length,
        `${seed}:tier-${tier}`,
      ),
    )
  }
  return selected
}

export function buildAttemptQuestions(
  bank: readonly Question[],
  config: AttemptBuildConfig,
): Question[] {
  if (config.count <= 0 || config.sets.length === 0) return []
  const allowedSets = new Set(config.sets)
  const eligible = bank.filter((question) => allowedSets.has(question.set))
  const count = Math.min(config.count, eligible.length)
  const recent = new Set(config.recentlySeenIds)
  const priority = new Set(config.priorityIds ?? [])

  if (!config.balanceSets || config.sets.length === 1) {
    return seededShuffle(
      pickQuestions(eligible, count, config.seed, recent, priority),
      `${config.seed}:final`,
    )
  }

  const base = Math.floor(count / config.sets.length)
  let remainder = count % config.sets.length
  const selected: Question[] = []
  for (const set of config.sets) {
    const target = base + (remainder > 0 ? 1 : 0)
    remainder -= remainder > 0 ? 1 : 0
    selected.push(
      ...pickQuestions(
        eligible.filter((question) => question.set === set),
        target,
        `${config.seed}:set-${set}`,
        recent,
        priority,
      ),
    )
  }
  return seededShuffle(selected, `${config.seed}:final`)
}

export function isExactAnswer(selected: readonly string[], correct: readonly string[]): boolean {
  const selectedUnique = [...new Set(selected)].sort()
  const correctUnique = [...new Set(correct)].sort()
  return (
    selectedUnique.length === correctUnique.length &&
    selectedUnique.every((answer, index) => answer === correctUnique[index])
  )
}

export function shuffleQuestionOptions(question: Question, seed: string): DisplayOption[] {
  const options = Object.entries(question.options).map(([id, text]) => ({ id, text }))
  if (question.shuffleOptions === false) return options
  return seededShuffle(options, `${seed}:${question.id}:options`)
}

function incrementScore(
  record: Record<string, TopicScore>,
  key: string,
  isCorrect: boolean,
): void {
  const current = record[key] ?? { correct: 0, total: 0 }
  record[key] = {
    correct: current.correct + (isCorrect ? 1 : 0),
    total: current.total + 1,
  }
}

export function scoreAttempt(
  questions: readonly Question[],
  responses: Record<string, string[]>,
): ScoreResult {
  let correct = 0
  let incorrect = 0
  let unanswered = 0
  const byTopic: Record<string, TopicScore> = {}
  const bySet: Record<string, TopicScore> = {}

  for (const question of questions) {
    const selected = responses[question.id] ?? []
    const answered = selected.length > 0
    const answerCorrect = answered && isExactAnswer(selected, question.answers)
    if (!answered) unanswered += 1
    else if (answerCorrect) correct += 1
    else incorrect += 1
    incrementScore(byTopic, question.topic, answerCorrect)
    incrementScore(bySet, `Set ${question.set}`, answerCorrect)
  }

  return {
    total: questions.length,
    correct,
    incorrect,
    unanswered,
    percentage: questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100),
    byTopic,
    bySet,
  }
}
