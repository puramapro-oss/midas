'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  User,
  Bot,
  Trash2,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import AIDisclosure from '@/lib/legal/components/AIDisclosure';
import ChatSidebar from './ChatSidebar';
import ChatInput from './ChatInput';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationItem {
  id: string;
  title: string;
  lastMessage: string;
  date: string;
  messageCount: number;
}

const SUGGESTED_QUESTIONS = [
  'Analyse technique ETH cette semaine',
  'Quelle strategie pour un marche lateral ?',
  'Compare DCA vs Grid Trading',
  'Meilleur moment pour acheter SOL ?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [questionsLimit, setQuestionsLimit] = useState(5);
  const [conversations, _setConversations] = useState<ConversationItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: activeConv ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setQuestionsUsed(data.used ?? questionsLimit);
          setQuestionsLimit(data.limit ?? questionsLimit);
        }
        throw new Error(data?.error || 'Erreur réseau');
      }
      if (data.conversationId && !activeConv) setActiveConv(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.response ?? 'Réponse vide.',
          timestamp: formatTime(new Date()),
        },
      ]);
      setQuestionsUsed((p) => p + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${msg}`,
          timestamp: formatTime(new Date()),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden" data-testid="chat-page">
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        conversations={conversations}
        activeConv={activeConv}
        questionsUsed={questionsUsed}
        questionsLimit={questionsLimit}
        onSetActiveConv={setActiveConv}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.04] text-white/40 hover:text-white/60 transition-colors"
              data-testid="toggle-sidebar"
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#FFD700]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">MIDAS AI</h2>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  En ligne
                </p>
              </div>
            </div>
          </div>
          <button
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.04] text-white/30 hover:text-red-400 transition-colors"
            data-testid="clear-chat-button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <AIDisclosure
          appName="MIDAS"
          extra="Les analyses et signaux ne constituent pas un conseil en investissement."
          className="px-4 py-2 text-[10px] text-white/30 border-b border-white/[0.04] text-center"
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" data-testid="messages-area">
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex gap-3 max-w-3xl',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              )}
              data-testid={`message-${msg.id}`}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  msg.role === 'user'
                    ? 'bg-[#FFD700]/10 border border-[#FFD700]/20'
                    : 'bg-white/[0.06] border border-white/[0.08]'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4 text-[#FFD700]" />
                ) : (
                  <Bot className="h-4 w-4 text-white/60" />
                )}
              </div>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%]',
                  msg.role === 'user'
                    ? 'bg-[#FFD700]/[0.08] border border-[#FFD700]/10 text-white'
                    : 'bg-white/[0.04] border border-white/[0.06] text-white/80'
                )}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <p className="text-[10px] text-white/20 mt-2 text-right">
                  {msg.timestamp}
                </p>
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white/60" />
              </div>
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2" data-testid="suggested-questions">
            {SUGGESTED_QUESTIONS.map((q) => (
              <motion.button
                key={q}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleSuggestedQuestion(q)}
                className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 hover:text-white/70 hover:border-[#FFD700]/20 transition-all"
              >
                <Zap className="h-3 w-3 inline mr-1 text-[#FFD700]/40" />
                {q}
              </motion.button>
            ))}
          </div>
        )}

        <ChatInput
          input={input}
          loading={loading}
          onInputChange={setInput}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}
