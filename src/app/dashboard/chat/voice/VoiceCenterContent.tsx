'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/formatters'
import { VoiceWaveform } from '@/components/chat/VoiceWaveform'
import { STATUS_LABELS, type ConversationState } from './voice-config'

interface VoiceCenterContentProps {
  analyserNode: AnalyserNode | null
  conversationState: ConversationState
  lastTranscription: string
  lastResponse: string
}

export function VoiceCenterContent({
  analyserNode,
  conversationState,
  lastTranscription,
  lastResponse,
}: VoiceCenterContentProps) {
  const isActive = conversationState === 'listening' || conversationState === 'speaking'

  return (
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-lg px-6 gap-8">
      {/* Waveform */}
      <div className="w-full">
        <VoiceWaveform
          analyserNode={analyserNode}
          isActive={isActive}
          color="#F59E0B"
          className="h-24"
        />
      </div>

      {/* Transcription / Response preview */}
      <AnimatePresence mode="wait">
        {conversationState === 'thinking' && lastTranscription && (
          <motion.p
            key="transcription"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-sm text-white/40 text-center max-w-xs line-clamp-2"
          >
            &ldquo;{lastTranscription}&rdquo;
          </motion.p>
        )}
        {conversationState === 'speaking' && lastResponse && (
          <motion.p
            key="response"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-sm text-white/60 text-center max-w-xs line-clamp-3"
          >
            {lastResponse.slice(0, 200)}{lastResponse.length > 200 ? '...' : ''}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Status text */}
      <motion.p
        key={conversationState}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'text-sm font-medium tracking-wide',
          conversationState === 'listening'
            ? 'text-[#F59E0B]'
            : conversationState === 'speaking'
              ? 'text-[#F59E0B]/80'
              : 'text-white/40'
        )}
      >
        {STATUS_LABELS[conversationState]}
      </motion.p>
    </div>
  )
}
