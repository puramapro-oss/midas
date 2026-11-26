'use client';

import { useState } from 'react';
import GainPurchaseExample from './GainPurchaseExample';
import { allocateGain, destinations, projectFirstYear, readAmount, type Allocation, type FirstYear } from '../../lib/trading/gain-allocation';

const fields = [
  ['realized', 'Résultat réalisé des opérations retenues (€)', 'Total des gains et pertes clôturés sur le mandat, avant les coûts saisis ci-dessous.'],
  ['marketCosts', 'Frais de marché à déduire (€)', 'Uniquement les frais encore absents du résultat réalisé.'],
  ['subscription', 'Abonnement imputable payé sur l’année (€)', 'Total du fixe nécessaire au trading, y compris les sommes payées depuis un autre compte.'],
  ['earlierLoss', 'Pertes antérieures à rattraper (€)', 'Pertes du même mandat dans cette première année, déjà réalisées et absentes de la première ligne.'],
  ['openPnl', 'Résultat latent net (€)', 'Les pertes ouvertes réduisent la base. Un gain encore ouvert attend sa réalisation.'],
  ['target', 'Objectif contractuel ajusté sur l’année (€)', 'Surplus exigé au-dessus du point de départ, après neutralisation des apports et retraits.'],
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

function calculate(values: typeof startingValues) {
  const parsed = {} as FirstYear;
  for (const [name] of fields) {
    const amount = readAmount(values[name], name === 'realized' || name === 'openPnl');
    if (amount === null) return null;
    parsed[name] = amount;
  }
  return projectFirstYear(parsed);
}

export default function GainAllocationSimulator() {
  const [values, setValues] = useState(startingValues);
  const [shares, setShares] = useState(blankShares);
  const result = calculate(values);
  const cash = readAmount(values.cash);
  const percent = {} as Allocation;
  for (const destination of destinations) {
    percent[destination] = /^\d{1,3}$/.test(shares[destination]) ? Number(shares[destination]) : NaN;
  }
  const validShares = destinations.every(key => percent[key] >= 0 && percent[key] <= 100)
    && Object.values(percent).reduce((sum, value) => sum + value, 0) <= 100;
  const allocation = result && cash !== null && validShares ? allocateGain(result.netGain, cash, percent) : null;

  return (
    <section aria-labelledby="gain-heading" className="rounded-2xl border border-white/15 bg-slate-900 p-5 text-left sm:p-8">
      <h2 id="gain-heading" className="text-2xl font-semibold">Simuler mes frais et répartir mon gain</h2>
      <p className="mt-2 text-slate-300">Premier arrêté annuel fictif, en euros, avant impôt personnel. Les montants restent dans ce navigateur. Cet exercice ne passe aucun ordre, achat ou transfert.</p>
      <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">1. Calculer le résultat sur douze mois</legend>
        {fields.map(([key, label, hint]) => (
          <label key={key} className="block text-sm font-medium">{label}
            <input className={fieldStyle} type="text" inputMode="decimal" maxLength={12} value={values[key]}
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
            ['Résultat après prise en compte des pertes ouvertes', result.economicGain],
            ['Pertes restant à rattraper', result.lossToRecover],
            ['Base des 3 %', result.feeBase],
            ['Commission de performance estimée', result.fee],
            ['Résultat après tous les frais', result.netGain],
          ] as const).map(([label, amount]) => <div key={label}><dt className="text-sm text-slate-300">{label}</dt><dd className="font-semibold">{format(amount)}</dd></div>)}
        </dl>
      ) : <p className="mt-4 text-amber-200" role="status">Calcul en attente. Complétez chaque montant avec au plus huit chiffres et deux décimales.</p>}
      <fieldset className="mt-7 space-y-4">
        <legend className="mb-2 font-semibold">2. Choisir la destination de mon gain</legend>
        <label className="block text-sm font-medium">Trésorerie effectivement disponible après frais (€)
          <input className={fieldStyle} type="text" inputMode="decimal" maxLength={11} value={values.cash}
            aria-describedby="gain-cash-hint" onChange={event => setValues({ ...values, cash: event.target.value })} />
          <span id="gain-cash-hint" className="mt-1 block font-normal text-slate-300">Après frais, marge, réservations et transferts déjà réalisés. La somme à répartir est plafonnée au gain net positif et à cette trésorerie.</span>
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
