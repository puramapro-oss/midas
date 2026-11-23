import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedAccountRisk } from '../../src/lib/trading/shared-account-risk.ts';

const binding={account_key:'a'.repeat(64),authority_id:'11111111-1111-4111-8111-111111111111',writer:'midas',currency:'USD'};
const intent={operation_id:'22222222-2222-4222-8222-222222222222',intent_hash:'b'.repeat(64),snapshot_hash:'c'.repeat(64),costs_hash:'d'.repeat(64),loss:'0.40',margin:'3'};
const receipt={contract:'purama.shared-account-risk.v1',...binding,operation_id:intent.operation_id,
  intent_hash:intent.intent_hash,snapshot_hash:intent.snapshot_hash,fencing:'9007199254740993',
  state:'RESERVED',applied:true,loss:'0.4',margin:'3.0',execution_authority:false,live_release:'LOCKED'};
function client(changes={}) {
  const calls=[];
  return {calls, api:new SharedAccountRisk(binding,async (...args)=>{
    calls.push(args);return {data:{...receipt,...changes},error:null};
  })};
}
test('missing authority fails closed',async()=>{
  await assert.rejects(new SharedAccountRisk(binding).reserve(intent),/AUTHORITY_UNAVAILABLE/);
});
test('exact decimal strings and big fencing tokens are preserved',async()=>{
  const {api,calls}=client(); const result=await api.reserve(intent);
  assert.equal(calls.length,1); assert.equal(calls[0][1].p_writer,'midas');
  assert.equal(calls[0][1].p_request.loss,'0.40'); assert.equal(result.fencing,'9007199254740993');
  assert.equal(result.execution_authority,false); assert.equal(result.live_release,'LOCKED');
});
test('timeout makes one call without retry, release or provider leakage',async()=>{
  let calls=0;
  const api=new SharedAccountRisk(binding,async()=>{calls++;throw new Error('private provider body');});
  await assert.rejects(api.reserve(intent),/^Error: SHARED_RISK_AUTHORITY_UNCERTAIN$/);assert.equal(calls,1);
});
test('scope, amounts and forged execution permission are rejected',async()=>{
  for(const change of [{writer:'jev'},{account_key:'e'.repeat(64)},{currency:'EUR'},
    {snapshot_hash:'e'.repeat(64)},{execution_authority:true},{live_release:'OPEN'},
    {applied:1},{loss:'0.3'},{fencing:1},{fencing:'9223372036854775808'},{state:'FILLED'}])
    await assert.rejects(client(change).api.reserve(intent),/INVALID_RECEIPT/);
});
test('missing, null or errored RPC envelopes are refused',async()=>{
  for(const result of [null,{}, {data:receipt},{data:receipt,error:'uncertain'},{data:[],error:null}])
    await assert.rejects(new SharedAccountRisk(binding,async()=>result).reserve(intent),/AUTHORITY_UNCERTAIN/);
});
test('malformed input never reaches the RPC',()=>{
  for(const change of [{loss:0.4},{loss:'NaN'},{margin:true},{loss:'1e-1'},{loss:'0'},
    {loss:'0.0000000000001'},{writer:'jev'},{operation_id:'invalid'}]) {
    const {api,calls}=client(); assert.throws(()=>api.reserve({...intent,...change}),/REQUEST_REQUIRED/); assert.equal(calls.length,0);
  }
});
test('terminal replay stays a receipt, never a renewed admission',async()=>{
  const result=await client({applied:false,state:'RELEASED'}).api.reserve(intent);
  assert.equal(result.applied,false);assert.equal(result.state,'RELEASED');
});
test('transition validates fence, state and unsupported release',async()=>{
  const {api}=client({state:'SUBMITTING',applied:false});
  assert.equal((await api.transition(intent.operation_id,receipt.fencing,'SUBMITTING')).applied,false);
  await assert.rejects(api.transition(intent.operation_id,'1','SUBMITTING'),/FENCE_LOST/);
  await assert.rejects(api.transition(intent.operation_id,receipt.fencing,'UNKNOWN'),/INVALID_RECEIPT/);
  assert.throws(()=>api.transition(intent.operation_id,receipt.fencing,'RELEASED'),/TRANSITION_INVALID/);
});
