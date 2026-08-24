'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, TrendingUp, Bell, Palette, Database, Save, Mic } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import ProfilTab from '@/components/settings/ProfilTab';
import TradingTab from '@/components/settings/TradingTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import InterfaceTab from '@/components/settings/InterfaceTab';
import VoiceSettings from '@/components/settings/VoiceSettings';
import DataTab from '@/components/settings/DataTab';

const TABS = [
  { id: 'profil', label: 'Profil', icon: <User className="h-4 w-4" /> },
  { id: 'trading', label: 'Trading', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'interface', label: 'Interface', icon: <Palette className="h-4 w-4" /> },
  { id: 'voix', label: 'Voix', icon: <Mic className="h-4 w-4" /> },
  { id: 'donnees', label: 'Donnees', icon: <Database className="h-4 w-4" /> },
];

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
        return <ProfilTab fullName={fullName} setFullName={setFullName} email={email} bio={bio} setBio={setBio} />;
      case 'trading':
        return (
          <TradingTab
            riskProfile={riskProfile}
            setRiskProfile={setRiskProfile}
            defaultSl={defaultSl}
            setDefaultSl={setDefaultSl}
            defaultTp={defaultTp}
            setDefaultTp={setDefaultTp}
            maxDailyLoss={maxDailyLoss}
            setMaxDailyLoss={setMaxDailyLoss}
            autoTrade={autoTrade}
            setAutoTrade={setAutoTrade}
            shieldActive={shieldActive}
            setShieldActive={setShieldActive}
          />
        );
      case 'notifications':
        return (
          <NotificationsTab
            notifEmail={notifEmail}
            setNotifEmail={setNotifEmail}
            notifPush={notifPush}
            setNotifPush={setNotifPush}
            notifSms={notifSms}
            setNotifSms={setNotifSms}
            notifTrades={notifTrades}
            setNotifTrades={setNotifTrades}
            notifSignals={notifSignals}
            setNotifSignals={setNotifSignals}
            notifPnl={notifPnl}
            setNotifPnl={setNotifPnl}
            notifNews={notifNews}
            setNotifNews={setNotifNews}
          />
        );
      case 'interface':
        return (
          <InterfaceTab
            timezone={timezone}
            setTimezone={setTimezone}
            compactMode={compactMode}
            setCompactMode={setCompactMode}
            animations={animations}
            setAnimations={setAnimations}
            sounds={sounds}
            setSounds={setSounds}
          />
        );
      case 'voix':
        return <VoiceSettings />;
      case 'donnees':
        return <DataTab />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">Paramètres</h1>
        <p className="text-sm text-white/40 mt-1">Configure ton expérience MIDAS.</p>
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
