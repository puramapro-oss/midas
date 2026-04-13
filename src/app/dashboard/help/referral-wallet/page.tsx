'use client';

import Link from 'next/link';
import { ArrowLeft, Gift, Wallet, DollarSign, Award } from 'lucide-react';

export default function ReferralWalletGuidePage() {
  return (
    <div className="space-y-6" data-testid="guide-referral-wallet">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/help" className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white font-[family-name:var(--font-orbitron)]">Parrainage et Wallet</h1>
          <p className="text-sm text-white/40">Gagne de l&apos;argent en invitant tes amis traders.</p>
        </div>
      </div>

      {/* How referral works */}
      <div className="rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/[0.03] p-5">
        <h2 className="text-sm font-semibold text-[#FFD700] mb-4 flex items-center gap-2"><Gift className="w-4 h-4" /> Comment ça marche</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Partage ton lien', desc: "Chaque utilisateur reçoit un code unique MIDAS-XXXXX. Partage-le par SMS, email, réseaux sociaux." },
            { step: '2', title: "Ton ami s'inscrit", desc: "Il clique sur ton lien, crée son compte et reçoit automatiquement -50% sur son premier mois d'abonnement." },
            { step: '3', title: 'Tu gagnes', desc: "Dès que ton filleul paie, tu reçois 50% de son premier paiement + 10% de ses paiements récurrents à vie dans ton wallet." },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#FFD700]/15 flex items-center justify-center text-[#FFD700] text-xs font-bold shrink-0">{s.step}</div>
              <div><p className="text-xs font-semibold text-white">{s.title}</p><p className="text-[11px] text-white/40 mt-0.5">{s.desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Commissions */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Tes commissions</h2>
        <div className="space-y-2">
          {[
            { label: 'Premier paiement du filleul', value: '50%', example: 'Si ton filleul prend le Pro à 29,99€/mois → tu gagnes 15€' },
            { label: 'Paiements récurrents', value: '10% à vie', example: 'Chaque mois où ton filleul paie → 3€ dans ton wallet' },
            { label: 'Réduction filleul', value: '-50% 1er mois', example: 'Ton ami paie 15€ au lieu de 29,99€ son premier mois' },
          ].map((c) => (
            <div key={c.label} className="p-3 rounded-lg bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">{c.label}</span>
                <span className="text-xs font-bold text-emerald-400">{c.value}</span>
              </div>
              <p className="text-[10px] text-white/30 mt-1">{c.example}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tiers */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-[#FFD700]" /> Paliers de récompense</h2>
        <div className="space-y-2 text-xs">
          {[
            { name: 'Bronze', min: '1 filleul', reward: 'Badge Bronze sur ton profil' },
            { name: 'Argent', min: '5 filleuls', reward: '-10% sur ton abonnement' },
            { name: 'Or', min: '15 filleuls', reward: '1 mois Pro gratuit' },
            { name: 'Platine', min: '30 filleuls', reward: '1 mois Ultra gratuit' },
            { name: 'Diamant', min: '50 filleuls', reward: '3 mois Ultra gratuits' },
            { name: 'Légende', min: '100 filleuls', reward: 'Ultra à vie' },
          ].map((t) => (
            <div key={t.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
              <span className="text-white">{t.name} <span className="text-white/30">({t.min})</span></span>
              <span className="text-[#FFD700]/70">{t.reward}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-cyan-400" /> Wallet et retraits</h2>
        <div className="space-y-2 text-xs text-white/50 leading-relaxed">
          <p>Tes gains de parrainage et de concours sont crédités automatiquement dans ton wallet MIDAS.</p>
          <p><strong className="text-white">Retrait minimum :</strong> 5€</p>
          <p><strong className="text-white">Méthode :</strong> Virement IBAN (FR et EU acceptés)</p>
          <p><strong className="text-white">Délai :</strong> 3-5 jours ouvrables après validation admin</p>
          <p><strong className="text-white">Où :</strong> Dashboard → Wallet → Retirer vers mon compte</p>
        </div>
      </div>
    </div>
  );
}
