'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/formatters';
import { ExchangeConnector, type Exchange } from '@/components/trading/ExchangeConnector';

const EXCHANGES: Exchange[] = [
  { name: 'binance', connected: true, status: 'connected' },
  { name: 'kraken', connected: false, status: 'disconnected' },
  { name: 'bybit', connected: false, status: 'disconnected' },
  { name: 'okx', connected: false, status: 'disconnected' },
  { name: 'coinbase', connected: false, status: 'disconnected' },
];

export default function ExchangesSettingsPage() {
  const router = useRouter();
  const [exchanges, setExchanges] = useState<Exchange[]>(EXCHANGES);

  const connectedCount = exchanges.filter((e) => e.connected).length;

  const handleSave = (name: string, data: { apiKey: string; secret: string }) => {
    setExchanges((prev) =>
      prev.map((e) =>
        e.name === name ? { ...e, connected: true, status: 'connected' } : e
      )
    );
  };

  const handleDisconnect = (name: string) => {
    setExchanges((prev) =>
      prev.map((e) =>
        e.name === name ? { ...e, connected: false, status: 'disconnected' } : e
      )
    );
  };

  return (
    <div className="space-y-6" data-testid="exchanges-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/dashboard/settings')}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4" />
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
            Exchanges
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {connectedCount} exchange{connectedCount > 1 ? 's' : ''} connect&eacute;{connectedCount > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Warning banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-5 flex gap-4"
        data-testid="security-warning"
      >
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-orange-300">
            S&eacute;curit&eacute; de tes cl&eacute;s API
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs text-white/50">
            <li className="flex items-start gap-2">
              <Shield className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
              <span>
                Ne donne <strong className="text-white/70">jamais</strong> la permission de retrait &agrave; une cl&eacute; API.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
              <span>
                Active uniquement les permissions <strong className="text-white/70">Lecture</strong> et <strong className="text-white/70">Trading Spot/Futures</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
              <span>
                Restreins l&apos;acc&egrave;s par IP si ton exchange le permet.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
              <span>
                Tes cl&eacute;s sont chiffr&eacute;es (AES-256) et ne sont jamais visibles en clair.
              </span>
            </li>
          </ul>
        </div>
      </motion.div>

      {/* Exchange Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {exchanges.map((exchange, index) => (
          <motion.div
            key={exchange.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <ExchangeConnector
              exchange={exchange}
              onSave={(data) => handleSave(exchange.name, data)}
              onDisconnect={() => handleDisconnect(exchange.name)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
