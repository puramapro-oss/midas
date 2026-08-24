'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check, MapPin, User } from 'lucide-react';
import { PROFILS, SITUATIONS, DEPARTEMENTS } from './constants';

interface Step1ProfileFormProps {
  typeProfil: string;
  setTypeProfil: (v: string) => void;
  situation: string;
  setSituation: (v: string) => void;
  departement: string;
  setDepartement: (v: string) => void;
  handicap: boolean;
  setHandicap: (v: boolean) => void;
  canNext: boolean;
  onNext: () => void;
}

export default function Step1ProfileForm({
  typeProfil,
  setTypeProfil,
  situation,
  setSituation,
  departement,
  setDepartement,
  handicap,
  setHandicap,
  canNext,
  onNext,
}: Step1ProfileFormProps) {
  return (
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
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

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
        onClick={onNext}
        disabled={!canNext}
        className={`w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
          canNext
            ? 'bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] text-white hover:opacity-90'
            : 'bg-white/5 text-white/20 cursor-not-allowed'
        }`}
      >
        Voir mes aides <ArrowRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
