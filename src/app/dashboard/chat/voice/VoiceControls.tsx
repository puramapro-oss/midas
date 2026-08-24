'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import type { ConversationState } from './voice-config'

interface VoiceControlsProps {
  conversationState: ConversationState
  isRecording: boolean
  onMicToggle: () => void
  onEndConversation: () => void
  onClose: () => void
}

export function VoiceControls({
  conversationState,
  isRecording,
  onMicToggle,
  onEndConversation,
  onClose,
}: VoiceControlsProps) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-6 pb-12 safe-bottom w-full px-6">
      {/* Large mic button */}
      <div className="relative">
        {/* Pulse rings */}
        <AnimatePresence>
          {conversationState === 'listening' && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`pulse-${i}`}
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-full border-2 border-[#F59E0B]/30 pointer-events-none"
                />
              ))}
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={onMicToggle}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          disabled={conversationState === 'transcribing' || conversationState === 'thinking'}
          className={cn(
            'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
            conversationState === 'listening'
              ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] shadow-[0_0_40px_rgba(245,158,11,0.4)] text-[#06080F]'
              : conversationState === 'speaking'
                ? 'bg-gradient-to-br from-[#F59E0B]/60 to-[#D97706]/60 text-[#06080F]/80'
                : conversationState === 'transcribing' || conversationState === 'thinking'
                  ? 'bg-white/[0.08] text-white/30 cursor-wait'
                  : 'bg-white/[0.08] border border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.12]'
          )}
          aria-label={isRecording ? 'Arreter l\'enregistrement' : 'Commencer l\'enregistrement'}
          data-testid="voice-large-mic-button"
        >
          {conversationState === 'transcribing' || conversationState === 'thinking' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-white/20 border-t-[#F59E0B] rounded-full"
            />
          ) : conversationState === 'listening' ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </motion.button>
      </div>

      {/* End conversation button */}
      <button
        onClick={conversationState === 'idle' ? onClose : onEndConversation}
        className="px-6 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/40 hover:text-white/60 hover:bg-white/[0.08] transition-all"
        data-testid="voice-end-conversation"
      >
        Terminer la conversation
      </button>
    </div>
  )
}
