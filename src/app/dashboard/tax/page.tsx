'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, RefreshCw, Loader2, AlertCircle, Euro, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface FrTaxReport {
  year: number;
  total_trades: number;
  closed_trades: number;
  total_gains_eur: number;
  total_losses_eur: number;
  net_taxable_eur: number;
  flat_tax_due_eur: number;
  income_tax_eur: number;
  social_charges_eur: number;
  monthly_breakdown: { month: string; gains: number; losses: number; net: number }[];
  by_pair: { pair: string; trades: number; net_pnl: number }[];
  cerfa_2086: {
    ligne_211_prix_cession: number;
    ligne_212_prix_acquisition: number;
    ligne_213_plus_value_brute: number;
    ligne_214_moins_value_compensable: number;
    ligne_215_plus_value_imposable: number;
  };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function TaxPage() {
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [report, setReport] = useState<FrTaxReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tax/${y}`);
      if (res.status === 401) {
        setError('Tu dois être connecté pour générer ton rapport fiscal.');
        setReport(null);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setReport(json.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(year);
  }, [year]);

  const downloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `midas-tax-${report.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!report) return;
    window.location.href = `/api/tax/${report.year}/pdf`;
  };

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="tax-page">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="text-amber-400" />
            Rapport Fiscal France
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Cerfa 2086 prérempli — Plus-values crypto déclarables (PFU 30%).
          </p>
        </div>
        <div className="flex gap-2">
          <select
            data-testid="tax-year-select"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
          >
            {YEARS.map((y) => (
              <option key={y} value={y} className="bg-zinc-900">
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchReport(year)}
            disabled={loading}
            data-testid="tax-refresh"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </button>
          <button
            onClick={downloadJson}
            disabled={!report}
            data-testid="tax-download-json"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition disabled:opacity-50"
          >
            <Download className="size-4" />
            JSON
          </button>
          <button
            onClick={downloadPdf}
            disabled={!report}
            data-testid="tax-download-pdf"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition disabled:opacity-50"
          >
            <Download className="size-4" />
            PDF Cerfa 2086
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100/80">{error}</div>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-white/50 flex items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin" /> Calcul du rapport…
        </div>
      )}

      {report && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
                  <TrendingUp className="size-4" /> Plus-values
                </div>
                <div className="mt-2 text-xl md:text-2xl font-bold text-emerald-400">
                  {fmt(report.total_gains_eur)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
                  <TrendingDown className="size-4" /> Moins-values
                </div>
                <div className="mt-2 text-xl md:text-2xl font-bold text-red-400">
                  {fmt(report.total_losses_eur)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
                  <Euro className="size-4" /> Net imposable
                </div>
                <div className="mt-2 text-xl md:text-2xl font-bold text-white" data-testid="tax-net">
                  {fmt(report.net_taxable_eur)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
                  <FileText className="size-4" /> Impôt PFU 30%
                </div>
                <div className="mt-2 text-xl md:text-2xl font-bold text-amber-400" data-testid="tax-due">
                  {fmt(report.flat_tax_due_eur)}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  IR {fmt(report.income_tax_eur)} + PS {fmt(report.social_charges_eur)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="size-5 text-amber-400" /> Cerfa 2086 — Lignes prêtes à recopier
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <CerfaLine label="211 — Prix de cession total" value={fmt(report.cerfa_2086.ligne_211_prix_cession)} />
                <CerfaLine label="212 — Prix d'acquisition total" value={fmt(report.cerfa_2086.ligne_212_prix_acquisition)} />
                <CerfaLine label="213 — Plus-value brute" value={fmt(report.cerfa_2086.ligne_213_plus_value_brute)} />
                <CerfaLine label="214 — Moins-value compensable" value={fmt(report.cerfa_2086.ligne_214_moins_value_compensable)} />
                <CerfaLine label="215 — Plus-value imposable" value={fmt(report.cerfa_2086.ligne_215_plus_value_imposable)} highlight />
              </div>
              <p className="text-xs text-white/40 mt-4">
                À reporter sur la déclaration 2042 case 3AN. Conserve ce document 6 ans.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <h3 className="px-5 pt-5 pb-3 text-white font-semibold">Répartition mensuelle</h3>
                {report.monthly_breakdown.length === 0 ? (
                  <p className="px-5 pb-5 text-white/40 text-sm">Aucun trade clos sur cette année.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                      <tr>
                        <th className="px-5 py-2">Mois</th>
                        <th className="px-5 py-2 text-right">Gains</th>
                        <th className="px-5 py-2 text-right">Pertes</th>
                        <th className="px-5 py-2 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {report.monthly_breakdown.map((m) => (
                        <tr key={m.month}>
                          <td className="px-5 py-2 text-white/70">{m.month}</td>
                          <td className="px-5 py-2 text-right text-emerald-400">{fmt(m.gains)}</td>
                          <td className="px-5 py-2 text-right text-red-400">{fmt(m.losses)}</td>
                          <td className={`px-5 py-2 text-right font-medium ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {fmt(m.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <h3 className="px-5 pt-5 pb-3 text-white font-semibold">Par paire</h3>
                {report.by_pair.length === 0 ? (
                  <p className="px-5 pb-5 text-white/40 text-sm">Aucune paire tradée cette année.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 text-left text-xs uppercase text-white/40">
                      <tr>
                        <th className="px-5 py-2">Paire</th>
                        <th className="px-5 py-2 text-right">Trades</th>
                        <th className="px-5 py-2 text-right">P&L Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {report.by_pair.map((p) => (
                        <tr key={p.pair}>
                          <td className="px-5 py-2 font-semibold text-white">{p.pair}</td>
                          <td className="px-5 py-2 text-right text-white/60">{p.trades}</td>
                          <td className={`px-5 py-2 text-right font-medium ${p.net_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {fmt(p.net_pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="text-xs text-white/40 text-center">
            <Badge variant="warning">INFORMATIF</Badge> Ce rapport est une aide à la déclaration. Consulte un
            expert-comptable pour validation. Taux de change USD/EUR appliqué : 0.92.
          </div>
        </>
      )}
    </div>
  );
}

function CerfaLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        highlight ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <span className="text-white/70">{label}</span>
      <span className={`font-mono font-semibold ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}
