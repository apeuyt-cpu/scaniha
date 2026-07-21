export type QuestionType = 'who' | 'choice' | 'trivia'

export interface SparkleQuestion {
  text: string
  type: QuestionType
  options?: string[]
  answer?: string
}

export const SPARKLE_QUESTIONS: SparkleQuestion[] = []

export function getBuildTimerMs(round: number): number { return Math.max(8000, 15000 - Math.floor((round - 1) / 3) * 1000) }
