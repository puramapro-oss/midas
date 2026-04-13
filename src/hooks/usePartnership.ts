'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Partner, PartnerStats, PartnerCommission, PartnerReferral, PartnerPayout } from '@/types/partnership';

interface UsePartnershipReturn {
  partner: Partner | null;
  stats: PartnerStats | null;
  commissions: PartnerCommission[];
  referrals: PartnerReferral[];
  payouts: PartnerPayout[];
  loading: boolean;
  isPartner: boolean;
  fetchPartner: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchCommissions: () => Promise<void>;
  fetchReferrals: () => Promise<void>;
  fetchPayouts: () => Promise<void>;
  requestPayout: (amount: number) => Promise<{ error: string | null }>;
  registerAsPartner: (data: {
    channel: string;
    display_name: string;
    bio?: string;
    website_url?: string;
    social_links?: Record<string, string>;
  }) => Promise<{ error: string | null; partner?: Partner }>;
}

export function usePartnership(): UsePartnershipReturn {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const fetchPartner = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPartner(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setPartner(data as Partner);
      } else {
        setPartner(null);
      }
    } catch {
      setPartner(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchStats = useCallback(async () => {
    if (!partner) return;

    try {
      const res = await fetch('/api/partner/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {
      // silently fail
    }
  }, [partner]);

  const fetchCommissions = useCallback(async () => {
    if (!partner) return;

    try {
      const res = await fetch('/api/partner/commissions');
      if (res.ok) {
        const data = await res.json();
        setCommissions(data.commissions ?? []);
      }
    } catch {
      // silently fail
    }
  }, [partner]);

  const fetchReferrals = useCallback(async () => {
    if (!partner) return;

    try {
      const { data, error } = await supabase
        .from('partner_referrals')
        .select('*')
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReferrals(data as PartnerReferral[]);
      }
    } catch {
      // silently fail
    }
  }, [supabase, partner]);

  const fetchPayouts = useCallback(async () => {
    if (!partner) return;

    try {
      const res = await fetch('/api/partner/payouts');
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts ?? []);
      }
    } catch {
      // silently fail
    }
  }, [partner]);

  const registerAsPartner = useCallback(async (data: {
    channel: string;
    display_name: string;
    bio?: string;
    website_url?: string;
    social_links?: Record<string, string>;
  }): Promise<{ error: string | null; partner?: Partner }> => {
    try {
      const res = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        return { error: result.error ?? 'Erreur lors de l\'inscription' };
      }

      if (result.partner) {
        setPartner(result.partner as Partner);
      }

      return { error: null, partner: result.partner as Partner };
    } catch {
      return { error: 'Erreur de connexion' };
    }
  }, []);

  const requestPayout = useCallback(async (amount: number): Promise<{ error: string | null }> => {
    try {
      const res = await fetch('/api/partner/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const result = await res.json();

      if (!res.ok) {
        return { error: result.error ?? 'Erreur lors de la demande de retrait' };
      }

      await fetchPayouts();
      await fetchPartner();
      return { error: null };
    } catch {
      return { error: 'Erreur de connexion' };
    }
  }, [fetchPayouts, fetchPartner]);

  useEffect(() => {
    fetchPartner();
  }, [fetchPartner]);

  useEffect(() => {
    if (partner) {
      fetchStats();
    }
  }, [partner, fetchStats]);

  return {
    partner,
    stats,
    commissions,
    referrals,
    payouts,
    loading,
    isPartner: !!partner,
    fetchPartner,
    fetchStats,
    fetchCommissions,
    fetchReferrals,
    fetchPayouts,
    requestPayout,
    registerAsPartner,
  };
}
