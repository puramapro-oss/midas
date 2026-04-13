'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, FileCheck, Upload,
  User, MapPin, CreditCard, CheckCircle2, Clock, XCircle,
  ChevronRight, Loader2, AlertCircle, Lock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { toast } from 'sonner';
import type { KycVerification, KycTier } from '@/types/database';
import { KYC_TIER_LIMITS } from '@/types/database';

type Step = 'overview' | 'identity' | 'address' | 'document' | 'review';

const DOCUMENT_TYPES = [
  { id: 'passport' as const, label: "Passeport", icon: '🛂' },
  { id: 'id_card' as const, label: "Carte d'identité", icon: '🪪' },
  { id: 'driver_license' as const, label: 'Permis de conduire', icon: '🚗' },
];

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

  useEffect(() => { fetchKyc(); }, [fetchKyc]);

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

      {/* Action / Form */}
      <AnimatePresence mode="wait">
        {step === 'overview' && status !== 'verified' && status !== 'pending' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-lg font-bold text-white mb-4">Commencer la vérification</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { icon: User, text: 'Informations personnelles', step: 'identity' as const },
                    { icon: MapPin, text: 'Adresse de résidence', step: 'address' as const },
                    { icon: CreditCard, text: "Document d'identité", step: 'document' as const },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                        <item.icon className="size-5 text-amber-400" />
                      </div>
                      <span className="text-sm text-white/80 flex-1">{item.text}</span>
                      <ChevronRight className="size-4 text-white/30" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setStep('identity')}
                  data-testid="kyc-start"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition"
                >
                  Vérifier mon identité
                </button>
                <p className="text-xs text-white/40 text-center mt-3">
                  Tes données sont chiffrées et stockées de manière sécurisée. Conforme RGPD.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'identity' && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <User className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Identité</h2>
                    <p className="text-xs text-white/50">Étape 1/3</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Nom complet</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jean Dupont"
                      data-testid="kyc-fullname"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Date de naissance</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      data-testid="kyc-dob"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-500/50 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Nationalité</label>
                    <select
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      data-testid="kyc-nationality"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-500/50 focus:outline-none transition"
                    >
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                      <option value="CH">Suisse</option>
                      <option value="CA">Canada</option>
                      <option value="LU">Luxembourg</option>
                      <option value="MC">Monaco</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep('overview')}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition"
                  >
                    Retour
                  </button>
                  <button
                    onClick={() => {
                      if (!fullName || !dateOfBirth) { toast.error('Nom et date de naissance requis'); return; }
                      setStep('address');
                    }}
                    data-testid="kyc-next-address"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition"
                  >
                    Suivant
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'address' && (
          <motion.div
            key="address"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <MapPin className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Adresse</h2>
                    <p className="text-xs text-white/50">Étape 2/3</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="8 Rue de la Chapelle"
                      data-testid="kyc-address"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Ville</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Frasne"
                        data-testid="kyc-city"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Code postal</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="25560"
                        data-testid="kyc-postal"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Pays</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-500/50 focus:outline-none transition"
                    >
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                      <option value="CH">Suisse</option>
                      <option value="CA">Canada</option>
                      <option value="LU">Luxembourg</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep('identity')}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition"
                  >
                    Retour
                  </button>
                  <button
                    onClick={() => {
                      if (!addressLine || !city || !postalCode) { toast.error('Adresse complète requise'); return; }
                      setStep('document');
                    }}
                    data-testid="kyc-next-document"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition"
                  >
                    Suivant
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'document' && (
          <motion.div
            key="document"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <FileCheck className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Document</h2>
                    <p className="text-xs text-white/50">Étape 3/3</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Type de document</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DOCUMENT_TYPES.map((dt) => (
                        <button
                          key={dt.id}
                          onClick={() => setDocumentType(dt.id)}
                          data-testid={`kyc-doc-${dt.id}`}
                          className={`p-3 rounded-xl border text-center transition ${
                            documentType === dt.id
                              ? 'border-amber-500/50 bg-amber-500/10'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="text-2xl block mb-1">{dt.icon}</span>
                          <span className="text-xs text-white/70">{dt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-white/60 space-y-1">
                        <p className="font-medium text-white/80">Instructions pour la photo</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>Document original, pas de photocopie</li>
                          <li>Bonne luminosité, pas de reflet</li>
                          <li>Tous les coins du document visibles</li>
                          <li>Texte lisible, pas de flou</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-6 rounded-xl border-2 border-dashed border-white/10 hover:border-amber-500/30 transition cursor-pointer text-center">
                      <Upload className="size-8 text-white/30 mx-auto mb-2" />
                      <p className="text-sm text-white/50">Recto du document</p>
                      <p className="text-xs text-white/30 mt-1">JPG, PNG — max 10 Mo</p>
                    </div>
                    <div className="p-6 rounded-xl border-2 border-dashed border-white/10 hover:border-amber-500/30 transition cursor-pointer text-center">
                      <Upload className="size-8 text-white/30 mx-auto mb-2" />
                      <p className="text-sm text-white/50">Verso du document</p>
                      <p className="text-xs text-white/30 mt-1">JPG, PNG — max 10 Mo</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep('address')}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition"
                  >
                    Retour
                  </button>
                  <button
                    onClick={() => setStep('review')}
                    data-testid="kyc-next-review"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition"
                  >
                    Vérifier et soumettre
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FileCheck className="size-5 text-amber-400" />
                  Récapitulatif
                </h2>
                <div className="space-y-3 mb-6">
                  {[
                    { label: 'Nom', value: fullName },
                    { label: 'Date de naissance', value: dateOfBirth },
                    { label: 'Nationalité', value: nationality },
                    { label: 'Adresse', value: `${addressLine}, ${postalCode} ${city}, ${country}` },
                    { label: 'Document', value: DOCUMENT_TYPES.find((d) => d.id === documentType)?.label ?? '' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03]">
                      <span className="text-sm text-white/50">{row.label}</span>
                      <span className="text-sm text-white font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('document')}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    data-testid="kyc-submit"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      'Soumettre la vérification'
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
