import { projectGainHistory, type AnnualProjection, type FirstYear } from './gain-allocation.ts';

const columns: ReadonlyArray<readonly [keyof (FirstYear & AnnualProjection), string]> = [
  ['realized', 'Résultat réalisé saisi (€)'],
  ['earlierLoss', 'Pertes réalisées saisies séparément (€)'],
  ['marketCosts', 'Frais de marché supplémentaires (€)'],
  ['subscription', 'Abonnement imputable de l’année (€)'],
  ['openPnl', 'Résultat latent à la clôture (€)'],
  ['target', 'Objectif annuel ajusté (€)'],
  ['realizedNet', 'Résultat réalisé net de l’année (€)'],
  ['annualEconomicGain', 'Résultat économique de l’année avant commission (€)'],
  ['economicGain', 'Résultat économique cumulé avant commissions (€)'],
  ['previousHigh', 'Sommet avant cet arrêté (€)'],
  ['highWaterMark', 'Sommet après cet arrêté (€)'],
  ['lossToRecover', 'Pertes restant à rattraper (€)'],
  ['feeBase', 'Base de commission de l’année (€)'],
  ['cumulativeFeeBase', 'Bases de commission cumulées (€)'],
  ['fee', 'Commission simulée de l’année à 3 % (€)'],
  ['totalFees', 'Commissions simulées cumulées (€)'],
  ['annualNetGain', 'Résultat net de l’année après commission (€)'],
  ['netGain', 'Résultat net cumulé après commissions (€)'],
];

function decimalEuros(cents: number): string {
  const digits = Math.abs(cents).toString().padStart(3, '0');
  return (cents < 0 ? '-' : '') + digits.slice(0, -2) + ',' + digits.slice(-2);
}

export function buildGainStatementCsv(years: readonly FirstYear[]): string {
  const header = ['Simulation MIDAS · Année', ...columns.map(([, label]) => label)];
  const lines = [header.join(';')];
  for (const [index, projection] of projectGainHistory(years).entries()) {
    const entry = { ...years[index], ...projection };
    const amounts = columns.map(([key]) => decimalEuros(entry[key]));
    lines.push([String(index + 1), ...amounts].join(';'));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
