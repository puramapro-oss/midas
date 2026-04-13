'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Volume2, Check } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { ELEVENLABS_VOICES, DEFAULT_VOICE_ID } from '@/lib/voice/constants'
import { useVoice } from '@/hooks/useVoice'

const SAMPLE_PHRASE = 'Bonjour, je suis ton assistant MIDAS. Je suis la pour t\'aider a analyser les marches.'

export function VoiceSettings() {
  const { speak, isPlaying, stopSpeaking } = useVoice()
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(DEFAULT_VOICE_ID)
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null)

  // Load saved voice on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('midas-voice-id')
      if (saved) {
        setSelectedVoiceId(saved)
      }
    } catch { /* ignore */ }
  }, [])

  const handleSelect = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId)
    try {
      localStorage.setItem('midas-voice-id', voiceId)
    } catch { /* ignore */ }
  }, [])

  const handleTest = useCallback((voiceId: string) => {
    if (isPlaying) {
      stopSpeaking()
      setTestingVoiceId(null)
      return
    }
    setTestingVoiceId(voiceId)
    speak(SAMPLE_PHRASE, voiceId).finally(() => {
      setTestingVoiceId(null)
    })
  }, [isPlaying, speak, stopSpeaking])

  return (
    <div className="space-y-6" data-testid="settings-voice">
      <div>
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-1">
          Voix de l&apos;assistant
        </h3>
        <p className="text-xs text-white/30 mb-4">
          Choisis la voix utilis&eacute;e pour la synth&egrave;se vocale de l&apos;assistant IA.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ELEVENLABS_VOICES.map((voice) => {
          const isSelected = voice.id === selectedVoiceId
          const isTesting = testingVoiceId === voice.id

          return (
            <motion.button
              key={voice.id}
              type="button"
              onClick={() => handleSelect(voice.id)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200',
                isSelected
                  ? 'border-[#F59E0B]/40 bg-[#F59E0B]/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]'
              )}
              data-testid={`voice-card-${voice.id}`}
            >
              {/* Selection indicator */}
              <div
                className={cn(
                  'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all',
                  isSelected
                    ? 'border-[#F59E0B] bg-[#F59E0B]'
                    : 'border-white/20'
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-[#06080F]" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-[#F59E0B]' : 'text-white/80'
                    )}
                  >
                    {voice.name}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium',
                      voice.gender === 'male'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-pink-500/15 text-pink-400'
                    )}
                  >
                    {voice.gender === 'male' ? 'Homme' : 'Femme'}
                  </span>
                </div>
                <p className="text-[11px] text-white/30">{voice.description}</p>
              </div>

              {/* Test button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleTest(voice.id)
                }}
                className={cn(
                  'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  isTesting
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                    : 'bg-white/[0.05] text-white/30 hover:text-white/60 hover:bg-white/[0.08]'
                )}
                aria-label={`Tester la voix ${voice.name}`}
                data-testid={`voice-test-${voice.id}`}
              >
                {isTesting ? (
                  <div className="flex items-end gap-[2px] h-3">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-[2px] bg-[#F59E0B] rounded-full"
                        animate={{
                          height: ['3px', '10px', '5px', '8px', '3px'],
                        }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          delay: i * 0.12,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
            </motion.button>
          )
        })}
      </div>

      <p className="text-[11px] text-white/20">
        La voix s&eacute;lectionn&eacute;e est utilis&eacute;e pour le mode conversation vocale et le bouton de lecture des messages.
      </p>
    </div>
  )
}

VoiceSettings.displayName = 'VoiceSettings'
export default VoiceSettings
