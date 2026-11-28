'use client';

import { useId, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { compareOrderCost, previewOrderCost, type CostQuote, type OrderSide } from '@/lib/trading/order-cost-comparison';
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
  const [view, setView] = useState<OrderSide | 'compare'>('compare');
  const [offerIndex, setOfferIndex] = useState(0);
  const [units, setUnits] = useState('1');
  const [quotes, setQuotes] = useState<CostQuote[]>(() => context
    ? examples.map(() => ({ ask: '', bid: '', commission: '0', fees: '0' }))
    : examples);
  const results = view === 'compare' ? quotes.map(quote => compareOrderCost(units, quote)) : [];
  const selectedQuote = quotes[offerIndex];
  const ticket = view !== 'compare' ? previewOrderCost(units, selectedQuote, view) : undefined;
  const visibleFields = fields.filter(({ key }) =>
    !(key === 'bid' && view === 'buy') && !(key === 'ask' && view === 'sell'));

  function updateQuote(index: number, changes: Partial<CostQuote>) {
    setQuotes(previous => previous.map((quote, i) => i === index ? { ...quote, ...changes } : quote));
  }

  function updateField(index: number, key: QuoteField, value: string) {
    const quote = quotes[index];
    if (view === 'sell' && (key === 'commission' || key === 'fees')) {
      updateQuote(index, { saleCharges: {
        commission: quote.saleCharges?.commission ?? quote.commission,
        fees: quote.saleCharges?.fees ?? quote.fees,
        [key]: value,
      } });
    } else {
      updateQuote(index, { [key]: value });
    }
  }

  return (
    <Card>
      <section id="comparer-les-couts" aria-labelledby={id + '-title'} tabIndex={-1} className="scroll-mt-6 p-4 sm:p-5">
        <h2 id={id + '-title'} className="text-base font-semibold text-[var(--text-primary)]">
          Comparer le coût de deux offres
        </h2>
        <p className="my-4 text-sm text-[var(--text-primary)]">
          {context
            ? `Simulation de ${context.label}. Utilise les prix de tes offres. Chaque prix est en ${currency} par unité (${context.unit}).`
            : 'Exemple fictif en euros. Compare les prix du même actif au même instant pour la même quantité.'}
        </p>
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm">Quelle opération veux-tu simuler ?</legend>
          <div className="flex flex-wrap gap-2">
            {([['compare', 'Aller-retour'], ['buy', 'Achat'], ['sell', 'Vente']] as const).map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/25 px-3 text-sm">
                <input type="radio" name={id + '-view'} checked={view === value} onChange={() => setView(value)} />{label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-4">
        <div className="max-w-60">
            <label htmlFor={id + '-units'} className="mb-1 block text-sm">Quantité d’unités</label>
            <Input className="text-[var(--text-primary)]" id={id + '-units'} inputMode="decimal" value={units} onChange={e => setUnits(e.target.value)} />
        </div>
        {view !== 'compare' && <label className="text-sm">Offre simulée
          <select value={offerIndex} onChange={e => setOfferIndex(Number(e.target.value))}
            className="mt-1 block min-h-11 rounded-lg border border-white/25 bg-[#101722] px-3 text-white">
            <option value={0}>Offre A</option><option value={1}>Offre B</option>
          </select>
        </label>}
        </div>
        <div className={view === 'compare' ? 'mt-4 grid gap-4 md:grid-cols-2' : 'mt-4'}>
          {quotes.map((quote, index) => (view === 'compare' || index === offerIndex) && (
            <fieldset key={index} className="min-w-0 rounded-xl border border-white/15 p-3">
              <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">Offre {index === 0 ? 'A' : 'B'}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleFields.map(({ key, label }) => (
                  <div key={key} className="min-w-0 text-sm">
                    <label htmlFor={id + index + key} className="mb-1 block">
                      {(view === 'sell' ? label.replace('par ordre', 'à la vente') : quote.saleCharges ? label.replace('par ordre', 'à l’achat') : label).replace('€', currencyLabel)}
                    </label>
                    <Input className="text-[var(--text-primary)]" id={id + index + key} inputMode="decimal" value={view === 'sell' && (key === 'commission' || key === 'fees') ? (quote.saleCharges ?? quote)[key] : quote[key]} onChange={e => updateField(index, key, e.target.value)} />
                  </div>
                ))}
              </div>
              {view === 'compare' && <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!quote.saleCharges} onChange={e => updateQuote(index, {
                  saleCharges: e.target.checked ? { commission: quote.commission, fees: quote.fees } : undefined,
                })} />
                Frais différents à la vente
              </label>}
              {view === 'compare' && quote.saleCharges && (
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
          Ajoute les taxes et frais externes connus dans « Autres frais » pour le sens concerné. Exprime les frais en {currency} et compte les frais de change une seule fois. Saisie jusqu’à 12 chiffres entiers et 8 décimales. Le brut et le net sont arrondis au centime. Les frais affichés correspondent à leur différence. L’aller-retour suppose des prix stables.
        </p>
        <div aria-live="polite" aria-atomic="true">
          {results.map((result, index) => result.error && (!context || quotes[index].ask || quotes[index].bid) && (
            <p key={index} className="my-2 text-sm text-amber-300">Offre {index === 0 ? 'A' : 'B'} · {result.error}</p>
          ))}
          {view !== 'compare' && ticket && (
            <section aria-label="Récapitulatif simulé" className="space-y-2 rounded-xl border border-white/15 p-4">
              <h3 className="font-semibold">{view === 'buy' ? 'Achat simulé' : 'Vente simulée'} · {context?.label ?? 'Exemple fictif'} · Offre {offerIndex === 0 ? 'A' : 'B'}</h3>
              {ticket.error !== undefined ? <p className="text-sm">{ticket.error}</p> : <>
                <p className="text-sm">Quantité : {units} ({context?.unit ?? 'unité'}). Prix unitaire : {view === 'buy' ? selectedQuote.ask : selectedQuote.bid} {currency}.</p>
                <dl className="space-y-1 text-sm tabular-nums">
                  {([
                    ['Montant brut', ticket.gross], ['Frais totaux après arrondi', ticket.totalFees],
                    [view === 'buy' ? 'Montant à débiter' : 'Produit net de vente', ticket.net],
                  ] as const).map(([label, amount]) => <div key={label} className="flex flex-wrap justify-between gap-2">
                    <dt>{label}</dt><dd>{formatPrice(amount / 100, currency)}</dd>
                  </div>)}
                </dl>
                {view === 'sell' && ticket.net < 0 && <p className="text-sm text-amber-300">Les frais dépassent le montant de la vente.</p>}
              </>}
            </section>
          )}
          {view === 'compare' && <table className="w-full table-fixed text-left text-xs sm:text-sm">
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
          </table>}
          {results.some(result => result.sale !== undefined && result.sale < 0) && (
            <p className="mt-2 text-sm text-amber-300">Un produit net négatif indique que les frais dépassent le montant de la vente.</p>
          )}
        </div>
      </section>
    </Card>
  );
}
