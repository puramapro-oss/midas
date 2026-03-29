'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MessageSquare,
  Plus,
  Sparkles,
  User,
  Bot,
  Trash2,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { Badge } from '@/components/ui/Badge';

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

const SAMPLE_CONVERSATIONS: ConversationItem[] = [
  {
    id: 'conv-1',
    title: 'Analyse BTC mars 2026',
    lastMessage: 'Le BTC montre des signaux haussiers...',
    date: '29 mars',
    messageCount: 4,
  },
  {
    id: 'conv-2',
    title: 'Strat\u00e9gie ETH Grid',
    lastMessage: 'Pour une strat\u00e9gie grid sur ETH...',
    date: '28 mars',
    messageCount: 8,
  },
  {
    id: 'conv-3',
    title: 'Diversification portefeuille',
    lastMessage: 'Je recommande une allocation...',
    date: '27 mars',
    messageCount: 6,
  },
];

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Analyse BTC pour la semaine prochaine. Quels sont les niveaux cl\u00e9s \u00e0 surveiller ?',
    timestamp: '14:32',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `**Analyse BTC/USDT \u2014 Semaine du 30 mars 2026**

**Tendance g\u00e9n\u00e9rale :** Hausse progressive depuis le 15 mars avec un momentum positif. Le RSI 14 est \u00e0 62, pas encore en surachat.

**Niveaux cl\u00e9s :**
- **Support majeur :** 84\u2009200 $ (MA 50 + ancien sommet)
- **Support secondaire :** 82\u2009800 $ (fibonacci 0.618)
- **R\u00e9sistance 1 :** 88\u2009500 $ (plus haut mensuel)
- **R\u00e9sistance 2 :** 91\u2009000 $ (zone psychologique)

**Signal IA MIDAS :** \ud83d\udfe2 **Achat mod\u00e9r\u00e9** \u2014 entr\u00e9e optimale entre 85\u2009000\u2009$ et 85\u2009800\u2009$ avec SL \u00e0 83\u2009500\u2009$ et TP \u00e0 88\u2009500\u2009$.

**Volume :** En hausse de +18% sur 7 jours, confirmant l\u2019int\u00e9r\u00eat acheteur.

\u26a0\ufe0f *Ceci n\u2019est pas un conseil financier. Fais toujours tes propres recherches.*`,
    timestamp: '14:33',
  },
];

const SUGGESTED_QUESTIONS = [
  'Analyse technique ETH cette semaine',
  'Quelle strat\u00e9gie pour un march\u00e9 lat\u00e9ral ?',
  'Compare DCA vs Grid Trading',
  'Meilleur moment pour acheter SOL ?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(SAMPLE_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeConv, setActiveConv] = useState('conv-1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [questionsUsed] = useState(3);
  const [questionsLimit] = useState(5);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content:
          'Je suis MIDAS, ton assistant trading IA. Cette r\u00e9ponse est un exemple de d\u00e9monstration. En production, je t\u2019apporterais une analyse d\u00e9taill\u00e9e avec des donn\u00e9es de march\u00e9 en temps r\u00e9el, des niveaux techniques et des recommandations personnalis\u00e9es.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1500);
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
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex flex-col border-r border-white/[0.06] bg-white/[0.02] overflow-hidden shrink-0"
            data-testid="chat-sidebar"
          >
            {/* New conversation */}
            <div className="p-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#FFD700]/30 text-[#FFD700] text-sm font-medium hover:bg-[#FFD700]/10 transition-all"
                data-testid="new-conversation-button"
              >
                <Plus className="h-4 w-4" />
                <span>Nouvelle conversation</span>
              </motion.button>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {SAMPLE_CONVERSATIONS.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200',
                    activeConv === conv.id
                      ? 'bg-[#FFD700]/[0.06] border border-[#FFD700]/10'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  )}
                  data-testid={`conversation-${conv.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-medium truncate',
                        activeConv === conv.id ? 'text-white' : 'text-white/60'
                      )}
                    >
                      {conv.title}
                    </span>
                    <span className="text-[10px] text-white/20 shrink-0 ml-2">
                      {conv.date}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/30 truncate mt-0.5">
                    {conv.lastMessage}
                  </p>
                </button>
              ))}
            </div>

            {/* Question counter */}
            <div className="p-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Questions aujourd&apos;hui</span>
                <Badge variant="gold" size="sm" data-testid="question-counter">
                  {questionsUsed}/{questionsLimit}
                </Badge>
              </div>
              <div className="mt-2 h-1 rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFC000] transition-all duration-500"
                  style={{ width: `${(questionsUsed / questionsLimit) * 100}%` }}
                />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

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

        {/* Input bar */}
        <div className="p-4 border-t border-white/[0.06]" data-testid="chat-input-bar">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pose une question sur le march\u00e9..."
                rows={1}
                className="w-full min-h-[44px] max-h-32 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none resize-none transition-all duration-200 hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]"
                data-testid="chat-input"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={cn(
                'flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200',
                input.trim() && !loading
                  ? 'bg-[#FFD700] text-[#0A0A0F] shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)]'
                  : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
              )}
              data-testid="chat-send"
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
