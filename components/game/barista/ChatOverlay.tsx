'use client'
import React, { useState, useEffect, useRef } from 'react'

export interface ChatMessage {
  id: string
  senderName: string
  senderPhone: string
  text: string
  timestamp: number
}

interface ChatOverlayProps {
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  currentPhone: string
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onTyping?: () => void
  typingUsers?: { name: string }[]
}

const EMOJIS = ['😂', '💀', '🧠', '🤯', '🤬', '🔥']

export default function ChatOverlay({ 
  messages, onSendMessage, currentPhone, isOpen, setIsOpen, onTyping, typingUsers = [] 
}: ChatOverlayProps) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, typingUsers])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onSendMessage(inputText.trim())
    setInputText('')
  }
  
  const handleEmoji = (emoji: string) => {
    onSendMessage(emoji)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    if (onTyping) onTyping()
  }

  // Floating button when closed
  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-indigo-600 text-white p-3 rounded-full shadow-lg shadow-indigo-500/50 cursor-pointer hover:bg-indigo-700 transition-transform hover:scale-105 active:scale-95"
        onClick={() => setIsOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </div>
    )
  }

  // Expanded Chat Panel
  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-80 h-96 max-h-[60vh] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-5">
      
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 py-3 flex justify-between items-center shadow-sm">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
          Chat Room
        </h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-indigo-100 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
            Say hi to everyone! 👋
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderPhone === currentPhone
            return (
              <div key={`${msg.id}-${idx}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-400 font-medium px-1 mb-0.5">
                  {isMe ? 'You' : msg.senderName}
                </span>
                <div 
                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                    isMe 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            )
          })
        )}
        
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic px-2 animate-pulse">
            <span className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {typingUsers.map(u => u.name).join(', ')} tape...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Quick Actions */}
      <div className="flex justify-around items-center bg-slate-50 border-t border-slate-100 py-2 px-4">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleEmoji(emoji)}
            className="text-xl hover:scale-125 transition-transform active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={handleInputChange}
          placeholder="Envoyer un message..."
          className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-300 focus:ring-0 rounded-full px-4 py-2 text-sm outline-none transition-all"
        />
        <button 
          type="submit"
          disabled={!inputText.trim()}
          className="bg-indigo-600 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </form>
    </div>
  )
}
