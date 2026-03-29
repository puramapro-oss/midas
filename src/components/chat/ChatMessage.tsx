'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/formatters'

export interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function renderContent(content: string): React.ReactNode[] {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []
  let keyIndex = 0

  const flushList = () => {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={`list-${keyIndex++}`} className="list-disc list-inside space-y-1 my-1.5">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">
            {renderInlineFormatting(item)}
          </li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Ordered list items: "1. ", "2. ", etc.
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    // Unordered list items: "- " or "* "
    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/)

    if (unorderedMatch) {
      listBuffer.push(unorderedMatch[1])
      continue
    }

    if (orderedMatch) {
      flushList()
      // Start an ordered list approach — but treat as unordered for simplicity in the buffer
      listBuffer.push(orderedMatch[1])
      continue
    }

    flushList()

    if (trimmed === '') {
      elements.push(<div key={`br-${keyIndex++}`} className="h-2" />)
      continue
    }

    elements.push(
      <p key={`p-${keyIndex++}`} className="text-sm leading-relaxed">
        {renderInlineFormatting(trimmed)}
      </p>
    )
  }

  flushList()
  return elements
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Match **bold** patterns
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <strong key={`b-${match.index}`} className="font-semibold text-white">
        {match[1]}
      </strong>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user'
  const formattedTime = useMemo(() => formatTimestamp(timestamp), [timestamp])
  const renderedContent = useMemo(() => renderContent(content), [content])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
      data-testid={`chat-message-${role}`}
    >
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold select-none',
          isUser
            ? 'bg-gradient-to-br from-[#FFD700] to-[#FFC000] text-[#06080F]'
            : 'bg-gradient-to-br from-cyan-500 to-cyan-400 text-[#06080F]'
        )}
      >
        {isUser ? 'V' : 'M'}
      </div>

      {/* Message bubble */}
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 backdrop-blur-xl',
            isUser
              ? 'bg-white/[0.04] border border-[#FFD700]/30 rounded-tr-sm'
              : 'bg-white/[0.05] border border-white/[0.08] rounded-tl-sm'
          )}
        >
          <div
            className={cn(
              isUser ? 'text-white/90' : 'text-white/80'
            )}
          >
            {renderedContent}
          </div>
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            'text-[10px] text-white/30 px-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formattedTime}
        </span>
      </div>
    </motion.div>
  )
}

ChatMessage.displayName = 'ChatMessage'
export default ChatMessage
