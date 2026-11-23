import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { readWalletAmount } from '@/lib/wallet-withdrawal';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'midas' },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component — safe to ignore */ }
        },
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (walletError) return NextResponse.json({ error: 'Lecture du wallet indisponible.' }, { status: 503 });

    // Get transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get pending withdrawals
    const { data: pendingWithdrawals, error: withdrawalsError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (transactionsError || withdrawalsError || !Array.isArray(transactions) || !Array.isArray(pendingWithdrawals) ||
        (!wallet && (transactions.length > 0 || pendingWithdrawals.length > 0))) {
      return NextResponse.json({ error: 'Les données du wallet restent à vérifier.' }, { status: 503 });
    }
    let balance = 0;
    try { if (wallet) balance = readWalletAmount(wallet.balance); }
    catch { return NextResponse.json({ error: 'Le solde du wallet reste à vérifier.' }, { status: 503 }); }

    return NextResponse.json({
      user_id: user.id,
      wallet: wallet ? { ...wallet, balance } : { user_id: user.id, balance: 0, currency: 'EUR' },
      transactions,
      withdrawals: pendingWithdrawals,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
