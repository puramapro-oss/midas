'use client'

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { SendHorizontal, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'
import { VoiceMicButton } from '@/components/chat/VoiceMicButton'

export interface ChatInputProps {
  onSend: (message: string) => void
  loading: boolean
  disabled: boolean
  placeholder?: string
  className?: string
}

export function ChatInput({
  onSend,
  loading,
  disabled,
  placeholder = 'Posez votre question...',
  className,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = value.trim().length > 0 && !loading && !disabled

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const maxHeight = 160
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || loading || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, loading, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
  }, [])

  const handleTranscription = useCallback((text: string) => {
    if (!text.trim() || loading || disabled) return
    onSend(text.trim())
  }, [loading, disabled, onSend])

  return (
    <div
      className={cn(
        'flex items-end gap-2 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl transition-all duration-200 focus-within:border-[#FFD700]/30 focus-within:shadow-[0_0_16px_rgba(255,215,0,0.08)]',
        disabled && 'opacity-50',
        className
      )}
      data-testid="chat-input-container"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        rows={1}
        className={cn(
          'flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none resize-none leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
          'min-h-[24px] max-h-[160px]'
        )}
        data-testid="chat-input"
      />

      <VoiceMicButton
        onTranscription={handleTranscription}
        disabled={disabled || loading}
      />

      <motion.button
        whileTap={canSend ? { scale: 0.9 } : undefined}
        whileHover={canSend ? { scale: 1.05 } : undefined}
        onClick={handleSend}
        disabled={!canSend}
        className={cn(
          'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
          canSend
            ? 'bg-gradient-to-r from-[#FFD700] to-[#FFC000] text-[#06080F] shadow-[0_0_12px_rgba(255,215,0,0.3)] cursor-pointer'
            : 'bg-white/[0.05] text-white/20 cursor-not-allowed'
        )}
        data-testid="chat-send"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizontal className="h-4 w-4" />
        )}
      </motion.button>
    </div>
  )
}

ChatInput.displayName = 'ChatInput'
export default ChatInput
