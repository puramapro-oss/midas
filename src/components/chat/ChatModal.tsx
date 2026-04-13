'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bot, Mic } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/formatters'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatSuggestions } from '@/components/chat/ChatSuggestions'
import { ChatQuestionCounter } from '@/components/chat/ChatQuestionCounter'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ChatModal({ isOpen, onClose, className }: ChatModalProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [questionsUsed, setQuestionsUsed] = useState(0)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const questionsTotal = 5

  const handleOpenVoice = useCallback(() => {
    onClose()
    router.push('/dashboard/chat/voice')
  }, [onClose, router])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSend = useCallback(
    async (text: string) => {
      if (loading || questionsUsed >= questionsTotal) return

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setLoading(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, conversationId }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || 'Erreur réseau')
        }
        if (data.conversationId) setConversationId(data.conversationId)
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: data.response ?? 'Réponse vide.',
            timestamp: new Date(),
          },
        ])
        setQuestionsUsed((prev) => prev + 1)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: `⚠️ ${msg}`,
            timestamp: new Date(),
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [loading, questionsUsed, questionsTotal, conversationId]
  )

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      handleSend(text)
    },
    [handleSend]
  )

  const hasMessages = messages.length > 0
  const isAtLimit = questionsUsed >= questionsTotal

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm md:bg-black/30"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-[1001] w-full md:w-[400px] flex flex-col',
              'bg-[#06080F] border-l border-white/[0.06]',
              className
            )}
            data-testid="chat-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Assistant IA MIDAS"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-[#06080F]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Assistant IA MIDAS
                  </h2>
                  <p className="text-[10px] text-white/40">
                    Analyse de marché en temps réel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleOpenVoice}
                  className="p-1.5 rounded-lg text-white/40 hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors"
                  aria-label="Mode vocal"
                  data-testid="modal-voice-button"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Fermer"
                  data-testid="modal-close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body — messages or suggestions */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {!hasMessages && (
                <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-cyan-500/20 border border-white/[0.06] flex items-center justify-center mx-auto">
                      <Bot className="h-6 w-6 text-[#FFD700]" />
                    </div>
                    <h3 className="text-sm font-medium text-white/80">
                      Comment puis-je t&apos;aider ?
                    </h3>
                    <p className="text-xs text-white/40 max-w-[250px]">
                      Analyse technique, stratégies, indicateurs... Pose ta question.
                    </p>
                  </div>

                  <ChatSuggestions onSelect={handleSuggestionSelect} />
                </div>
              )}

              {hasMessages &&
                messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                  />
                ))}

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 max-w-[85%]"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#06080F]">M</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white/[0.05] border border-white/[0.08]">
                    <div className="flex items-center gap-1.5">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-white/40"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-white/40"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-white/40"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 space-y-3">
              <ChatQuestionCounter used={questionsUsed} total={questionsTotal} />
              <ChatInput
                onSend={handleSend}
                loading={loading}
                disabled={isAtLimit}
                placeholder={
                  isAtLimit
                    ? 'Limite atteinte — Passe à Pro'
                    : 'Posez votre question...'
                }
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

ChatModal.displayName = 'ChatModal'
export default ChatModal
