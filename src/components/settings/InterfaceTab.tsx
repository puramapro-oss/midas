'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { useTheme } from '@/hooks/useTheme';
import LanguageSelector from '@/components/settings/LanguageSelector';

const timezoneOptions = [
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Europe/London', label: 'Londres (UTC+0)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
];

interface InterfaceTabProps {
  timezone: string;
  setTimezone: (v: string) => void;
  compactMode: boolean;
  setCompactMode: (v: boolean) => void;
  animations: boolean;
  setAnimations: (v: boolean) => void;
  sounds: boolean;
  setSounds: (v: boolean) => void;
}

export default function InterfaceTab({
  timezone, setTimezone,
  compactMode, setCompactMode,
  animations, setAnimations,
  sounds, setSounds,
}: InterfaceTabProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6" data-testid="settings-interface">
      {/* Theme */}
      <div>
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Thème</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark' as const, label: 'Sombre', icon: <Moon className="h-4 w-4" />, bg: 'bg-[#06080F]' },
            { id: 'oled' as const, label: 'OLED', icon: <Monitor className="h-4 w-4" />, bg: 'bg-black' },
            { id: 'light' as const, label: 'Clair', icon: <Sun className="h-4 w-4" />, bg: 'bg-gray-100' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200',
                theme === t.id
                  ? 'border-[#FFD700]/40 bg-[#FFD700]/[0.06] text-[#FFD700]'
                  : 'border-white/[0.06] bg-white/[0.03] text-white/40 hover:border-white/[0.12]'
              )}
              data-testid={`theme-${t.id}`}
            >
              {t.icon}
              <span className="text-xs font-medium">{t.label}</span>
              <div className={cn('w-8 h-4 rounded-md border border-white/10', t.bg)} />
            </button>
          ))}
        </div>
      </div>

      <Select label="Fuseau horaire" options={timezoneOptions} value={timezone} onChange={setTimezone} />

      {/* Language */}
      <div>
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Langue</h3>
        <LanguageSelector />
      </div>

      <div className="pt-4 border-t border-white/[0.06] space-y-4">
        <Toggle checked={compactMode} onChange={setCompactMode} label="Mode compact" description="Reduit l'espacement pour afficher plus de donnees" />
        <Toggle checked={animations} onChange={setAnimations} label="Animations" description="Active les animations de l'interface" />
        <Toggle checked={sounds} onChange={setSounds} label="Sons" description="Retour sonore sur les actions" />
      </div>
    </div>
  );
}
