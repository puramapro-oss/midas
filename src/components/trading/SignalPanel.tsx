'use client';

import { Brain } from 'lucide-react';
import InvestmentModeActions from '@/components/trading/InvestmentModeActions';
import { Card, CardContent } from '@/components/ui/Card';
import { SAMPLE_AGENTS } from '@/lib/trading/constants';

interface SignalPanelProps {
  selectedPair: string;
}

export default function SignalPanel({ selectedPair }: SignalPanelProps) {
  return (
    <div className="space-y-4">
      <Card variant="highlighted">
        <CardContent className="p-5">
          <h3
            className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-orbitron)' }}
          >
            Analyse de {selectedPair}
          </h3>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            L’analyse IA en direct est indisponible sur cet écran.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain aria-hidden="true" className="h-3.5 w-3.5 text-[#FFD700]" />
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Domaines d’analyse
            </h3>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {SAMPLE_AGENTS.map((agent) => (
              <li
                key={agent.agent}
                data-testid={`agent-${agent.agent}`}
                className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
              >
                <span aria-hidden="true">{agent.icon}</span>
                {agent.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <InvestmentModeActions />
    </div>
  );
}
