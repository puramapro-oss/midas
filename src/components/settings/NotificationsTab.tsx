'use client';

import { Toggle } from '@/components/ui/Toggle';

interface NotificationsTabProps {
  notifEmail: boolean;
  setNotifEmail: (v: boolean) => void;
  notifPush: boolean;
  setNotifPush: (v: boolean) => void;
  notifSms: boolean;
  setNotifSms: (v: boolean) => void;
  notifTrades: boolean;
  setNotifTrades: (v: boolean) => void;
  notifSignals: boolean;
  setNotifSignals: (v: boolean) => void;
  notifPnl: boolean;
  setNotifPnl: (v: boolean) => void;
  notifNews: boolean;
  setNotifNews: (v: boolean) => void;
}

export default function NotificationsTab({
  notifEmail, setNotifEmail,
  notifPush, setNotifPush,
  notifSms, setNotifSms,
  notifTrades, setNotifTrades,
  notifSignals, setNotifSignals,
  notifPnl, setNotifPnl,
  notifNews, setNotifNews,
}: NotificationsTabProps) {
  return (
    <div className="space-y-6" data-testid="settings-notifications">
      <div>
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-4">Canaux de notification</h3>
        <div className="space-y-4">
          <Toggle checked={notifEmail} onChange={setNotifEmail} label="Email" description="Recevoir les notifications par email" />
          <Toggle checked={notifPush} onChange={setNotifPush} label="Push" description="Notifications push dans le navigateur" />
          <Toggle checked={notifSms} onChange={setNotifSms} label="SMS" description="Alertes critiques par SMS (Pro uniquement)" />
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-4">Types d&apos;alertes</h3>
        <div className="space-y-4">
          <Toggle checked={notifTrades} onChange={setNotifTrades} label="Execution de trades" description="Quand un bot ouvre ou ferme une position" />
          <Toggle checked={notifSignals} onChange={setNotifSignals} label="Nouveaux signaux" description="Quand l'IA detecte une opportunite" />
          <Toggle checked={notifPnl} onChange={setNotifPnl} label="Recap P&L quotidien" description="Resume de ta performance chaque soir" />
          <Toggle checked={notifNews} onChange={setNotifNews} label="Actualites marche" description="Evenements importants du marche crypto" />
        </div>
      </div>
    </div>
  );
}
