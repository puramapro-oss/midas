// Render the actual component with the installed React/ReactDOM in Chromium.
// Isolated behavior fixture; this is not the complete Next application or a
// visual deployment review. Only loopback HTTP and simulated receipts are used.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { runWalletBrowserCases, walletBrowserScenarios } from './wallet-browser-cases.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const user = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000009';
const withdrawalId = '00000000-0000-4000-8000-000000000003';
const expectedScenarios = 7 + walletBrowserScenarios;
const evidence = path.join(root,'test-results','withdrawals-browser');

const modules = {};
for (const [name,pkg,file] of [
  ['react','react','react.production.js'], ['react/jsx-runtime','react','react-jsx-runtime.production.js'],
  ['react-dom','react-dom','react-dom.production.js'], ['react-dom/client','react-dom','react-dom-client.production.js'],
  ['scheduler','scheduler','scheduler.production.js'],
]) {
  const dir = path.dirname(require.resolve(pkg+'/package.json'));
  modules[name] = await fs.readFile(path.join(dir,'cjs',file),'utf8');
}
const compile = (source,name) => {
  const result=ts.transpileModule(source,{fileName:name,reportDiagnostics:true,compilerOptions:{
    target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,
  }});
  const errors=(result.diagnostics??[]).filter(diagnostic=>diagnostic.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,name+': '+errors.map(diagnostic=>ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n')).join('\n'));
  return result.outputText;
};
for (const [name,file] of [
  ['WithdrawButton','src/components/connect/WithdrawButton.tsx'],
  ['ConnectHubPage','src/app/compte/connect/page.tsx'],
  ['WalletPage','src/app/dashboard/wallet/page.tsx'],
  ['./useWalletState','src/app/dashboard/wallet/useWalletState.ts'],
  ['./withdrawConstants','src/components/connect/withdrawConstants.ts'],
  ['./withdrawal-attempt','src/components/connect/withdrawal-attempt.ts'],
  ['./utils','src/app/dashboard/wallet/utils.ts'],
  ['@/lib/utils/formatters','src/lib/utils/formatters.ts'],
  ['@/lib/iban','src/lib/iban.ts'],
]) modules[name] = compile(await fs.readFile(path.join(root,file),'utf8'),file);
for (const name of ['clsx','tailwind-merge']) modules[name]=await fs.readFile(require.resolve(name),'utf8');
modules['@/components/connect/WithdrawButton'] = "module.exports = require('WithdrawButton');";
modules['@/components/connect/withdrawal-attempt'] = "module.exports = require('./withdrawal-attempt');";
modules['@/hooks/useAuth'] = 'exports.useAuth = () => window.fixtureAuth;';
// Open phase only inside this isolated fixture; the real phase/NIYAMA guards
// and all monetary handlers remain unchanged and are not contacted here.
modules['@/hooks/usePhase'] = 'exports.usePhase = () => window.fixturePhase;';
modules['sonner'] = "exports.toast={success:message=>window.fixtureToasts.push({type:'success',message}),error:message=>window.fixtureToasts.push({type:'error',message})};";
modules['framer-motion'] = `
  const React=require('react');
  const Div=React.forwardRef(({children,initial,animate,exit,transition,variants,custom,...props},ref)=>React.createElement('div',{...props,ref},children));
  exports.motion={div:Div};exports.AnimatePresence=({children})=>children;
`;
modules['lucide-react'] = `
  const React=require('react');
  for(const name of ['Wallet','ArrowUpRight','ArrowDownRight','Clock','CreditCard','X','Check','AlertTriangle','Loader2','RefreshCw'])
    exports[name]=props=>React.createElement('svg',{...props,'aria-hidden':true,'data-fixture-icon':name});
`;
for (const name of ['@/components/wallet/PrimeTracker','@/components/wallet/CardTeaser','@/components/fiscal/FiscalBanner']) {
  modules[name]='exports.default=()=>null;';
}
modules['next/link'] = "exports.default = ({href,children}) => require('react').createElement('a',{href},children);";
modules['@/components/connect/ConnectRoot'] = "exports.default = ({children}) => require('react').createElement('div',{'data-testid':'fixture-onboarding-root'},children);";
modules['@stripe/react-connect-js'] = "exports.ConnectAccountOnboarding = () => require('react').createElement('div',{'data-testid':'fixture-onboarding'});";
modules.fixture = compile(`
  import {useState,useEffect} from 'react';
  import {createRoot} from 'react-dom/client';
  import WithdrawButton from 'WithdrawButton';
  import ConnectHubPage from 'ConnectHubPage';
  import WalletPage from 'WalletPage';
  window.fixtureEvents=[];
  window.fixtureToasts=[];
  function Harness(){
    const [props,setProps]=useState({userId:${JSON.stringify(user)},stripeAccountId:'acct_fixture',balanceEur:20});
    const [auth,setAuth]=useState({user:{id:${JSON.stringify(user)}},loading:false});
    const [phase,setPhase]=useState({phase:2,walletMode:'euros',cardAvailable:true,withdrawalAvailable:true});
    window.fixtureAuth=auth;
    window.fixturePhase=phase;
    useEffect(()=>{window.fixture={update:(changes)=>setProps(previous=>({...previous,...changes})),auth:(changes)=>setAuth(previous=>({...previous,...changes})),phase:(changes)=>setPhase(previous=>({...previous,...changes}))};},[]);
    const query=new URLSearchParams(location.search);
    return query.has('wallet') ? <WalletPage/> : query.has('hub') ? <ConnectHubPage/> : <WithdrawButton {...props} onSuccess={(balance)=>{
      window.fixtureEvents.push({userId:props.userId,balance});setProps(previous=>({...previous,balanceEur:balance}));
    }}/>;
  }
  createRoot(document.getElementById('root')).render(<Harness/>);
`,'fixture.tsx');
const bundle = `(()=>{const process={env:{NODE_ENV:'production'}};const modules={${Object.entries(modules).map(([name,code])=>`${JSON.stringify(name)}:(module,exports,require)=>{\n${code}\n}`).join(',')}};const cache={};function require(id){if(cache[id])return cache[id].exports;if(!modules[id])throw new Error('Unexpected browser module '+id);const m={exports:{}};cache[id]=m;modules[id](m,m.exports,require);return m.exports;}require('fixture');})();`;
// Validate the same module map used by Chromium, without running its DOM code.
for (const [name,code] of Object.entries(modules)) {
  const source=ts.createSourceFile(name+'.js',code,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
  const visit=node=>{
    if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='require'&&
        node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])) {
      assert(Object.hasOwn(modules,node.arguments[0].text),'Missing fixture module '+node.arguments[0].text+' imported by '+name);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);
}
new Script(bundle,{filename:'withdrawals-browser-fixture.js'});
if(process.argv.includes('--check-bundle')) {
  process.stdout.write('PASS fixture syntax and module resolution; browser scenarios NOT RUN.\n');
  process.exit(0);
}
await fs.mkdir(evidence,{recursive:true});
const server = http.createServer((req,res)=>{
  if(req.url==='/bundle.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(bundle);return;}
  if(new URL(req.url,'http://127.0.0.1').pathname==='/'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Isolated withdrawal fixture</title><div id="root"></div><script src="/bundle.js"></script></html>');return;}
  res.writeHead(404);res.end();
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin='http://127.0.0.1:'+server.address().port;
let browser;
let browserVersion=null;
let launchError=null;
const cleanupErrors=[];
const results=[];
async function waitUntil(predicate) {
  const deadline=Date.now()+10_000;
  while(!predicate()) {
    if(Date.now()>=deadline)throw new Error('Timed out waiting for the fixture request');
    await new Promise(resolve=>setTimeout(resolve,10));
  }
}
function confirmation(body,changes={}) {
  return {ok:true,user_id:body.expectedUserId,idempotency_key:body.idempotencyKey,stripe_account_id:body.expectedAccountId,
    withdrawal_id:withdrawalId,transfer_id:'tr_fixture',amount_eur:body.amount_eur,new_balance_eur:0,status:'pending',reversed_amount_eur:0,...changes};
}
async function scenario(name,action) {
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();const errors=[];const external=[];
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(10_000);
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>{
    if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}
    return route.continue();
  });
  try{
    await page.goto(origin);await page.waitForFunction(()=>!!window.fixture);
    await page.getByTestId('withdraw-button').waitFor({state:'visible'});
    await action(page);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    results.push({name,status:'PASS'});process.stdout.write('PASS '+name+'\n');
  }catch(error){results.push({name,status:'FAIL',error:error.message});console.error('FAIL '+name+': '+error.message);}
  finally{await context.close();}
}
try {
  // This is the same installed Chrome explicitly hardened before credentials
  // and used by the repository's existing Desktop Chrome CI project.
  if(process.env.CI && !process.env.WITHDRAWAL_CHROMIUM_EXECUTABLE) {
    const installedChrome=await fs.stat('/opt/google/chrome/chrome');
    assert(installedChrome.isFile() && (installedChrome.mode & 0o111)!==0,'The existing CI Chrome must be installed and executable');
  }
  browser=await chromium.launch({headless:true,chromiumSandbox:true,
    ...(process.env.WITHDRAWAL_CHROMIUM_EXECUTABLE ? {executablePath:process.env.WITHDRAWAL_CHROMIUM_EXECUTABLE} : {channel:'chrome'}),
  });
  browserVersion=browser.version();
  await scenario('same-event-loop double click sends once and success survives the lower balance',async(page)=>{
    const requests=[];let release;const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/api/connect/withdraw',async route=>{const body=route.request().postDataJSON();requests.push(body);await gate;await route.fulfill({json:confirmation(body)});});
    try {
    await page.getByTestId('withdraw-button').click();
    await page.evaluate(()=>{const button=document.querySelector('[data-testid="withdraw-confirm"]');button.click();button.click();});
    await page.waitForFunction(()=>!!document.querySelector('[data-testid="withdraw-confirm"]')?.disabled);
    await waitUntil(()=>requests.length>0);
    assert.equal(requests.length,1);release();
    await page.getByTestId('withdraw-success').waitFor();
    assert.equal((await page.evaluate(()=>window.fixtureEvents)).length,1);
    assert.match(await page.getByTestId('withdraw-success').textContent(),/Transfert confirmé/);
    assert.equal(requests.length,1);
    } finally { release(); }
  });
  await scenario('lost response, reload and zero balance retain the original request',async(page)=>{
    const requests=[];
    await page.route('**/api/connect/withdraw',async route=>{const body=route.request().postDataJSON();requests.push(body);if(requests.length===1)return route.abort('failed');return route.fulfill({json:confirmation(body)});});
    await page.getByTestId('withdraw-button').click();await page.getByTestId('withdraw-confirm').click();
    await page.getByTestId('withdraw-error').waitFor();
    await page.reload();await page.waitForFunction(()=>!!window.fixture);
    await page.evaluate(()=>window.fixture.update({balanceEur:0}));
    await page.getByTestId('withdraw-button').click();
    assert.equal(await page.getByTestId('withdraw-amount-input').inputValue(),'20.00');
    assert.equal(await page.getByTestId('withdraw-amount-input').isDisabled(),true);
    await page.getByTestId('withdraw-confirm').click();await page.getByTestId('withdraw-success').waitFor();
    assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1]);
  });
  await scenario('account switch discards late completion and does not borrow the previous request',async(page)=>{
    const requests=[];let release;const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/api/connect/withdraw',async route=>{const body=route.request().postDataJSON();requests.push(body);await gate;await route.fulfill({json:confirmation(body)});});
    try {
    await page.getByTestId('withdraw-button').click();await page.getByTestId('withdraw-confirm').click();
    await waitUntil(()=>requests.length>0);
    await page.evaluate(otherUser=>window.fixture.update({userId:otherUser,stripeAccountId:'acct_other',balanceEur:40}),other);
    await page.getByTestId('withdraw-modal').waitFor({state:'hidden'});release();
    await page.waitForLoadState('networkidle');
    assert.deepEqual(await page.evaluate(()=>window.fixtureEvents),[]);
    assert.equal(await page.getByTestId('withdraw-success').count(),0);
    assert.equal(await page.getByTestId('withdraw-button').textContent(),'Retirer mes gains');
    await page.getByTestId('withdraw-button').click();
    assert.equal(await page.getByTestId('withdraw-amount-input').inputValue(),'40.00');
    assert.equal(await page.getByTestId('withdraw-amount-input').isDisabled(),false);
    } finally { release(); }
  });
  await scenario('partial reversal displays credited funds without promising a bank arrival',async(page)=>{
    await page.route('**/api/connect/withdraw',route=>route.fulfill({json:confirmation(route.request().postDataJSON(),{reversed_amount_eur:5,new_balance_eur:5})}));
    await page.getByTestId('withdraw-button').click();await page.getByTestId('withdraw-confirm').click();
    await page.getByTestId('withdraw-success').waitFor();
    const message=await page.getByTestId('withdraw-success').textContent();
    assert.match(message,/partiellement annulé/);assert.match(message,/5,00/);assert.doesNotMatch(message,/1 à 3 jours|20,00.*transférés/);
  });
  const accountSummary=(owner,account='acct_fixture')=>({user_id:owner,stripe_account_id:account,stage:'verified',
    payouts_enabled:true,charges_enabled:true,details_submitted:true,disabled_reason:null,
    requirements_summary:{currently_due:[],past_due:[],eventually_due:[]}});
  await scenario('the account hub binds its real withdrawal component to both verified identities',async(page)=>{
    const requests=[];
    await page.route('**/api/connect/status',route=>route.fulfill({json:accountSummary(user)}));
    await page.route('**/api/wallet/balance',route=>route.fulfill({json:{user_id:user,balance_eur:20,currency:'EUR'}}));
    await page.route('**/api/connect/withdraw',route=>{const body=route.request().postDataJSON();requests.push(body);return route.fulfill({json:confirmation(body)});});
    await page.goto(origin+'/?hub');
    await page.getByTestId('connect-withdraw-section').waitFor();
    await page.getByTestId('withdraw-button').click();await page.getByTestId('withdraw-confirm').click();
    await page.getByTestId('withdraw-success').waitFor();
    assert.equal(requests.length,1);assert.equal(requests[0].expectedUserId,user);assert.equal(requests[0].expectedAccountId,'acct_fixture');
    assert.match(await page.getByTestId('connect-wallet-balance').textContent(),/0,00/);
  });
  await scenario('account read failure or mixed owner responses never start onboarding or withdrawals',async(page)=>{
    let fail=true;
    await page.route('**/api/connect/status',route=>route.fulfill(fail?{status:503,json:{error:'fixture unavailable'}}:{json:accountSummary(user)}));
    await page.route('**/api/wallet/balance',route=>route.fulfill({json:{user_id:other,balance_eur:20,currency:'EUR'}}));
    await page.goto(origin+'/?hub');await page.getByTestId('connect-status-error').waitFor();
    assert.equal(await page.getByTestId('fixture-onboarding-root').count(),0);assert.equal(await page.getByTestId('withdraw-button').count(),0);
    fail=false;await page.reload();await page.getByTestId('connect-status-error').waitFor();
    assert.match(await page.getByTestId('connect-status-error').textContent(),/compte a changé/);
    assert.equal(await page.getByTestId('fixture-onboarding-root').count(),0);assert.equal(await page.getByTestId('withdraw-button').count(),0);
    await page.evaluate(()=>window.fixture.auth({user:null}));
    await page.waitForFunction(()=>document.querySelector('[data-testid="connect-status-error"]')?.textContent.includes('Connecte-toi'));
    assert.equal(await page.getByTestId('fixture-onboarding-root').count(),0);
  });
  await scenario('the account hub ignores pending responses after the authenticated owner changes',async(page)=>{
    let initial=true;const held=[];let release;const gate=new Promise(resolve=>{release=resolve;});
    const respond=(kind)=>async route=>{
      const old=initial;const owner=old?user:other;
      if(old){held.push(kind);await gate;}
      const json=kind==='status'?accountSummary(owner,old?'acct_fixture':'acct_other'):{user_id:owner,balance_eur:old?20:40,currency:'EUR'};
      try { await route.fulfill({json}); } catch (error) { if(!old)throw error; }
    };
    await page.route('**/api/connect/status',respond('status'));await page.route('**/api/wallet/balance',respond('balance'));
    try {
      await page.goto(origin+'/?hub');await page.waitForFunction(()=>!!window.fixture);await waitUntil(()=>held.length===2);
      initial=false;await page.evaluate(otherUser=>window.fixture.auth({user:{id:otherUser}}),other);
      await page.getByTestId('connect-withdraw-section').waitFor();
      release();await page.waitForLoadState('networkidle');
      assert.match(await page.getByTestId('connect-wallet-balance').textContent(),/40,00/);
      await page.getByTestId('withdraw-button').click();assert.equal(await page.getByTestId('withdraw-amount-input').inputValue(),'40.00');
      assert.equal(await page.getByTestId('connect-status-error').count(),0);
    } finally { release(); }
  });
  await runWalletBrowserCases({scenario,user,other,withdrawalId,origin,waitUntil});
} catch (error) {
  launchError={name:error.name,message:error.message};
  process.exitCode=1;
  console.error(error.message);
} finally {
  try { if(browser)await browser.close(); }
  catch(error){cleanupErrors.push({phase:'browser',message:error.message});process.exitCode=1;}
  try { await new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();}); }
  catch(error){cleanupErrors.push({phase:'server',message:error.message});process.exitCode=1;}
  finally {
    await fs.writeFile(path.join(evidence,'report.json'),JSON.stringify({scope:'Actual WithdrawButton, ConnectHubPage, WalletPage, persistence helpers and React in Chromium; auth/phase/Next/Stripe/animation/icon/child UI boundaries and monetary providers simulated',
      browserVersion,chromiumSandbox:true,systemExecutable:process.env.WITHDRAWAL_CHROMIUM_EXECUTABLE??null,launchError,cleanupErrors,expectedScenarios,results},null,2)+'\n');
  }
}
if(results.length!==expectedScenarios||results.some(result=>result.status!=='PASS'))process.exitCode=1;
