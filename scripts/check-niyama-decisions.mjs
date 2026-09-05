import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const phase = await readFile(new URL('../src/lib/phase.ts', import.meta.url), 'utf8');
const route = await readFile(new URL('../src/app/api/trade/execute/route.ts', import.meta.url), 'utf8');
const executor = await readFile(new URL('../src/lib/trading/trade-executor.ts', import.meta.url), 'utf8');

assert.match(phase, /walletMode: 'points'/);
assert.match(phase, /withdrawalAvailable: false/);
assert.doesNotMatch(phase, /process\.env\.(?:PURAMA_PHASE|WALLET_MODE|WITHDRAWAL_AVAILABLE)/);
assert.match(route, /uniquement les simulations éducatives/);
assert.doesNotMatch(executor, /createMarketOrder|live_executed|is_paper:\s*false/);
assert.match(executor, /executePaperTrade/);

console.log('NIYAMA MIDAS D1=C D2=A: PASS');
