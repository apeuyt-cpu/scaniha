import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { Player } from './Lobby'
import { ChatMessage } from './ChatOverlay'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export type GameState = 'lobby' | 'playing' | 'reveal' | 'leaderboard' | 'finished'

interface UseMultiplayerGameProps {
  slug: string
  token: string
  phone: string
  name: string
  age?: number | null
}

export function useMultiplayerGame({ slug, token, phone, name, age }: UseMultiplayerGameProps) {
  const [gameState, setGameState] = useState<GameState>('lobby')
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Round state
  const [roundNumber, setRoundNumber] = useState(1)
  const [roundType, setRoundType] = useState<'choice' | 'input'>('choice')
  const [roundText, setRoundText] = useState('')
  const [roundOptions, setRoundOptions] = useState<{id: string, label: string}[]>([])
  const [repliedPhones, setRepliedPhones] = useState<string[]>([])
  const [roundReplies, setRoundReplies] = useState<{phone: string, optionId: string | null, isCorrect?: boolean}[]>([])
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null)
  const [winnerPhone, setWinnerPhone] = useState<string | null>(null)
  const [justiceVotes, setJusticeVotes] = useState<Record<string, string[]>>({})

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [typingUsers, setTypingUsers] = useState<{name: string, timestamp: number}[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const [publicRooms, setPublicRooms] = useState<{ room_code: string; player_count: number }[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  // Fetch public rooms and categories in lobby
  useEffect(() => {
    if (gameState === 'lobby' && !roomCode) {
      const fetchInitialData = async () => {
        try {
          const res = await fetch(`/api/game/${slug}/barista`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_public', token })
          })
          const d = await res.json()
          if (d.success) setPublicRooms(d.rooms)

          const resCat = await fetch(`/api/game/${slug}/barista`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_categories', token })
          })
          const dCat = await resCat.json()
          if (dCat.success) setAvailableCategories(dCat.categories)
        } catch (e) {}
      }
      fetchInitialData()
      const interval = setInterval(fetchInitialData, 10000)
      return () => clearInterval(interval)
    }
  }, [gameState, roomCode, slug, token])

  // Clean up channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  const subscribeToRoom = useCallback((code: string, sid: string, host: boolean) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase.channel(`barista:${code}`, {
      config: { 
        presence: { key: phone },
        broadcast: { self: true }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setPlayers(prevPlayers => {
          const updatedPlayers = [...prevPlayers]
          
          for (const key in state) {
            const presences = state[key] as any[]
            if (presences.length > 0) {
              const incomingPlayer = presences[0] as Player
              const existingIndex = updatedPlayers.findIndex(p => p.phone === incomingPlayer.phone)
              
              if (existingIndex >= 0) {
                // Keep the highest roundsSurvived to prevent presence overwriting local score
                updatedPlayers[existingIndex] = {
                  ...incomingPlayer,
                  roundsSurvived: Math.max(updatedPlayers[existingIndex].roundsSurvived, incomingPlayer.roundsSurvived),
                  status: 'alive'
                }
              } else {
                updatedPlayers.push(incomingPlayer)
              }
            }
          }
          
          // --- Host Migration Logic ---
          const finalPlayers = updatedPlayers.map(p => ({
            ...p,
            status: (state[p.phone] ? 'alive' : 'offline') as 'alive' | 'offline' | 'eliminated'
          }))
          const alivePlayers = finalPlayers.filter(p => p.status === 'alive')
          if (alivePlayers.length > 0) {
            const hasAliveHost = alivePlayers.some(p => p.isHost)
            if (!hasAliveHost) {
              // The host is dead! The oldest alive player becomes the new host.
              // To ensure determinism, we sort by phone number (or simply use the first alive player)
              alivePlayers.sort((a, b) => a.phone.localeCompare(b.phone))
              const newHostPhone = alivePlayers[0].phone
              
              const hostIndex = finalPlayers.findIndex(p => p.phone === newHostPhone)
              if (hostIndex >= 0) finalPlayers[hostIndex].isHost = true
              
              if (newHostPhone === phone && !isHost) {
                // I am the new captain now.
                setIsHost(true)
                // We must broadcast our new host status so others don't also try to take over later
                channelRef.current?.track({ ...finalPlayers[hostIndex] })
              }
            }
          }
          
          return finalPlayers
        })
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        setRoundNumber(payload.round_number)
        setRoundType(payload.type || 'choice')
        setRoundText(payload.text)
        setRoundOptions(payload.options || [])
        setRepliedPhones([])
        setRoundReplies([])
        setCorrectOptionId(null)
        setJusticeVotes({})
        setGameState('playing')
      })
      .on('broadcast', { event: 'next_round' }, ({ payload }) => {
        setRoundNumber(payload.round_number)
        setRoundType(payload.type || 'choice')
        setRoundText(payload.text)
        setRoundOptions(payload.options || [])
        setRepliedPhones([])
        setRoundReplies([])
        setCorrectOptionId(null)
        setJusticeVotes({})
        setGameState('playing')
      })
      .on('broadcast', { event: 'player_locked_in' }, ({ payload }) => {
        setRoundReplies(prev => {
          if (!prev.some(r => r.phone === payload.phone)) {
            return [...prev, { phone: payload.phone, optionId: payload.optionId }]
          }
          return prev
        })
        setRepliedPhones(prev => prev.includes(payload.phone) ? prev : [...prev, payload.phone])
        
        if (payload.isCorrect) {
          setPlayers(prev => prev.map(p => p.phone === payload.phone ? { ...p, roundsSurvived: p.roundsSurvived + 1 } : p))
        }
        if (payload.correctId) {
          setCorrectOptionId(payload.correctId)
        }
      })
      .on('broadcast', { event: 'show_reveal' }, ({ payload }) => {
        setGameState('reveal')
        if (payload.correctId) setCorrectOptionId(payload.correctId)
        if (payload.winners) {
          setRoundReplies(prev => prev.map(r => ({
            ...r,
            isCorrect: payload.winners.includes(r.phone)
          })))
          
          if (payload.scores) {
            setPlayers(currentPlayers => {
              const updated = currentPlayers.map(p => ({
                ...p,
                roundsSurvived: payload.scores[p.phone] !== undefined ? payload.scores[p.phone] : p.roundsSurvived
              }))
              
              const me = updated.find(p => p.phone === phone)
              if (me) {
                channelRef.current?.track({ ...me })
              }
              return updated
            })
          }
        }
      })
      .on('broadcast', { event: 'vote_justice' }, ({ payload }) => {
        setJusticeVotes(prev => {
          const targetVotes = prev[payload.targetPhone] || []
          if (targetVotes.includes(payload.voterPhone)) return prev
          return { ...prev, [payload.targetPhone]: [...targetVotes, payload.voterPhone] }
        })
      })
      .on('broadcast', { event: 'justice_awarded' }, ({ payload }) => {
        // The server has spoken! Award the points.
        setRoundReplies(replies => replies.map(r => 
          r.phone === payload.targetPhone ? { ...r, isCorrect: true } : r
        ))
        
        setPlayers(currentPlayers => {
          return currentPlayers.map(p => 
            p.phone === payload.targetPhone ? { ...p, roundsSurvived: payload.newScore } : p
          )
        })
      })
      .on('broadcast', { event: 'show_leaderboard' }, () => {
        setGameState('leaderboard')
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        setPlayers(currentPlayers => {
          let best = currentPlayers[0]
          for(let p of currentPlayers) {
            if (p.roundsSurvived > (best?.roundsSurvived || 0)) best = p
          }
          setWinnerPhone(best?.phone || null)
          return currentPlayers
        })
        setGameState('finished')
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        setChatMessages(prev => prev.some(m => m.id === payload.id) ? prev : [...prev, payload])
      })
      .on('broadcast', { event: 'chat_typing' }, ({ payload }) => {
        if (payload.phone === phone) return
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.name !== payload.name)
          return [...filtered, { name: payload.name, timestamp: Date.now() }]
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ phone, name, age, isHost: host, status: 'alive', roundsSurvived: 0 })
        }
      })

    channelRef.current = channel
    setRoomCode(code)
    setSessionId(sid)
    setIsHost(host)
  }, [phone, name, slug, token])

  const handleCreate = useCallback(async (isPublic: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/game/${slug}/barista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', token, is_public: isPublic })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      subscribeToRoom(data.session.room_code, data.session.id, true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug, token, subscribeToRoom])

  const handleJoin = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/game/${slug}/barista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', token, room_code: code })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      subscribeToRoom(data.session.room_code, data.session.id, false)
      if (data.round) {
        setRoundNumber(data.round.round_number)
        setRoundType(data.round.type || 'choice')
        setRoundText(data.round.text)
        setRoundOptions(data.round.options || [])
        setGameState('playing')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug, token, subscribeToRoom])

  const handleStart = useCallback(async (theme: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/game/${slug}/barista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', token, session_id: sessionId, theme })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      
      channelRef.current?.send({
        type: 'broadcast',
        event: 'game_start',
        payload: { round_number: data.round.round_number, type: data.round.type, text: data.round.text, options: data.round.options }
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug, token, sessionId])

  const checkEndGame = useCallback(async () => {
    if (!isHost) return
    try {
      const res = await fetch(`/api/game/${slug}/barista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next_round', token, session_id: sessionId, current_round: roundNumber })
      })
      const data = await res.json()
      if (data.success) {
        if (data.isEnd) {
          await fetch(`/api/game/${slug}/barista`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'end', token, session_id: sessionId })
          })
          channelRef.current?.send({ type: 'broadcast', event: 'game_end', payload: {} })
        } else {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'next_round',
            payload: { round_number: data.round.round_number, type: data.round.type, text: data.round.text, options: data.round.options }
          })
        }
      } else {
        console.error("Next round failed:", data.error)
        // Retry after a short delay
        setTimeout(() => checkEndGame(), 3000)
      }
    } catch (err) {
      console.error("Next round network error:", err)
      setTimeout(() => checkEndGame(), 3000)
    }
  }, [slug, token, sessionId, roundNumber, isHost])

  // Trigger reveal automatically when all players have replied
  useEffect(() => {
    if (!isHost) return
    const activePlayers = players.filter(p => p.status === 'alive')
    if (activePlayers.length > 0 && roundReplies.length >= activePlayers.length) {
      if (gameState === 'playing') {
        const evaluateAndReveal = async () => {
          try {
            const res = await fetch(`/api/game/${slug}/barista`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                action: 'evaluate', 
                token, 
                session_id: sessionId, 
                round_number: roundNumber, 
                answers: roundReplies.map(r => ({ phone: r.phone, text: r.optionId }))
              })
            })
            const data = await res.json()
            if (data.success) {
              setCorrectOptionId(data.correctId)
              channelRef.current?.send({ 
                type: 'broadcast', 
                event: 'show_reveal', 
                payload: { winners: data.winners, correctId: data.correctId, scores: data.scores } 
              })
              
              setTimeout(() => {
                channelRef.current?.send({ type: 'broadcast', event: 'show_leaderboard', payload: {} })
                setTimeout(() => {
                  checkEndGame()
                }, 4000)
              }, 5000)
            }
          } catch (e) {
            console.error('Evaluation failed', e)
          }
        }
        evaluateAndReveal()
      }
    }
  }, [roundReplies, players, isHost, gameState, roundNumber, slug, token, sessionId, checkEndGame])

  const handleSubmitRound = useCallback(async (selectedIds: string[]) => {
    try {
      const res = await fetch(`/api/game/${slug}/barista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', token, session_id: sessionId, round_number: roundNumber, submittedIds: selectedIds })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      if (data.success) {
        channelRef.current?.send({ 
          type: 'broadcast', 
          event: 'player_locked_in', 
          payload: { phone, optionId: selectedIds[0] || null } 
        })
      }
    } catch (e) {
      console.error(e)
    }
  }, [slug, token, sessionId, roundNumber, phone])

  const handleTimeUp = useCallback(() => {
    handleSubmitRound([])
  }, [handleSubmitRound])

  const handleVoteJustice = async (targetPhone: string) => {
    // Optimistically update UI
    setJusticeVotes(prev => {
      const targetVotes = prev[targetPhone] || []
      if (targetVotes.includes(phone)) return prev
      return { ...prev, [targetPhone]: [...targetVotes, phone] }
    })

    // Hit Server-Authoritative API
    try {
      const res = await fetch(`/api/game/${slug}/barista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'vote_justice', 
          token, 
          session_id: sessionId, 
          target_phone: targetPhone,
          round_number: roundNumber 
        })
      })
      const data = await res.json()
      
      // If server threshold met, broadcast the result to everyone!
      if (data.success && data.thresholdMet) {
         channelRef.current?.send({
           type: 'broadcast',
           event: 'justice_awarded',
           payload: { targetPhone, newScore: data.newScore }
         })
         
         // Update local state if I am the target
         if (targetPhone === phone) {
           setPlayers(currentPlayers => {
             const me = currentPlayers.find(p => p.phone === phone)
             if (me) channelRef.current?.track({ ...me, roundsSurvived: data.newScore })
             return currentPlayers.map(p => p.phone === phone ? { ...p, roundsSurvived: data.newScore } : p)
           })
         }
      } else {
         // Just broadcast the vote to others so they see it
         channelRef.current?.send({
           type: 'broadcast',
           event: 'vote_justice',
           payload: { targetPhone, voterPhone: phone }
         })
      }
    } catch (e) {
      console.error('Vote failed', e)
    }
  }

  const sendChatMessage = (text: string) => {
    if (!channelRef.current) return
    const msg = {
      id: Math.random().toString(36).substr(2, 9),
      senderName: name,
      senderPhone: phone,
      text,
      timestamp: Date.now()
    }
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: msg
    })
    setChatMessages(prev => [...prev, msg])
  }

  const sendTyping = () => {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_typing',
      payload: { phone, name }
    })
  }

  // Cleanup old typing users
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers(prev => prev.filter(u => now - u.timestamp < 3000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    gameState,
    roomCode,
    isHost,
    players,
    loading,
    error,
    roundNumber,
    roundType,
    roundText,
    roundOptions,
    roundReplies,
    correctOptionId,
    winnerPhone,
    justiceVotes,
    chatMessages,
    isChatOpen,
    setIsChatOpen,
    typingUsers,
    publicRooms,
    handleCreate,
    handleJoin,
    handleStart,
    handleSubmitRound,
    handleTimeUp,
    handleVoteJustice,
    handleSendChatMessage: sendChatMessage,
    handleSendTyping: sendTyping,
    availableCategories
  }
}
