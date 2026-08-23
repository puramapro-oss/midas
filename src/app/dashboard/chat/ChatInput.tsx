'use client';

import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils/formatters';

interface ChatInputProps {
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function ChatInput({
  input,
  loading,
  onInputChange,
  onSend,
  onKeyDown,
}: ChatInputProps) {
  return (
    <div className="p-4 border-t border-white/[0.06]" data-testid="chat-input-bar">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pose une question sur le marche..."
            rows={1}
            className="w-full min-h-[44px] max-h-32 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none resize-none transition-all duration-200 hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]"
            data-testid="chat-input"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          onClick={onSend}
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
  );
}
