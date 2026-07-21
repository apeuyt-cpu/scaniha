import { aiProvider, normalizeAnswer, fuzzyMatch } from './ai-provider'

export async function generateAIGameBatch(theme: string, players: string[], count: number = 3) {
  try {
    return await aiProvider.generateQuestions(theme, players, count)
  } catch (err) {
    console.error('AI Generator Failed:', err)
    throw new Error('Failed to generate AI questions. Please try again.')
  }
}

export async function evaluateAnswersLocal(
  questionText: string,
  answerMode: string,
  correctEntity: string,
  aliases: string[],
  activePlayers: string[],
  answers: { phone: string, text: string }[]
): Promise<string[]> {
  const normExpected = normalizeAnswer(correctEntity)
  const normAliases = aliases.map(a => normalizeAnswer(a))
  const normPlayers = activePlayers.map(p => normalizeAnswer(p))

  // Execute all validations in parallel to avoid sequential network bottlenecks
  const evalPromises = answers.map(async (ans) => {
    // Subjective Bypass - accept any non-empty raw text (even emojis)
    if (answerMode === 'subjective') {
      if (ans.text && ans.text.trim().length > 0) return ans.phone
      return null
    }

    const normInput = normalizeAnswer(ans.text)
    
    // Reject empty immediately
    if (!normInput) return null

    // Player-Based Matching
    if (answerMode === 'player_based') {
      let matchedPlayer = false
      for (const p of normPlayers) {
        if (normInput === p || fuzzyMatch(normInput, p) > 0.85) {
          if (normExpected === p || fuzzyMatch(normExpected, p) > 0.85) {
             matchedPlayer = true
             break
          }
        }
      }
      if (matchedPlayer) return ans.phone
      // Also check if the input matches the correct entity directly
      if (normInput === normExpected || fuzzyMatch(normInput, normExpected) > 0.85) {
        return ans.phone
      }
      return null
    }

    // Objective Fast-Path
    if (answerMode === 'objective' || answerMode === 'choice') {
      // 1. Exact or Alias Match
      if (normInput === normExpected || normAliases.includes(normInput)) {
        return ans.phone
      }

      // 2. Fuzzy Match
      const fScore = fuzzyMatch(normInput, normExpected)
      if (fScore > 0.85) {
        return ans.phone
      }
      
      let aliasFuzzyMatched = false
      for (const alias of normAliases) {
        if (fuzzyMatch(normInput, alias) > 0.85) {
          aliasFuzzyMatched = true
          break
        }
      }
      if (aliasFuzzyMatched) {
        return ans.phone
      }

      // 3. AI Semantic Fallback
      if (fScore > 0.40) {
        const isMatch = await aiProvider.verifySemanticMatch(ans.text, correctEntity, questionText)
        if (isMatch) return ans.phone
      }
    }
    
    return null
  })

  const results = await Promise.all(evalPromises)
  return results.filter((phone): phone is string => phone !== null)
}
