'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  TrendingUp,
  Bell,
  Palette,
  Database,
  Save,
  Camera,
  LogOut,
  Shield,
  Moon,
  Sun,
  Monitor,
  Download,
  Trash2,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/Slider';
import { useTheme } from '@/hooks/useTheme';
import { createClient } from '@/lib/supabase/client';
import LanguageSelector from '@/components/settings/LanguageSelector';
import VoiceSettings from '@/components/settings/VoiceSettings';

const TABS = [
  { id: 'profil', label: 'Profil', icon: <User className="h-4 w-4" /> },
  { id: 'trading', label: 'Trading', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'interface', label: 'Interface', icon: <Palette className="h-4 w-4" /> },
  { id: 'voix', label: 'Voix', icon: <Mic className="h-4 w-4" /> },
  { id: 'donnees', label: 'Donnees', icon: <Database className="h-4 w-4" /> },
];

const riskOptions = [
  { value: 'conservative', label: 'Conservateur' },
  { value: 'moderate', label: 'Modere' },
  { value: 'aggressive', label: 'Agressif' },
];

const timezoneOptions = [
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Europe/London', label: 'Londres (UTC+0)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
];


function handleLogout() {
  // Set forced logout flag FIRST — prevents auto-reconnection
  try { localStorage.setItem('midas_forced_logout', 'true'); } catch { /* ignore */ }
  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0];
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('sb-') || key.startsWith('supabase')) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem('midas_remember');
    sessionStorage.removeItem('midas_session_valid');
  } catch { /* ignore */ }
  try { createClient().auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
  window.location.href = '/login';
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profil');
  const [saving, setSaving] = useState(false);

  // Profil state
  const [fullName, setFullName] = useState('Tissma');
  const [email] = useState('matiss.frasne@gmail.com');
  const [bio, setBio] = useState('Trader passionne depuis 2020');

  // Trading state
  const [riskProfile, setRiskProfile] = useState('moderate');
  const [defaultSl, setDefaultSl] = useState(3);
  const [defaultTp, setDefaultTp] = useState(6);
  const [maxDailyLoss, setMaxDailyLoss] = useState(5);
  const [autoTrade, setAutoTrade] = useState(true);
  const [shieldActive, setShieldActive] = useState(true);

  // Notifications state
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [notifTrades, setNotifTrades] = useState(true);
  const [notifSignals, setNotifSignals] = useState(true);
  const [notifPnl, setNotifPnl] = useState(true);
  const [notifNews, setNotifNews] = useState(false);

  // Interface state
  const { theme, setTheme } = useTheme();
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [compactMode, setCompactMode] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [sounds, setSounds] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profil':
        return (
          <div className="space-y-6" data-testid="settings-profil">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/20 flex items-center justify-center text-2xl font-bold text-[#FFD700]">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#FFD700] text-[#0A0A0F] flex items-center justify-center hover:brightness-110 transition-all">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{fullName}</h3>
                <p className="text-xs text-white/40">{email}</p>
                <Badge variant="gold" size="sm" className="mt-1">
                  Pro
                </Badge>
              </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nom complet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                data-testid="settings-name-input"
              />
              <Input
                label="Email"
                value={email}
                disabled
                data-testid="settings-email-input"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none resize-none transition-all duration-200 hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]"
                data-testid="settings-bio-input"
              />
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">
                S&eacute;curit&eacute;
              </h3>
              <div className="space-y-3">
                <Button variant="secondary" size="sm">
                  Changer le mot de passe
                </Button>
                <Button variant="secondary" size="sm">
                  Activer la 2FA
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleLogout}
                data-testid="settings-signout-button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Deconnexion
              </button>
            </div>
          </div>
        );

      case 'trading':
        return (
          <div className="space-y-6" data-testid="settings-trading">
            <Select
              label="Profil de risque"
              options={riskOptions}
              value={riskProfile}
              onChange={setRiskProfile}
            />

            <Slider
              label="Stop Loss par defaut"
              min={1}
              max={15}
              step={0.5}
              value={defaultSl}
              onChange={setDefaultSl}
              formatValue={(v) => `${v}%`}
            />

            <Slider
              label="Take Profit par defaut"
              min={1}
              max={30}
              step={0.5}
              value={defaultTp}
              onChange={setDefaultTp}
              formatValue={(v) => `${v}%`}
            />

            <Slider
              label="Perte journaliere max"
              min={1}
              max={20}
              step={0.5}
              value={maxDailyLoss}
              onChange={setMaxDailyLoss}
              formatValue={(v) => `${v}%`}
            />

            <div className="pt-4 border-t border-white/[0.06] space-y-4">
              <Toggle
                checked={autoTrade}
                onChange={setAutoTrade}
                label="Trading automatique"
                description="Autorise les bots a executer des trades"
              />
              <Toggle
                checked={shieldActive}
                onChange={setShieldActive}
                label="MIDAS Shield"
                description="Protection automatique contre les pertes excessives"
              />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6" data-testid="settings-notifications">
            <div>
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-4">
                Canaux de notification
              </h3>
              <div className="space-y-4">
                <Toggle
                  checked={notifEmail}
                  onChange={setNotifEmail}
                  label="Email"
                  description="Recevoir les notifications par email"
                />
                <Toggle
                  checked={notifPush}
                  onChange={setNotifPush}
                  label="Push"
                  description="Notifications push dans le navigateur"
                />
                <Toggle
                  checked={notifSms}
                  onChange={setNotifSms}
                  label="SMS"
                  description="Alertes critiques par SMS (Pro uniquement)"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-4">
                Types d&apos;alertes
              </h3>
              <div className="space-y-4">
                <Toggle
                  checked={notifTrades}
                  onChange={setNotifTrades}
                  label="Execution de trades"
                  description="Quand un bot ouvre ou ferme une position"
                />
                <Toggle
                  checked={notifSignals}
                  onChange={setNotifSignals}
                  label="Nouveaux signaux"
                  description="Quand l'IA detecte une opportunite"
                />
                <Toggle
                  checked={notifPnl}
                  onChange={setNotifPnl}
                  label="Recap P&L quotidien"
                  description="Resume de ta performance chaque soir"
                />
                <Toggle
                  checked={notifNews}
                  onChange={setNotifNews}
                  label="Actualites marche"
                  description="Evenements importants du marche crypto"
                />
              </div>
            </div>
          </div>
        );

      case 'interface':
        return (
          <div className="space-y-6" data-testid="settings-interface">
            {/* Theme */}
            <div>
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">
                Th&egrave;me
              </h3>
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

            <Select
              label="Fuseau horaire"
              options={timezoneOptions}
              value={timezone}
              onChange={setTimezone}
            />

            {/* Language */}
            <div>
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">
                Langue
              </h3>
              <LanguageSelector />
            </div>

            <div className="pt-4 border-t border-white/[0.06] space-y-4">
              <Toggle
                checked={compactMode}
                onChange={setCompactMode}
                label="Mode compact"
                description="Reduit l'espacement pour afficher plus de donnees"
              />
              <Toggle
                checked={animations}
                onChange={setAnimations}
                label="Animations"
                description="Active les animations de l'interface"
              />
              <Toggle
                checked={sounds}
                onChange={setSounds}
                label="Sons"
                description="Retour sonore sur les actions"
              />
            </div>
          </div>
        );

      case 'voix':
        return <VoiceSettings />;

      case 'donnees':
        return (
          <div className="space-y-6" data-testid="settings-donnees">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="flex items-center gap-3 mb-2">
                <Download className="h-5 w-5 text-[#FFD700]/60" />
                <h3 className="text-sm font-semibold text-white">Exporter mes donn&eacute;es</h3>
              </div>
              <p className="text-xs text-white/40 mb-4">
                T&eacute;l&eacute;charge l&apos;ensemble de tes donn&eacute;es (profil, trades, conversations) au format JSON.
              </p>
              <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />}>
                Exporter (JSON)
              </Button>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="h-5 w-5 text-red-400/60" />
                <h3 className="text-sm font-semibold text-white">Supprimer l&apos;historique</h3>
              </div>
              <p className="text-xs text-white/40 mb-4">
                Supprime d&eacute;finitivement l&apos;historique de tes conversations IA. Tes trades et param&egrave;tres sont conserv&eacute;s.
              </p>
              <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />}>
                Supprimer l&apos;historique
              </Button>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-red-400/60" />
                <h3 className="text-sm font-semibold text-red-400">Zone dangereuse</h3>
              </div>
              <p className="text-xs text-white/40 mb-4">
                La suppression de ton compte est d&eacute;finitive. Toutes tes donn&eacute;es, bots et abonnements seront effac&eacute;s.
              </p>
              <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />}>
                Supprimer mon compte
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          Param&egrave;tres
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Configure ton exp&eacute;rience MIDAS.
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6"
      >
        {renderTabContent()}

        {/* Save button */}
        {activeTab !== 'donnees' && activeTab !== 'voix' && (
          <div className="mt-8 pt-4 border-t border-white/[0.06] flex justify-end">
            <Button
              variant="primary"
              size="md"
              icon={<Save className="h-4 w-4" />}
              loading={saving}
              onClick={handleSave}
              data-testid="settings-save-button"
            >
              Sauvegarder
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
