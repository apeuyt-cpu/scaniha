import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Player {
  phone: string
  name: string
  age?: number | null
  status: string
  roundsSurvived: number
}

interface GameBoardProps {
  roundNumber: number
  roundType?: 'choice' | 'input'
  roundText: string
  roundOptions: {id: string, label: string}[]
  phase: 'playing' | 'reveal'
  roundReplies?: {phone: string, optionId: string | null, isCorrect?: boolean}[]
  correctOptionId?: string | null
  players?: Player[]
  timerMs: number
  onSubmit: (selectedIds: string[]) => void
  onTimeUp: () => void
  onVoteJustice?: (targetPhone: string) => void
  justiceVotes?: Record<string, string[]>
  myPhone?: string
  accent: string
  gradient: string
}

export default function GameBoard({ 
  roundNumber, roundType = 'choice', roundText, roundOptions, phase: externalPhase, 
  roundReplies = [], correctOptionId, players = [], timerMs, onSubmit, onTimeUp, onVoteJustice, justiceVotes = {}, myPhone, accent, gradient 
}: GameBoardProps) {
  const [internalPhase, setInternalPhase] = useState<'read' | 'answer'>('read')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  // Reset state when round changes
  useEffect(() => {
    setInternalPhase('read')
    setSelectedId(null)
    setInputText('')
    setSubmitted(false)
    const t = setTimeout(() => {
      setInternalPhase('answer')
      setTimeLeft(timerMs / 1000)
    }, 3500)
    return () => clearTimeout(t)
  }, [roundNumber, roundText, timerMs])

  // Answer timer phase
  useEffect(() => {
    if (externalPhase === 'reveal') return
    if (internalPhase !== 'answer') return
    if (timeLeft <= 0) {
      if (!submitted) {
        onTimeUp()
        setSubmitted(true)
      }
      return
    }
    const t = setTimeout(() => setTimeLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [internalPhase, timeLeft, onTimeUp, submitted, externalPhase])

  const handleSelect = (id: string) => {
    if (submitted || externalPhase === 'reveal') return
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) window.navigator.vibrate(20)
    setSelectedId(id)
  }

  const handleSubmit = () => {
    if (submitted) return
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) window.navigator.vibrate(50)
    setSubmitted(true)
    if (roundType === 'input') {
      onSubmit([inputText.trim()])
    } else {
      if (!selectedId) return
      onSubmit([selectedId])
    }
  }

  if (internalPhase === 'read' && externalPhase !== 'reveal') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center w-full px-4"
      >
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold uppercase tracking-widest mb-6" 
          style={{ color: accent }}
        >
          🌟 Round {roundNumber} 🌟
        </motion.h2>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="text-3xl sm:text-4xl font-black leading-tight drop-shadow-sm" 
          style={{ color: '#1A1410', fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {roundText}
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="mt-12 w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" 
          style={{ borderColor: `${accent}40`, borderTopColor: accent }} 
        />
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-4 text-sm font-bold uppercase tracking-wide" 
          style={{ color: '#71695F' }}
        >
          Préparez-vous !
        </motion.p>
      </motion.div>
    )
  }

  return (
    <div className="flex-1 flex flex-col relative w-full h-full pb-24 overflow-y-auto">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      <div className="p-4 sm:p-6 w-full max-w-lg mx-auto flex-1 flex flex-col relative z-10">
        <div className="flex justify-between items-center mb-6 bg-white/70 backdrop-blur-md px-5 py-3 rounded-2xl shadow-sm border border-white">
          <div className="font-black text-lg sm:text-xl tracking-tight" style={{ color: accent }}>
            Round {roundNumber}
          </div>
          <div className={`font-mono font-bold text-lg px-4 py-1.5 rounded-full shadow-inner ${timeLeft <= 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
            {externalPhase === 'reveal' ? 'FINI' : timeLeft + 's'}
          </div>
        </div>

        <motion.div 
          layoutId="roundCard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-xl border border-white mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-black text-center text-slate-800 leading-snug drop-shadow-sm">
            {roundText}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {roundType === 'input' && externalPhase !== 'reveal' && (
              <motion.div 
                key="input-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={submitted}
                  placeholder="Tapez votre réponse ici..."
                  className="w-full px-6 py-5 text-center rounded-2xl text-xl font-bold border-2 focus:outline-none transition-all shadow-sm focus:shadow-md focus:scale-[1.02]"
                  style={{ borderColor: accent, background: '#ffffff', color: '#1e293b' }}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {roundType === 'input' && externalPhase === 'reveal' && (
              <motion.div 
                key="reveal-phase"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-3"
              >
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="bg-green-100 border-2 border-green-500 rounded-2xl p-4 text-center shadow-sm"
                >
                  <span className="text-sm font-bold text-green-700 uppercase tracking-widest block mb-1">La bonne réponse :</span>
                  <span className="text-2xl font-black text-green-800">{correctOptionId}</span>
                </motion.div>
                <motion.div layout className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roundReplies.map((reply, idx) => {
                    const p = players.find(player => player.phone === reply.phone)
                    const isCorrect = reply.isCorrect // Evaluated by the AI Judge server-side
                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1, type: 'spring' }}
                        key={idx} 
                        className={`p-4 rounded-2xl shadow-md border-2 transition-all ${isCorrect ? 'bg-green-50/90 border-green-400' : 'bg-red-50/90 border-red-300'} flex justify-between items-center backdrop-blur-sm`}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-lg">
                            {p?.name || 'Inconnu'} {p?.age ? <span className="text-xs text-slate-500 ml-1">({p.age} ans)</span> : null}
                          </span>
                          <span className="font-mono text-slate-600 font-medium">"{reply.optionId}"</span>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex flex-col items-end">
                            <motion.span 
                              animate={isCorrect ? { scale: [1, 1.2, 1] } : { x: [-5, 5, -5, 5, 0] }}
                              transition={{ duration: 0.5, repeat: isCorrect ? Infinity : 0, repeatDelay: 1 }}
                              className="text-3xl"
                            >
                              {isCorrect ? '🎉' : '💀'}
                            </motion.span>
                            {isCorrect && <span className="text-green-600 font-black text-sm mt-1 animate-pulse">+2 pts</span>}
                          </div>
                          
                          {!isCorrect && reply.phone !== myPhone && (
                            <button
                              onClick={() => {
                                // Haptic feedback
                                if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                                  window.navigator.vibrate(50)
                                }
                                onVoteJustice && onVoteJustice(reply.phone)
                              }}
                              disabled={(justiceVotes[reply.phone] || []).includes(myPhone || '')}
                              className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 ${
                                (justiceVotes[reply.phone] || []).includes(myPhone || '') 
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                  : 'bg-white text-orange-500 border-2 border-orange-200 hover:border-orange-500 hover:scale-105 active:scale-95'
                              }`}
                            >
                              <span>👍 Justice</span>
                              <span className="bg-orange-100 px-1.5 py-0.5 rounded-md text-orange-700 ml-1">
                                {(justiceVotes[reply.phone] || []).length}
                              </span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {roundType === 'choice' && roundOptions.map((opt) => {
            const isSelected = selectedId === opt.id
            const isReveal = externalPhase === 'reveal'
            const isCorrect = isReveal && opt.id === correctOptionId
            const isWrongAndSelected = isReveal && isSelected && !isCorrect
            
            // Find who picked this option
            const pickedBy = roundReplies.filter(r => r.optionId === opt.id).map(r => {
              const p = players.find(player => player.phone === r.phone)
              return p?.name || 'Inconnu'
            })

            let buttonStyle = {
              background: isSelected ? gradient : '#ffffff',
              borderColor: isSelected ? 'transparent' : '#e2e8f0',
              color: isSelected ? '#ffffff' : '#1e293b',
              boxShadow: isSelected ? '0 10px 25px -5px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
              opacity: 1
            }

            if (isReveal) {
              if (isCorrect) {
                buttonStyle = {
                  background: '#22c55e', // Green
                  borderColor: 'transparent',
                  color: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgba(34,197,94,0.4)',
                  opacity: 1
                }
              } else if (isWrongAndSelected) {
                buttonStyle = {
                  background: '#ef4444', // Red
                  borderColor: 'transparent',
                  color: '#ffffff',
                  boxShadow: 'none',
                  opacity: 1
                }
              } else {
                buttonStyle = {
                  ...buttonStyle,
                  opacity: 0.5
                }
              }
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={submitted || isReveal}
                className="w-full relative px-6 py-5 rounded-2xl text-lg sm:text-xl font-bold transition-all transform active:scale-95 border-b-4 disabled:active:scale-100 flex flex-col items-center justify-center min-h-[80px]"
                style={buttonStyle}
              >
                <span>{opt.label}</span>
                
                {isReveal && pickedBy.length > 0 && (
                  <div className="absolute -bottom-3 flex gap-1 justify-center w-full">
                    {pickedBy.map((name, idx) => (
                      <span key={idx} className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm border border-white">
                        {name.substring(0, 10)}
                      </span>
                    ))}
                  </div>
                )}
                
                {isCorrect && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl animate-bounce">✅</span>
                )}
                {isWrongAndSelected && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">❌</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {!submitted && externalPhase !== 'reveal' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/60 backdrop-blur-xl border-t border-white/50 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
          <button
            onClick={handleSubmit}
            disabled={roundType === 'input' ? !inputText.trim() : !selectedId}
            className="w-full max-w-md mx-auto block rounded-2xl py-4 sm:py-5 text-xl font-black text-white transition-all active:scale-95 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none hover:-translate-y-1"
            style={{ background: gradient }}
          >
            {(roundType === 'input' ? inputText.trim() : selectedId) ? 'VALIDER MON CHOIX ! 🚀' : 'RÉPONDEZ VITE ! ⏳'}
          </button>
        </div>
      )}
      
      {submitted && externalPhase !== 'reveal' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 text-center py-6">
          <span className="font-bold text-lg" style={{ color: '#71695F' }}>En attente des autres joueurs... ⏳</span>
        </div>
      )}
    </div>
  )
}
