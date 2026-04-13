'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/formatters'
import { useVoice } from '@/hooks/useVoice'
import { useChat } from '@/hooks/useChat'
import { VoiceWaveform } from '@/components/chat/VoiceWaveform'
import { ELEVENLABS_VOICES, DEFAULT_VOICE_ID } from '@/lib/voice/constants'

type ConversationState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

const STATUS_LABELS: Record<ConversationState, string> = {
  idle: 'Appuie pour parler',
  listening: 'Ecoute...',
  transcribing: 'Transcription...',
  thinking: 'Reflexion...',
  speaking: 'Parle...',
}

export default function VoiceConversationPage() {
  const router = useRouter()
  const {
    isRecording,
    startRecording,
    stopRecording,
    isPlaying,
    speak,
    stopSpeaking,
    analyserNode,
    state: voiceState,
    cancelRecording,
  } = useVoice()
  const { messages, sendMessage, loading: chatLoading } = useChat()

  const [conversationState, setConversationState] = useState<ConversationState>('idle')
  const [lastTranscription, setLastTranscription] = useState('')
  const [lastResponse, setLastResponse] = useState('')
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('midas-voice-id') ?? DEFAULT_VOICE_ID
    }
    return DEFAULT_VOICE_ID
  })
  const [autoLoop, setAutoLoop] = useState(true)
  const loopActiveRef = useRef(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedVoice = ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId) ?? ELEVENLABS_VOICES[0]

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setVoiceDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update conversation state based on voice state
  useEffect(() => {
    if (isRecording) {
      setConversationState('listening')
    } else if (voiceState === 'transcribing') {
      setConversationState('transcribing')
    } else if (chatLoading) {
      setConversationState('thinking')
    } else if (isPlaying) {
      setConversationState('speaking')
    } else {
      setConversationState('idle')
    }
  }, [isRecording, voiceState, chatLoading, isPlaying])

  const handleClose = useCallback(() => {
    loopActiveRef.current = false
    setAutoLoop(false)
    if (isRecording) cancelRecording()
    if (isPlaying) stopSpeaking()
    router.push('/dashboard')
  }, [isRecording, isPlaying, cancelRecording, stopSpeaking, router])

  // Track messages to detect new assistant responses
  const lastMessageCountRef = useRef(messages.length)
  const pendingTTSRef = useRef(false)

  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant' && pendingTTSRef.current && loopActiveRef.current) {
        pendingTTSRef.current = false
        const responseText = lastMsg.content
        setLastResponse(responseText)
        setConversationState('speaking')

        // Auto-play TTS then optionally restart recording
        speak(responseText, selectedVoiceId)
          .then(() => {
            if (autoLoop && loopActiveRef.current) {
              return startRecording()
            }
            return undefined
          })
          .catch(() => {
            // ignore
          })
          .finally(() => {
            if (!loopActiveRef.current || !autoLoop) {
              setConversationState('idle')
            }
          })
      }
    }
    lastMessageCountRef.current = messages.length
  }, [messages, speak, selectedVoiceId, autoLoop, startRecording])

  const handleMicToggle = useCallback(async () => {
    if (conversationState === 'speaking') {
      stopSpeaking()
      return
    }

    if (conversationState !== 'idle' && conversationState !== 'listening') return

    if (isRecording) {
      try {
        const text = await stopRecording()
        if (!text || text.trim().length === 0) {
          setConversationState('idle')
          return
        }

        setLastTranscription(text.trim())
        setConversationState('thinking')
        pendingTTSRef.current = true

        // Send to chat API — response will come via messages useEffect
        await sendMessage(text.trim())

        if (!loopActiveRef.current) {
          setConversationState('idle')
        }
      } catch {
        pendingTTSRef.current = false
        setConversationState('idle')
      }
    } else {
      try {
        await startRecording()
      } catch {
        setConversationState('idle')
      }
    }
  }, [
    conversationState,
    isRecording,
    stopRecording,
    startRecording,
    sendMessage,
    stopSpeaking,
  ])

  const handleEndConversation = useCallback(() => {
    loopActiveRef.current = false
    setAutoLoop(false)
    if (isRecording) cancelRecording()
    if (isPlaying) stopSpeaking()
    setConversationState('idle')
  }, [isRecording, isPlaying, cancelRecording, stopSpeaking])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        handleMicToggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, handleMicToggle])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleVoiceSelect = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId)
    try {
      localStorage.setItem('midas-voice-id', voiceId)
    } catch { /* ignore */ }
    setVoiceDropdownOpen(false)
  }, [])

  const isActive = conversationState === 'listening' || conversationState === 'speaking'

  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-between bg-[#0A0A0F]"
      data-testid="voice-conversation-page"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            isActive ? 'opacity-100' : 'opacity-30'
          )}
          style={{
            background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(245,158,11,0.08) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between w-full px-5 py-4 safe-top">
        {/* Voice selector */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setVoiceDropdownOpen((p) => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/60 hover:text-white/80 hover:bg-white/[0.08] transition-all"
            data-testid="voice-selector-trigger"
          >
            <span>{selectedVoice.name}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', voiceDropdownOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {voiceDropdownOpen && (
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
                    onClick={() => handleVoiceSelect(voice.id)}
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

        {/* Close button */}
        <button
          onClick={handleClose}
          className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
          aria-label="Fermer"
          data-testid="voice-close-button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Center content */}
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

      {/* Bottom controls */}
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
            onClick={handleMicToggle}
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
          onClick={conversationState === 'idle' ? handleClose : handleEndConversation}
          className="px-6 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/40 hover:text-white/60 hover:bg-white/[0.08] transition-all"
          data-testid="voice-end-conversation"
        >
          Terminer la conversation
        </button>
      </div>
    </div>
  )
}
