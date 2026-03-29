'use client';

import { useState, useCallback, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ShieldLimits {
  maxDailyLossPercent: number;
  maxPositionSize: number;
  maxOpenPositions: number;
  cooldownMinutes: number;
}

interface UseShieldReturn {
  shieldActive: boolean;
  dailyLoss: number;
  dailyLossPercent: number;
  limits: ShieldLimits;
  loading: boolean;
  toggleShield: () => Promise<void>;
  updateLimits: (newLimits: Partial<ShieldLimits>) => Promise<void>;
}

const DEFAULT_LIMITS: ShieldLimits = {
  maxDailyLossPercent: 5,
  maxPositionSize: 1000,
  maxOpenPositions: 5,
  cooldownMinutes: 30,
};

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useShield(): UseShieldReturn {
  const [shieldActive, setShieldActive] = useState(true);
  const [dailyLoss, setDailyLoss] = useState(0);
  const [dailyLossPercent, setDailyLossPercent] = useState(0);
  const [limits, setLimits] = useState<ShieldLimits>(DEFAULT_LIMITS);
  const [loading, setLoading] = useState(true);

  const fetchShieldData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', user.id)
        .single();

      if (profile?.metadata) {
        const meta = profile.metadata as Record<string, unknown>;
        const shieldConfig = meta.shield as Record<string, unknown> | undefined;

        if (shieldConfig) {
          setShieldActive(shieldConfig.active !== false);
          setLimits({
            maxDailyLossPercent: Number(shieldConfig.maxDailyLossPercent ?? DEFAULT_LIMITS.maxDailyLossPercent),
            maxPositionSize: Number(shieldConfig.maxPositionSize ?? DEFAULT_LIMITS.maxPositionSize),
            maxOpenPositions: Number(shieldConfig.maxOpenPositions ?? DEFAULT_LIMITS.maxOpenPositions),
            cooldownMinutes: Number(shieldConfig.cooldownMinutes ?? DEFAULT_LIMITS.cooldownMinutes),
          });
        }
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: trades } = await supabase
        .from('trades')
        .select('pnl')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('closed_at', todayStart.toISOString());

      if (trades && trades.length > 0) {
        const totalLoss = trades.reduce((sum, t) => {
          const pnl = Number(t.pnl ?? 0);
          return pnl < 0 ? sum + Math.abs(pnl) : sum;
        }, 0);

        setDailyLoss(totalLoss);

        const { data: balanceData } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();

        const balance = Number(balanceData?.wallet_balance ?? 10000);
        setDailyLossPercent(balance > 0 ? (totalLoss / balance) * 100 : 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleShield = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newActive = !shieldActive;

    const { data: profile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', user.id)
      .single();

    const currentMeta = (profile?.metadata ?? {}) as Record<string, unknown>;
    const currentShield = (currentMeta.shield ?? {}) as Record<string, unknown>;

    const { error } = await supabase
      .from('profiles')
      .update({
        metadata: {
          ...currentMeta,
          shield: { ...currentShield, active: newActive },
        },
      })
      .eq('id', user.id);

    if (!error) {
      setShieldActive(newActive);
    }
  }, [shieldActive]);

  const updateLimits = useCallback(
    async (newLimits: Partial<ShieldLimits>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const merged = { ...limits, ...newLimits };

      const { data: profile } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', user.id)
        .single();

      const currentMeta = (profile?.metadata ?? {}) as Record<string, unknown>;

      const { error } = await supabase
        .from('profiles')
        .update({
          metadata: {
            ...currentMeta,
            shield: { active: shieldActive, ...merged },
          },
        })
        .eq('id', user.id);

      if (!error) {
        setLimits(merged);
      }
    },
    [limits, shieldActive]
  );

  useEffect(() => {
    fetchShieldData();
  }, [fetchShieldData]);

  return {
    shieldActive,
    dailyLoss,
    dailyLossPercent,
    limits,
    loading,
    toggleShield,
    updateLimits,
  };
}
