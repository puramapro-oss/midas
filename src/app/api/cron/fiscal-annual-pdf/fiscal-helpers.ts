import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export type SourceKind = 'primes' | 'parrainage' | 'nature' | 'marketplace' | 'missions' | 'other'

export interface Totals {
  primes: number
  parrainage: number
  nature: number
  marketplace: number
  missions: number
  other: number
  annuel: number
}

export interface ProfileRow {
  id: string
  email: string
  full_name: string | null
}

export interface WalletTx {
  user_id: string
  amount: number
  source: string | null
  type: string | null
}

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, {
    db: { schema: 'midas' as never },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function getResend() {
  const k = process.env.RESEND_API_KEY?.trim()
  return k ? new Resend(k) : null
}

export function classifySource(src: string | null): SourceKind {
  const s = (src ?? '').toLowerCase()
  if (s === 'prime' || s.startsWith('prime_') || s === 'tranche') return 'primes'
  if (s === 'referral' || s === 'parrainage' || s === 'partnership' || s === 'commission')
    return 'parrainage'
  if (s === 'nature' || s === 'nature_rewards' || s === 'health') return 'nature'
  if (s === 'marketplace' || s === 'sale') return 'marketplace'
  if (s === 'mission' || s === 'missions' || s === 'quest' || s === 'contest' || s === 'lottery')
    return 'missions'
  return 'other'
}
