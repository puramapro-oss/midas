'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface CookiePreferences {
  necessary: true;
  analytics: boolean;
  performance: boolean;
}

const COOKIE_CONSENT_KEY = 'midas-cookie-consent';

function getCookieConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // corrupt or unavailable
  }
  return null;
}

function setCookieConsent(prefs: CookiePreferences) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [performance, setPerformance] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    const prefs: CookiePreferences = { necessary: true, analytics: true, performance: true };
    setCookieConsent(prefs);
    setVisible(false);
  }, []);

  const handleRefuseAll = useCallback(() => {
    const prefs: CookiePreferences = { necessary: true, analytics: false, performance: false };
    setCookieConsent(prefs);
    setVisible(false);
  }, []);

  const handleSaveCustom = useCallback(() => {
    const prefs: CookiePreferences = { necessary: true, analytics, performance };
    setCookieConsent(prefs);
    setVisible(false);
  }, [analytics, performance]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[9998] p-4 sm:p-6"
          data-testid="cookie-banner"
        >
          <div className="max-w-2xl mx-auto bg-[#0E1118] border border-white/[0.08] rounded-2xl shadow-[0_-4px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden">
            {/* Main content */}
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-[#FFD700]/10 shrink-0">
                  <Cookie className="w-5 h-5 text-[#FFD700]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-orbitron)' }}>
                    Cookies
                  </h3>
                  <p className="text-white/50 text-xs leading-relaxed">
                    MIDAS utilise des cookies essentiels pour fonctionner et des cookies optionnels pour ameliorer votre experience.{' '}
                    <Link href="/legal/cookies" className="text-[#FFD700]/70 hover:text-[#FFD700] underline underline-offset-2">
                      En savoir plus
                    </Link>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefuseAll}
                  className="p-1 text-white/30 hover:text-white/60 transition-colors shrink-0"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Customize toggle */}
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1.5 text-white/40 text-xs mt-3 hover:text-white/60 transition-colors"
                data-testid="cookie-customize-toggle"
              >
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Personnaliser
              </button>

              {/* Details panel */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-3">
                      {/* Necessary - always on */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
                        <div>
                          <p className="text-white text-xs font-medium">Essentiels</p>
                          <p className="text-white/40 text-[11px]">Authentification, preferences. Toujours actifs.</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-[#FFD700]/30 flex items-center px-0.5 cursor-not-allowed">
                          <div className="w-4 h-4 rounded-full bg-[#FFD700] ml-auto" />
                        </div>
                      </div>

                      {/* Analytics */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
                        <div>
                          <p className="text-white text-xs font-medium">Analytiques</p>
                          <p className="text-white/40 text-[11px]">PostHog (UE) — comprendre l&apos;utilisation du site.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnalytics(!analytics)}
                          data-testid="cookie-analytics-toggle"
                          className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                            analytics ? 'bg-[#FFD700]/30' : 'bg-white/10'
                          }`}
                        >
                          <motion.div
                            className={`w-4 h-4 rounded-full ${analytics ? 'bg-[#FFD700]' : 'bg-white/40'}`}
                            animate={{ x: analytics ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>

                      {/* Performance */}
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
                        <div>
                          <p className="text-white text-xs font-medium">Performance</p>
                          <p className="text-white/40 text-[11px]">Vercel Analytics — mesurer les performances.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPerformance(!performance)}
                          data-testid="cookie-performance-toggle"
                          className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                            performance ? 'bg-[#FFD700]/30' : 'bg-white/10'
                          }`}
                        >
                          <motion.div
                            className={`w-4 h-4 rounded-full ${performance ? 'bg-[#FFD700]' : 'bg-white/40'}`}
                            animate={{ x: performance ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleRefuseAll}
                  data-testid="cookie-refuse"
                  className="flex-1 py-2.5 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-xs font-medium hover:bg-white/[0.06] hover:text-white/80 transition-all"
                >
                  Refuser
                </button>
                {showDetails ? (
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    data-testid="cookie-save-custom"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/30 text-[#FFD700] text-xs font-semibold hover:bg-[#FFD700]/30 transition-all"
                  >
                    Enregistrer mes choix
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    data-testid="cookie-accept"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#FFD700] text-[#06080F] text-xs font-semibold hover:bg-[#FFD700]/90 transition-all shadow-lg shadow-[#FFD700]/20"
                  >
                    Accepter tout
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
