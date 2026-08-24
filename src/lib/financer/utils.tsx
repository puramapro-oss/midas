import { BadgeCheck, CircleAlert, CircleHelp, CheckCircle2, XCircle, RefreshCw, Clock } from 'lucide-react';

export function probabilityBadge(p: string) {
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
}

export function statutIcon(s: string) {
  switch (s) {
    case 'accepte':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'refuse':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'renouveler':
      return <RefreshCw className="h-4 w-4 text-amber-400" />;
    default:
      return <Clock className="h-4 w-4 text-blue-400" />;
  }
}
