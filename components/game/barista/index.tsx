'use client'

import React from 'react'
import Lobby from './Lobby'
import GameBoard from './GameBoard'
import Leaderboard from './Leaderboard'
import WinnerScreen from './WinnerScreen'
import ChatOverlay from './ChatOverlay'
import { useMultiplayerGame } from './useMultiplayerGame'

interface BaristaNightmareProps {
  slug: string
  accent: string
  gradient: string
  token: string
  phone: string
  name: string
  onClose: () => void
}

export default function BaristaNightmare({ slug, accent, gradient, token, phone, name, onClose }: BaristaNightmareProps) {
  const {
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
    publicRooms,
    handleCreate,
    handleJoin,
    handleStart,
    handleSubmitRound,
    handleTimeUp,
    handleVoteJustice,
    handleSendChatMessage,
    handleSendTyping,
    typingUsers,
    availableCategories
  } = useMultiplayerGame({ slug, token, phone, name })

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5] relative overflow-y-auto">
      <div className="flex items-center gap-2 p-4">
        <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm text-[#1A1410]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="font-bold">Sparkle Party 🌟</span>
      </div>

      {error && (
        <div className="mx-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex-1 px-4 pb-8">
        {gameState === 'lobby' && (
          <Lobby 
            roomCode={roomCode} 
            players={players} 
            isHost={isHost} 
            onJoin={handleJoin} 
            onCreate={handleCreate} 
            onStart={handleStart} 
            accent={accent} 
            gradient={gradient} 
            loading={loading}
            publicRooms={publicRooms}
            availableCategories={availableCategories}
          />
        )}

        {(gameState === 'playing' || gameState === 'reveal') && (
          <GameBoard 
            roundNumber={roundNumber} 
            roundType={roundType}
            roundText={roundText} 
            roundOptions={roundOptions}
            phase={gameState === 'reveal' ? 'reveal' : 'playing'}
            roundReplies={roundReplies}
            correctOptionId={correctOptionId}
            players={players}
            justiceVotes={justiceVotes}
            timerMs={15000} 
            onSubmit={handleSubmitRound} 
            onTimeUp={handleTimeUp}
            onVoteJustice={handleVoteJustice}
            accent={accent} 
            gradient={gradient}
            myPhone={phone}
          />
        )}

        {gameState === 'leaderboard' && (
          <Leaderboard 
            players={players} 
            roundNumber={roundNumber} 
            accent={accent} 
            gradient={gradient} 
          />
        )}

        {gameState === 'finished' && (
          <WinnerScreen 
            players={players} 
            winnerPhone={winnerPhone} 
            myPhone={phone} 
            accent={accent} 
            gradient={gradient} 
            onClose={onClose} 
          />
        )}
      </div>

      {(gameState === 'playing' || gameState === 'reveal' || gameState === 'leaderboard') && (
        <ChatOverlay 
          messages={chatMessages}
          onSendMessage={handleSendChatMessage}
          currentPhone={phone}
          isOpen={isChatOpen}
          setIsOpen={setIsChatOpen}
          onTyping={handleSendTyping}
          typingUsers={typingUsers}
        />
      )}

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px) rotate(-5deg); }
          50% { transform: translateX(10px) rotate(5deg); }
          75% { transform: translateX(-10px) rotate(-5deg); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}

