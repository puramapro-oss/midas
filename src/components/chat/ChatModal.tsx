'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bot } from 'lucide-react'
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

const SIMULATED_RESPONSES: Record<string, string> = {
  'analyse btc/usdt':
    "**BTC/USDT — Analyse technique rapide**\n\nLe Bitcoin évolue actuellement dans un canal haussier sur le 4h.\n\n- **Support clé** : 62 400 $\n- **Résistance** : 65 800 $\n- **RSI (14)** : 58 — zone neutre, pas de surachat\n- **MACD** : Croisement haussier récent\n\nLe volume est en légère hausse, ce qui confirme le momentum actuel. Un breakout au-dessus de 65 800 $ pourrait déclencher un mouvement vers 68 000 $.\n\n**Recommandation** : Surveiller la zone 65 500-65 800 $ pour un signal d'entrée.",
  'meilleure stratégie pour eth?':
    "**Stratégies recommandées pour ETH**\n\nEn fonction du régime de marché actuel :\n\n1. **DCA (Dollar Cost Averaging)** — Idéal si tu vises le long terme. Achats réguliers pour lisser la volatilité.\n2. **Grid Trading** — Parfait pour le range actuel entre 3 200 $ et 3 600 $. Le bot achète bas et vend haut automatiquement.\n3. **Momentum** — Si ETH casse les 3 650 $ avec volume, un trade directionnel avec stop à 3 500 $ offre un bon ratio risque/récompense.\n\n**Mon conseil** : Le Grid Trading avec un capital de 500 $ et un risque de 1% par trade est la meilleure option actuellement.",
  'explique le rsi':
    "**Le RSI (Relative Strength Index)**\n\nLe RSI mesure la vitesse et l'amplitude des mouvements de prix.\n\n- **> 70** : Zone de **surachat** — le prix pourrait corriger\n- **< 30** : Zone de **survente** — opportunité d'achat potentielle\n- **50** : Ligne de neutralité\n\n**Comment l'utiliser :**\n\n1. Chercher les **divergences** entre le RSI et le prix\n2. Utiliser en combinaison avec d'autres indicateurs (MACD, Bollinger)\n3. Adapter la période selon ton timeframe (14 par défaut)\n\n**Astuce MIDAS** : Notre IA combine le RSI avec 6 autres indicateurs pour des signaux plus fiables.",
  'comment fonctionne le shield?':
    "**Le SHIELD — Protection intelligente**\n\nLe SHIELD est notre système de gestion des risques automatisé.\n\n**Ce qu'il fait :**\n\n- **Limite les pertes** : Stop loss dynamique basé sur la volatilité\n- **Contrôle l'exposition** : Maximum 2% du capital par trade\n- **Détecte les anomalies** : Manipulation de marché, flash crash\n- **Pause automatique** : Après 3 pertes consécutives, cooldown de 30 min\n\n**Niveaux de protection :**\n\n1. **Conservateur** — Max 1% par trade, levier ×3\n2. **Modéré** — Max 1.5% par trade, levier ×5\n3. **Agressif** — Max 2% par trade, levier ×10\n\nLe SHIELD ne peut pas être désactivé — ta sécurité est notre priorité.",
  'prédiction sol cette semaine?':
    "**SOL/USDT — Prédiction hebdomadaire**\n\n**Analyse multi-agents MIDAS :**\n\n- **Agent Technique** : Signal haussier (confiance 72%)\n- **Agent Sentiment** : Neutre-positif (Fear & Greed : 61)\n- **Agent On-chain** : Activité réseau en hausse de 15%\n\n**Scénarios :**\n\n1. **Haussier (60%)** : Objectif 155-165 $ si BTC maintient son support\n2. **Neutre (25%)** : Range entre 140-155 $\n3. **Baissier (15%)** : Retour vers 130 $ si BTC corrige\n\n**Niveaux clés :** Support 138 $ / Résistance 158 $\n\n*Rappel : Ceci n'est pas un conseil financier. Toujours utiliser le SHIELD.*",
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getSimulatedResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase().trim()

  for (const [key, response] of Object.entries(SIMULATED_RESPONSES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return response
    }
  }

  return `**Analyse en cours...**\n\nJe vais analyser ta demande : "${userMessage}"\n\nVoici ce que je peux te dire :\n\n- Les marchés crypto sont actuellement dans une phase de **consolidation**\n- Le sentiment global est **neutre à positif**\n- Le volume total 24h est stable\n\nPour une analyse plus détaillée, essaie de me poser une question sur une **paire spécifique** (ex: BTC/USDT) ou un **indicateur technique** (ex: RSI, MACD).`
}

export function ChatModal({ isOpen, onClose, className }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [questionsUsed, setQuestionsUsed] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const questionsTotal = 5

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
      setQuestionsUsed((prev) => prev + 1)

      // Simulate assistant response with delay
      await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800))

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: getSimulatedResponse(text),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setLoading(false)
    },
    [loading, questionsUsed, questionsTotal]
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

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Fermer"
                data-testid="modal-close"
              >
                <X className="h-5 w-5" />
              </button>
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
