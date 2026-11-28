'use client';

import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import InvestmentModeActions from '@/components/trading/InvestmentModeActions';

const riskOptions = [
  { value: 'conservative', label: 'Conservateur' },
  { value: 'moderate', label: 'Modere' },
  { value: 'aggressive', label: 'Agressif' },
];

interface TradingTabProps {
  riskProfile: string;
  setRiskProfile: (v: string) => void;
  defaultSl: number;
  setDefaultSl: (v: number) => void;
  defaultTp: number;
  setDefaultTp: (v: number) => void;
  maxDailyLoss: number;
  setMaxDailyLoss: (v: number) => void;
}

export default function TradingTab({
  riskProfile, setRiskProfile,
  defaultSl, setDefaultSl,
  defaultTp, setDefaultTp,
  maxDailyLoss, setMaxDailyLoss,
}: TradingTabProps) {
  return (
    <div className="space-y-6" data-testid="settings-trading">
      <InvestmentModeActions comparisonHref="/#comparer-les-couts" />

      <p className="text-sm text-[var(--text-primary)]">
        Les réglages ci-dessous sont un aperçu. Ils ne sont pas enregistrés et ne pilotent aucun compte.
      </p>

      <Select label="Profil de risque" options={riskOptions} value={riskProfile} onChange={setRiskProfile} />

      <Slider label="Stop Loss par defaut" min={1} max={15} step={0.5} value={defaultSl} onChange={setDefaultSl} formatValue={(v) => `${v}%`} />

      <Slider label="Take Profit par defaut" min={1} max={30} step={0.5} value={defaultTp} onChange={setDefaultTp} formatValue={(v) => `${v}%`} />

      <Slider label="Perte journaliere max" min={1} max={20} step={0.5} value={maxDailyLoss} onChange={setMaxDailyLoss} formatValue={(v) => `${v}%`} />

      <div className="space-y-2 border-t border-[var(--border-default)] pt-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">MIDAS Shield — protection réelle indisponible</p>
        <p className="text-sm text-[var(--text-primary)]">
          Aucun portefeuille réel n’est surveillé ou protégé depuis cet écran.
        </p>
      </div>
    </div>
  );
}
