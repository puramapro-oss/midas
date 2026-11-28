'use client';

import { useState } from 'react';
import { readAmount } from '../../lib/trading/gain-allocation';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const euros = (cents: number) => currency.format(cents / 100);
const referencePrice = 12_000;
const priceDelivered = referencePrice - referencePrice / 10;
const cashbackCents = priceDelivered * 2 / 100;

export default function GainPurchaseExample({ shoppingBudgetCents }: { shoppingBudgetCents: number | null }) {
  const [availability, setAvailability] = useState('available');
  const [funded, setFunded] = useState(true);
  const [alternative, setAlternative] = useState('104');
  const available = availability === 'available';
  const cashback = available && funded ? cashbackCents : 0;
  const netPrice = priceDelivered - cashback;
  const otherPrice = readAmount(alternative);
  const difference = otherPrice === null ? null : otherPrice - netPrice;
  const control = 'min-h-11 w-full rounded-lg border border-white/30 bg-slate-950 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-teal-300';

  return (
    <section aria-labelledby="purchase-example-heading" className="mt-7 space-y-4 border-t border-white/20 pt-6">
      <h3 id="purchase-example-heading" className="text-lg font-semibold">Comparer un achat</h3>
      <p className="text-sm text-slate-300">Panier fictif à {euros(referencePrice)} livraison incluse, avec une remise de 10 % déjà accordée par le marchand dans cet exemple. La même offre s’applique avec une carte ou avec le budget achats.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm font-medium">
          <span>Situation du panier fictif</span>
          <select className={control} value={availability} onChange={event => setAvailability(event.target.value)}>
            <option value="available">Article disponible</option>
            <option value="unavailable">Article indisponible</option>
            <option value="cancelled">Panier annulé avant paiement</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Prix livré d’une offre comparable (€)</span>
          <input className={control} type="text" inputMode="decimal" maxLength={11}
            value={alternative} onChange={event => setAlternative(event.target.value)} />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={funded} onChange={event => setFunded(event.target.checked)} />
        Le marchand finance un cashback de 2 % sur ce panier fictif.
      </label>
      <div aria-live="polite" className="space-y-2 rounded-xl bg-slate-950 p-4">
        {!available ? (
          <p>{availability === 'cancelled' ? 'Panier annulé.' : 'Article indisponible.'} Paiement et cashback simulés de {euros(0)}.
            {shoppingBudgetCents !== null && <> Budget achats conservé en totalité, soit {euros(shoppingBudgetCents)}.</>}
          </p>
        ) : (
          <>
            <dl className="space-y-2">
              <div className="flex justify-between gap-4"><dt>À payer maintenant, livraison comprise</dt><dd>{euros(priceDelivered)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Cashback après validation de l’achat</dt><dd>{euros(cashback)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Coût final après cashback acquis</dt><dd>{euros(netPrice)}</dd></div>
              {shoppingBudgetCents !== null && (
                <div className="flex justify-between gap-4"><dt>Complément pour payer maintenant</dt><dd>{euros(Math.max(0, priceDelivered - shoppingBudgetCents))}</dd></div>
              )}
            </dl>
            {shoppingBudgetCents === null && <p>Complétez la répartition pour chiffrer le complément à payer.</p>}
            {difference === null ? (
              <p>Renseignez un prix livré pour comparer les deux paniers.</p>
            ) : (
              <p>{difference === 0 ? 'Les deux paniers ont le même coût final.' :
                `Après prise en compte du cashback indiqué, ${difference < 0 ? 'l’offre comparable' : 'le panier PURAMA'} coûte ${euros(Math.abs(difference))} de moins.`}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
