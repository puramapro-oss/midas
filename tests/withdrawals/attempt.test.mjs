import test from 'node:test';
import assert from 'node:assert/strict';
import { readWithdrawalAttempt, prepareWithdrawalAttempt, readWithdrawalConfirmation, clearConfirmedWithdrawal, clearRejectedWithdrawal } from '../../src/components/connect/withdrawal-attempt.ts';
import { readIbanWithdrawalAttempt, prepareIbanWithdrawalAttempt, readIbanWithdrawalConfirmation, clearConfirmedIbanWithdrawal, clearRejectedIbanWithdrawal } from '../../src/components/connect/withdrawal-attempt.ts';

const user = '00000000-0000-4000-8000-000000000001';
const another = '00000000-0000-4000-8000-000000000009';
const key = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000003';
const account = 'acct_fixture';
function storage() {
  const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
function receipt(a, changes={}) {
  return {ok:true,user_id:a.userId,idempotency_key:a.key,stripe_account_id:a.accountId,withdrawal_id:id,
    transfer_id:'tr_fixture',amount_eur:a.amountEur,new_balance_eur:0,status:'pending',reversed_amount_eur:0,...changes};
}

test('network retry and page reload reuse the exact original key and amount',()=>{
  const s=storage();let generated=0;
  const first=prepareWithdrawalAttempt(s,user,account,20,()=>{generated++;return key;});
  const afterReload=readWithdrawalAttempt(s,user,account);
  const retry=prepareWithdrawalAttempt(s,user,account,0,()=>{throw new Error('Must not generate another key');});
  assert.deepEqual(afterReload,first);assert.deepEqual(retry,first);assert.equal(generated,1);
});
test('a pending amount remains immutable even when a new field value is entered',()=>{
  const s=storage();const first=prepareWithdrawalAttempt(s,user,account,20,()=>key);
  assert.deepEqual(prepareWithdrawalAttempt(s,user,account,30,()=>id),first);
});
test('different users and destination accounts do not share pending state',()=>{
  const s=storage();prepareWithdrawalAttempt(s,user,account,20,()=>key);
  assert.equal(readWithdrawalAttempt(s,another,account),null);assert.equal(readWithdrawalAttempt(s,user,'acct_other'),null);
});
test('malformed stored pending state cannot be replaced by a new payment',()=>{
  const s=storage();s.setItem(`midas:withdrawal:v1:${user}:${account}`,'{');
  assert.throws(()=>prepareWithdrawalAttempt(s,user,account,20,()=>key));
  assert.equal(s.getItem(`midas:withdrawal:v1:${user}:${account}`),'{');
});
test('storage failure blocks sending instead of losing the stable key',()=>{
  const s=storage();s.setItem=()=>{};
  assert.throws(()=>prepareWithdrawalAttempt(s,user,account,20,()=>key),/conserver/);
});
test('a response for another user, key, account, amount or invalid money is not confirmation',()=>{
  const s=storage(),a=prepareWithdrawalAttempt(s,user,account,20,()=>key);
  for(const changed of [{user_id:another},{idempotency_key:id},{stripe_account_id:'acct_other'},{amount_eur:21},
    {new_balance_eur:NaN},{new_balance_eur:-1},{new_balance_eur:0.001},{new_balance_eur:Number.MAX_VALUE},{transfer_id:null},{withdrawal_id:'invalid'},
    {reversed_amount_eur:21},{reversed_amount_eur:0.001},{status:'reversed',reversed_amount_eur:0},{ok:false}]) {
    assert.throws(()=>readWithdrawalConfirmation(receipt(a,changed),a));
    assert.equal(readWithdrawalAttempt(s,user,account).key,key);
  }
});
test('an exact persistent receipt clears only its own request',()=>{
  const s=storage(),a=prepareWithdrawalAttempt(s,user,account,20,()=>key);
  const other=prepareWithdrawalAttempt(s,another,account,20,()=>id);
  const confirmed=readWithdrawalConfirmation(receipt(a),a);clearConfirmedWithdrawal(s,a,confirmed);
  assert.equal(readWithdrawalAttempt(s,user,account),null);assert.deepEqual(readWithdrawalAttempt(s,another,account),other);
});
test('a partial or full reversal remains an explicit verified outcome',()=>{
  const a=prepareWithdrawalAttempt(storage(),user,account,20,()=>key);
  assert.equal(readWithdrawalConfirmation(receipt(a,{reversed_amount_eur:5}),a).reversed_amount_eur,5);
  assert.equal(readWithdrawalConfirmation(receipt(a,{reversed_amount_eur:20,status:'reversed'}),a).status,'reversed');
});
test('old confirmation cannot remove a newer request saved in another tab',()=>{
  const s=storage(),a=prepareWithdrawalAttempt(s,user,account,20,()=>key);
  s.setItem(`midas:withdrawal:v1:${user}:${account}`,JSON.stringify({...a,key:id}));
  clearConfirmedWithdrawal(s,a,receipt(a));assert.equal(readWithdrawalAttempt(s,user,account).key,id);
});
test('only a certain rejection for the exact owner and request permits a new amount',()=>{
  const s=storage(),a=prepareWithdrawalAttempt(s,user,account,20,()=>key);
  const rejected={request_closed:true,rejection_recorded:true,debit_confirmed:false,refunded:false,withdrawal_id:id,user_id:user,idempotency_key:key,stripe_account_id:account,code:'withdrawal_cap_exceeded'};
  for(const change of [{request_closed:false},{user_id:another},{idempotency_key:id},
    {stripe_account_id:'acct_other'},{rejection_recorded:false},{debit_confirmed:true},{refunded:true},{withdrawal_id:null},{code:'withdrawal_reconciliation_required'},{code:'network_error'}]) {
    assert.equal(clearRejectedWithdrawal(s,a,{...rejected,...change}),false);
    assert.deepEqual(readWithdrawalAttempt(s,user,account),a);
  }
  assert.equal(clearRejectedWithdrawal(s,a,rejected),true);
  assert.equal(readWithdrawalAttempt(s,user,account),null);
  const next=prepareWithdrawalAttempt(s,user,account,25,()=>id);
  assert.equal(next.amountEur,25);assert.equal(next.key,id);
  clearRejectedWithdrawal(s,a,rejected);
  assert.deepEqual(readWithdrawalAttempt(s,user,account),next);
});

const iban='FR7630006000011234567890189';
const otherIban='FR1420041010050500013M02606';
function ibanReceipt(a,changes={}) {
  return {ok:true,withdrawal_id:a.key,user_id:a.userId,idempotency_key:a.key,amount_eur:a.amountEur,
    new_balance_eur:0,status:'pending',debit_confirmed:true,refunded:false,replayed:false,iban_last4:a.ibanLast4,...changes};
}
test('IBAN reload keeps its request but never stores the complete bank account',async()=>{
  const s=storage(),a=await prepareIbanWithdrawalAttempt(s,user,20,'fr76 3000 6000 0112 3456 7890 189',()=>key);
  assert.equal(a.ibanLast4,'0189');assert.match(a.ibanDigest,/^[a-f0-9]{64}$/);
  assert.equal([...s.values.values()].some(value=>value.includes(iban)),false);
  assert.deepEqual(readIbanWithdrawalAttempt(s,user),a);
  assert.deepEqual(await prepareIbanWithdrawalAttempt(s,user,0,'',()=>{throw new Error('New key forbidden');}),a);
  assert.equal(readIbanWithdrawalAttempt(s,another),null);
});
test('IBAN re-entry resumes the exact same request and rejects another account or amount',async()=>{
  const s=storage(),a=await prepareIbanWithdrawalAttempt(s,user,20,iban,()=>key);
  assert.deepEqual(await prepareIbanWithdrawalAttempt(s,user,20,iban,()=>id),a);
  await assert.rejects(prepareIbanWithdrawalAttempt(s,user,20,otherIban,()=>id),/origine/);
  await assert.rejects(prepareIbanWithdrawalAttempt(s,user,25,iban,()=>id),/origine/);
  assert.deepEqual(readIbanWithdrawalAttempt(s,user),a);
});
test('IBAN corrupted storage or missing persistence blocks admission preparation',async()=>{
  const s=storage();s.setItem('midas:withdrawal:iban:v1:'+user,'{');
  await assert.rejects(prepareIbanWithdrawalAttempt(s,user,20,iban,()=>key));
  assert.equal(s.getItem('midas:withdrawal:iban:v1:'+user),'{');
  const dropped=storage();dropped.setItem=()=>{};
  await assert.rejects(prepareIbanWithdrawalAttempt(dropped,user,20,iban,()=>key),/conserver/);
});
test('IBAN receipt must prove owner, original request, amount, bank suffix and debit',async()=>{
  const a=await prepareIbanWithdrawalAttempt(storage(),user,20,iban,()=>key);
  for(const change of [{ok:false},{withdrawal_id:id},{idempotency_key:id},{user_id:another},{amount_eur:21},
    {iban_last4:'0000'},{debit_confirmed:false},{new_balance_eur:NaN},{new_balance_eur:-1},{new_balance_eur:0.001},
    {status:'rejected',refunded:false},{status:'pending',refunded:true},{status:'failed'},{replayed:null}]) {
    assert.throws(()=>readIbanWithdrawalConfirmation(ibanReceipt(a,change),a));
  }
  assert.equal(readIbanWithdrawalConfirmation(ibanReceipt(a,{status:'rejected',refunded:true,new_balance_eur:20}),a).refunded,true);
});
test('IBAN confirmed receipt clears its own request without erasing another user or a newer key',async()=>{
  const s=storage(),a=await prepareIbanWithdrawalAttempt(s,user,20,iban,()=>key);
  const b=await prepareIbanWithdrawalAttempt(s,another,20,iban,()=>id);
  clearConfirmedIbanWithdrawal(s,a,ibanReceipt(a));
  assert.equal(readIbanWithdrawalAttempt(s,user),null);assert.deepEqual(readIbanWithdrawalAttempt(s,another),b);
  const newer=await prepareIbanWithdrawalAttempt(s,user,25,iban,()=>id);
  clearConfirmedIbanWithdrawal(s,a,ibanReceipt(a));assert.deepEqual(readIbanWithdrawalAttempt(s,user),newer);
});
test('IBAN rejection without a durable no-debit record cannot release the request',async()=>{
  const s=storage(),a=await prepareIbanWithdrawalAttempt(s,user,20,iban,()=>key);
  const rejected={request_closed:true,rejection_recorded:true,debit_confirmed:false,refunded:false,
    withdrawal_id:key,idempotency_key:key,user_id:user,code:'insufficient_balance'};
  for(const change of [{request_closed:false},{rejection_recorded:false},{user_id:another},{withdrawal_id:id},
    {idempotency_key:id},{debit_confirmed:true},{refunded:true},{code:'withdrawal_request_not_found'},{code:'withdrawal_reconciliation_required'}]) {
    assert.equal(clearRejectedIbanWithdrawal(s,a,{...rejected,...change}),false);
    assert.deepEqual(readIbanWithdrawalAttempt(s,user),a);
  }
  assert.equal(clearRejectedIbanWithdrawal(s,a,rejected),true);
  const next=await prepareIbanWithdrawalAttempt(s,user,25,iban,()=>id);
  assert.equal(next.key,id);assert.equal(next.amountEur,25);
  clearRejectedIbanWithdrawal(s,a,rejected);assert.deepEqual(readIbanWithdrawalAttempt(s,user),next);
});
