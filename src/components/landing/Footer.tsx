'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const footerLinks = {
  produit: [
    { label: 'Fonctionnalites', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],
  legal: [
    { label: 'Mentions legales', href: '/legal/mentions' },
    { label: 'Politique de confidentialite', href: '/legal/privacy' },
    { label: 'CGV', href: '/legal/cgv' },
    { label: 'CGU', href: '/legal/cgu' },
    { label: 'Politique cookies', href: '/legal/cookies' },
    { label: 'Avertissement risques', href: '/legal/disclaimer' },
  ],
  support: [
    { label: 'Changelog', href: '/changelog' },
    { label: 'Statut', href: '/status' },
    { label: 'Contact', href: 'mailto:support@purama.dev' },
  ],
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#06080F]">
      {/* Disclaimer banner */}
      <div className="border-b border-white/[0.06] bg-[#FFD700]/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-4">
            <AlertTriangle className="h-5 w-5 text-[#FFD700]/60 shrink-0 mt-0.5" />
            <p className="text-white/40 text-xs leading-relaxed font-[var(--font-dm-sans)]">
              <span className="text-[#FFD700]/60 font-semibold">Avertissement :</span>{' '}
              MIDAS est un outil d&apos;aide a la decision. Le trading de cryptomonnaies comporte des risques significatifs de perte en capital. Les performances passees ne garantissent pas les resultats futurs. N&apos;investissez jamais plus que ce que vous etes pret a perdre. MIDAS ne fournit pas de conseils financiers et ne detient jamais vos fonds. Vous etes seul responsable de vos decisions d&apos;investissement.
            </p>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFD700] to-[#B8860B] flex items-center justify-center">
                <span className="text-[#06080F] font-bold text-sm font-[var(--font-orbitron)]">
                  M
                </span>
              </div>
              <span className="text-white font-bold text-lg font-[var(--font-orbitron)]">
                MIDAS
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed font-[var(--font-dm-sans)] max-w-xs">
              L&apos;intelligence artificielle au service de vos trades. Analysez, tradez et protegez vos investissements crypto.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4 font-[var(--font-orbitron)]">
              Produit
            </h4>
            <ul className="space-y-3">
              {footerLinks.produit.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/40 text-sm hover:text-[#FFD700] transition-colors font-[var(--font-dm-sans)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4 font-[var(--font-orbitron)]">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/40 text-sm hover:text-[#FFD700] transition-colors font-[var(--font-dm-sans)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4 font-[var(--font-orbitron)]">
              Support
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('mailto') ? (
                    <a
                      href={link.href}
                      className="text-white/40 text-sm hover:text-[#FFD700] transition-colors font-[var(--font-dm-sans)]"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-white/40 text-sm hover:text-[#FFD700] transition-colors font-[var(--font-dm-sans)]"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-xs font-[var(--font-dm-sans)]">
            &copy; 2026 Purama. Tous droits reserves.
          </p>
          <p className="text-white/15 text-xs font-[var(--font-dm-sans)]">
            PURAMA SASU — TVA non applicable, art. 293B du CGI
          </p>
        </div>
      </div>
    </footer>
  )
}

Footer.displayName = 'Footer'
export default Footer
