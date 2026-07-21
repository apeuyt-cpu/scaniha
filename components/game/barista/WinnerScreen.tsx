import React from 'react'
import { motion } from 'framer-motion'
import { Player } from './Lobby'
import Confetti from '../Confetti'

interface WinnerScreenProps {
  players: Player[]
  winnerPhone: string | null
  myPhone: string
  accent: string
  gradient: string
  onClose: () => void
}

export default function WinnerScreen({ players, winnerPhone, myPhone, accent, gradient, onClose }: WinnerScreenProps) {
  const winner = players.find(p => p.phone === winnerPhone)
  const isMeWinner = winnerPhone === myPhone
  
  const sortedPlayers = [...players].sort((a, b) => b.roundsSurvived - a.roundsSurvived)

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ type: 'spring', damping: 20 }}
      className="flex flex-col items-center justify-center min-h-[85vh] w-full px-4 pb-24 relative"
    >
      {/* Background Confetti Effects */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center items-center text-6xl gap-10 flex-wrap"
      >
        🎉 ✨ 🎊 🎈 🏆 💃 🕺 🥂 🎇
      </motion.div>
      
      {isMeWinner && <Confetti accent={accent} />}
      
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }}
        className="bg-white/90 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] shadow-2xl text-center border-4 border-white w-full max-w-md relative z-10"
      >
        <motion.div 
          animate={{ y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-8xl mb-6 drop-shadow-xl"
        >
          🏆
        </motion.div>
        
        <h2 className="text-4xl sm:text-5xl font-black mb-3 leading-tight tracking-tight text-slate-800">
          {isMeWinner ? 'VOUS AVEZ GAGNÉ !' : `${winner?.name?.toUpperCase() || 'QUELQU\'UN'} GAGNE !`}
        </h2>
        
        <p className="text-lg font-bold uppercase tracking-widest" style={{ color: accent }}>
          {isMeWinner ? '+15 PTS GAGNÉS ! 🔥' : 'Tentez votre chance ! 😅'}
        </p>

        <div className="mt-10 w-full bg-slate-50 rounded-3xl p-5 shadow-inner border border-slate-100">
          <h3 className="font-black mb-4 text-sm uppercase tracking-widest text-slate-400">Classement Final</h3>
          <ul className="space-y-3">
            {sortedPlayers.map((p, i) => {
              const isFirst = i === 0
              return (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                  className={`flex items-center gap-4 p-3 rounded-2xl relative overflow-hidden transition-all ${isFirst ? 'bg-white shadow-md scale-105 z-10' : 'bg-transparent'}`}
                >
                  {isFirst && <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: gradient }}></div>}
                  
                  <div className={`text-xl font-black w-8 ${isFirst ? 'text-yellow-500' : 'text-slate-300'}`}>
                    {isFirst ? '🥇' : i + 1}
                  </div>
                  
                  <span className={`font-bold flex-1 text-left ${isFirst ? 'text-slate-800 text-lg' : 'text-slate-600'}`}>
                    {p.name} {p.phone === myPhone && ' (Vous)'}
                  </span>
                  
                  <span className={`font-black font-mono ${isFirst ? 'text-2xl' : 'text-lg'}`} style={{ color: isFirst ? accent : '#94a3b8' }}>
                    {p.roundsSurvived} <span className="text-[10px] uppercase">pts</span>
                  </span>
                </motion.li>
              )
            })}
          </ul>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) window.navigator.vibrate(50)
            onClose()
          }}
          className="w-full mt-8 rounded-full py-5 text-lg font-black text-white transition-all shadow-2xl"
          style={{ background: gradient, boxShadow: `0 20px 40px -10px ${accent}80` }}
        >
          RETOUR AU SALON 🎮
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
