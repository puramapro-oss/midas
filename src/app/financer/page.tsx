'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileText,
  MapPin,
  User,
  Loader2,
  BadgeCheck,
  CircleAlert,
  CircleHelp,
  Euro,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface Aide {
  id: string;
  nom: string;
  type_aide: string;
  montant_max: number | null;
  description: string | null;
  url_officielle: string | null;
  probability?: 'probable' | 'possible' | 'verifier';
}

interface Dossier {
  id: string;
  aide_id: string;
  statut: string;
  created_at: string;
  aide?: Aide;
}

const PROFILS = [
  { value: 'particulier', label: 'Particulier', icon: '🧑' },
  { value: 'entreprise', label: 'Entreprise', icon: '🏢' },
  { value: 'association', label: 'Association', icon: '🤝' },
  { value: 'etudiant', label: 'Etudiant', icon: '🎓' },
];

const SITUATIONS = [
  { value: 'salarie', label: 'Salarie' },
  { value: 'demandeur_emploi', label: 'Demandeur d\'emploi' },
  { value: 'independant', label: 'Independant' },
  { value: 'auto_entrepreneur', label: 'Auto-entrepreneur' },
  { value: 'retraite', label: 'Retraite' },
  { value: 'rsa', label: 'RSA' },
  { value: 'cej', label: 'Contrat Engagement Jeune' },
];

const DEPARTEMENTS = [
  '01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19',
  '2A','2B','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37',
  '38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56',
  '57','58','59','60','61','62','63','64','65','66','67','68','69','70','71','72','73','74','75',
  '76','77','78','79','80','81','82','83','84','85','86','87','88','89','90','91','92','93','94','95',
  '971','972','973','974','976',
];

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

  const canNext1 = typeProfil && situation && departement;

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
    if (step === 4) fetchDossiers();
  }, [step, fetchDossiers]);

  const probabilityBadge = (p: string) => {
    switch (p) {
      case 'probable':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BadgeCheck className="h-3 w-3" /> Probable
          </span>
        );
      case 'possible':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CircleAlert className="h-3 w-3" /> Possible
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CircleHelp className="h-3 w-3" /> A verifier
          </span>
        );
    }
  };

  const statutIcon = (s: string) => {
    switch (s) {
      case 'accepte': return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'refuse': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'renouveler': return <RefreshCw className="h-4 w-4 text-amber-400" />;
      default: return <Clock className="h-4 w-4 text-blue-400" />;
    }
  };

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
          {/* STEP 1 — Profil */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#F59E0B]" /> Ton profil
                </h2>

                {/* Type */}
                <p className="text-sm text-white/50 mb-3">Tu es :</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {PROFILS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setTypeProfil(p.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        typeProfil === p.value
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-white'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl">{p.icon}</span>
                      <p className="text-sm font-medium mt-1">{p.label}</p>
                    </button>
                  ))}
                </div>

                {/* Situation */}
                <p className="text-sm text-white/50 mb-3">Ta situation :</p>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {SITUATIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSituation(s.value)}
                      className={`px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                        situation === s.value
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-white'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:border-white/20'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Departement */}
                <p className="text-sm text-white/50 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Departement :
                </p>
                <select
                  value={departement}
                  onChange={(e) => setDepartement(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white outline-none focus:border-[#F59E0B]/50 mb-6"
                >
                  <option value="">Selectionner...</option>
                  {DEPARTEMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* Handicap */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setHandicap(!handicap)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      handicap ? 'bg-[#F59E0B] border-[#F59E0B]' : 'bg-white/5 border-white/20'
                    }`}
                  >
                    {handicap && <Check className="h-3 w-3 text-black" />}
                  </div>
                  <span className="text-sm text-white/60">Situation de handicap (RQTH)</span>
                </label>
              </div>

              <button
                onClick={handleStep1Next}
                disabled={!canNext1}
                className={`w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  canNext1
                    ? 'bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] text-white hover:opacity-90'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                Voir mes aides <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* STEP 2 — Aides matching */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Cumul banner */}
              {totalCumul > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Euro className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-300 font-medium">Ton abonnement peut te couter 0 EUR</p>
                    <p className="text-2xl font-bold text-emerald-400 font-[family-name:var(--font-orbitron)]">
                      Jusqu&apos;a {totalCumul.toLocaleString('fr-FR')} EUR recuperables
                    </p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {aides.map((aide) => (
                    <div
                      key={aide.id}
                      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-white">{aide.nom}</h3>
                            {aide.probability && probabilityBadge(aide.probability)}
                          </div>
                          <p className="text-xs text-white/40 mb-2">{aide.description}</p>
                          {aide.url_officielle && (
                            <a
                              href={aide.url_officielle}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#F59E0B]/70 hover:text-[#F59E0B] transition-colors"
                            >
                              Voir le site officiel
                            </a>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {aide.montant_max ? (
                            <p className="text-lg font-bold text-[#F59E0B] font-mono">
                              {aide.montant_max.toLocaleString('fr-FR')} EUR
                            </p>
                          ) : (
                            <p className="text-sm text-white/40">Variable</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {aides.length === 0 && (
                    <div className="text-center py-12 text-white/30">
                      Aucune aide trouvee pour ce profil. Essaie de modifier tes criteres.
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 rounded-xl border border-white/10 text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Modifier
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                >
                  Generer les dossiers <FileText className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — PDF generation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#F59E0B]" /> Telecharger tes dossiers
                </h2>
                <p className="text-sm text-white/40 mb-6">
                  Clique sur chaque aide pour generer le dossier PDF pre-rempli.
                </p>

                <div className="space-y-3">
                  {aides.filter((a) => a.probability === 'probable' || a.probability === 'possible').map((aide) => (
                    <div
                      key={aide.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{aide.nom}</p>
                        <p className="text-xs text-white/40">
                          {aide.montant_max ? `${aide.montant_max.toLocaleString('fr-FR')} EUR max` : 'Montant variable'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleGeneratePdf(aide.id)}
                        disabled={generatingPdf === aide.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-sm font-medium hover:bg-[#F59E0B]/20 transition-all disabled:opacity-50"
                      >
                        {generatingPdf === aide.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 h-12 rounded-xl border border-white/10 text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                >
                  Suivi de mes dossiers <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Suivi */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#F59E0B]" /> Suivi de tes demandes
                </h2>

                {dossiers.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>Aucun dossier en cours.</p>
                    <p className="text-xs mt-1">Genere des dossiers a l&apos;etape precedente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dossiers.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          {statutIcon(d.statut)}
                          <div>
                            <p className="text-sm font-medium text-white">
                              {(d.aide as Aide)?.nom ?? 'Aide'}
                            </p>
                            <p className="text-xs text-white/40">
                              {new Date(d.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          d.statut === 'accepte' ? 'bg-emerald-500/10 text-emerald-400' :
                          d.statut === 'refuse' ? 'bg-red-500/10 text-red-400' :
                          d.statut === 'renouveler' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {d.statut === 'en_cours' ? 'En cours' : d.statut === 'accepte' ? 'Accepte' : d.statut === 'refuse' ? 'Refuse' : 'A renouveler'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full h-12 rounded-xl border border-white/10 text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Nouvelle recherche
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
