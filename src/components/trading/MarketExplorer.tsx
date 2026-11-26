'use client';

import { useState, useSyncExternalStore } from 'react';
import InvestmentModeActions from './InvestmentModeActions';
import OrderCostComparison, { type QuoteContext } from './OrderCostComparison';

interface Instrument {
  symbol: string;
  name: string;
  family: string;
  unit?: string;
  currency?: QuoteContext['currency'];
  note?: string;
}

const instruments: Instrument[] = [
  { symbol: 'AAPL', name: 'Apple', family: 'Actions', unit: 'action', currency: 'USD' },
  { symbol: 'AIR', name: 'Airbus', family: 'Actions', unit: 'action', currency: 'EUR' },
  { symbol: 'CW8', name: 'Amundi MSCI World Swap UCITS ETF EUR Acc', family: 'ETF', unit: 'part', currency: 'EUR' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', family: 'ETF', unit: 'part', currency: 'USD' },
  { symbol: 'EUR/USD', name: 'Euro / Dollar américain', family: 'Forex', unit: 'euro', currency: 'USD', note: 'Change au comptant. Un cours de 1,10 signifie 1,10 dollar pour un euro. Les produits forex à levier ont des coûts et des risques différents.' },
  { symbol: 'GBP/EUR', name: 'Livre sterling / Euro', family: 'Forex', unit: 'livre sterling', currency: 'EUR', note: 'Change au comptant. Le prix indique le nombre d’euros pour une livre sterling. La simulation exclut marge, intérêts et effet de levier.' },
  { symbol: 'BTC/EUR', name: 'Bitcoin', family: 'Cryptos', unit: 'bitcoin', currency: 'EUR' },
  { symbol: 'ETH/EUR', name: 'Ethereum · ether', family: 'Cryptos', unit: 'ether', currency: 'EUR' },
  { symbol: 'OAT', name: 'Dette de l’État français', family: 'Obligations', note: 'Pour comparer deux offres, il faut identifier la même émission, son nominal, son échéance et le coupon couru. Cette fiche présente la famille de titres.' },
  { symbol: 'CAC 40', name: 'Indice des actions françaises', family: 'Indices', note: 'Un indice mesure un marché. Pour y être exposé, il faut choisir un instrument qui le suit et comparer les frais de cet instrument.' },
  { symbol: 'XAU', name: 'Or', family: 'Matières premières', note: 'Le métal physique, un produit coté adossé à l’or et un contrat à terme ont des modalités de détention, de livraison et de coût différentes.' },
  { symbol: 'CFD', name: 'Contrats sur différence', family: 'Dérivés', note: 'Un CFD donne une exposition par contrat. Son financement et son effet de levier nécessitent un calcul spécifique. Cette fiche est consultable uniquement.' },
];

const families = ['Tous', ...new Set(instruments.map(item => item.family))];
function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesFilter(item: Instrument, family: string, query: string) {
  return (family === 'Tous' || item.family === family)
    && [item.name, item.symbol, item.family].some(value => normalize(value).includes(normalize(query)));
}

const favoriteKey = 'midas-favori-marche';

function readFavorite() {
  try { return localStorage.getItem(favoriteKey); } catch { return null; }
}

function subscribeFavorite(notify: () => void) {
  window.addEventListener('storage', notify);
  window.addEventListener(favoriteKey, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(favoriteKey, notify);
  };
}

export default function MarketExplorer() {
  const symbol = useSyncExternalStore(subscribeFavorite, readFavorite, () => null);
  const favorite = instruments.find(item => item.symbol === symbol);
  const [storageMessage, setStorageMessage] = useState('');

  function toggleFavorite(item: Instrument) {
    const remove = item.symbol === favorite?.symbol;
    try {
      if (remove) localStorage.removeItem(favoriteKey);
      else localStorage.setItem(favoriteKey, item.symbol);
      window.dispatchEvent(new Event(favoriteKey));
      setStorageMessage('');
    } catch {
      setStorageMessage('Le navigateur ne permet pas d’enregistrer le favori sur cet appareil.');
    }
  }
  const [family, setFamily] = useState('Tous');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Instrument>();
  const matches = instruments.filter(item => matchesFilter(item, family, query));
  function filter(nextFamily: string, nextQuery: string) {
    setFamily(nextFamily);
    setQuery(nextQuery);
    if (selected && !matchesFilter(selected, nextFamily, nextQuery)) setSelected(undefined);
  }
  const context = selected?.currency && selected.unit
    ? { label: selected.symbol, currency: selected.currency, unit: selected.unit }
    : undefined;

  return (
    <div className="space-y-8">
      <section id="marches" aria-labelledby="titre-marches" className="space-y-4">
        <h2 id="titre-marches" className="text-2xl font-semibold">Marchés</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grow text-sm">Rechercher un instrument
            <input type="search" value={query} onChange={e => filter(family, e.target.value)}
              placeholder="Nom ou symbole, par exemple EUR/USD" className="mt-1 block min-h-11 w-full rounded-xl border border-white/25 bg-[#101722] px-3" />
          </label>
          <label className="text-sm">Marché
            <select value={family} onChange={e => filter(e.target.value, query)} className="mt-1 block min-h-11 rounded-xl border border-white/25 bg-[#101722] px-3">
              {families.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>
        {favorite && <a className="inline-block text-sm text-violet-200 underline" href="#fiche-instrument" onClick={() => { setFamily('Tous'); setQuery(favorite.symbol); setSelected(favorite); }}>Mon favori · {favorite.symbol}</a>}
        <p aria-live="polite" className="text-sm text-white/70">{matches.length ? `${matches.length} fiche${matches.length > 1 ? 's' : ''} disponible${matches.length > 1 ? 's' : ''}` : 'Aucun résultat. Essaie un autre symbole ou change de marché.'}</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map(item => (
            <li key={item.symbol}>
              <a href="#fiche-instrument" aria-label={`${item.family} ${item.symbol} ${item.name}`} onClick={() => setSelected(item)} className="block rounded-xl border border-white/15 p-3 hover:border-violet-400 focus-visible:outline-violet-400">
                <span className="block text-xs text-white/65">{item.family}</span>
                <strong>{item.symbol}</strong>
                <span className="ml-2 text-sm">{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
        <div id="fiche-instrument" tabIndex={-1} className="scroll-mt-5" aria-live="polite">
          {selected && <div className="rounded-xl border border-violet-400/40 px-5 py-4">
            <h3 className="text-lg font-semibold">{selected.name} · {selected.symbol}</h3>
            <button type="button" aria-pressed={favorite?.symbol === selected.symbol} onClick={() => toggleFavorite(selected)} className="my-2 text-sm text-violet-200 underline">
              {favorite?.symbol === selected.symbol ? 'Retirer des favoris' : 'Définir comme favori sur cet appareil'}
            </button>
            {storageMessage && <p role="status" className="text-sm">{storageMessage}</p>}
            {selected.note && <p className="mt-1 text-sm text-white/75">{selected.note}</p>}
            {context && <p className="mt-1 text-sm">Prix en {context.currency} pour une unité ({context.unit}). <a className="underline" href="#comparer-les-couts">Comparer les offres pour {selected.symbol}</a></p>}
          </div>}
        </div>
      </section>
      <section aria-labelledby="modes-investissement" className="space-y-4">
        <h2 id="modes-investissement" className="text-2xl font-semibold">Manuel ou automatique</h2>
        <InvestmentModeActions comparisonAvailable={!selected || !!context} />
        {(!selected || context) && <OrderCostComparison key={context?.label ?? 'exemple'} context={context} />}
      </section>
    </div>
  );
}
