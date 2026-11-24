import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFixture, withdrawalBody, transferFor, USER, KEY, ACCOUNT, LEGACY_ID, IBAN } from './handler-fixture.mjs';

const active = state => createFixture({ cashAvailable: true, state });
const response = async promise => { const result = await promise; return { status: result.status, body: await result.json() }; };
const decision = { id: LEGACY_ID, action: 'rejected' };
async function bounded(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('The retry did not finish without resending to the provider')), 1500);
    })]);
  } finally { clearTimeout(timer); }
}

test('the actual default phase blocks direct Connect and admin mutations before authentication, while admin history remains readable', async () => {
  const fixture = createFixture();
  for (const result of [await response(fixture.post(withdrawalBody())), await response(fixture.patch(decision))]) {
    assert.equal(result.status, 403); assert.equal(result.body.code, 'PHASE_1_LOCKED');
  }
  assert.equal(fixture.state.authCalls, 0);
  assert.deepEqual(fixture.state.rpcCalls, []); assert.deepEqual(fixture.state.stripeCalls, []);
  assert.equal((await fixture.load('src/app/api/admin/withdrawals/route.ts').GET()).status, 200);
  assert.deepEqual(fixture.state.directWrites, []);
});

test('invalid input, stale session/account and unavailable profile cannot reach admission or Stripe', async () => {
  const fixture = active();
  for (const changes of [{ idempotencyKey: undefined }, { amount_eur: 20.001 }, { amount_eur: -20 }, { amount_eur: 100_001 }]) {
    assert.equal((await response(fixture.post(withdrawalBody(changes)))).status, 400);
  }
  for (const changes of [{ expectedUserId: '00000000-0000-4000-8000-000000000009' }, { expectedAccountId: 'acct_other' }]) {
    const result = await response(fixture.post(withdrawalBody(changes)));
    assert.equal(result.status, 409); assert.equal(result.body.code, 'withdrawal_account_changed');
  }
  fixture.state.profileError = 'profile unavailable';
  assert.equal((await response(fixture.post(withdrawalBody()))).status, 503);
  assert.equal(fixture.state.rpcCalls.length, 0); assert.equal(fixture.state.stripeCalls.length, 0);
});

test('two identical POSTs return the persisted receipt after one debit and one provider submission', async () => {
  const fixture = active();
  const first = await response(fixture.post(withdrawalBody()));
  const second = await response(fixture.post(withdrawalBody()));
  assert.equal(first.status, 200); assert.equal(first.body.ok, true);
  assert.equal(second.status, 200); assert.equal(second.body.replayed, true);
  assert.equal(first.body.withdrawal_id, second.body.withdrawal_id);
  assert.equal(first.body.idempotency_key, KEY); assert.equal(first.body.user_id, USER);
  assert.equal(fixture.state.balance, 80); assert.equal(fixture.state.debits, 1);
  assert.equal(fixture.state.stripeCalls.length, 1);
  assert.equal(fixture.state.stripeCalls[0].settings.idempotencyKey, `midas-withdrawal-${first.body.withdrawal_id}`);
  assert.deepEqual(fixture.state.directWrites, []);
});

test('concurrent retry and a transport timeout retain the debit and request without refund or resend, even after 25 hours', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const fixture = active({ transferBehavior: async () => { await pending; throw new Error('simulated lost response'); } });
  const first = fixture.post(withdrawalBody());
  const deadline = Date.now() + 1000;
  while (fixture.state.stripeCalls.length === 0) {
    assert.ok(Date.now() < deadline, 'The first request must reach the simulated provider');
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  let concurrent;
  try { concurrent = await response(bounded(fixture.post(withdrawalBody()))); }
  finally { release(); }
  assert.equal(concurrent.status, 409);
  const uncertain = await response(first);
  assert.equal(uncertain.status, 409); assert.equal(uncertain.body.code, 'withdrawal_reconciliation_required');
  assert.doesNotMatch(uncertain.body.error, /restauré|remboursé/i);
  fixture.state.nowMs += 25 * 60 * 60 * 1000;
  assert.equal((await response(fixture.post(withdrawalBody()))).status, 409);
  assert.equal((await response(fixture.post(withdrawalBody({ idempotencyKey: '00000000-0000-4000-8000-000000000099' })))).status, 409);
  assert.equal(fixture.state.balance, 80); assert.equal(fixture.state.refunds, 0);
  assert.equal(fixture.state.debits, 1); assert.equal(fixture.state.stripeCalls.length, 1);
});

test('reusing a key with a different amount refuses the request without another debit or transfer', async () => {
  const fixture = active();
  assert.equal((await response(fixture.post(withdrawalBody()))).status, 200);
  const conflict = await response(fixture.post(withdrawalBody({ amount_eur: 30 })));
  assert.equal(conflict.status, 409); assert.equal(conflict.body.code, 'withdrawal_idempotency_conflict');
  assert.equal(conflict.body.request_closed, undefined);
  assert.equal(fixture.state.debits, 1); assert.equal(fixture.state.stripeCalls.length, 1);
});

test('only a proved no-admission rejection is bound to the original request and permits editing', async () => {
  for (const [state, expectedCode, expectedStatus] of [
    [{ balance: 10 }, 'withdrawal_invalid_amount', 400], [{ cap: 10 }, 'withdrawal_cap_exceeded', 403],
  ]) {
    const fixture = active(state);
    const rejected = await response(fixture.post(withdrawalBody()));
    assert.equal(rejected.status, expectedStatus); assert.equal(rejected.body.code, expectedCode);
    assert.equal(rejected.body.request_closed, true);
    assert.equal(rejected.body.rejection_recorded, true);
    assert.equal(rejected.body.debit_confirmed, false); assert.equal(rejected.body.refunded, false);
    assert.equal(rejected.body.user_id, USER); assert.equal(rejected.body.idempotency_key, KEY);
    assert.equal(rejected.body.stripe_account_id, ACCOUNT);
    assert.equal(fixture.state.debits, 0); assert.equal(fixture.state.stripeCalls.length, 0);
  }
  const unavailable = active({ rpcErrors: { admit_connect_withdrawal: 'database unavailable' } });
  const result = await response(unavailable.post(withdrawalBody()));
  assert.equal(result.status, 409); assert.equal(result.body.request_closed, undefined);
  assert.equal(unavailable.state.stripeCalls.length, 0);
});

test('missing or malformed journal/provider receipts never produce success or an invented refund', async () => {
  for (const corrupt of [() => null, row => ({ ...row, request_key: 'bad' }), row => ({ ...row, wallet_balance: null }),
    row => ({ ...row, ledger_version: 0 }), row => ({ ...row, credited_reversal_eur: undefined })]) {
    const fixture = active({ receiptOverrides: { admit_connect_withdrawal: corrupt } });
    const result = await response(fixture.post(withdrawalBody()));
    assert.equal(result.status, 409); assert.notEqual(result.body.ok, true);
    assert.equal(fixture.state.stripeCalls.length, 0); assert.equal(fixture.state.refunds, 0);
  }
  for (const state of [
    { rpcErrors: { reconcile_connect_withdrawal: 'write failed' } },
    { receiptOverrides: { reconcile_connect_withdrawal: row => ({ ...row, stripe_transfer_id: null }) } },
    { receiptOverrides: { reconcile_connect_withdrawal: row => ({ ...row, currency: 'usd' }) } },
    { transferBehavior: async input => ({ ...input, object: 'transfer', id: 'tr_wrong', amount: 2200, amount_reversed: 0, reversed: false }) },
  ]) {
    const fixture = active(state); const result = await response(fixture.post(withdrawalBody()));
    assert.equal(result.status, 409); assert.notEqual(result.body.ok, true);
    assert.equal(fixture.state.debits, 1); assert.equal(fixture.state.refunds, 0); assert.equal(fixture.state.stripeCalls.length, 1);
  }
});

test('withdraw-all retries preserve the admitted amount after the balance reaches zero', async () => {
  const fixture = active(); const body = withdrawalBody({ amount_eur: undefined });
  const first = await response(fixture.post(body)); const second = await response(fixture.post(body));
  assert.equal(first.status, 200); assert.equal(first.body.amount_eur, 100);
  assert.equal(second.status, 200); assert.equal(second.body.amount_eur, 100);
  assert.equal(fixture.state.balance, 0); assert.equal(fixture.state.debits, 1);
  assert.deepEqual(fixture.state.rpcCalls.filter(call => call.name === 'admit_connect_withdrawal').map(call => call.args.p_amount), [null, null]);
});

test('partial, duplicate, cumulative and older reversal events credit only the positive delta', async () => {
  const fixture = active(); await fixture.post(withdrawalBody());
  const handlers = fixture.load('src/app/api/stripe/webhook/handlers-connect.ts');
  const service = fixture.load('src/app/api/stripe/webhook/route.ts');
  assert.equal(typeof handlers.handleTransferReversed, 'function'); assert.equal(typeof service.POST, 'function');
  for (const [cents, expectedBalance] of [[500, 85], [500, 85], [300, 85], [1000, 90], [2000, 100]]) {
    const result = await response(fixture.webhook({ type: 'transfer.reversed', data: { object: transferFor(fixture.state, { amount_reversed: cents, reversed: cents === 2000 }) } }));
    assert.equal(result.status, 200); assert.equal(fixture.state.balance, expectedBalance);
  }
  const delayed = await response(fixture.webhook({ type: 'transfer.created', data: { object: transferFor(fixture.state) } }));
  assert.equal(delayed.status, 200); assert.equal(fixture.state.balance, 100);
  assert.equal([...fixture.state.journal.values()][0].status, 'reversed');
  assert.equal(fixture.state.refunds, 20); assert.equal(fixture.state.notifications.length, 3);
  assert.equal(fixture.state.notifications[0].data.credited_eur, 5);
  assert.equal(fixture.state.rpcCalls.filter(call => call.name === 'credit_wallet_on_withdrawal_failure').length, 0);
});

test('reconciliation failure reaches the signed webhook error path, while invalid signatures cannot reach the ledger', async () => {
  const fixture = active(); await fixture.post(withdrawalBody());
  const event = { type: 'transfer.reversed', data: { object: transferFor(fixture.state, { amount_reversed: 500 }) } };
  fixture.state.rpcErrors.reconcile_connect_withdrawal = 'database unavailable';
  assert.equal((await response(fixture.webhook(event))).status, 500);
  assert.equal(fixture.state.balance, 80); assert.equal(fixture.state.notifications.length, 0);
  const count = fixture.state.rpcCalls.length;
  assert.equal((await response(fixture.webhook(event, 'invalid-signature'))).status, 400);
  assert.equal(fixture.state.rpcCalls.length, count);
  assert.equal(fixture.state.signatureInputs[0].raw, JSON.stringify(event));
});

test('foreign transfers are ignored and unlinked legacy MIDAS transfers require reconciliation', async () => {
  const fixture = active(); await fixture.post(withdrawalBody());
  const before = fixture.state.rpcCalls.length;
  const foreign = transferFor(fixture.state, { metadata: { app: 'another-app', source: 'connect_withdraw', user_id: USER } });
  assert.equal((await response(fixture.webhook({ type: 'transfer.reversed', data: { object: foreign } }))).status, 200);
  assert.equal(fixture.state.rpcCalls.length, before);
  const legacy = transferFor(fixture.state, { metadata: { app: 'midas', source: 'connect_withdraw', user_id: USER } });
  assert.equal((await response(fixture.webhook({ type: 'transfer.reversed', data: { object: legacy } }))).status, 500);
  assert.equal(fixture.state.rpcCalls.length, before); assert.equal(fixture.state.refunds, 0);
});

test('admin decisions use the midas RPC and refuse missing debit proof or failed persistence without direct refund writes', async () => {
  const fixture = active(); fixture.state.legacy.debitProof = false;
  const unproven = await response(fixture.patch(decision));
  assert.equal(unproven.status, 409); assert.equal(unproven.body.code, 'withdrawal_reconciliation_required');
  assert.equal(fixture.state.rpcCalls[0].schema, 'midas');
  fixture.state.legacy.debitProof = true;
  fixture.state.rpcErrors.decide_wallet_withdrawal = 'withdrawal_credit_unconfirmed';
  assert.equal((await response(fixture.patch(decision))).status, 503);
  assert.equal(fixture.state.legacyBalance, 80); assert.equal(fixture.state.legacyRefunds, 0);
  assert.deepEqual(fixture.state.directWrites, []);
  fixture.state.user = null;
  assert.equal((await response(fixture.patch(decision))).status, 403);
});

test('admin success requires a valid receipt and repeated rejection refunds exactly once', async () => {
  const fixture = active();
  const first = await response(fixture.patch(decision)); const replay = await response(fixture.patch(decision));
  assert.equal(first.status, 200); assert.equal(replay.status, 200); assert.equal(replay.body.replayed, true);
  assert.equal(fixture.state.legacyRefunds, 1); assert.equal(fixture.state.legacyBalance, 100);
  assert.equal((await response(fixture.patch({ ...decision, action: 'processed' }))).status, 409);
  for (const changes of [{ wallet_balance: null }, { wallet_balance: '' }, { wallet_balance: '-1' }, { status: 'processed' }, { refunded: false },
    { debit_confirmed: false }, { rejection_recorded: true }, { admission_rejection: 'insufficient_balance' }]) {
    const broken = active({ receiptOverrides: { decide_wallet_withdrawal: receipt => ({ ...receipt, ...changes }) } });
    const result = await response(broken.patch(decision));
    assert.equal(result.status, 503); assert.notEqual(result.body.ok, true);
  }
});

const bankActive = changes => active({ legacy: null, legacyBalance: 100, ...changes });
const bankBody = changes => ({ idempotencyKey: KEY, expectedUserId: USER, amount: 20, iban: IBAN, ...changes });
const bankRetry = () => ({ idempotencyKey: KEY, expectedUserId: USER });

test('IBAN direct mutation retains the actual phase gate and validates owner, key, cents and existing IBAN rules', async () => {
  const closed = createFixture();
  assert.equal((await response(closed.walletPost(bankBody()))).body.code, 'PHASE_1_LOCKED');
  assert.equal(closed.state.rpcCalls.length, 0);
  const fixture = bankActive();
  for (const change of [{ idempotencyKey: undefined }, { amount: 4.99 }, { amount: 5.001 }, { amount: 10_000_000_000 },
    { iban: 'DE00370400440532013000' }, { iban: undefined }]) {
    assert.equal((await response(fixture.walletPost(bankBody(change)))).status, 400);
  }
  assert.equal((await response(fixture.walletPost(bankBody({ expectedUserId: '00000000-0000-4000-8000-000000000009' })))).status, 409);
  assert.equal(fixture.state.rpcCalls.length, 0); assert.equal(fixture.state.legacyDebits, 0);
});

test('IBAN admission, administrative refund and key-only replay share the same request and debit proof', async () => {
  const fixture = bankActive(); const first = await response(fixture.walletPost(bankBody()));
  assert.equal(first.status, 200); assert.equal(first.body.withdrawal_id, KEY);
  assert.equal(first.body.idempotency_key, KEY); assert.equal(first.body.user_id, USER);
  assert.equal(first.body.debit_confirmed, true); assert.equal(first.body.new_balance_eur, 80);
  assert.equal(first.body.iban_last4, IBAN.slice(-4)); assert.ok(!JSON.stringify(first.body).includes(IBAN));
  assert.equal(fixture.state.rpcCalls[0].schema, 'midas');
  const rejected = await response(fixture.patch({ id: KEY, action: 'rejected' }));
  assert.equal(rejected.status, 200);
  const replay = await response(fixture.walletPost(bankRetry()));
  assert.equal(replay.status, 200); assert.equal(replay.body.status, 'rejected'); assert.equal(replay.body.refunded, true);
  assert.equal(replay.body.replayed, true); assert.equal(fixture.state.legacyBalance, 100);
  assert.equal(fixture.state.legacyDebits, 1); assert.equal(fixture.state.legacyRefunds, 1);
  assert.deepEqual(fixture.state.directWrites, []); assert.equal(fixture.state.stripeCalls.length, 0);
});

test('IBAN same-key parameter changes conflict and processed admission replays never debit again', async () => {
  const fixture = bankActive(); await fixture.walletPost(bankBody());
  for (const changes of [{ amount: 25 }, { iban: 'FR7630006000011234567890189' }]) {
    const result = await response(fixture.walletPost(bankBody(changes)));
    assert.equal(result.status, 409); assert.equal(result.body.code, 'withdrawal_idempotency_conflict');
    assert.equal(result.body.request_closed, undefined);
  }
  assert.equal((await response(fixture.patch({ id: KEY, action: 'processed' }))).status, 200);
  const replay = await response(fixture.walletPost(bankRetry()));
  assert.equal(replay.status, 200); assert.equal(replay.body.status, 'processed'); assert.equal(replay.body.refunded, false);
  assert.equal(fixture.state.legacyDebits, 1); assert.equal(fixture.state.legacyRefunds, 0);
});

test('IBAN retry arriving before the original does not close the key and the original can still be admitted once', async () => {
  const fixture = bankActive(); const early = await response(fixture.walletPost(bankRetry()));
  assert.equal(early.status, 409); assert.equal(early.body.code, 'withdrawal_request_not_found');
  assert.equal(early.body.request_closed, undefined); assert.equal(fixture.state.legacyRequests.size, 0);
  assert.equal((await response(fixture.walletPost(bankBody()))).status, 200);
  fixture.state.profile.subscription_started_at = '2026-11-23T00:00:00Z';
  const replay = await response(fixture.walletPost(bankRetry()));
  assert.equal(replay.status, 200); assert.equal(replay.body.replayed, true); assert.equal(fixture.state.legacyDebits, 1);
});

test('IBAN errors and malformed receipts never invent a refund, confirmation or closed request', async () => {
  for (const error of ['database unavailable', 'withdrawal_journal_unconfirmed', 'insufficient_balance']) {
    const fixture = bankActive({ rpcErrors: { admit_wallet_withdrawal: error } });
    const result = await response(fixture.walletPost(bankBody()));
    assert.equal(result.status, 409); assert.equal(result.body.request_closed, undefined); assert.notEqual(result.body.ok, true);
    assert.equal(fixture.state.legacyDebits, 0); assert.equal(fixture.state.legacyRefunds, 0);
  }
  for (const corrupt of [() => null, row => ({ ...row, id: LEGACY_ID }), row => ({ ...row, wallet_balance: null }),
    row => ({ ...row, debit_confirmed: false }), row => ({ ...row, iban: 'invalid' })]) {
    const fixture = bankActive({ receiptOverrides: { admit_wallet_withdrawal: corrupt } });
    const result = await response(fixture.walletPost(bankBody()));
    assert.equal(result.status, 409); assert.equal(result.body.request_closed, undefined);
    assert.equal(fixture.state.legacyDebits, 1); assert.equal(fixture.state.legacyRefunds, 0);
  }
});

test('persisted IBAN refusal prevents a delayed original from debiting after funds arrive and another key is admitted', async () => {
  const fixture = bankActive({ legacyBalance: 10 });
  const denied = await response(fixture.walletPost(bankBody()));
  assert.equal(denied.status, 400); assert.equal(denied.body.request_closed, true); assert.equal(denied.body.rejection_recorded, true);
  assert.equal(denied.body.debit_confirmed, false); assert.equal(denied.body.refunded, false); assert.equal(denied.body.withdrawal_id, KEY);
  fixture.state.legacyBalance = 100;
  assert.equal((await response(fixture.walletPost(bankBody({ idempotencyKey: LEGACY_ID })))).status, 200);
  const late = await response(fixture.walletPost(bankBody()));
  assert.equal(late.status, 400); assert.equal(late.body.rejection_recorded, true);
  assert.equal(fixture.state.legacyBalance, 80); assert.equal(fixture.state.legacyDebits, 1);
  assert.equal((await response(fixture.patch({ id: KEY, action: 'rejected' }))).status, 409);
  assert.equal(fixture.state.legacyRefunds, 0);
});

test('persisted Connect refusal prevents delayed debits and an SQL exception is never a closure receipt', async () => {
  const fixture = active({ balance: 10 });
  assert.equal((await response(fixture.post(withdrawalBody()))).body.rejection_recorded, true);
  fixture.state.balance = 100;
  assert.equal((await response(fixture.post(withdrawalBody({ idempotencyKey: LEGACY_ID })))).status, 200);
  assert.equal((await response(fixture.post(withdrawalBody()))).body.rejection_recorded, true);
  assert.equal(fixture.state.balance, 80); assert.equal(fixture.state.debits, 1); assert.equal(fixture.state.stripeCalls.length, 1);
  for (const error of ['withdrawal_cap_exceeded', 'insufficient_balance', 'withdrawal_journal_unconfirmed']) {
    const unavailable = active({ rpcErrors: { admit_connect_withdrawal: error } });
    const result = await response(unavailable.post(withdrawalBody()));
    assert.equal(result.status, 409); assert.equal(result.body.request_closed, undefined);
  }
});

test('GET wallet binds the authenticated identity, disables caching and does not mask database errors as zero', async () => {
  const fixture = bankActive(); const http = await fixture.load('src/app/api/wallet/route.ts').GET();
  assert.equal(http.status, 200); assert.equal(http.headers.get('cache-control'), 'no-store');
  const body = await http.json(); assert.equal(body.user_id, USER); assert.equal(body.wallet.balance, 100);
  for (const table of ['wallets', 'wallet_transactions', 'withdrawal_requests']) {
    const broken = bankActive({ tableErrors: { [table]: 'read unavailable' } });
    const result = await response(broken.load('src/app/api/wallet/route.ts').GET());
    assert.equal(result.status, 503); assert.equal(result.body.wallet, undefined);
  }
  for (const balance of [null, '', -1, 0.001, Infinity]) {
    const broken = bankActive({ legacyBalance: balance });
    assert.equal((await broken.load('src/app/api/wallet/route.ts').GET()).status, 503);
  }
  const empty = bankActive({ walletAbsent: true });
  const result = await response(empty.load('src/app/api/wallet/route.ts').GET());
  assert.equal(result.status, 200); assert.equal(result.body.wallet.balance, 0); assert.deepEqual(empty.state.directWrites, []);
});

test('malformed refusal receipts cannot unlock a new request in either wallet model', async () => {
  for (const changed of [{ rejection_recorded: false }, { debit_confirmed: true }, { refunded: true },
    { user_id: '00000000-0000-4000-8000-000000000009' }, { admission_rejection: 'unrecognized' }, { wallet_balance: null }]) {
    const connect = active({ balance: 10, receiptOverrides: { admit_connect_withdrawal: row => ({ ...row, ...changed }) } });
    const c = await response(connect.post(withdrawalBody())); assert.equal(c.status, 409); assert.equal(c.body.request_closed, undefined);
    const bank = bankActive({ legacyBalance: 10, receiptOverrides: { admit_wallet_withdrawal: row => ({ ...row, ...changed }) } });
    const b = await response(bank.walletPost(bankBody())); assert.equal(b.status, 409); assert.equal(b.body.request_closed, undefined);
  }
});

test('uppercase UUID input is canonicalized before admission or administrative mutation', async () => {
  const key = 'abcdefab-cdef-4abc-8abc-abcdefabcdef';
  const user = 'abcdefab-cdef-4abc-8abc-abcdefabcde1';
  const connect = active({
    user: { id: user, email: 'matiss.frasne@gmail.com' },
    account: { user_id: user, stripe_account_id: ACCOUNT, payouts_enabled: true, kyc_verified_at: '2026-01-01T00:00:00Z' },
  });
  const first = await response(connect.post(withdrawalBody({ idempotencyKey: key.toUpperCase(), expectedUserId: user.toUpperCase() })));
  assert.equal(first.status, 200); assert.equal(first.body.idempotency_key, key);
  assert.equal(connect.state.rpcCalls[0].args.p_request_key, key);
  const replay = await response(connect.post(withdrawalBody({ idempotencyKey: key, expectedUserId: user })));
  assert.equal(replay.status, 200); assert.equal(connect.state.debits, 1); assert.equal(connect.state.stripeCalls.length, 1);
  const bank = bankActive();
  assert.equal((await response(bank.walletPost(bankBody({ idempotencyKey: key.toUpperCase() })))).status, 200);
  const decision = await response(bank.patch({ id: key.toUpperCase(), action: 'rejected' }));
  assert.equal(decision.status, 200); assert.equal(decision.body.withdrawal_id, key);
  assert.equal(bank.state.legacyRefunds, 1);
});
