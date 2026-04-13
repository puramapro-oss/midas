'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Coins, Tag, Ticket, Sparkles, Gift, ArrowRight } from 'lucide-react';
import type { ShopItem } from '@/types/database';

const CATEGORY_ICONS: Record<string, typeof Coins> = {
  reduction: Tag,
  subscription: Sparkles,
  ticket: Ticket,
  feature: Gift,
  cash: Coins,
};

const CATEGORY_LABELS: Record<string, string> = {
  reduction: 'Réductions',
  subscription: 'Abonnements',
  ticket: 'Tickets Tirage',
  feature: 'Fonctionnalités',
  cash: 'Conversion €',
};

export default function BoutiquePage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/boutique')
      .then(r => r.json())
      .then(data => {
        setItems(data.items ?? []);
        setBalance(data.balance ?? 0);
        setPurchasedIds(data.purchased_ids ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (itemId: string) => {
    setPurchasing(itemId);
    try {
      const res = await fetch('/api/boutique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance);
        setPurchasedIds(prev => [...prev, itemId]);
      }
    } finally {
      setPurchasing(null);
    }
  };

  const categories = [...new Set(items.map(i => i.category))];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-400" />
            Boutique Points
          </h1>
          <p className="text-white/50 mt-1">Échange tes points contre des récompenses</p>
        </div>
        <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xl font-bold text-white">{balance.toLocaleString()}</span>
          <span className="text-white/50 text-sm">pts</span>
        </div>
      </div>

      {/* Items by category */}
      {categories.map(cat => {
        const Icon = CATEGORY_ICONS[cat] ?? Gift;
        const catItems = items.filter(i => i.category === cat);
        return (
          <div key={cat}>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Icon className="w-5 h-5 text-amber-400" />
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catItems.map(item => {
                const owned = purchasedIds.includes(item.id);
                const canAfford = balance >= item.cost_points;
                return (
                  <div key={item.id} className="glass rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{item.name}</h3>
                      {item.description && <p className="text-white/50 text-sm mt-1">{item.description}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-bold">{item.cost_points.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => handlePurchase(item.id)}
                        disabled={!canAfford || owned || purchasing === item.id}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          owned
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : canAfford
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <span className="animate-spin">⏳</span>
                        ) : owned ? (
                          'Obtenu'
                        ) : (
                          <>Échanger <ArrowRight className="w-3 h-3" /></>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">La boutique est en cours de préparation</p>
          <p className="text-white/30 text-sm mt-1">Les articles arrivent bientôt !</p>
        </div>
      )}
    </div>
  );
}
