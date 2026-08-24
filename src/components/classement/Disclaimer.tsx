import { AlertTriangle } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
      <AlertTriangle className="w-4 h-4 text-amber-400/60 mt-0.5 shrink-0" />
      <p className="text-[10px] leading-relaxed text-white/35">
        Les performances passées ne préjugent pas des performances futures.
        Le trading comporte des risques de perte en capital.
        Ne jamais investir plus que ce que vous pouvez vous permettre de perdre.
      </p>
    </div>
  );
}
