import type { AccordionItem } from '@/components/ui/Accordion'

export const exchangeDisplayNames: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  bitget: 'Bitget',
  kucoin: 'KuCoin',
  kraken: 'Kraken',
  gate: 'Gate.io',
  mexc: 'MEXC',
  htx: 'HTX',
  coinbase: 'Coinbase',
}

export const exchangeTutorials: Record<string, AccordionItem[]> = {
  binance: [
    {
      id: 'step-1',
      title: 'Étape 1 — Accéder aux paramètres API',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Connecte-toi à ton compte Binance. Va dans <strong className="text-white/70">Profil</strong> puis <strong className="text-white/70">Gestion des API</strong>.</p>
        </div>
      ),
    },
    {
      id: 'step-2',
      title: 'Étape 2 — Créer une clé API',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Clique sur <strong className="text-white/70">Créer une API</strong>. Donne un label (ex: &quot;MIDAS Bot&quot;). Complète la vérification 2FA.</p>
        </div>
      ),
    },
    {
      id: 'step-3',
      title: 'Étape 3 — Configurer les permissions',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Active uniquement <strong className="text-white/70">Lecture</strong> et <strong className="text-white/70">Trading Spot & Futures</strong>. Ne coche <strong className="text-red-400/70">jamais</strong> la permission Retrait.</p>
          <p>Ajoute une restriction IP si possible pour plus de sécurité.</p>
        </div>
      ),
    },
    {
      id: 'step-4',
      title: 'Étape 4 — Copier les clés',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Copie la <strong className="text-white/70">clé API</strong> et le <strong className="text-white/70">Secret</strong> dans les champs ci-dessus. Le secret n&apos;est visible qu&apos;une seule fois.</p>
        </div>
      ),
    },
  ],
  bybit: [
    {
      id: 'step-1',
      title: 'Étape 1 — Accéder aux clés API',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Connecte-toi à Bybit. Va dans <strong className="text-white/70">Compte</strong> puis <strong className="text-white/70">API Management</strong>.</p>
        </div>
      ),
    },
    {
      id: 'step-2',
      title: 'Étape 2 — Créer une nouvelle clé',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Clique sur <strong className="text-white/70">Create New Key</strong>. Sélectionne &quot;System-generated API Keys&quot;. Nomme la clé &quot;MIDAS Bot&quot;.</p>
        </div>
      ),
    },
    {
      id: 'step-3',
      title: 'Étape 3 — Permissions',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Active <strong className="text-white/70">Read-Write</strong> pour les trades. Désactive les retraits. Valide avec ta 2FA.</p>
        </div>
      ),
    },
  ],
}

export function getDefaultTutorial(name: string): AccordionItem[] {
  const displayName = exchangeDisplayNames[name] ?? name
  return [
    {
      id: 'step-1',
      title: 'Étape 1 — Connexion',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Connecte-toi à ton compte {displayName}. Accède aux paramètres API dans ton profil ou tes réglages de sécurité.</p>
        </div>
      ),
    },
    {
      id: 'step-2',
      title: 'Étape 2 — Créer les clés',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Crée une nouvelle clé API. Active les permissions de <strong className="text-white/70">Lecture</strong> et de <strong className="text-white/70">Trading</strong>. Ne donne <strong className="text-red-400/70">jamais</strong> la permission de retrait.</p>
        </div>
      ),
    },
    {
      id: 'step-3',
      title: 'Étape 3 — Coller ici',
      content: (
        <div className="space-y-2 text-xs text-white/50">
          <p>Copie ta clé API et ton Secret dans les champs ci-dessus, puis clique sur &quot;Tester la connexion&quot;.</p>
        </div>
      ),
    },
  ]
}
