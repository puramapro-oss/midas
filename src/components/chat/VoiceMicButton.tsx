'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { useVoice } from '@/hooks/useVoice'

export interface VoiceMicButtonProps {
  onTranscription: (text: string) => void
  disabled?: boolean
  className?: string
}

export function VoiceMicButton({ onTranscription, disabled = false, className }: VoiceMicButtonProps) {
  const { isRecording, startRecording, stopRecording, state, error, cancelRecording } = useVoice()
  const [shaking, setShaking] = useState(false)

  const isTranscribing = state === 'transcribing'

  const handleClick = useCallback(async () => {
    if (disabled || isTranscribing) return

    if (isRecording) {
      try {
        const text = await stopRecording()
        if (text && text.trim().length > 0) {
          onTranscription(text.trim())
        }
      } catch {
        setShaking(true)
        setTimeout(() => setShaking(false), 500)
      }
    } else {
      try {
        await startRecording()
      } catch {
        setShaking(true)
        setTimeout(() => setShaking(false), 500)
      }
    }
  }, [disabled, isTranscribing, isRecording, stopRecording, startRecording, onTranscription])

  const handleCancel = useCallback(() => {
    if (isRecording) {
      cancelRecording()
    }
  }, [isRecording, cancelRecording])

  return (
    <div className={cn('relative', className)}>
      {/* Pulse rings when recording */}
      <AnimatePresence>
        {isRecording && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`ring-${i}`}
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ scale: 1, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'easeOut',
                }}
                className="absolute inset-0 rounded-xl border-2 border-[#F59E0B]/40 pointer-events-none"
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault()
          handleCancel()
        }}
        disabled={disabled || isTranscribing}
        animate={
          shaking
            ? { x: [0, -4, 4, -4, 4, 0] }
            : {}
        }
        transition={shaking ? { duration: 0.4 } : undefined}
        whileTap={!disabled && !isTranscribing ? { scale: 0.9 } : undefined}
        whileHover={!disabled && !isTranscribing ? { scale: 1.05 } : undefined}
        className={cn(
          'relative shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
          isRecording
            ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080F] shadow-[0_0_16px_rgba(245,158,11,0.4)]'
            : isTranscribing
              ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#06080F]'
              : disabled
                ? 'bg-white/[0.05] text-white/20 cursor-not-allowed'
                : 'bg-white/[0.05] text-white/40 hover:text-white/60 hover:bg-white/[0.08] cursor-pointer'
        )}
        aria-label={isRecording ? 'Arreter l\'enregistrement' : 'Enregistrer un message vocal'}
        data-testid="voice-mic-button"
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </motion.button>

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-[10px] text-red-400 whitespace-nowrap pointer-events-none"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

VoiceMicButton.displayName = 'VoiceMicButton'
export default VoiceMicButton
