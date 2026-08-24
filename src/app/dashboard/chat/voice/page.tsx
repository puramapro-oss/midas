'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/formatters'
import { useVoice } from '@/hooks/useVoice'
import { useChat } from '@/hooks/useChat'
import { DEFAULT_VOICE_ID, ELEVENLABS_VOICES } from '@/lib/voice/constants'
import AIDisclosure from '@/lib/legal/components/AIDisclosure'
import type { ConversationState } from './voice-config'
import { VoiceSelector } from './VoiceSelector'
import { VoiceCenterContent } from './VoiceCenterContent'
import { VoiceControls } from './VoiceControls'

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
    const nextState: ConversationState = isRecording
      ? 'listening'
      : voiceState === 'transcribing'
        ? 'transcribing'
        : chatLoading
          ? 'thinking'
          : isPlaying
            ? 'speaking'
            : 'idle';

    // Batch state update via queueMicrotask to avoid sync setState warning
    queueMicrotask(() => setConversationState(nextState));
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
        void (async () => {
          pendingTTSRef.current = false
          const responseText = lastMsg.content
          setLastResponse(responseText)
          setConversationState('speaking')

          // Auto-play TTS then optionally restart recording
          try {
            await speak(responseText, selectedVoiceId)
            if (autoLoop && loopActiveRef.current) {
              await startRecording()
            }
          } catch {
            // ignore
          } finally {
            if (!loopActiveRef.current || !autoLoop) {
              setConversationState('idle')
            }
          }
        })();
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
        <VoiceSelector
          selectedVoiceId={selectedVoiceId}
          dropdownOpen={voiceDropdownOpen}
          dropdownRef={dropdownRef}
          onToggle={() => setVoiceDropdownOpen((p) => !p)}
          onSelect={handleVoiceSelect}
        />

        <button
          onClick={handleClose}
          className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
          aria-label="Fermer"
          data-testid="voice-close-button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <AIDisclosure
        appName="MIDAS"
        extra="Les analyses vocales ne constituent pas un conseil en investissement."
        className="relative z-10 px-6 text-[10px] text-white/25 text-center"
      />

      <VoiceCenterContent
        analyserNode={analyserNode}
        conversationState={conversationState}
        lastTranscription={lastTranscription}
        lastResponse={lastResponse}
      />

      <VoiceControls
        conversationState={conversationState}
        isRecording={isRecording}
        onMicToggle={handleMicToggle}
        onEndConversation={handleEndConversation}
        onClose={handleClose}
      />
    </div>
  )
}
