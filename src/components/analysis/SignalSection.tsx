'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface SignalSectionProps {
  signal: string;
  reasoning: string;
}

export default function SignalSection({ signal, reasoning }: SignalSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#FFD700]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
              Signal
            </h2>
          </div>
          <Badge
            variant={signal.includes('Achat') ? 'success' : signal.includes('Vente') ? 'danger' : 'warning'}
            size="md"
          >
            {signal}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed" data-testid="signal-reasoning">
          {reasoning}
        </p>
      </CardContent>
    </Card>
  );
}
