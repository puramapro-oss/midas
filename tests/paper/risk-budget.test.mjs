import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db, decision, account, limits, closedHistory, execute, counts, observe } from './fixture.mjs';

test('risk budget includes actual fill quantity and both fees for buy and sell', async () => {
  for (const side of ['buy', 'sell']) {
    const user = await account();
    await limits(user, { capital: 5 });
    await closedHistory(user, -0.0474);
    const request = { ...decision, action: side, stop_loss: side === 'buy' ? 95 : 105, take_profit: side === 'buy' ? 110 : 90 };
    // Nominal stop risk is 0.0025. Actual entry slippage and round-trip fees
    // make this exceed the 0.05 account allowance, despite that nominal pass.
    await assert.rejects(execute(user, randomUUID(), request, 0.05), /Daily paper loss budget/);
    assert.deepEqual(await counts(user), { trades: 1, audits: 0, intents: 0 });
  }
});
test('risk budget reserves all open positions across distinct operation identifiers', async () => {
  const user = await account(); await limits(user, { daily: 10 });
  const first = await execute(user, randomUUID());
  await assert.rejects(execute(user, randomUUID()), /Daily paper loss budget/);
  assert.deepEqual(await counts(user), { trades: 1, audits: 1, intents: 1 });
  // Reconciliation remains available after a policy change makes new orders unsafe.
  await limits(user, { daily: 0 });
  const replay = await execute(user, first.operation_id);
  assert.deepEqual(replay, first);
});
test('risk budget does not offset losses with profitable closed trades', async () => {
  const user = await account(); await limits(user, { daily: 10 });
  await closedHistory(user, -5); await closedHistory(user, 500);
  await assert.rejects(execute(user, randomUUID()), /Daily paper loss budget/);
});
test('risk budget enforces weekly and monthly windows independently', async () => {
  for (const [days, window, cap] of [[2, 'Weekly', { weekly: 10 }], [10, 'Monthly', { monthly: 10 }]]) {
    const user = await account(); await limits(user, cap);
    await closedHistory(user, -5, 0, new Date(Date.now() - days * 86400000).toISOString());
    await assert.rejects(execute(user, randomUUID()), new RegExp(`${window} paper loss budget`));
  }
});
test('risk budget rejects zero loss limits and incomplete or future history', async () => {
  for (const field of ['daily', 'weekly', 'monthly']) {
    const user = await account(); await limits(user, { [field]: 0 });
    await assert.rejects(execute(user, randomUUID()), /Invalid paper loss limit/);
  }
  for (const date of [null, new Date(Date.now() + 60000).toISOString()]) {
    const user = await account(); await closedHistory(user, -1, 0, date);
    await assert.rejects(execute(user, randomUUID()), /Paper history contains invalid/);
  }
});
test('risk budget fails closed on malformed open positions', async () => {
  for (const change of ['fees = NULL', 'fees = -1', 'quantity = -1', "stop_loss = 'NaN'::numeric", 'entry_price = 0', 'quote_amount = NULL']) {
    const user = await account(); const first = await execute(user, randomUUID());
    await db.query(`UPDATE public.trades SET ${change} WHERE id=$1`, [first.trade_id]);
    await assert.rejects(execute(user, randomUUID()), /Invalid open paper position/);
    assert.deepEqual(await counts(user), { trades: 1, audits: 1, intents: 1 });
  }
});
test('risk budget uses the persisted effective stop after a protected move', async () => {
  const user = await account(); await limits(user, { daily: 10 });
  const first = await execute(user, randomUUID(), { ...decision, take_profit: 150 });
  await assert.rejects(execute(user, randomUUID()), /Daily paper loss budget/);
  const moved = await observe(user, first.trade_id, 120);
  assert.equal(Number(moved.trade.stop_loss), first.executed_price);
  assert.equal((await execute(user, randomUUID())).success, true);
});
test('risk budget releases open exposure on close while retaining the realized loss', async () => {
  const user = await account(); await limits(user, { daily: 10 });
  const first = await execute(user, randomUUID());
  await observe(user, first.trade_id, 95);
  await assert.rejects(execute(user, randomUUID()), /Daily paper loss budget/);
  const profitable = await account(); await limits(profitable, { daily: 10 });
  const opened = await execute(profitable, randomUUID());
  await observe(profitable, opened.trade_id, 110, true);
  assert.equal((await execute(profitable, randomUUID())).success, true);
});
test('risk budget rejects stale transaction isolation before reading a snapshot', async () => {
  const user = await account();
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try { await assert.rejects(execute(user, randomUUID()), /requires read committed isolation/); }
  finally { await db.exec('ROLLBACK'); }
  assert.deepEqual(await counts(user), { trades: 0, audits: 0, intents: 0 });
});
test('risk budget rejects the exact decimal limit and accepts an amount below it', async () => {
  const reference = await account(); await execute(reference, randomUUID());
  const budget = (await db.query("SELECT details->'paper_risk_budget' AS budget FROM public.trade_audit_logs WHERE user_id=$1", [reference])).rows[0].budget;
  const blocked = await account(); await limits(blocked, { daily: budget.new_position_loss });
  await assert.rejects(execute(blocked, randomUUID()), /Daily paper loss budget/);
  const allowed = await account(); await limits(allowed, { daily: budget.new_position_loss + 0.00000001 });
  assert.equal((await execute(allowed, randomUUID())).success, true);
});
test('risk budget rejects incompatible currencies and a target crossed by entry slippage', async () => {
  const user = await account();
  await assert.rejects(execute(user, randomUUID(), { ...decision, pair: 'ETH/BTC' }), /Invalid paper request/);
  await assert.rejects(execute(user, randomUUID(), { ...decision, take_profit: 100.01 }), /after slippage/);
  const sell = { ...decision, action: 'sell', stop_loss: 105, take_profit: 99.99 };
  await assert.rejects(execute(user, randomUUID(), sell), /after slippage/);
  assert.deepEqual(await counts(user), { trades: 0, audits: 0, intents: 0 });
});
test('risk budget retains a worse observed mark instead of a fictitious stop fill', async () => {
  const user = await account(); await limits(user, { daily: 10 });
  const first = await execute(user, randomUUID());
  await db.query('UPDATE public.trades SET current_price=80 WHERE id=$1', [first.trade_id]);
  await assert.rejects(execute(user, randomUUID(), decision, 1), /Daily paper loss budget/);
});
test('risk budget history is readable but cannot be rewritten directly by an authenticated client', async () => {
  const user = await account(); const other = await account();
  const own = await execute(user, randomUUID()); await execute(other, randomUUID());
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec('SET ROLE authenticated');
  try {
    const visible = await db.query('SELECT id FROM public.trades');
    assert.deepEqual(visible.rows, [{ id: own.trade_id }]);
    await assert.rejects(db.query("UPDATE public.trades SET fees=0, pnl=1000000, status='closed' WHERE id=$1", [own.trade_id]), /permission denied/);
    await assert.rejects(db.query('DELETE FROM public.trades WHERE id=$1', [own.trade_id]), /permission denied/);
    await assert.rejects(db.query(`INSERT INTO public.trades(user_id,exchange,pair,side,entry_price,quantity,quote_amount,stop_loss,strategy,is_paper_trade)
      VALUES ($1,'paper','BTC/USDT','buy',100,1,100,95,'direct',true)`, [user]), /permission denied/);
  } finally { await db.exec('RESET ROLE'); }
  assert.deepEqual(await counts(user), { trades: 1, audits: 1, intents: 1 });
});
test('risk budget history cannot be erased through a direct client profile cascade', async () => {
  const user = await account(); await execute(user, randomUUID());
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec('SET ROLE authenticated');
  try {
    assert.equal((await db.query('SELECT id FROM public.profiles WHERE id=$1', [user])).rows.length, 1);
    await assert.rejects(db.query('DELETE FROM public.profiles WHERE id=$1', [user]), /permission denied/);
  } finally { await db.exec('RESET ROLE'); }
  assert.deepEqual(await counts(user), { trades: 1, audits: 1, intents: 1 });
  // The authorized server-side account-deletion cascade remains available.
  await db.query('DELETE FROM auth.users WHERE id=$1', [user]);
  assert.deepEqual(await counts(user), { trades: 0, audits: 0, intents: 0 });
});
test('effective risk/reward is enforced by actual SQL after slippage and both fees', async () => {
  for (const action of ['buy', 'sell']) {
    for (const ratio of [1.6, 1.5]) {
      const user = await account();
      const request = { ...decision, action, stop_loss: action === 'buy' ? 95 : 105,
        take_profit: 100 + 5 * ratio * (action === 'buy' ? 1 : -1), risk_reward_ratio: ratio };
      await assert.rejects(execute(user, randomUUID(), request), /Paper execution risk\/reward below minimum/);
      assert.deepEqual(await counts(user), { trades: 0, audits: 0, intents: 0 });
    }
  }
});
