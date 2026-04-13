'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { useVoice } from '@/hooks/useVoice'

export interface SpeakButtonProps {
  text: string
  className?: string
}

export function SpeakButton({ text, className }: SpeakButtonProps) {
  const { isPlaying, speak, stopSpeaking } = useVoice()

  const handleClick = useCallback(() => {
    if (isPlaying) {
      stopSpeaking()
    } else {
      speak(text)
    }
  }, [isPlaying, speak, stopSpeaking, text])

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200',
        isPlaying
          ? 'text-[#F59E0B] bg-[#F59E0B]/10'
          : 'text-white/25 hover:text-white/50 hover:bg-white/[0.05]',
        className
      )}
      aria-label={isPlaying ? 'Arreter la lecture' : 'Ecouter le message'}
      data-testid="speak-button"
    >
      {isPlaying ? (
        <motion.div className="relative flex items-center justify-center w-3.5 h-3.5">
          {/* Animated sound bars */}
          <div className="flex items-end gap-[2px] h-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-[2px] bg-[#F59E0B] rounded-full"
                animate={{
                  height: ['4px', '12px', '6px', '10px', '4px'],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </motion.button>
  )
}

SpeakButton.displayName = 'SpeakButton'
export default SpeakButton
