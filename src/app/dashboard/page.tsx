'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

const PortfolioOverview = dynamic(() => import('@/components/dashboard/PortfolioOverview'), {
  loading: () => <DashboardSkeleton height="h-72" />,
  ssr: false,
});
const AIStatusGauges = dynamic(() => import('@/components/dashboard/AIStatusGauges'), {
  loading: () => <DashboardSkeleton height="h-48" />,
  ssr: false,
});
const AutoTradeToggle = dynamic(() => import('@/components/dashboard/AutoTradeToggle'), {
  loading: () => <DashboardSkeleton height="h-48" />,
  ssr: false,
});
const RiskSlider = dynamic(() => import('@/components/dashboard/RiskSlider'), {
  loading: () => <DashboardSkeleton height="h-48" />,
  ssr: false,
});
const OpenPositions = dynamic(() => import('@/components/dashboard/OpenPositions'), {
  loading: () => <DashboardSkeleton height="h-64" />,
  ssr: false,
});
const SignalsList = dynamic(() => import('@/components/dashboard/SignalsList'), {
  loading: () => <DashboardSkeleton height="h-64" />,
  ssr: false,
});
const RecentActivity = dynamic(() => import('@/components/dashboard/RecentActivity'), {
  loading: () => <DashboardSkeleton height="h-64" />,
  ssr: false,
});
const ShieldStatus = dynamic(() => import('@/components/dashboard/ShieldStatus'), {
  loading: () => <DashboardSkeleton height="h-48" />,
  ssr: false,
});

function DashboardSkeleton({ height = 'h-48' }: { height?: string }) {
  return (
    <div className={`${height} rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden`}>
      <Skeleton className="w-full h-full" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Portfolio Overview - Full width */}
      <section data-testid="dashboard-portfolio">
        <Suspense fallback={<DashboardSkeleton height="h-72" />}>
          <PortfolioOverview />
        </Suspense>
      </section>

      {/* AI Status + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" data-testid="dashboard-ai-gauges">
          <Suspense fallback={<DashboardSkeleton height="h-48" />}>
            <AIStatusGauges />
          </Suspense>
        </div>
        <div className="space-y-6" data-testid="dashboard-controls">
          <Suspense fallback={<DashboardSkeleton height="h-24" />}>
            <AutoTradeToggle />
          </Suspense>
          <Suspense fallback={<DashboardSkeleton height="h-24" />}>
            <RiskSlider />
          </Suspense>
        </div>
      </div>

      {/* Open Positions - Full width */}
      <section data-testid="dashboard-positions">
        <Suspense fallback={<DashboardSkeleton height="h-64" />}>
          <OpenPositions />
        </Suspense>
      </section>

      {/* Signals + Activity - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section data-testid="dashboard-signals">
          <Suspense fallback={<DashboardSkeleton height="h-64" />}>
            <SignalsList />
          </Suspense>
        </section>
        <section data-testid="dashboard-activity">
          <Suspense fallback={<DashboardSkeleton height="h-64" />}>
            <RecentActivity />
          </Suspense>
        </section>
      </div>

      {/* Shield Status - Full width */}
      <section data-testid="dashboard-shield">
        <Suspense fallback={<DashboardSkeleton height="h-48" />}>
          <ShieldStatus />
        </Suspense>
      </section>
    </div>
  );
}
