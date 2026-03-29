'use client'

import { motion } from 'framer-motion'
import {
  TrendingUp,
  Lightbulb,
  BarChart3,
  Shield,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils/formatters'

export interface ChatSuggestionsProps {
  onSelect: (text: string) => void
  className?: string
}

const suggestions = [
  {
    text: 'Analyse BTC/USDT',
    icon: TrendingUp,
  },
  {
    text: 'Meilleure stratégie pour ETH?',
    icon: Lightbulb,
  },
  {
    text: 'Explique le RSI',
    icon: BarChart3,
  },
  {
    text: 'Comment fonctionne le SHIELD?',
    icon: Shield,
  },
  {
    text: 'Prédiction SOL cette semaine?',
    icon: Sparkles,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const chipVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

export function ChatSuggestions({ onSelect, className }: ChatSuggestionsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2', className)}
      data-testid="chat-suggestions"
    >
      {suggestions.map((suggestion) => {
        const Icon = suggestion.icon

        return (
          <motion.button
            key={suggestion.text}
            variants={chipVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(suggestion.text)}
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm',
              'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]',
              'text-white/60 hover:text-white hover:border-[#FFD700]/30 hover:bg-[#FFD700]/[0.03]',
              'transition-colors duration-200 cursor-pointer'
            )}
            data-testid={`chat-suggestion-${suggestion.text.toLowerCase().replace(/\s+/g, '-').replace(/[?]/g, '')}`}
          >
            <Icon className="h-4 w-4 shrink-0 text-[#FFD700]/50" />
            <span>{suggestion.text}</span>
          </motion.button>
        )
      })}
    </motion.div>
  )
}

ChatSuggestions.displayName = 'ChatSuggestions'
export default ChatSuggestions
