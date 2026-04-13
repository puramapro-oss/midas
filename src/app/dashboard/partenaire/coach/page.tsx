'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { usePartnership } from '@/hooks/usePartnership';
import { createClient } from '@/lib/supabase/client';
import CoachChat from '@/components/partnership/CoachChat';

interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function CoachPage() {
  const { partner, loading } = usePartnership();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  useEffect(() => {
    if (!partner) return;

    const fetchMessages = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('partner_coach_messages')
          .select('id, role, content, created_at')
          .eq('partner_id', partner.id)
          .order('created_at', { ascending: true })
          .limit(50);

        if (data) {
          setMessages(data as CoachMessage[]);
        }
      } catch {
        // silently fail
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [partner]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[var(--text-secondary)]">Partenaire non trouve</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div>
        <Link
          href="/dashboard/partenaire"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard partenaire
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
          Coach IA
        </h1>
      </div>

      <div className="flex-1 min-h-0">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-[var(--gold-primary)] animate-spin" />
          </div>
        ) : (
          <CoachChat initialMessages={messages} />
        )}
      </div>
    </div>
  );
}
