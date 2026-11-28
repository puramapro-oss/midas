'use client';

import { useRef, useState } from 'react';
import { buildGainStatementCsv } from '../../lib/trading/gain-statement';
import GainPurchaseExample from './GainPurchaseExample';
import { allocateGain, destinations, projectGainHistory, readAmount, type Allocation, type FirstYear } from '../../lib/trading/gain-allocation';

const fields = [
  ['realized', 'Résultat réalisé des opérations retenues (€)', 'Total des gains et pertes clôturés sur le mandat, avant les coûts saisis ci-dessous.'],
  ['marketCosts', 'Frais de marché à déduire (€)', 'Uniquement les frais encore absents du résultat réalisé.'],
  ['subscription', 'Abonnement imputable payé sur l’année (€)', 'Total du fixe nécessaire au trading, y compris les sommes payées depuis un autre compte.'],
  ['earlierLoss', 'Pertes réalisées cette année et absentes du premier montant (€)', 'Pertes réalisées pendant cette année, absentes de la première ligne. Les pertes des années enregistrées sont reprises automatiquement.'],
  ['openPnl', 'Résultat latent net (€)', 'Les pertes ouvertes réduisent la base. Un gain encore ouvert attend sa réalisation.'],
  ['target', 'Objectif contractuel ajusté sur l’année (€)', 'Gain exigé au cours de cette année, après neutralisation des apports et des retraits.'],
] as const;

const names = { bank: 'Retrait vers ma banque', savings: 'Épargne', investment: 'Investir ailleurs', shopping: 'Achats PURAMA' };
const destinationNotes = {
  bank: 'Jusqu’à 100 % vers votre banque. Frais et délais à vérifier avant un retrait réel.',
  savings: 'Un objectif d’épargne peut rester un simple budget. Pour un dépôt, vérifier la banque partenaire, le taux, les conditions de sortie et la protection applicable.',
  investment: 'Placement au choix, y compris hors PURAMA. Le capital peut perdre de la valeur. Vérifier frais et liquidité.',
  shopping: 'Budget pour un achat au prix livré. Aucun article ni stock proposé ici. Un cashback éventuel dépend d’une offre financée et de son acquisition.',
};
const startingValues = { realized: '100', marketCosts: '0', subscription: '10', earlierLoss: '0', openPnl: '0', target: '0', cash: '87,30' };
const blankShares = { bank: '0', savings: '0', investment: '0', shopping: '0' };
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const format = (cents: number) => money.format(cents / 100);
const fieldStyle = 'mt-1 block w-full rounded-lg border border-white/30 bg-slate-950 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-teal-300';

type Entry = { values: typeof startingValues; shares: typeof blankShares };
const emptyValues = { ...startingValues, realized: '', subscription: '', cash: '' };
const controlStyle = 'min-h-11 rounded-lg border border-white/30 px-3 disabled:opacity-50';

function parseYear(values: typeof startingValues) {
  const parsed = {} as FirstYear;
  for (const [name] of fields) {
    const amount = readAmount(values[name], name === 'realized' || name === 'openPnl');
    if (amount === null) return null;
    parsed[name] = amount;
  }
  return parsed;
}

export default function GainAllocationSimulator() {
  const firstAmount = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<FirstYear[]>([]);
  const [draft, setDraft] = useState<Entry>({ values: startingValues, shares: blankShares });
  const [revision, setRevision] = useState<{ index: number; entry: Entry } | null>(null);
  const [notice, setNotice] = useState('');
  const entry = revision?.entry ?? draft;
  const { values, shares } = entry;
  const yearIndex = revision?.index ?? history.length;
  const year = parseYear(values);
  const closed = projectGainHistory(history);
  const result = year ? projectGainHistory([...history.slice(0, yearIndex), year]).at(-1) : null;

  function update(entry: Entry) {
    if (revision) setRevision({ ...revision, entry });
    else setDraft(entry);
  }

  const setValues = (values: Entry['values']) => update({ shares, values });
  const setShares = (shares: Entry['shares']) => update({ values, shares });

  function save() {
    if (!year) return;
    requestAnimationFrame(() => firstAmount.current?.focus());
    if (revision) {
      setHistory(history.map((item, index) => index === revision.index ? year : item));
      setRevision(null);
      setDraft({ values: { ...draft.values, cash: '' }, shares: blankShares });
      setNotice(`Année ${yearIndex + 1} corrigée. Les exercices suivants ont été recalculés. Confirmez de nouveau la trésorerie du brouillon.`);
    } else {
      setHistory([...history, year]);
      setDraft({ values: emptyValues, shares: blankShares });
      setNotice(`Année ${yearIndex + 1} enregistrée. Saisissez les montants de la nouvelle année.`);
    }
  }

  function edit(index: number) {
    requestAnimationFrame(() => firstAmount.current?.focus());
    const restored = { ...emptyValues };
    for (const [key] of fields) restored[key] = String(history[index][key] / 100).replace('.', ',');
    setRevision({ index, entry: { values: restored, shares: blankShares } });
    setNotice(`Correction de l’année ${index + 1}. La trésorerie et les choix de répartition sont à renseigner pour cette projection.`);
  }

  function downloadStatement() {
    const csv = buildGainStatementCsv(history);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MIDAS-simulation-arretes.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function undoLast() {
    setHistory(history.slice(0, -1));
    setDraft({ values: { ...draft.values, cash: '' }, shares: blankShares });
    setNotice(`Arrêté de l’année ${history.length} annulé. Le brouillon porte désormais sur l’année ${history.length}. Confirmez sa trésorerie et sa répartition.`);
  }

  const cash = readAmount(values.cash);
  const percent = {} as Allocation;
  for (const destination of destinations) {
    percent[destination] = /^\d{1,3}$/.test(shares[destination]) ? Number(shares[destination]) : NaN;
  }
  const validShares = destinations.every(key => percent[key] >= 0 && percent[key] <= 100)
    && Object.values(percent).reduce((sum, value) => sum + value, 0) <= 100;
  const allocation = result && cash !== null && validShares ? allocateGain(Math.min(result.annualNetGain, result.netGain), cash, percent) : null;

  return (
    <section aria-labelledby="gain-heading" className="rounded-2xl border border-white/15 bg-slate-900 p-5 text-left sm:p-8">
      <h2 id="gain-heading" className="text-2xl font-semibold">Simuler mes frais et répartir mon gain</h2>
      <p className="mt-2 text-slate-300">Simulation annuelle en euros, avant impôt personnel. Les calculs restent dans cette page et se réinitialisent à son rechargement.</p>
      <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Année {yearIndex + 1} · {revision ? 'Corriger le calcul annuel' : 'Calculer le résultat sur douze mois'}</legend>
        {fields.map(([key, label, hint]) => (
          <label key={key} className="block text-sm font-medium">{label}
            <input ref={key === 'realized' ? firstAmount : undefined} className={fieldStyle} type="text" inputMode="decimal" maxLength={12} value={values[key]}
              aria-describedby={'gain-hint-' + key}
              onChange={event => setValues({ ...values, [key]: event.target.value })} />
            <span className="mt-1 block font-normal text-slate-300" id={'gain-hint-' + key}>{hint}</span>
          </label>
        ))}
      </fieldset>
      <p className="mt-4 text-sm text-slate-300">Le taux de 3 % porte sur le nouveau gain net au-dessus de l’objectif. Le capital, les dépôts et les retraits sont exclus. Le fixe de l’exemple est une hypothèse et reste compté en cas de perte.</p>
      {result ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-950 p-4 sm:grid-cols-2" aria-live="polite">
          {([
            ['Résultat réalisé après frais et fixe', result.realizedNet],
            ['Variation économique de l’année', result.annualEconomicGain],
            ['Sommet avant cet arrêté', result.previousHigh],
            ['Résultat économique cumulé', result.economicGain],
            ['Pertes restant à rattraper', result.lossToRecover],
            ['Base des 3 %', result.feeBase],
            ['Commission de performance estimée', result.fee],
            ['Résultat de l’année après tous les frais', result.annualNetGain],
            ['Résultat cumulé après tous les frais', result.netGain],
          ] as const).map(([label, amount]) => <div key={label}><dt className="text-sm text-slate-300">{label}</dt><dd className="font-semibold">{format(amount)}</dd></div>)}
        </dl>
      ) : <p className="mt-4 text-amber-200" role="status">Calcul en attente. Complétez les montants de cette année, dont l’abonnement imputable (0 si aucun), avec au plus huit chiffres et deux décimales.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={controlStyle} onClick={save} disabled={!result}>
          {revision ? 'Appliquer la correction' : `Enregistrer l’arrêté de l’année ${yearIndex + 1}`}
        </button>
        {revision && <button type="button" className={controlStyle} onClick={() => {
          setRevision(null);
          setNotice('Correction abandonnée. Le brouillon courant est conservé.');
        }}>Abandonner la correction</button>}
      </div>
      <p className="mt-2 text-sm text-slate-300">L’arrêté enregistre le calcul annuel dans la simulation. Les choix de répartition restent des essais, sans retrait, placement ni achat.</p>
      <p role="status" className="mt-2 text-sm">{notice}</p>
      {closed.length > 0 && (
        <section aria-labelledby="gain-history-title" className="mt-6 space-y-3">
          <h3 id="gain-history-title" className="font-semibold">Arrêtés enregistrés</h3>
          <ol className="space-y-2">
            {closed.map((row, index) => (
              <li key={index} className="rounded-xl border border-white/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong>Année {index + 1}</strong>
                  <button type="button" className={controlStyle} disabled={revision !== null} onClick={() => edit(index)}>Corriger l’année {index + 1}</button>
                </div>
                <p className="mt-1 text-sm">Commission {format(row.fee)} · cumul des commissions {format(row.totalFees)} · pertes à rattraper {format(row.lossToRecover)}.</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={controlStyle} onClick={downloadStatement}>Télécharger les arrêtés enregistrés (CSV)</button>
            <button type="button" className={controlStyle} disabled={revision !== null} onClick={undoLast}>Annuler le dernier arrêté</button>
          </div>
        </section>
      )}
      <fieldset className="mt-7 space-y-4">
        <legend className="mb-2 font-semibold">Répartir le gain de l’année {yearIndex + 1}</legend>
        <label className="block text-sm font-medium">Trésorerie effectivement disponible après frais (€)
          <input className={fieldStyle} type="text" inputMode="decimal" maxLength={11} value={values.cash}
            aria-describedby="gain-cash-hint" onChange={event => setValues({ ...values, cash: event.target.value })} />
          <span id="gain-cash-hint" className="mt-1 block font-normal text-slate-300">Après frais, marge, réservations et transferts déjà réalisés. La somme à répartir respecte le gain net positif de l’année, le gain net cumulé et les fonds disponibles indiqués pour cet exercice.</span>
        </label>
        <p className="text-sm text-slate-300">Chaque choix est facultatif. Les parts non attribuées et les fractions de centime restent disponibles.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {destinations.map(key => <label key={key} className="block text-sm font-medium">{names[key]} (%)
            <input className={fieldStyle} type="text" inputMode="numeric" maxLength={3} value={shares[key]}
              aria-describedby={'gain-destination-' + key} onChange={event => setShares({ ...shares, [key]: event.target.value })} />
            <span className="mt-1 block font-normal text-slate-300" id={'gain-destination-' + key}>{destinationNotes[key]}</span>
          </label>)}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="min-h-11 rounded-lg border border-white/30 px-3" onClick={() => setShares({ bank: '40', savings: '30', investment: '20', shopping: '10' })}>Essayer 40 / 30 / 20 / 10 %</button>
          <button type="button" className="min-h-11 rounded-lg border border-white/30 px-3" onClick={() => setShares(blankShares)}>Tout garder disponible</button>
        </div>
      </fieldset>
      <div className="mt-4 rounded-xl bg-slate-950 p-4" aria-live="polite">
        {allocation ? <dl className="space-y-2">
          <div className="flex justify-between gap-4 font-semibold"><dt>Gain disponible à répartir</dt><dd>{format(allocation.available)}</dd></div>
          {destinations.map(key => <div className="flex justify-between gap-4" key={key}><dt>{names[key]}</dt><dd>{format(allocation.amounts[key])}</dd></div>)}
          <div className="flex justify-between gap-4 border-t border-white/20 pt-2 font-semibold"><dt>Solde sans affectation</dt><dd>{format(allocation.unassigned)}</dd></div>
        </dl> : <p>{!result ? 'La répartition attend le calcul du gain.' : cash === null ? 'Renseignez la trésorerie disponible pour calculer la répartition.' : 'Saisissez des pourcentages entiers de 0 à 100 dont le total ne dépasse pas 100 %.'}</p>}
      </div>
      <p className="mt-4 text-sm text-slate-300">Une part prévue pour des achats reste un budget. Un prix, une disponibilité et un avantage financé doivent être vérifiés par Commerce. À panier et droits identiques, le prix et les avantages sont indépendants du moyen de paiement. Le budget disponible exclut les remises et récompenses éventuelles.</p>
      <GainPurchaseExample shoppingBudgetCents={allocation?.amounts.shopping ?? null} />
    </section>
  );
}
