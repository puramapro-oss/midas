'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import type { Aide, Dossier } from '@/lib/financer/types';
import Step1ProfileForm from '@/components/financer/Step1ProfileForm';
import Step2AidesMatching from '@/components/financer/Step2AidesMatching';
import Step3PdfGeneration from '@/components/financer/Step3PdfGeneration';
import Step4Suivi from '@/components/financer/Step4Suivi';

export default function FinancerPage() {
  const [step, setStep] = useState(1);
  const [typeProfil, setTypeProfil] = useState('');
  const [situation, setSituation] = useState('');
  const [departement, setDepartement] = useState('');
  const [handicap, setHandicap] = useState(false);
  const [aides, setAides] = useState<Aide[]>([]);
  const [totalCumul, setTotalCumul] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const canNext1 = Boolean(typeProfil && situation && departement);

  const fetchAides = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type_profil: typeProfil,
        situation,
        departement,
        handicap: String(handicap),
      });
      const res = await fetch(`/api/financer?${params}`);
      const data = await res.json();
      setAides(data.aides ?? []);
      setTotalCumul(data.totalCumul ?? 0);
    } finally {
      setLoading(false);
    }
  }, [typeProfil, situation, departement, handicap]);

  const fetchDossiers = useCallback(async () => {
    try {
      const res = await fetch('/api/financer/dossiers');
      const data = await res.json();
      setDossiers(data.dossiers ?? []);
    } catch {
      // ignore
    }
  }, []);

  const handleStep1Next = async () => {
    // Save profile
    await fetch('/api/financer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type_profil: typeProfil, situation, departement, handicap }),
    });
    await fetchAides();
    setStep(2);
  };

  const handleGeneratePdf = async (aideId: string) => {
    setGeneratingPdf(aideId);
    try {
      // Create dossier first
      await fetch('/api/financer/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aide_id: aideId }),
      });

      // Generate PDF
      const res = await fetch('/api/financer/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aide_id: aideId }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dossier-financement.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setGeneratingPdf(null);
    }
  };

  useEffect(() => {
    if (step === 4) queueMicrotask(() => fetchDossiers());
  }, [step, fetchDossiers]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white" data-testid="financer-page">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute w-[600px] h-[600px] rounded-full top-[-200px] right-[-100px] bg-[radial-gradient(circle,#F59E0B_0%,transparent_70%)] opacity-[0.06] blur-[80px] animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute w-[400px] h-[400px] rounded-full bottom-[-100px] left-[-50px] bg-[radial-gradient(circle,#7C3AED_0%,transparent_70%)] opacity-[0.04] blur-[60px] animate-[float_25s_ease-in-out_infinite_reverse]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/pricing"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)]">
              Financer ton abonnement
            </h1>
            <p className="text-sm text-white/40 mt-1">
              La plupart de nos clients ne paient rien grace aux aides
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  step >= s
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B]/50 text-[#F59E0B]'
                    : 'bg-white/5 border-white/10 text-white/30'
                }`}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all ${step > s ? 'bg-[#F59E0B]/40' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1ProfileForm
              typeProfil={typeProfil}
              setTypeProfil={setTypeProfil}
              situation={situation}
              setSituation={setSituation}
              departement={departement}
              setDepartement={setDepartement}
              handicap={handicap}
              setHandicap={setHandicap}
              canNext={canNext1}
              onNext={handleStep1Next}
            />
          )}

          {step === 2 && (
            <Step2AidesMatching
              loading={loading}
              aides={aides}
              totalCumul={totalCumul}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <Step3PdfGeneration
              aides={aides}
              generatingPdf={generatingPdf}
              onGeneratePdf={handleGeneratePdf}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}

          {step === 4 && <Step4Suivi dossiers={dossiers} onBack={() => setStep(1)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
