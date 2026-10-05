import setA from './generated/set-a.json'
import setB from './generated/set-b.json'
import setC from './generated/set-c.json'
import setD from './generated/set-d.json'
import type { Question } from '../domain/types'

export const questionBank: Question[] = [
  ...(setA as Question[]),
  ...(setB as Question[]),
  ...(setC as Question[]),
  ...(setD as Question[]),
]

export const questionsById = new Map(questionBank.map((question) => [question.id, question]))
