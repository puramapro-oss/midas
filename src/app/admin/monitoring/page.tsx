'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

interface HealthCheck {
  id: string;
  status: string;
  response_time_ms?: number;
  service?: string;
  details?: string;
  created_at: string;
}

interface Incident {
  id: string;
  severity: string;
  message: string;
  service?: string;
  resolved_at?: string;
  created_at: string;
}

interface UptimeStats {
  percent: number;
  total_checks_24h: number;
  successful_checks_24h: number;
  critical_incidents_24h: number;
}

interface MonitoringData {
  health_checks: HealthCheck[];
  incidents: Incident[];
  uptime: UptimeStats;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400',
    warn: 'bg-amber-500/15 text-amber-400',
    info: 'bg-blue-500/15 text-blue-400',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[severity] ?? 'bg-white/10 text-white/60'}`}>
      {severity}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'error') return <XCircle className="w-4 h-4 text-red-400" />;
  return <AlertTriangle className="w-4 h-4 text-amber-400" />;
}

export default function AdminMonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/monitoring');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  const uptime = data?.uptime ?? { percent: 100, total_checks_24h: 0, successful_checks_24h: 0, critical_incidents_24h: 0 };
  const healthChecks = data?.health_checks ?? [];
  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] text-[#FFD700]">
          Monitoring
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">
            MAJ: {lastRefresh.toLocaleTimeString('fr-FR')}
          </span>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg border border-white/10 hover:border-[#FFD700]/30 text-white/40 hover:text-[#FFD700] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Uptime KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-5 h-5 text-[#FFD700]" />
            <span className="text-white/50 text-sm">Uptime 24h</span>
          </div>
          <p className={`text-2xl font-bold font-[family-name:var(--font-jetbrains-mono)] ${uptime.percent >= 99 ? 'text-green-400' : uptime.percent >= 95 ? 'text-amber-400' : 'text-red-400'}`}>
            {uptime.percent}%
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-[#FFD700]" />
            <span className="text-white/50 text-sm">Checks 24h</span>
          </div>
          <p className="text-2xl font-bold font-[family-name:var(--font-jetbrains-mono)] text-white">
            {uptime.total_checks_24h}
          </p>
          <p className="text-xs text-white/40 mt-1">{uptime.successful_checks_24h} reussis</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-5 h-5 text-[#FFD700]" />
            <span className="text-white/50 text-sm">Incidents critiques</span>
          </div>
          <p className={`text-2xl font-bold font-[family-name:var(--font-jetbrains-mono)] ${uptime.critical_incidents_24h === 0 ? 'text-green-400' : 'text-red-400'}`}>
            {uptime.critical_incidents_24h}
          </p>
          <p className="text-xs text-white/40 mt-1">Dernieres 24h</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-[#FFD700]" />
            <span className="text-white/50 text-sm">Auto-refresh</span>
          </div>
          <p className="text-2xl font-bold font-[family-name:var(--font-jetbrains-mono)] text-white">
            30s
          </p>
          <p className="text-xs text-white/40 mt-1">Intervalle actif</p>
        </motion.div>
      </div>

      {/* Health Checks History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-semibold text-white/60 mb-3">
          Historique des health checks
        </h2>
        <div className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl overflow-hidden">
          {healthChecks.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">
              Aucun health check enregistre
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Statut</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Service</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Temps de reponse</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Details</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {healthChecks.slice(0, 10).map((check) => (
                    <tr key={check.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <StatusIcon status={check.status} />
                      </td>
                      <td className="px-4 py-3 text-white/70">{check.service ?? '-'}</td>
                      <td className="px-4 py-3">
                        {check.response_time_ms != null ? (
                          <span className={`font-[family-name:var(--font-jetbrains-mono)] text-xs ${check.response_time_ms < 500 ? 'text-green-400' : check.response_time_ms < 2000 ? 'text-amber-400' : 'text-red-400'}`}>
                            {check.response_time_ms}ms
                          </span>
                        ) : (
                          <span className="text-white/30">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50 max-w-xs truncate">{check.details ?? '-'}</td>
                      <td className="px-4 py-3 text-white/40 font-[family-name:var(--font-jetbrains-mono)] text-xs">
                        {formatDate(check.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Incident Log */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-semibold text-white/60 mb-3">
          Journal des incidents
        </h2>
        <div className="bg-[#0A0F1A]/80 border border-white/10 rounded-xl overflow-hidden">
          {incidents.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">
              Aucun incident enregistre
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-white/[0.03]">
              {incidents.map((incident) => (
                <div key={incident.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <SeverityBadge severity={incident.severity} />
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 truncate">{incident.message}</p>
                        {incident.service && (
                          <p className="text-xs text-white/30 mt-0.5">{incident.service}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {incident.resolved_at ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
                          Resolu
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                          Actif
                        </span>
                      )}
                      <span className="text-xs text-white/30 font-[family-name:var(--font-jetbrains-mono)]">
                        {formatDate(incident.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
