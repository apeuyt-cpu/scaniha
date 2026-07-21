import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Player {
  phone: string
  name: string
  age?: number | null
  status: string
  roundsSurvived: number // Score
}

interface LeaderboardProps {
  players: Player[]
  roundNumber: number
  accent: string
  gradient: string
}

export default function Leaderboard({ players, roundNumber, accent, gradient }: LeaderboardProps) {
  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.roundsSurvived - a.roundsSurvived)

  const top3 = sortedPlayers.slice(0, 3)
  const restOfPlayers = sortedPlayers.slice(3)

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-start min-h-[100vh] w-full px-4 pt-12 pb-24 overflow-x-hidden bg-slate-900 text-white"
    >
      {/* Background Glow */}
      <div 
        className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ background: gradient }}
      />

      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-2xl relative z-10 flex flex-col items-center"
      >
        
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 font-bold uppercase tracking-widest text-xs mb-4"
          >
            Round {roundNumber} Terminé
          </motion.div>
          <motion.h2 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
            className="text-5xl md:text-6xl font-black text-transparent bg-clip-text drop-shadow-lg tracking-tight"
            style={{ backgroundImage: gradient }}
          >
            LE CLASSEMENT
          </motion.h2>
        </div>

        {/* PODIUM SECTION */}
        <div className="flex items-end justify-center w-full h-[280px] mb-16 gap-2 md:gap-4">
          
          {/* 2nd Place */}
          {top3[1] && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="flex flex-col items-center w-[30%]"
            >
              <div className="flex flex-col items-center mb-4">
                <span className="text-4xl mb-1">🥈</span>
                <span className="font-bold text-lg text-slate-200 text-center truncate w-full px-1">{top3[1].name}</span>
                <span className="text-3xl font-black text-white">{top3[1].roundsSurvived} <span className="text-xs text-slate-400">pts</span></span>
              </div>
              <div className="w-full h-[140px] rounded-t-2xl border-t border-x border-slate-300/30 relative overflow-hidden"
                   style={{ background: 'linear-gradient(to top, rgba(148, 163, 184, 0.1), rgba(148, 163, 184, 0.4))' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="absolute top-4 w-full text-center text-4xl font-black text-slate-300/50">2</div>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <motion.div 
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="flex flex-col items-center w-[35%] z-10"
            >
              <div className="flex flex-col items-center mb-4 relative">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute -top-12"
                >
                  <span className="text-5xl drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]">👑</span>
                </motion.div>
                <span className="font-black text-2xl text-amber-300 text-center truncate w-full px-1">{top3[0].name}</span>
                <span className="text-5xl font-black text-white drop-shadow-md">{top3[0].roundsSurvived} <span className="text-sm text-slate-400">pts</span></span>
              </div>
              <div className="w-full h-[200px] rounded-t-2xl shadow-[0_0_40px_rgba(251,191,36,0.3)] relative overflow-hidden"
                   style={{ background: gradient }}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                <div className="absolute top-4 w-full text-center text-6xl font-black text-white/30">1</div>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <motion.div 
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="flex flex-col items-center w-[30%]"
            >
              <div className="flex flex-col items-center mb-4">
                <span className="text-4xl mb-1">🥉</span>
                <span className="font-bold text-lg text-slate-300 text-center truncate w-full px-1">{top3[2].name}</span>
                <span className="text-3xl font-black text-white">{top3[2].roundsSurvived} <span className="text-xs text-slate-400">pts</span></span>
              </div>
              <div className="w-full h-[100px] rounded-t-2xl border-t border-x border-amber-700/30 relative overflow-hidden"
                   style={{ background: 'linear-gradient(to top, rgba(180, 83, 9, 0.1), rgba(180, 83, 9, 0.4))' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="absolute top-4 w-full text-center text-4xl font-black text-amber-700/50">3</div>
              </div>
            </motion.div>
          )}

        </div>

        {/* REST OF PLAYERS */}
        {restOfPlayers.length > 0 && (
          <div className="w-full flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {restOfPlayers.map((player, index) => {
                const globalRank = index + 4
                return (
                  <motion.div 
                    layout
                    key={player.phone}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + (index * 0.1), type: 'spring', bounce: 0.4 }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-slate-300 font-bold text-lg border border-white/5">
                        {globalRank}
                      </div>
                      <span className="font-bold text-xl text-slate-100">
                        {player.name}
                      </span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black font-mono tracking-tighter text-white">
                        {player.roundsSurvived}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">pts</span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* LOADING INDICATOR FOR NEXT ROUND */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-16 text-center flex flex-col items-center gap-4"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-slate-700 absolute" />
            <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin relative z-10" style={{ borderTopColor: accent }} />
          </div>
          <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Préparation du prochain round...</span>
        </motion.div>

      </motion.div>
    </motion.div>
  )
}
