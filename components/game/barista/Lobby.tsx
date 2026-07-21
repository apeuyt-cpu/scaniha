import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Player {
  phone: string
  name: string
  age?: number | null
  isHost: boolean
  status: 'alive' | 'eliminated' | 'offline'
  roundsSurvived: number
}

interface LobbyProps {
  roomCode: string | null
  players: Player[]
  isHost: boolean
  onJoin: (code: string) => void
  onCreate: (isPublic: boolean) => void
  onStart: (theme: string) => void
  accent: string
  gradient: string
  loading: boolean
  publicRooms?: { room_code: string; player_count: number }[]
  availableCategories?: string[]
}

export default function Lobby({ roomCode, players, isHost, onJoin, onCreate, onStart, accent, gradient, loading, publicRooms = [], availableCategories = [] }: LobbyProps) {
  const [inputCode, setInputCode] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState('Surprise (Mix Aléatoire)')

  const themes = availableCategories.length > 0 
    ? [...availableCategories, 'Surprise (Mix Aléatoire)']
    : [
        'Culture Générale',
        'Dilemmes & Choix Impossibles',
        'Clash & Roast entre amis',
        'Culture Tunisienne',
        'Surprise (Mix Aléatoire)'
      ]

  if (roomCode) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="flex flex-col items-center gap-6 pt-4 w-full"
      >
        <div className="text-center">
          <h2 className="text-2xl font-black mb-2" style={{ color: '#1A1410', fontFamily: 'Georgia, serif' }}>Code du Salon</h2>
          <div className="px-6 py-4 bg-white rounded-2xl shadow-sm border border-slate-200">
            <span className="text-4xl font-mono tracking-[0.2em] font-bold" style={{ color: accent }}>{roomCode}</span>
          </div>
          <p className="mt-3 text-sm" style={{ color: '#71695F' }}>Partagez ce code avec vos amis à table !</p>
        </div>

        <div className="w-full bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider" style={{ color: '#B7AFA4' }}>Joueurs ({players.length})</h3>
          <ul className="space-y-2">
            <AnimatePresence>
              {players.map((p, i) => (
                <motion.li 
                  key={p.phone}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring' }}
                  className="flex items-center gap-3 p-3 rounded-xl" 
                  style={{ background: '#FAF8F5' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: p.isHost ? gradient : '#B7AFA4' }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium flex-1" style={{ color: '#1A1410' }}>
                    {p.name} {p.age ? <span className="text-xs text-gray-500 ml-1">({p.age} ans)</span> : null} {p.isHost && '👑'}
                  </span>
                  {p.status === 'offline' && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">Hors ligne</span>}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>

        {isHost ? (
          <div className="w-full flex flex-col gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold mb-2 text-sm uppercase tracking-wider" style={{ color: '#1A1410' }}>Thème de la partie</h3>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full p-3 rounded-xl border-2 outline-none font-semibold text-sm"
                style={{ borderColor: accent, color: '#1A1410', backgroundColor: '#FAF8F5' }}
              >
                {themes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button
              type="button"
              disabled={players.length < 1 || loading}
              onClick={() => onStart(selectedTheme)}
              className="w-full rounded-2xl py-4 text-base font-bold text-white transition active:scale-95 disabled:opacity-50"
              style={{ background: gradient, boxShadow: `0 10px 25px -10px ${accent}` }}
            >
              {loading ? 'Génération IA...' : 'Démarrer la partie'}
            </button>
          </div>
        ) : (
          <div className="w-full text-center p-4 rounded-2xl bg-amber-50 text-amber-800 text-sm font-medium">
            En attente de l'hôte pour commencer...
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-6 pt-4 w-full"
    >
      <div className="text-center mb-2">
        <h2 className="text-2xl font-black mb-2" style={{ color: '#1A1410', fontFamily: 'Georgia, serif' }}>Rejoindre une partie</h2>
        <p className="text-sm" style={{ color: '#71695F' }}>Entrez le code de vos amis pour jouer ensemble.</p>
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="text"
          maxLength={4}
          placeholder="CODE (ex: ABCD)"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          className="w-full text-center text-2xl font-mono tracking-widest font-bold py-4 rounded-2xl border-2 outline-none transition-colors"
          style={{ borderColor: inputCode.length === 4 ? accent : '#EFEAE3', color: '#1A1410' }}
        />
        <button
          type="button"
          disabled={inputCode.length !== 4 || loading}
          onClick={() => onJoin(inputCode)}
          className="w-full rounded-2xl py-4 text-base font-bold text-white transition active:scale-95 disabled:opacity-50"
          style={{ background: gradient, boxShadow: `0 10px 25px -10px ${accent}` }}
        >
          {loading ? 'Connexion...' : 'Rejoindre'}
        </button>
      </div>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="flex-shrink-0 mx-4 text-sm font-medium" style={{ color: '#B7AFA4' }}>OU</span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 px-2 py-1 cursor-pointer w-fit mx-auto">
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-5 h-5 accent-amber-600 rounded cursor-pointer" />
          <span className="text-sm font-semibold" style={{ color: '#71695F' }}>Rendre la partie publique</span>
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => onCreate(isPublic)}
          className="w-full rounded-2xl py-4 text-base font-bold transition active:scale-95 disabled:opacity-50 border-2"
          style={{ borderColor: accent, color: accent, background: 'transparent' }}
        >
          {loading ? 'Création...' : 'Créer une partie'}
        </button>
      </div>

      {publicRooms.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 border-dashed">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-center" style={{ color: '#B7AFA4' }}>Parties Publiques ({publicRooms.length})</h3>
          <ul className="space-y-3">
            {publicRooms.map(r => (
              <li key={r.room_code} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="font-mono font-black text-xl tracking-wider" style={{ color: '#1A1410' }}>{r.room_code}</div>
                  <div className="text-xs font-semibold mt-1" style={{ color: '#71695F' }}>{r.player_count} joueur{r.player_count > 1 ? 's' : ''} en attente</div>
                </div>
                <button
                  type="button"
                  onClick={() => onJoin(r.room_code)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
                  style={{ background: gradient, boxShadow: `0 4px 12px -4px ${accent}` }}
                >
                  Rejoindre
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
