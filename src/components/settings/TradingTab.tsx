'use client';

import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';

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
  autoTrade: boolean;
  setAutoTrade: (v: boolean) => void;
  shieldActive: boolean;
  setShieldActive: (v: boolean) => void;
}

export default function TradingTab({
  riskProfile, setRiskProfile,
  defaultSl, setDefaultSl,
  defaultTp, setDefaultTp,
  maxDailyLoss, setMaxDailyLoss,
  autoTrade, setAutoTrade,
  shieldActive, setShieldActive,
}: TradingTabProps) {
  return (
    <div className="space-y-6" data-testid="settings-trading">
      <Select label="Profil de risque" options={riskOptions} value={riskProfile} onChange={setRiskProfile} />

      <Slider label="Stop Loss par defaut" min={1} max={15} step={0.5} value={defaultSl} onChange={setDefaultSl} formatValue={(v) => `${v}%`} />

      <Slider label="Take Profit par defaut" min={1} max={30} step={0.5} value={defaultTp} onChange={setDefaultTp} formatValue={(v) => `${v}%`} />

      <Slider label="Perte journaliere max" min={1} max={20} step={0.5} value={maxDailyLoss} onChange={setMaxDailyLoss} formatValue={(v) => `${v}%`} />

      <div className="pt-4 border-t border-white/[0.06] space-y-4">
        <Toggle checked={autoTrade} onChange={setAutoTrade} label="Trading automatique" description="Autorise les bots a executer des trades" />
        <Toggle checked={shieldActive} onChange={setShieldActive} label="MIDAS Shield" description="Protection automatique contre les pertes excessives" />
      </div>
    </div>
  );
}
