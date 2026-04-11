'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqItems: FAQItem[] = [
  {
    question: 'Est-ce que MIDAS est legal ?',
    answer:
      'Oui, MIDAS est 100% legal. MIDAS est un outil d\'aide a la decision et d\'analyse de marche. Il ne gere pas vos fonds directement. Vous connectez votre exchange via des cles API en lecture seule (ou avec permissions de trading limitees si vous activez le trading automatique). MIDAS ne detient jamais vos cryptomonnaies. L\'utilisation d\'outils d\'analyse et de bots de trading est parfaitement legale en France et en Europe.',
  },
  {
    question: 'Mes fonds sont-ils en securite ?',
    answer:
      'Absolument. MIDAS ne detient jamais vos fonds. Vos cryptomonnaies restent a tout moment sur votre exchange (Binance, Kraken, Bybit, etc.). La connexion se fait via des cles API que vous configurez vous-meme avec les permissions minimales necessaires. Pour l\'analyse seule, une cle en lecture suffit. Pour le trading automatique, vous pouvez autoriser le trading sans permission de retrait. Personne — ni MIDAS, ni notre equipe — ne peut retirer vos fonds.',
  },
  {
    question: 'MIDAS peut-il retirer mes cryptos ?',
    answer:
      'Non, jamais. Lorsque vous creez vos cles API sur votre exchange, vous choisissez precisement les permissions a accorder. Nous vous recommandons de ne jamais activer la permission de retrait. MIDAS fonctionne uniquement avec les permissions de lecture (pour l\'analyse) et eventuellement de trading (pour le trading automatique). Meme en cas de compromission hypothetique, sans permission de retrait, vos fonds ne peuvent pas quitter votre exchange.',
  },
  {
    question: 'Quels sont les risques du trading avec MIDAS ?',
    answer:
      'Le trading de cryptomonnaies comporte des risques inherents, que MIDAS soit utilise ou non. Les marches crypto sont volatils et les pertes sont possibles. MIDAS reduit ces risques grace a son systeme SHIELD (stop-loss intelligent, gestion du risque automatique, detection d\'anomalies), mais ne les elimine pas completement. Nous recommandons de ne jamais investir plus que ce que vous etes pret a perdre, de commencer en mode paper trading pour vous familiariser, et d\'utiliser toujours le SHIELD pour proteger vos positions.',
  },
  {
    question: 'Comment connecter mon exchange a MIDAS ?',
    answer:
      'C\'est simple et prend moins de 2 minutes. Allez dans les parametres de votre exchange (Binance, Kraken, Bybit, etc.), creez une nouvelle cle API avec les permissions souhaitees (lecture seule ou lecture + trading). Copiez la cle API et le secret, puis collez-les dans MIDAS > Parametres > Exchanges. MIDAS verifie automatiquement la connexion et vous confirme que tout fonctionne. Des tutoriels detailles sont disponibles pour chaque exchange supporte.',
  },
  {
    question: 'Combien coute MIDAS ?',
    answer:
      'MIDAS propose 3 plans. Le plan Free est gratuit pour toujours avec 5 questions par jour, le paper trading et 1 exchange connecte. Le plan Pro a 39€/mois (ou 26€/mois en annuel avec -33%) inclut le chat illimite, 2 trades automatiques par jour, le backtesting et le SHIELD complet. Le plan Ultra a 79€/mois (ou 53€/mois en annuel) offre les trades illimites, le whale tracking, le sentiment analysis et le support prioritaire. Vous pouvez commencer gratuitement et passer a un plan superieur a tout moment.',
  },
  {
    question: 'Qu\'est-ce que le paper trading ?',
    answer:
      'Le paper trading est un mode de simulation qui vous permet de trader avec de l\'argent fictif dans les conditions reelles du marche. C\'est l\'equivalent d\'un simulateur de vol pour les pilotes. Vous passez des ordres, testez des strategies et voyez vos resultats — sans risquer un seul euro. C\'est la methode ideale pour debuter, tester une nouvelle strategie ou se familiariser avec MIDAS avant de passer en trading reel. Disponible gratuitement sur tous les plans.',
  },
  {
    question: 'Quels exchanges sont supportes ?',
    answer:
      'MIDAS supporte les principaux exchanges : Binance, Kraken, Bybit, OKX, Coinbase Pro, KuCoin et Bitget. Nous ajoutons regulierement de nouveaux exchanges en fonction des demandes de nos utilisateurs. Le plan Free permet de connecter 1 exchange, le plan Pro 2, et le plan Ultra offre des connexions illimitees. Si votre exchange n\'est pas encore supporte, contactez-nous — nous l\'ajouterons en priorite.',
  },
  {
    question: 'Comment fonctionne MIDAS SHIELD ?',
    answer:
      'MIDAS SHIELD est notre systeme de protection a 7 niveaux qui veille sur vos positions 24h/24. Il comprend des stop-loss dynamiques adaptes a la volatilite (ATR), un anti-drawdown qui reduit la taille des positions sous stress, une detection de flash crash qui liquide les positions en moins de 60 secondes, un cooldown automatique apres 3 pertes consecutives, une decorrelation de portefeuille (max 30% par secteur), un verrouillage d\'une partie du capital, et un kill switch total activable en un clic. Toutes les couches sont detaillees dans la section SHIELD de la landing.',
  },
  {
    question: 'Puis-je annuler mon abonnement a tout moment ?',
    answer:
      'Oui, vous pouvez annuler votre abonnement a tout moment depuis votre espace Parametres > Abonnement. L\'annulation prend effet a la fin de votre periode de facturation en cours — vous conservez l\'acces a toutes les fonctionnalites jusqu\'a cette date. Aucun frais de resiliation. Si vous avez souscrit un plan annuel, nous vous remboursons au prorata les mois restants. Apres annulation, votre compte repasse automatiquement en plan Free.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  return (
    <section
      ref={ref}
      id="faq"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-xs font-semibold tracking-wider uppercase mb-4 font-[var(--font-orbitron)]">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 font-[var(--font-orbitron)]">
            Questions frequentes
          </h2>
          <p className="text-white/50 text-lg font-[var(--font-dm-sans)]">
            Tout ce que vous devez savoir avant de commencer.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
              >
                <div
                  className={`rounded-xl border transition-colors duration-200 ${
                    isOpen
                      ? 'border-[#FFD700]/20 bg-[#FFD700]/[0.02]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-3">
                      <HelpCircle
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isOpen ? 'text-[#FFD700]' : 'text-white/30'
                        }`}
                      />
                      <span
                        className={`text-sm sm:text-base font-medium transition-colors font-[var(--font-dm-sans)] ${
                          isOpen ? 'text-white' : 'text-white/70'
                        }`}
                      >
                        {item.question}
                      </span>
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 ml-4"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-colors ${
                          isOpen ? 'text-[#FFD700]' : 'text-white/30'
                        }`}
                      />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pl-12 text-sm text-white/50 leading-relaxed font-[var(--font-dm-sans)]">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-white/40 text-sm font-[var(--font-dm-sans)]">
            Vous avez d&apos;autres questions ?{' '}
            <a
              href="mailto:support@purama.dev"
              className="text-[#FFD700] hover:text-[#FFD700]/80 transition-colors underline underline-offset-4"
            >
              Contactez-nous
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}

FAQ.displayName = 'FAQ'
export default FAQ
