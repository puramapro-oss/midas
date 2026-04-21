// =============================================================================
// MIDAS — Layout /compte/* (V4.1)
// Partage le chrome dashboard (sidebar + header + bottom nav) pour les 7 pages
// Stripe Connect Embedded. Les pages sont client-only (composants Stripe).
// =============================================================================

export const dynamic = 'force-dynamic';

import DashboardShell from '../dashboard/DashboardShell';

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
