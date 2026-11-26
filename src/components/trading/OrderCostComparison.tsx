'use client';

import { useId, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { compareOrderCost, type CostQuote } from '@/lib/trading/order-cost-comparison';
import { formatPrice } from '@/lib/utils/formatters';

const examples: CostQuote[] = [
  { ask: '100,10', bid: '99,90', commission: '0', fees: '1' },
  { ask: '100,30', bid: '99,70', commission: '0,10', fees: '0' },
];
type QuoteField = Exclude<keyof CostQuote, 'saleCharges'>;
const fields: { key: QuoteField; label: string }[] = [
  { key: 'ask', label: 'Prix unitaire d’achat (€)' },
  { key: 'bid', label: 'Prix unitaire de vente (€)' },
  { key: 'commission', label: 'Commission par ordre (%)' },
  { key: 'fees', label: 'Autres frais par ordre (€)' },
];
const totals = [
  ['purchase', 'Achat · montant débité'],
  ['sale', 'Vente · produit net'],
  ['roundTrip', 'Coût de l’aller-retour'],
  ['spread', 'Dont écart des prix'],
] as const;

export interface QuoteContext {
  label: string;
  currency: 'EUR' | 'USD';
  unit: string;
}

export default function OrderCostComparison({ context }: { context?: QuoteContext }) {
  const currency = context?.currency ?? 'EUR';
  const currencyLabel = currency === 'EUR' ? '€' : 'USD';
  const id = useId();
  const [units, setUnits] = useState('1');
  const [quotes, setQuotes] = useState<CostQuote[]>(() => context
    ? examples.map(() => ({ ask: '', bid: '', commission: '0', fees: '0' }))
    : examples);
  const results = quotes.map(quote => compareOrderCost(units, quote));

  function updateQuote(index: number, changes: Partial<CostQuote>) {
    setQuotes(previous => previous.map((quote, i) => i === index ? { ...quote, ...changes } : quote));
  }

  return (
    <Card>
      <section id="comparer-les-couts" aria-labelledby={id + '-title'} tabIndex={-1} className="scroll-mt-6 p-4 sm:p-5">
        <h2 id={id + '-title'} className="text-base font-semibold text-[var(--text-primary)]">
          Comparer le coût de deux offres
        </h2>
        <p className="my-4 text-sm text-[var(--text-primary)]">
          {context
            ? `Simulation de ${context.label}. Saisis deux offres pour la même quantité. Chaque prix est en ${currency} par unité (${context.unit}).`
            : 'Exemple fictif en euros. Compare les prix du même actif au même instant pour la même quantité.'}
        </p>
        <div className="max-w-60">
          <label htmlFor={id + '-units'} className="mb-1 block text-sm">Quantité d’unités</label>
          <Input className="text-[var(--text-primary)]" id={id + '-units'} inputMode="decimal" value={units} onChange={e => setUnits(e.target.value)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {quotes.map((quote, index) => (
            <fieldset key={index} className="min-w-0 rounded-xl border border-white/15 p-3">
              <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">Offre {index === 0 ? 'A' : 'B'}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map(({ key, label }) => (
                  <div key={key} className="min-w-0 text-sm">
                    <label htmlFor={id + index + key} className="mb-1 block">
                      {(quote.saleCharges ? label.replace('par ordre', 'à l’achat') : label).replace('€', currencyLabel)}
                    </label>
                    <Input className="text-[var(--text-primary)]" id={id + index + key} inputMode="decimal" value={quote[key]} onChange={e => updateQuote(index, { [key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!quote.saleCharges} onChange={e => updateQuote(index, {
                  saleCharges: e.target.checked ? { commission: quote.commission, fees: quote.fees } : undefined,
                })} />
                Frais différents à la vente
              </label>
              {quote.saleCharges && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(['commission', 'fees'] as const).map(key => (
                    <div key={key} className="text-sm">
                      <label htmlFor={id + index + 'sale' + key} className="mb-1 block">
                        {key === 'commission' ? 'Commission à la vente (%)' : `Autres frais à la vente (${currencyLabel})`}
                      </label>
                      <Input className="text-[var(--text-primary)]" id={id + index + 'sale' + key} inputMode="decimal" value={quote.saleCharges?.[key]} onChange={e => updateQuote(index, {
                        saleCharges: { ...quote.saleCharges!, [key]: e.target.value },
                      })} />
                    </div>
                  ))}
                </div>
              )}
            </fieldset>
          ))}
        </div>
        <p className="my-3 text-xs text-[var(--text-secondary)]">
          Ajoute les taxes et frais externes connus dans « Autres frais » pour le sens concerné. Exprime les frais en {currency} et compte les frais de change une seule fois. Saisie jusqu’à 12 chiffres entiers et 8 décimales. Chaque montant d’ordre est arrondi au centime. L’aller-retour suppose des prix stables.
        </p>
        <div aria-live="polite" aria-atomic="true">
          {results.map((result, index) => result.error && (!context || quotes[index].ask || quotes[index].bid) && (
            <p key={index} className="my-2 text-sm text-amber-300">Offre {index === 0 ? 'A' : 'B'} · {result.error}</p>
          ))}
          <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <caption className="sr-only">Montants simulés pour les deux offres</caption>
            <thead className="text-[var(--text-secondary)]">
              <tr><th scope="col" className="w-[42%] py-2">Montants simulés</th><th scope="col">Offre A</th><th scope="col">Offre B</th></tr>
            </thead>
            <tbody>
              {totals.map(([key, label]) => (
                <tr key={key} className="border-t border-white/10">
                  <th scope="row" className="py-2 pr-1 font-normal">{label}</th>
                  {results.map((result, index) => (
                    <td key={index} className="break-words pr-1 tabular-nums">
                      {result.error ? '—' : formatPrice(result[key] / 100, currency)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {results.some(result => result.sale !== undefined && result.sale < 0) && (
            <p className="mt-2 text-sm text-amber-300">Un produit net négatif indique que les frais dépassent le montant de la vente.</p>
          )}
        </div>
      </section>
    </Card>
  );
}
