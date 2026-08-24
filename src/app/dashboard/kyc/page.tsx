'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, CheckCircle2, Clock, Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { toast } from 'sonner';
import type { KycVerification, KycTier } from '@/types/database';
import { KYC_TIER_LIMITS } from '@/types/database';
import type { Step } from '@/lib/kyc/constants';
import KycOverview from '@/components/kyc/KycOverview';
import KycIdentityStep from '@/components/kyc/KycIdentityStep';
import KycAddressStep from '@/components/kyc/KycAddressStep';
import KycDocumentStep from '@/components/kyc/KycDocumentStep';
import KycReviewStep from '@/components/kyc/KycReviewStep';

export default function KycPage() {
  const [kyc, setKyc] = useState<Partial<KycVerification> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('overview');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('FR');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('FR');
  const [documentType, setDocumentType] = useState<'passport' | 'id_card' | 'driver_license'>('id_card');

  const fetchKyc = useCallback(async () => {
    try {
      const res = await fetch('/api/kyc');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setKyc(json.kyc);
    } catch {
      toast.error('Erreur de chargement KYC');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => fetchKyc()); }, [fetchKyc]);

  const handleSubmit = async () => {
    if (!fullName || !dateOfBirth || !addressLine || !city || !postalCode) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          date_of_birth: dateOfBirth,
          nationality,
          address_line: addressLine,
          city,
          postal_code: postalCode,
          country,
          document_type: documentType,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur de soumission');
        return;
      }

      toast.success('Vérification soumise avec succès');
      setKyc(json.kyc);
      setStep('overview');
    } catch {
      toast.error('Erreur réseau. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  const tier = (kyc?.tier ?? 0) as KycTier;
  const tierInfo = KYC_TIER_LIMITS[tier];
  const status = kyc?.status ?? 'none';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="kyc-page">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="text-amber-400" />
          Vérification KYC
        </h1>
        <p className="text-white/60 text-sm mt-1">
          Vérifie ton identité pour débloquer les retraits et augmenter tes limites.
        </p>
      </motion.div>

      {/* Status Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {status === 'verified' && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="size-6 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-300">Identité vérifiée</p>
              <p className="text-sm text-emerald-200/60">Niveau {tier} — {tierInfo.description}</p>
            </div>
          </div>
        )}
        {status === 'pending' && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <Clock className="size-6 text-amber-400 animate-pulse" />
            <div>
              <p className="font-semibold text-amber-300">Vérification en cours</p>
              <p className="text-sm text-amber-200/60">Ta demande est en cours de traitement. Délai moyen : 24h.</p>
            </div>
          </div>
        )}
        {status === 'rejected' && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
            <ShieldAlert className="size-6 text-red-400" />
            <div>
              <p className="font-semibold text-red-300">Vérification refusée</p>
              <p className="text-sm text-red-200/60">
                {kyc?.rejection_reason ?? 'Raison non précisée. Tu peux soumettre à nouveau.'}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Tier Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {([0, 1, 2, 3] as KycTier[]).map((t) => {
          const info = KYC_TIER_LIMITS[t];
          const isActive = tier >= t;
          const isCurrent = tier === t;
          return (
            <Card key={t} className={isCurrent ? 'ring-1 ring-amber-500/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {isActive ? (
                    <CheckCircle2 className="size-5 text-emerald-400" />
                  ) : (
                    <Lock className="size-5 text-white/20" />
                  )}
                  <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-white/40'}`}>
                    Niveau {t}
                  </span>
                  {isCurrent && <Badge variant="warning" className="text-[10px] ml-auto">Actuel</Badge>}
                </div>
                <p className={`text-xs ${isActive ? 'text-white/60' : 'text-white/30'}`}>{info.label}</p>
                <p className={`text-xs mt-1 ${isActive ? 'text-amber-400/80' : 'text-white/20'}`}>
                  {info.withdrawalMax === 0 ? 'Pas de retrait' :
                    info.withdrawalMax >= 999999 ? 'Retrait illimité' :
                    `Max ${info.withdrawalMax.toLocaleString('fr-FR')}€/mois`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 'overview' && status !== 'verified' && status !== 'pending' && (
          <KycOverview onStart={() => setStep('identity')} />
        )}

        {step === 'identity' && (
          <KycIdentityStep
            fullName={fullName}
            setFullName={setFullName}
            dateOfBirth={dateOfBirth}
            setDateOfBirth={setDateOfBirth}
            nationality={nationality}
            setNationality={setNationality}
            onBack={() => setStep('overview')}
            onNext={() => setStep('address')}
          />
        )}

        {step === 'address' && (
          <KycAddressStep
            addressLine={addressLine}
            setAddressLine={setAddressLine}
            city={city}
            setCity={setCity}
            postalCode={postalCode}
            setPostalCode={setPostalCode}
            country={country}
            setCountry={setCountry}
            onBack={() => setStep('identity')}
            onNext={() => setStep('document')}
          />
        )}

        {step === 'document' && (
          <KycDocumentStep
            documentType={documentType}
            setDocumentType={setDocumentType}
            onBack={() => setStep('address')}
            onNext={() => setStep('review')}
          />
        )}

        {step === 'review' && (
          <KycReviewStep
            fullName={fullName}
            dateOfBirth={dateOfBirth}
            nationality={nationality}
            addressLine={addressLine}
            postalCode={postalCode}
            city={city}
            country={country}
            documentType={documentType}
            submitting={submitting}
            onBack={() => setStep('document')}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
