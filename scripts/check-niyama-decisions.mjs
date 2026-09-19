import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const phase = await readFile(new URL('../src/lib/phase.ts', import.meta.url), 'utf8');
const route = await readFile(new URL('../src/app/api/trade/execute/route.ts', import.meta.url), 'utf8');
const closeRoute = await readFile(new URL('../src/app/api/trade/close/route.ts', import.meta.url), 'utf8');
const executor = await readFile(new URL('../src/lib/trading/trade-executor.ts', import.meta.url), 'utf8');
const prompts = await readFile(new URL('../src/lib/ai/system-prompts.ts', import.meta.url), 'utf8');
const help = await readFile(new URL('../src/app/dashboard/help/data.ts', import.meta.url), 'utf8');
const middleware = await readFile(new URL('../src/middleware.ts', import.meta.url), 'utf8');
const home = await readFile(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../src/app/dashboard/page.tsx', import.meta.url), 'utf8');
const cgu = await readFile(new URL('../src/app/legal/cgu/page.tsx', import.meta.url), 'utf8');
const cgv = await readFile(new URL('../src/app/legal/cgv/page.tsx', import.meta.url), 'utf8');
const privacy = await readFile(new URL('../src/app/legal/privacy/page.tsx', import.meta.url), 'utf8');
const pricing = await readFile(new URL('../src/app/pricing/page.tsx', import.meta.url), 'utf8');
const changelog = await readFile(new URL('../src/app/changelog/page.tsx', import.meta.url), 'utf8');
const chat = await readFile(new URL('../src/app/dashboard/chat/page.tsx', import.meta.url), 'utf8');
const mobileRoot = await readFile(new URL('../mobile/app/_layout.tsx', import.meta.url), 'utf8');
const mobileTabs = await readFile(new URL('../mobile/app/(tabs)/_layout.tsx', import.meta.url), 'utf8');
const mobileDashboard = await readFile(new URL('../mobile/app/(tabs)/index.tsx', import.meta.url), 'utf8');
const mobileChat = await readFile(new URL('../mobile/app/(tabs)/chat.tsx', import.meta.url), 'utf8');
const mobileHelp = await readFile(new URL('../mobile/app/(stack)/help.tsx', import.meta.url), 'utf8');
const mobileMarkets = await readFile(new URL('../mobile/app/(stack)/markets.tsx', import.meta.url), 'utf8');
const mobileSettings = await readFile(new URL('../mobile/app/(stack)/settings.tsx', import.meta.url), 'utf8');
const mobileStore = await readFile(new URL('../mobile/store.config.json', import.meta.url), 'utf8');
const notifEmail = await readFile(new URL('../src/lib/notifications/email.ts', import.meta.url), 'utf8');
const emailSequence = await readFile(new URL('../src/app/api/cron/email-sequence/route.ts', import.meta.url), 'utf8');
const vercelJson = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

assert.match(phase, /walletMode: 'points'/);
assert.match(phase, /withdrawalAvailable: false/);
assert.doesNotMatch(phase, /process\.env\.(?:PURAMA_PHASE|WALLET_MODE|WITHDRAWAL_AVAILABLE)/);
assert.match(route, /uniquement les simulations éducatives/);
// D2=A : aucun chemin d'ordre exchange — ni ouverture (executor) ni fermeture
// (close route). L'invariant est asserté sur les DEUX fichiers : un grep
// mono-fichier laisserait la prochaine route s'échapper.
assert.doesNotMatch(executor, /createMarketOrder|live_executed|is_paper:\s*false/);
assert.doesNotMatch(closeRoute, /createMarketOrder|live_executed|executeLiveOrder/);
assert.match(closeRoute, /PAPER_FEE_RATE/);
assert.match(executor, /executePaperTrade/);
assert.match(phase, /cryptoPromotionFrance: false/);
assert.match(phase, /personalizedCryptoAdvice: false/);
assert.match(prompts, /uniquement de l'information générale et de l'éducation/);
assert.match(prompts, /ne fournis jamais de conseil personnalisé/);
assert.match(help, /connexion et la promotion d'exchanges sont désactivées en France/);
assert.doesNotMatch(help, /29,99|79,99|jusqu'à 1000|50% de son premier paiement|Trading Spot/);
assert.match(middleware, /EDUCATION_ONLY_API_PREFIXES/);
assert.match(middleware, /\/api\/exchange\//);
assert.match(middleware, /\/api\/trade\//);
assert.match(middleware, /EDUCATION_ONLY_PAGE_PREFIXES/);
assert.match(middleware, /DISABLED_LEGACY_PUBLIC_ROUTES/);
assert.match(middleware, /'\/subscribe'/);
assert.match(middleware, /'\/api\/connect\/'/);
assert.match(middleware, /'\/api\/stripe\/checkout'/);
assert.match(middleware, /'\/dashboard\/referral'/);
assert.match(middleware, /'\/dashboard\/partenaire'/);
assert.match(middleware, /'\/dashboard\/settings\/abonnement'/);
assert.match(middleware, /'\/compte\/'/);
assert.match(middleware, /DISABLED_LEGACY_PUBLIC_PREFIXES/);
assert.match(middleware, /'\/go\/'/);
assert.match(middleware, /'\/scan\/'/);
assert.match(middleware, /'\/confirmation'/);
assert.match(home, /ne collecte aucune clé API/);
assert.doesNotMatch(home, /Pricing|Hero|HowItWorks|connexion exchange|trading automatisé/);
assert.match(dashboard, /Aucun conseil personnalisé/);
assert.doesNotMatch(dashboard, /PortfolioOverview|AutoTradeToggle|SignalsList|ReferralBlock/);
assert.match(cgu, /Aucun retrait monétaire/);
assert.match(cgv, /Aucun abonnement MIDAS distinct/);
assert.match(cgv, /CM2C/);
assert.match(privacy, /ne collecte aucune clé d(?:'|&apos;)exchange/);
assert.match(pricing, /aucun abonnement propre/);
assert.doesNotMatch(pricing, /39€|79€|Trading IA|<Pricing/);
assert.match(changelog, /ordres réels/);
assert.doesNotMatch(changelog, /trading autonome|Connexion multi-exchange|Plans Free/);
assert.doesNotMatch(chat, /Meilleur moment pour acheter|Analyse technique ETH cette semaine/);
assert.match(mobileRoot, /"\/settings\/exchanges"/);
assert.match(mobileRoot, /"\/help\/connect-binance"/);
assert.match(mobileTabs, /name="trading"[\s\S]*?href: null/);
assert.match(mobileTabs, /name="referral"[\s\S]*?href: null/);
assert.match(mobileDashboard, /Aucun conseil personnalis(?:e|é), signal, ordre r(?:e|é)el/);
assert.match(mobileDashboard, /Aucun achat ni lien d’achat/);
assert.match(mobileChat, /ni conseil personnalise, ni signal, ni recommandation/);
assert.doesNotMatch(mobileHelp, /Connecter Binance|trade depuis MIDAS/);
assert.doesNotMatch(mobileMarkets, /router\.push|\/analysis\//);
assert.doesNotMatch(mobileSettings, /Exchanges|Agents IA|Bots|Partenaire|Tirage/);
assert.match(mobileStore, /ne contient aucun achat ni lien d'achat/);
assert.doesNotMatch(mobileStore, /https?:\/\/[^"\s]*(?:subscribe|pricing|checkout)/i);

// --- Garde anti-régression emails sortants (D2=A / D4=A) ---
// Les deux pipelines d'emails actifs (cron email-sequence + cron
// retention-followup via lib/notifications/email.ts) ne doivent contenir
// ni remise commerciale, ni témoignage/chiffre de gain, ni CTA vers une
// page neutralisée par EDUCATION_ONLY_PAGE_PREFIXES.
assert.doesNotMatch(notifEmail, /-50%|-30%|-20%|settings\/abonnement|tes bots/);
assert.doesNotMatch(emailSequence, /-50%|-30%|-20%|dashboard\/signals|dashboard\/bots|dashboard\/settings\/abonnement|\+\d+\s*€/);

// --- Garde anti-régression crons : aucun cron planifié ne doit pointer
// vers un préfixe API neutralisé (403 middleware permanent, ex. fiscal-*).
const eduPrefixMatch = middleware.match(/EDUCATION_ONLY_API_PREFIXES = \[([\s\S]*?)\]/);
assert.ok(eduPrefixMatch, 'EDUCATION_ONLY_API_PREFIXES illisible');
const eduApiPrefixes = [...eduPrefixMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
assert.ok(eduApiPrefixes.length > 0);
const deadCrons = (vercelJson.crons ?? []).filter((cron) =>
  eduApiPrefixes.some((prefix) => cron.path === prefix || cron.path.startsWith(prefix)),
);
assert.deepEqual(deadCrons, [], `crons neutralisés déclarés: ${JSON.stringify(deadCrons)}`);

console.log('NIYAMA MIDAS D1=C D2=A: PASS');
