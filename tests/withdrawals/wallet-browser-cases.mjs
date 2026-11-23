import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const fixtureIban = 'FR7630006000011234567890189';
export const walletBrowserScenarios = 10;

// Cases for the existing browser.mjs runner; no second server or browser.
export async function runWalletBrowserCases({scenario,user,other,withdrawalId,origin,waitUntil}) {
  function walletSnapshot(owner,balance=20) {
    return {user_id:owner,wallet:{user_id:owner,balance,currency:'EUR'},transactions:[],withdrawals:[]};
  }
  function walletConfirmation(body,changes={}) {
    return {ok:true,withdrawal_id:body.idempotencyKey,user_id:body.expectedUserId,idempotency_key:body.idempotencyKey,
      amount_eur:body.amount??20,new_balance_eur:0,status:'pending',debit_confirmed:true,refunded:false,replayed:false,
      iban_last4:(body.iban??fixtureIban).slice(-4),...changes};
  }
  function walletRejection(body,changes={}) {
    return {request_closed:true,rejection_recorded:true,debit_confirmed:false,refunded:false,
      withdrawal_id:body.idempotencyKey,idempotency_key:body.idempotencyKey,user_id:body.expectedUserId,
      code:'insufficient_balance',error:'Refus persistant de la fixture',...changes};
  }
  async function walletAttempt(page,owner=user) {
    return page.evaluate(id=>{
      const raw=localStorage.getItem('midas:withdrawal:iban:v1:'+id);
      return raw===null?null:JSON.parse(raw);
    },owner);
  }
  async function expectWalletBalance(page,balance) {
    const expected=balance.toFixed(2).replace('.',',')+'€';
    await page.waitForFunction(value=>document.querySelector('[data-testid="wallet-balance"]')?.textContent.replace(/\s/g,'')===value,expected);
  }
  async function openWallet(page,balance=20) {
    await page.goto(origin+'/?wallet');
    await page.waitForFunction(()=>!!window.fixture);
    await page.getByTestId('wallet-page').waitFor();
    await expectWalletBalance(page,balance);
  }
  async function fillWalletRequest(page,amount=20) {
    if(!await page.getByTestId('confirm-withdraw').isVisible())await page.getByTestId('withdraw-button').click();
    await page.getByTestId('withdraw-amount').fill(String(amount));
    await page.getByTestId('withdraw-iban').fill(fixtureIban);
  }
  async function expectWalletError(page,count) {
    await page.getByTestId('wallet-withdraw-error').waitFor();
    await page.waitForFunction(total=>window.fixtureToasts.filter(event=>event.type==='error').length===total,count);
    await page.waitForFunction(()=>{
      const control=document.querySelector('[data-testid="confirm-withdraw"]');return control&&!control.disabled;
    });
  }
  await scenario('IBAN wallet: synchronous double click admits one persisted key and accepts its exact receipt',async(page)=>{
    const requests=[];let balance=20;let release;const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/api/wallet',route=>route.fulfill({json:walletSnapshot(user,balance)}));
    await page.route('**/api/wallet/withdraw',async route=>{
      const body=route.request().postDataJSON();requests.push(body);await gate;
      balance=0;await route.fulfill({json:walletConfirmation(body)});
    });
    try {
      await openWallet(page);await fillWalletRequest(page);
      await page.evaluate(()=>{const control=document.querySelector('[data-testid="confirm-withdraw"]');control.click();control.click();});
      await waitUntil(()=>requests.length>0);
      assert.equal(requests.length,1);
      assert.match(requests[0].idempotencyKey,/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i);
      assert.equal(requests[0].expectedUserId,user);assert.equal(requests[0].amount,20);assert.equal(requests[0].iban,fixtureIban);
      assert.equal((await walletAttempt(page)).key,requests[0].idempotencyKey);
      release();await page.getByTestId('confirm-withdraw').waitFor({state:'hidden'});await expectWalletBalance(page,0);
      assert.equal((await page.evaluate(()=>window.fixtureToasts.filter(event=>event.type==='success'))).length,1);
      assert.equal(await walletAttempt(page),null);assert.equal(requests.length,1);
    } finally { release(); }
  });
  await scenario('IBAN wallet: lost response and reload at zero balance reuse the key without retaining the full IBAN',async(page)=>{
    const requests=[];let balance=20;
    await page.route('**/api/wallet',route=>route.fulfill({json:walletSnapshot(user,balance)}));
    await page.route('**/api/wallet/withdraw',route=>{
      const body=route.request().postDataJSON();requests.push(body);balance=0;
      if(requests.length===1)return route.abort('failed');
      return route.fulfill({json:walletConfirmation(body,{replayed:true})});
    });
    await openWallet(page);await fillWalletRequest(page);await page.getByTestId('confirm-withdraw').click();
    await expectWalletError(page,1);assert.equal(requests.length,1);
    const saved=await walletAttempt(page);
    assert.deepEqual(saved,{version:1,userId:user,key:requests[0].idempotencyKey,amountEur:20,
      ibanLast4:fixtureIban.slice(-4),ibanDigest:createHash('sha256').update(fixtureIban).digest('hex')});
    const storage=await page.evaluate(()=>JSON.stringify({...localStorage}));
    assert.equal(storage.includes(fixtureIban),false);
    await page.reload();await page.getByTestId('wallet-page').waitFor();await expectWalletBalance(page,0);
    assert.equal(await page.getByTestId('withdraw-button').isEnabled(),true);
    await page.getByTestId('withdraw-button').click();
    assert.equal(await page.getByTestId('withdraw-amount').inputValue(),'20.00');
    assert.equal(await page.getByTestId('withdraw-amount').isDisabled(),true);
    assert.equal(await page.getByTestId('withdraw-iban').inputValue(),'');
    await page.getByTestId('confirm-withdraw').click();await page.getByTestId('confirm-withdraw').waitFor({state:'hidden'});
    assert.equal(requests.length,2);
    assert.deepEqual(requests[1],{idempotencyKey:requests[0].idempotencyKey,expectedUserId:user});
    assert.equal(await walletAttempt(page),null);await expectWalletBalance(page,0);
  });
  await scenario('IBAN wallet: a late write from the previous authenticated owner cannot change the current wallet',async(page)=>{
    const requests=[];let currentOwner=user;let balance=20;let release;const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/api/wallet',route=>route.fulfill({json:walletSnapshot(currentOwner,balance)}));
    await page.route('**/api/wallet/withdraw',async route=>{
      const body=route.request().postDataJSON();requests.push(body);
      if(body.expectedUserId===user){await gate;try { await route.fulfill({json:walletConfirmation(body)}); } catch(error) { if(currentOwner===user)throw error; } return;}
      balance=10;await route.fulfill({json:walletConfirmation(body,{new_balance_eur:10})});
    });
    try {
      await openWallet(page);await fillWalletRequest(page);await page.getByTestId('confirm-withdraw').click();
      await waitUntil(()=>requests.length===1);
      currentOwner=other;balance=40;await page.evaluate(owner=>window.fixture.auth({user:{id:owner}}),other);
      await expectWalletBalance(page,40);release();await page.waitForLoadState('networkidle');
      await expectWalletBalance(page,40);assert.deepEqual(await page.evaluate(()=>window.fixtureToasts),[]);
      assert.equal(await page.getByTestId('confirm-withdraw').count(),0);
      assert.equal((await walletAttempt(page,user)).key,requests[0].idempotencyKey);
      assert.equal(await walletAttempt(page,other),null);
      await fillWalletRequest(page,30);await page.getByTestId('confirm-withdraw').click();
      await page.getByTestId('confirm-withdraw').waitFor({state:'hidden'});await expectWalletBalance(page,10);
      assert.equal(requests.length,2);assert.equal(requests[1].expectedUserId,other);
      assert.equal(requests[1].amount,30);assert.notEqual(requests[1].idempotencyKey,requests[0].idempotencyKey);
      assert.equal((await page.evaluate(()=>window.fixtureToasts.filter(event=>event.type==='success'))).length,1);
    } finally { release(); }
  });
  await scenario('IBAN wallet: unpersisted or wrongly bound rejections never close an uncertain key',async(page)=>{
    const requests=[];let balance=20;
    const invalid=[{rejection_recorded:undefined},{rejection_recorded:false},{debit_confirmed:undefined},
      {user_id:other},{withdrawal_id:withdrawalId,idempotency_key:withdrawalId},{refunded:true}];
    await page.route('**/api/wallet',route=>route.fulfill({json:walletSnapshot(user,balance)}));
    await page.route('**/api/wallet/withdraw',route=>{
      const body=route.request().postDataJSON();requests.push(body);const index=requests.length-1;
      if(index<invalid.length)return route.fulfill({status:409,json:walletRejection(body,invalid[index])});
      balance=0;return route.fulfill({json:walletConfirmation(body,{replayed:true})});
    });
    await openWallet(page);await fillWalletRequest(page);
    for(let index=0;index<invalid.length;index++) {
      await page.getByTestId('confirm-withdraw').click();await expectWalletError(page,index+1);
      assert.equal(requests.length,index+1);assert.equal((await walletAttempt(page)).key,requests[0].idempotencyKey);
      assert.equal(await page.getByTestId('withdraw-amount').isDisabled(),true);await expectWalletBalance(page,20);
      assert.equal((await page.evaluate(()=>window.fixtureToasts.filter(event=>event.type==='success'))).length,0);
      await page.getByTestId('withdraw-iban').fill('');
    }
    await page.getByTestId('confirm-withdraw').click();await page.getByTestId('confirm-withdraw').waitFor({state:'hidden'});
    for(const body of requests.slice(1))assert.deepEqual(body,{idempotencyKey:requests[0].idempotencyKey,expectedUserId:user});
    assert.equal(await walletAttempt(page),null);await expectWalletBalance(page,0);
  });
  await scenario('IBAN wallet: a persisted rejection bound to owner and key permits a new amount with a new key',async(page)=>{
    const requests=[];let balance=20;
    await page.route('**/api/wallet',route=>route.fulfill({json:walletSnapshot(user,balance)}));
    await page.route('**/api/wallet/withdraw',route=>{
      const body=route.request().postDataJSON();requests.push(body);
      if(requests.length===1)return route.fulfill({status:409,json:walletRejection(body)});
      balance=10;return route.fulfill({json:walletConfirmation(body,{new_balance_eur:10})});
    });
    await openWallet(page);await fillWalletRequest(page);await page.getByTestId('confirm-withdraw').click();
    await expectWalletError(page,1);assert.equal(await walletAttempt(page),null);
    assert.equal(await page.getByTestId('withdraw-amount').isEnabled(),true);
    await fillWalletRequest(page,10);await page.getByTestId('confirm-withdraw').click();
    await page.getByTestId('confirm-withdraw').waitFor({state:'hidden'});await expectWalletBalance(page,10);
    assert.equal(requests.length,2);assert.equal(requests[1].expectedUserId,user);
    assert.notEqual(requests[1].idempotencyKey,requests[0].idempotencyKey);assert.equal(requests[1].amount,10);
    assert.equal(requests[1].iban,fixtureIban);assert.equal(await walletAttempt(page),null);
  });
  await scenario('IBAN wallet: mismatched successful receipts cannot replace the balance or release the key',async(page)=>{
    const requests=[];let balance=20;
    const invalid=[{user_id:other},{withdrawal_id:withdrawalId},{amount_eur:19},{iban_last4:'0000'}];
    await page.route('**/api/wallet',route=>route.fulfill({json:walletSnapshot(user,balance)}));
    await page.route('**/api/wallet/withdraw',route=>{
      const body=route.request().postDataJSON();requests.push(body);const index=requests.length-1;
      if(index<invalid.length)return route.fulfill({json:walletConfirmation(body,invalid[index])});
      balance=0;return route.fulfill({json:walletConfirmation(body,{replayed:true})});
    });
    await openWallet(page);await fillWalletRequest(page);
    for(let index=0;index<invalid.length;index++) {
      await page.getByTestId('confirm-withdraw').click();await expectWalletError(page,index+1);
      assert.equal((await walletAttempt(page)).key,requests[0].idempotencyKey);await expectWalletBalance(page,20);
      assert.equal((await page.evaluate(()=>window.fixtureToasts.filter(event=>event.type==='success'))).length,0);
    }
    await page.getByTestId('confirm-withdraw').click();await page.getByTestId('confirm-withdraw').waitFor({state:'hidden'});
    assert.equal(new Set(requests.map(body=>body.idempotencyKey)).size,1);assert.equal(await walletAttempt(page),null);
    await expectWalletBalance(page,0);
  });
  await scenario('IBAN wallet: failed initial and refresh reads show an unavailable balance instead of invented zero funds',async(page)=>{
    let fail=true;let writes=0;
    await page.route('**/api/wallet',route=>route.fulfill(fail?{status:503,json:{error:'fixture unavailable'}}:{json:walletSnapshot(user)}));
    await page.route('**/api/wallet/withdraw',route=>{writes++;return route.fulfill({status:500,json:{error:'unexpected write'}});});
    await page.goto(origin+'/?wallet');await page.getByTestId('wallet-error').waitFor();
    assert.equal((await page.getByTestId('wallet-balance').textContent()).trim(),'—');
    assert.equal(await page.getByTestId('withdraw-button').isDisabled(),true);
    fail=false;await page.getByRole('button',{name:'Rafraîchir',exact:true}).click();await expectWalletBalance(page,20);
    fail=true;await page.getByRole('button',{name:'Rafraîchir',exact:true}).click();await page.getByTestId('wallet-error').waitFor();
    assert.equal((await page.getByTestId('wallet-balance').textContent()).trim(),'—');
    assert.equal(await page.getByTestId('withdraw-button').isDisabled(),true);assert.equal(writes,0);
  });
  await scenario('IBAN wallet: mixed envelope, wallet or transaction owners never expose another account balance',async(page)=>{
    const cases=[walletSnapshot(other,40),{...walletSnapshot(user),wallet:{user_id:other,balance:40,currency:'EUR'}},
      {...walletSnapshot(user),transactions:[{id:withdrawalId,user_id:other,type:'credit',amount:40,source:'manual',description:'FOREIGN-LEDGER-MARKER',created_at:'2026-11-23T00:00:00Z'}]}];
    let current=cases[0];let writes=0;
    await page.route('**/api/wallet',route=>route.fulfill({json:current}));
    await page.route('**/api/wallet/withdraw',route=>{writes++;return route.fulfill({status:500,json:{error:'unexpected write'}});});
    for(const response of cases) {
      current=response;await page.goto(origin+'/?wallet');await page.getByTestId('wallet-error').waitFor();
      assert.equal((await page.getByTestId('wallet-balance').textContent()).trim(),'—');
      assert.equal(await page.getByTestId('withdraw-button').isDisabled(),true);
      assert.equal(await page.getByText('FOREIGN-LEDGER-MARKER',{exact:true}).count(),0);
    }
    await page.evaluate(()=>window.fixture.auth({user:null}));
    await page.waitForFunction(()=>document.querySelector('[data-testid="wallet-error"]')?.textContent.includes('Connecte-toi'));
    assert.equal(await page.getByTestId('wallet-balance').count(),0);assert.equal(await page.getByTestId('withdraw-button').count(),0);
    assert.equal(writes,0);
  });
  await scenario('IBAN wallet: an older pending read cannot replace the authenticated owner after a switch',async(page)=>{
    let initial=true;let held=0;let release;const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/api/wallet',async route=>{
      const old=initial;const response=walletSnapshot(old?user:other,old?20:40);
      if(old){held++;await gate;}
      try { await route.fulfill({json:response}); } catch(error) { if(!old)throw error; }
    });
    try {
      await page.goto(origin+'/?wallet');await page.waitForFunction(()=>!!window.fixture);await waitUntil(()=>held===1);
      initial=false;await page.evaluate(owner=>window.fixture.auth({user:{id:owner}}),other);
      await expectWalletBalance(page,40);release();await page.waitForLoadState('networkidle');
      await expectWalletBalance(page,40);assert.equal(await page.getByTestId('wallet-error').count(),0);
      assert.deepEqual(await page.evaluate(()=>window.fixtureToasts),[]);
    } finally { release(); }
  });
  await scenario('IBAN wallet: the closed phase keeps the withdrawal action unavailable in the actual page',async(page)=>{
    let writes=0;
    await page.route('**/api/wallet',route=>route.fulfill({json:walletSnapshot(user)}));
    await page.route('**/api/wallet/withdraw',route=>{writes++;return route.fulfill({status:500,json:{error:'unexpected write'}});});
    await openWallet(page);await page.evaluate(()=>window.fixture.phase({withdrawalAvailable:false,cardAvailable:false,phase:1}));
    await page.waitForFunction(()=>document.querySelector('[data-testid="withdraw-button"]')?.disabled);
    await page.evaluate(()=>document.querySelector('[data-testid="withdraw-button"]').click());
    assert.equal(await page.getByTestId('confirm-withdraw').count(),0);assert.equal(writes,0);await expectWalletBalance(page,20);
  });
}
