'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { Badge } from '@/components/ui/Badge';

interface ConversationItem {
  id: string;
  title: string;
  lastMessage: string;
  date: string;
  messageCount: number;
}

interface ChatSidebarProps {
  sidebarOpen: boolean;
  conversations: ConversationItem[];
  activeConv: string | null;
  questionsUsed: number;
  questionsLimit: number;
  onSetActiveConv: (id: string) => void;
}

export default function ChatSidebar({
  sidebarOpen,
  conversations,
  activeConv,
  questionsUsed,
  questionsLimit,
  onSetActiveConv,
}: ChatSidebarProps) {
  return (
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
            {conversations.length === 0 ? (
              <p className="text-[11px] text-white/30 text-center py-6 px-2">
                Aucune conversation. Commence à poser une question pour démarrer.
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSetActiveConv(conv.id)}
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
              ))
            )}
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
  );
}
