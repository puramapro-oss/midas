'use client';

import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex-1 flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
              currentStep >= s
                ? 'bg-[#F59E0B]/20 border-[#F59E0B]/50 text-[#F59E0B]'
                : 'bg-white/5 border-white/10 text-white/30'
            }`}
          >
            {currentStep > s ? <Check className="h-4 w-4" /> : s}
          </div>
          {s < 4 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all ${currentStep > s ? 'bg-[#F59E0B]/40' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
