'use client';

import { Brain } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import RingGauge from '@/components/charts/RingGauge';
import type { PairData } from '@/lib/analysis/constants';

interface AIScoresSectionProps {
  scores: PairData['scores'];
}

export default function AIScoresSection({ scores }: AIScoresSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#FFD700]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Scores IA
          </h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6" data-testid="ai-scores">
          <RingGauge value={scores.composite} label="Composite" color="#FFD700" size={100} />
          <RingGauge value={scores.technical} label="Technique" color="#3B82F6" size={100} />
          <RingGauge value={scores.sentiment} label="Sentiment" color="#8B5CF6" size={100} />
          <RingGauge value={scores.onChain} label="On-Chain" color="#10B981" size={100} />
        </div>
      </CardContent>
    </Card>
  );
}
