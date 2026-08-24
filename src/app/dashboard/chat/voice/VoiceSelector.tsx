'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { ELEVENLABS_VOICES } from '@/lib/voice/constants'

interface VoiceSelectorProps {
  selectedVoiceId: string
  dropdownOpen: boolean
  dropdownRef: React.RefObject<HTMLDivElement | null>
  onToggle: () => void
  onSelect: (voiceId: string) => void
}

export function VoiceSelector({
  selectedVoiceId,
  dropdownOpen,
  dropdownRef,
  onToggle,
  onSelect,
}: VoiceSelectorProps) {
  const selectedVoice = ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId) ?? ELEVENLABS_VOICES[0]

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/60 hover:text-white/80 hover:bg-white/[0.08] transition-all"
        data-testid="voice-selector-trigger"
      >
        <span>{selectedVoice.name}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', dropdownOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-white/[0.08] bg-[#0A0A0F]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            {ELEVENLABS_VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => onSelect(voice.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-all',
                  voice.id === selectedVoiceId
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                    : 'text-white/60 hover:bg-white/[0.05] hover:text-white/80'
                )}
                data-testid={`voice-option-${voice.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{voice.name}</span>
                    <span
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium',
                        voice.gender === 'male'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-pink-500/15 text-pink-400'
                      )}
                    >
                      {voice.gender === 'male' ? 'H' : 'F'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 mt-0.5 truncate">{voice.description}</p>
                </div>
                {voice.id === selectedVoiceId && (
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
