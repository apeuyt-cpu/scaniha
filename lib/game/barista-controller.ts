import { createServiceRoleClient } from '@/lib/supabase/server'
import { evaluateAnswersLocal } from '@/lib/game/ai-generator'

const GAME_COST = 10

export async function handleCreate(sb: any, biz: any, phone: string, name: string, age: number | null, isPublic: boolean) {
  const { data: summary } = await sb.rpc('customer_summary', { p_business: biz.id, p_phone: phone })
  const currentBalance = summary?.balance || 0
  if (currentBalance < GAME_COST) {
    return { success: false, error: `Fonds insuffisants (${GAME_COST} pts requis, vous avez ${currentBalance} pts).`, status: 402 }
  }
  
  await sb.from('points_ledger').insert({ business_id: biz.id, customer_phone: phone, delta: -GAME_COST, reason: 'play', note: "Création d'une partie Sparkle Party 🌟" })

  const newRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase()

  const { data: sessionData, error: sessionErr } = await sb
    .from('game_sessions')
    .insert({ business_id: biz.id, room_code: newRoomCode, status: 'lobby', created_by: phone, is_public: isPublic || false })
    .select('id, room_code')
    .single()
    
  if (sessionErr) return { success: false, error: 'Erreur serveur.', status: 500 }

  await sb.from('game_players').insert({ session_id: sessionData.id, customer_phone: phone, customer_name: name, age })

  return { success: true, session: sessionData, status: 200 }
}

export async function handleJoin(sb: any, biz: any, phone: string, name: string, age: number | null, roomCode: string) {
  if (!roomCode) return { success: false, error: 'Code manquant.', status: 400 }
  const sanitizedCode = roomCode.trim().toUpperCase()
  const { data: sessionData } = await sb.from('game_sessions').select('id, status, room_code').eq('business_id', biz.id).eq('room_code', sanitizedCode).maybeSingle()
  if (!sessionData) return { success: false, error: 'Partie introuvable.', status: 404 }

  const { data: existingPlayer } = await sb.from('game_players').select('id').eq('session_id', sessionData.id).eq('customer_phone', phone).maybeSingle()
  
  // If they are not an existing player and the game isn't in lobby, block them
  if (!existingPlayer && sessionData.status !== 'lobby') {
    return { success: false, error: 'La partie a déjà commencé ou est terminée.', status: 400 }
  }

  if (!existingPlayer) {
    // Joining is free for guests. Only the host pays to create the room.
    const { error: insertErr } = await sb.from('game_players').insert({ session_id: sessionData.id, customer_phone: phone, customer_name: name, age })
    if (insertErr) {
      console.error("game_players insert error:", insertErr)
      return { success: false, error: 'Impossible de rejoindre: ' + insertErr.message, status: 500 }
    }
  }

  let currentRound = null
  if (sessionData.status === 'playing') {
    const { data: latestRound } = await sb.from('game_rounds')
      .select('round_number, correct_attributes')
      .eq('session_id', sessionData.id)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()
      
    if (latestRound && latestRound.correct_attributes && latestRound.correct_attributes.length > 1) {
      const q = latestRound.correct_attributes[1]
      currentRound = {
        round_number: latestRound.round_number,
        type: q.type || 'input',
        text: q.text,
        options: q.options || []
      }
    }
  }

  return { success: true, session: sessionData, round: currentRound, status: 200 }
}

export async function handleListPublic(sb: any, biz: any) {
  const { data: publicRooms } = await sb.from('game_sessions')
    .select('room_code')
    .eq('business_id', biz.id)
    .eq('status', 'lobby')
    .eq('is_public', true)

  return { success: true, rooms: publicRooms || [], status: 200 }
}

export async function handleStart(sb: any, session_id: string, phone: string, theme: string) {
  const { data: sessionData } = await sb.from('game_sessions').select('id, created_by, business_id').eq('id', session_id).maybeSingle()
  if (!sessionData || sessionData.created_by !== phone) return { success: false, error: 'Non autorisé.', status: 403 }

  let query = sb.from('custom_game_questions').select('*').eq('business_id', sessionData.business_id)
  
  if (theme && theme !== 'Surprise (Mix Aléatoire)') {
    query = query.eq('category', theme)
  }

  const { data: customQuestions } = await query
  
  if (!customQuestions || customQuestions.length < 5) {
    return { success: false, error: `Pas assez de questions pour le thème "${theme}". Au moins 5 questions requises.`, status: 400 }
  }

  // Shuffle and pick 5 questions
  const shuffled = customQuestions.sort(() => 0.5 - Math.random()).slice(0, 5)

  await sb.from('game_sessions').update({ status: 'playing', configuration: { theme } }).eq('id', session_id)
  
  const roundsToInsert = shuffled.map((q: any, i: number) => ({
    session_id,
    round_number: i + 1,
    correct_attributes: [
      q.correct_entity || '', 
      { 
        type: 'input', 
        text: q.text, 
        options: [], 
        answer_mode: q.answer_mode || 'objective', 
        correct_entity: q.correct_entity || '', 
        aliases: q.aliases || [] 
      }
    ]
  }))
  
  const { error: insertErr } = await sb.from('game_rounds').insert(roundsToInsert)
  if (insertErr) {
    return { success: false, error: 'Erreur lors de la création des rounds.', status: 500 }
  }

  const firstRound = roundsToInsert[0].correct_attributes[1] as any
  
  return { success: true, round: { round_number: 1, type: 'input', text: firstRound.text, options: [] }, status: 200 }
}

export async function handleNextRound(sb: any, session_id: string, phone: string, current_round: number) {
  const { data: sessionData } = await sb.from('game_sessions').select('id, created_by').eq('id', session_id).maybeSingle()
  if (!sessionData || sessionData.created_by !== phone) return { success: false, error: 'Non autorisé.', status: 403 }

  const nextRoundNum = (current_round || 0) + 1
  const MAX_ROUNDS = 5
  
  if (nextRoundNum > MAX_ROUNDS) {
    return { success: true, isEnd: true, status: 200 }
  }

  const { data: nextRoundData } = await sb.from('game_rounds')
    .select('correct_attributes')
    .eq('session_id', session_id)
    .eq('round_number', nextRoundNum)
    .maybeSingle()

  if (!nextRoundData || !nextRoundData.correct_attributes || nextRoundData.correct_attributes.length < 2) {
    return { success: true, isEnd: true, status: 200 }
  }

  const payload = nextRoundData.correct_attributes[1] as any
  
  return { success: true, round: { round_number: nextRoundNum, type: 'input', text: payload.text, options: [] }, status: 200 }
}

export async function handleEvaluate(sb: any, session_id: string, phone: string, round_number: number, answers: any[]) {
  if (!round_number || !Array.isArray(answers)) return { success: false, error: 'Données invalides.', status: 400 }

  const { data: sessionData } = await sb.from('game_sessions').select('id, created_by').eq('id', session_id).maybeSingle()
  if (!sessionData || sessionData.created_by !== phone) return { success: false, error: 'Non autorisé.', status: 403 }

  const { data: roundData } = await sb.from('game_rounds').select('correct_attributes').eq('session_id', session_id).eq('round_number', round_number).maybeSingle()
  if (!roundData) return { success: false, error: 'Round introuvable.', status: 404 }

  const correctId = roundData.correct_attributes[0]
  const payload = roundData.correct_attributes[1] || {}
  const isInput = payload.type === 'input'
  const answerMode = payload.answer_mode || 'objective'
  const correctEntity = payload.correct_entity || correctId
  const aliases = payload.aliases || []
  const questionText = payload.text || ''

  const { data: activePlayersDB } = await sb.from('game_players').select('customer_name').eq('session_id', session_id)
  const activePlayers = activePlayersDB?.map((p: any) => p.customer_name) || []

  let winningPhones: string[] = []

  if (isInput && answers.length > 0) {
    winningPhones = await evaluateAnswersLocal(questionText, answerMode, correctEntity, aliases, activePlayers, answers)
  } else if (!isInput && answers.length > 0) {
    answers.forEach(a => {
      if (a.text === correctId) winningPhones.push(a.phone)
    })
  }

  for (const pPhone of winningPhones) {
    const { data: p } = await sb.from('game_players').select('rounds_survived').eq('session_id', session_id).eq('customer_phone', pPhone).single()
    const newScore = (p?.rounds_survived || 0) + 2
    await sb.from('game_players').update({ rounds_survived: newScore }).eq('session_id', session_id).eq('customer_phone', pPhone)
  }

  const { data: updatedPlayers } = await sb.from('game_players').select('customer_phone, rounds_survived').eq('session_id', session_id)
  const scores = updatedPlayers?.reduce((acc: any, p: any) => {
    acc[p.customer_phone] = p.rounds_survived
    return acc
  }, {}) || {}

  return { success: true, correctId, winners: winningPhones, scores, status: 200 }
}

export async function handleVoteJustice(sb: any, session_id: string, voter_phone: string, target_phone: string, round_number: number) {
  if (!target_phone || !round_number) return { success: false, error: 'Données invalides.', status: 400 }

  const { data: sessionData } = await sb.from('game_sessions').select('id, configuration').eq('id', session_id).maybeSingle()
  if (!sessionData) return { success: false, error: 'Session introuvable.', status: 404 }

  const { data: players } = await sb.from('game_players').select('id').eq('session_id', session_id)
  const totalPlayers = players?.length || 1
  const threshold = Math.max(2, Math.floor(totalPlayers / 2))

  const conf = sessionData.configuration as any || {}
  const justiceVotes = conf.justice_votes || {}
  const voteKey = `${round_number}_${target_phone}`
  
  if (!justiceVotes[voteKey]) justiceVotes[voteKey] = []
  
  // Prevent double voting
  if (justiceVotes[voteKey].includes(voter_phone)) {
    return { success: true, status: 200 } // Already voted
  }
  
  justiceVotes[voteKey].push(voter_phone)
  conf.justice_votes = justiceVotes
  
  await sb.from('game_sessions').update({ configuration: conf }).eq('id', session_id)

  if (justiceVotes[voteKey].length >= threshold) {
    // Threshold met! Server-Authoritative score award.
    // Ensure we only award once per voteKey
    if (!conf.justice_awarded) conf.justice_awarded = []
    if (!conf.justice_awarded.includes(voteKey)) {
      conf.justice_awarded.push(voteKey)
      await sb.from('game_sessions').update({ configuration: conf }).eq('id', session_id)

      const { data: p } = await sb.from('game_players').select('rounds_survived').eq('session_id', session_id).eq('customer_phone', target_phone).single()
      if (p) {
        const newScore = (p.rounds_survived || 0) + 2
        await sb.from('game_players').update({ rounds_survived: newScore }).eq('session_id', session_id).eq('customer_phone', target_phone)
        return { success: true, thresholdMet: true, newScore, targetPhone: target_phone, status: 200 }
      }
    }
  }

  return { success: true, thresholdMet: false, status: 200 }
}

export async function handleEndGame(sb: any, biz: any, session_id: string, phone: string) {
  const { data: sessionData } = await sb.from('game_sessions').select('id, created_by').eq('id', session_id).maybeSingle()
  if (!sessionData || sessionData.created_by !== phone) return { success: false, error: 'Non autorisé.', status: 403 }

  await sb.from('game_sessions').update({ status: 'finished' }).eq('id', session_id)

  const { data: players } = await sb.from('game_players').select('*').eq('session_id', session_id)
  if (players) {
    let maxSurvived = -1
    let winnerPhone: string | null = null
    let winnerId: string | null = null

    for (const p of players) {
      if (p.rounds_survived > maxSurvived) {
        maxSurvived = p.rounds_survived
        winnerPhone = p.customer_phone
        winnerId = p.id
      }
    }

    if (winnerId) {
      await sb.from('game_players').update({ is_winner: true }).eq('id', winnerId)
    }

    for (const p of players) {
      let earned = p.rounds_survived
      if (p.id === winnerId) earned += 15
      if (earned > 0) {
        await sb.from('points_ledger').insert({ business_id: biz.id, customer_phone: p.customer_phone, delta: earned, reason: 'play', note: "Gain Sparkle Party 🌟" })
      }
    }
  }

  return { success: true, status: 200 }
}
