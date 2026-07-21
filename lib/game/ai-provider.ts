import OpenAI from 'openai'

export type AnswerMode = 'objective' | 'subjective' | 'player_based' | 'choice'

export interface GeneratedQuestion {
  type: 'input' | 'choice'
  text: string
  answer_mode: AnswerMode
  correct_entity: string
  aliases: string[]
  options?: { id: string; label: string }[]
}

export interface AIProvider {
  generateQuestions(theme: string, players: string[], count: number): Promise<GeneratedQuestion[]>
  verifySemanticMatch(userAnswer: string, expectedAnswer: string, question: string): Promise<boolean>
}

class NvidiaKimiProvider implements AIProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.AI_API_KEY || 'dummy',
      baseURL: process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1'
    })
  }

  async generateQuestions(theme: string, players: string[], count: number): Promise<GeneratedQuestion[]> {
    const tunisianSeeds = [
      "Tunisian Weddings (Sdak, Wtiya, 7enna, 3ers)",
      "Ramadan (Che9an fatr, chicha, series, mosalsalet)",
      "Café Culture (Rami, belote, chicha, express)",
      "Childhood Memories in Tunisia (Madrsa, lycée, choklata b 100 Frank)",
      "Workplace Drama (Retards, congé, chef de projet)",
      "Tunisian Traffic & Driving (Kiosque, embouteillage, taxi)",
      "Family Gatherings (Lammet l'3ayla, el 5alat, el a7ad)",
      "Tunisian Pop Culture (Music, TV shows, Instagram influencers)",
      "Summer in Tunisia (B7ar, location, sidi bou, hammamet)",
      "Food & Diet (Lablebi, makrouna, régime, mekla chera3)"
    ];
    
    // Pick a random seed to guarantee wild variety every time
    const randomSeed = tunisianSeeds[Math.floor(Math.random() * tunisianSeeds.length)];

    const prompt = `# Professional Tunisian Language Engine (Mandatory)

## CRITICAL INSTRUCTION
From this moment forward, every question shown to the player MUST sound like it was written by a native Tunisian copywriter with years of experience writing TV quiz shows and commercial games.
The game must NEVER sound translated by AI.
The player should immediately feel: "This game was made by Tunisians." NOT "This game was translated from English."

# Your Role
You are NOT a translator.
You are NOT converting English into Tunisian.
You are a professional Tunisian game writer.
Before displaying any question, completely rewrite it into natural Tunisian Arabic.

Theme/Category selected by the host: "${theme}"
Current Random Topic Seed to guarantee variety: "${randomSeed}"
Players currently in the room: ${players.join(', ') || 'No specific names provided'}

# Writing Style
Every question must be: Natural, Fluent, Easy to understand, Fun, Professional, Short, Clear, Friendly, Conversational, Grammatically correct.
Never make the player read the question twice to understand it.
If there is a simpler way to ask the same question, always choose the simpler wording.

# Use Real Tunisian Arabic
Write exactly how educated Tunisians naturally speak.
Use expressions that are understood across all regions of Tunisia.
Avoid regional slang that many players may not understand.

# NEVER Use
Never use machine-translated expressions.
Never translate word-for-word.
Never invent Tunisian words.
Never mix multiple Arabic dialects.
Never use Egyptian, Levantine, Gulf, Moroccan, or Algerian vocabulary unless it is also commonly used in Tunisia.
Never write unnatural phrases.
Never use internet chat language.
Never use Franco Arabic (3, 5, 7, 9). Write in Arabic script.
Never use unnecessary Modern Standard Arabic when a natural Tunisian alternative exists.

# The Question Must Be Instantly Understood
If the wording causes any confusion, Rewrite it.
If a sentence sounds strange, Rewrite it.
If a sentence sounds translated or robotic, Rewrite it.
Keep rewriting until it sounds completely natural.

# Examples
BAD: مين كان الستاركون الشهير من جيل 90؟
GOOD: شكون من أشهر نجوم التسعينات؟

BAD: دعنا نتعرف على الدولة التي يوجد فيها برج إيفل.
GOOD: في أي بلاد موجود برج إيفل؟

BAD: ما هو الحيوان الذي يعرف بملك الغابة؟
GOOD: شنوّة الحيوان المعروف بملك الغابة؟

BAD: أي فيلم حصل على الشهرة الأكبر؟
GOOD: شنوّة الفيلم اللي حقق أكبر نجاح؟

BAD: من هو مؤسس فيسبوك؟
GOOD: شكون أسّس فيسبوك؟

# Game Show Style
The game should sound exciting but professional.
Examples:
🎯 جاهز للسؤال؟
🔥 ركّز مليح...
😄 يلا نشوفو.
🏆 هذا سؤال ينجم يبدّل الترتيب!
⏳ عندك وقت محدود... جاوب بسرعة!
Do not repeat the same introduction frequently. Rotate them naturally.

# Question Quality
Every question must be: Factually correct, Easy to read, Unambiguous, Fun, Interesting, Fair, Suitable for all ages.

## ZERO-TOLERANCE QUESTION QUALITY RULE
Never generate a player-facing question directly.
Every question must pass through 3 separate stages silently in your mind before outputting JSON.

### STAGE 1: FACT CREATION
Create only: Question meaning, Correct answer, Accepted answers, Category, Difficulty.
Do NOT write Tunisian yet.
Example: Meaning: Actor who played Luke Skywalker in Star Wars. Answer: Mark Hamill.

### STAGE 2: TUNISIAN HUMAN REWRITE
Rewrite ONLY the meaning into natural Tunisian Arabic.
Do not translate. Do not preserve the original structure. Think like a Tunisian TV quiz writer.
Example BAD: شنوّة بطل داربيرو في فيلم حرب النجوم؟
Example GOOD: شكون الممثل اللي لعب دور لوك سكاي ووكر في فيلم حرب النجوم؟

### STAGE 3: HUMAN REVIEW
Before saving the question, check:
1. Is every word a real Tunisian word?
2. Does the sentence have a clear meaning?
3. Would a Tunisian understand instantly?
4. Is the grammar natural?
5. Does it sound like a human wrote it?
If ANY answer is no: DELETE the question and regenerate. Never repair corrupted sentences. Generate a new one.

## FORBIDDEN OUTPUT
Never produce: invented words, corrupted names, random sounds, untranslated English words, broken Tunisian grammar, confusing questions.
Examples of unacceptable output: ❌ داربيرو | ❌ لامطط | ❌ هتستغمر | ❌ الستاركون
These indicate generation failure.

## QUALITY STANDARD
The final question must feel like: "A professional Tunisian game show wrote this." Not: "An AI translated this."
DO NOT OUTPUT ANY OF THE 3 STAGES AS TEXT. ONLY OUTPUT THE FINAL VALIDATED JSON.


STRICT RULES FOR GENERATION & JSON STRUCTURE:
1. Question Format: ALL questions MUST be open-ended text inputs. (Do not provide 'options').
2. Variety: NEVER repeat common party game questions. Use the "Random Topic Seed" to inspire hyper-specific, uniquely Tunisian scenarios. Make it unhinged, creative, and extremely funny.
3. Question Analysis & Types: You must classify the question using 'answer_mode':
   - "objective": A question with a factual correct answer. (e.g. "شكون ربح كاس العالم 2010؟").
   - "subjective": A question with NO single correct answer. (e.g. "شنوة أكثر حاجة تخاف منها؟").
   - "player_based": A question where the answer MUST be the name of one of the players in the room. (e.g. "شكون من القروب هذا ديما يجي مأخر؟").
4. Entities & Aliases:
   - For 'objective' questions, 'correct_entity' must be the canonical short answer (e.g., "إسبانيا"), and 'aliases' must be an array of valid synonyms/translations (e.g., ["اسبانيا", "espagne", "spain"]).
   - For 'player_based' questions, 'correct_entity' must be the exact name of the player you chose as the punchline.
   - For 'subjective' questions, 'correct_entity' should be empty, and 'aliases' empty.

Your response MUST be ONLY valid JSON matching this structure exactly (No markdown formatting, no backticks, no explanations):
{
  "questions": [
    {
      "type": "input",
      "text": "The highly engaging question text in Tunisian Arabic",
      "answer_mode": "objective",
      "correct_entity": "The canonical answer",
      "aliases": ["valid variation 1", "valid variation 2"],
      "options": []
    }
  ]
}`

    try {
      const response = await this.client.chat.completions.create({
        model: process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.95, // Increased slightly for more unhinged variety
        max_tokens: 400,
        response_format: { type: 'json_object' } // Enforce strict JSON
      })

      const content = response.choices[0]?.message?.content || '{}'
      
      // Robust JSON Extraction (in case the LLM ignores response_format and adds markdown)
      let cleanContent = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleanContent)
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid JSON structure')
      }
      return parsed.questions.slice(0, count)
    } catch (err: any) {
      console.error('Nvidia Kimi Generation Error:', err.message)
      throw err
    }
  }

  async verifySemanticMatch(userAnswer: string, expectedAnswer: string, question: string): Promise<boolean> {
    try {
      const prompt = `You are a Semantic Evaluation AI for a trivia game.
Question: "${question}"
Expected Correct Answer: "${expectedAnswer}"
User's Answer: "${userAnswer}"

Rule: Is the user's answer semantically identical, a synonym, or a minor typo of the expected answer? Understand Tunisian Arabic, French, and English variations.

Return your verdict as a pure JSON object in this format:
{
  "accepted": true/false,
  "confidence": 0.95,
  "type": "semantic_match",
  "reason": "User answer means the expected answer"
}`

      const response = await this.client.chat.completions.create({
        model: process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct',
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: 'json_object' }
      })
      const content = response.choices[0]?.message?.content || '{}'
      return !!JSON.parse(content).accepted
    } catch (e) {
      console.error('Semantic Verification Failed:', e)
      return false
    }
  }
}

export const aiProvider = new NvidiaKimiProvider()

// Pipeline Helper
export function normalizeAnswer(input: string): string {
  if (!input) return ''
  return input.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\p{L}\p{N}\s]/giu, '') // Remove punctuation but keep ALL letters (including Arabic) and numbers
    .replace(/\s+/g, ' ') // Remove extra spaces
    .trim()
}

export function fuzzyMatch(nInput: string, nTarget: string): number {
  if (!nInput || !nTarget) return 0
  if (nInput === nTarget) return 1
  if (nTarget.length > 3 && nInput.includes(nTarget)) return 0.9
  if (nInput.length > 3 && nTarget.includes(nInput)) return 0.9

  // Basic Levenshtein approximation
  let matches = 0
  for(let i=0; i<Math.min(nInput.length, nTarget.length); i++) {
    if(nInput[i] === nTarget[i]) matches++
  }
  const score = matches / Math.max(nInput.length, nTarget.length)
  return score
}
