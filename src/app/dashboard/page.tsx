'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
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

// V7 §15 — Blocs above the fold (3 cartes obligatoires)
const ReferralBlock = dynamic(() => import('@/components/engagement/ReferralBlock'), {
  loading: () => <DashboardSkeleton height="h-[280px]" />,
  ssr: false,
});
const AmbassadeurBlock = dynamic(() => import('@/components/engagement/AmbassadeurBlock'), {
  loading: () => <DashboardSkeleton height="h-[280px]" />,
  ssr: false,
});
const CrossPromoBlock = dynamic(() => import('@/components/engagement/CrossPromoBlock'), {
  loading: () => <DashboardSkeleton height="h-[280px]" />,
  ssr: false,
});

function DashboardSkeleton({ height = 'h-48' }: { height?: string }) {
  return (
    <div className={`${height} rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden`}>
      <Skeleton className="w-full h-full" />
    </div>
  );
}

const stagger = {
  hidden: {} as const,
  visible: { transition: { staggerChildren: 0.08 } } as const,
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
};

const fadeSlideLeft = {
  hidden: { opacity: 0, x: -20 } as const,
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 } as const,
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 22 },
  },
};

export default function DashboardPage() {
  return (
    <motion.div
      className="space-y-6"
      data-testid="dashboard-page"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* V7 §15 — 3 blocs above the fold : Parrainage + Ambassadeur + Cross-promo */}
      <motion.section
        variants={fadeSlideUp}
        data-testid="dashboard-v7-blocks"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
      >
        <Suspense fallback={<DashboardSkeleton height="h-[280px]" />}>
          <ReferralBlock />
        </Suspense>
        <Suspense fallback={<DashboardSkeleton height="h-[280px]" />}>
          <AmbassadeurBlock />
        </Suspense>
        <Suspense fallback={<DashboardSkeleton height="h-[280px]" />}>
          <CrossPromoBlock />
        </Suspense>
      </motion.section>

      {/* Portfolio Overview */}
      <motion.section variants={fadeSlideUp} data-testid="dashboard-portfolio">
        <Suspense fallback={<DashboardSkeleton height="h-72" />}>
          <PortfolioOverview />
        </Suspense>
      </motion.section>

      {/* AI Status + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fadeSlideLeft} className="lg:col-span-2" data-testid="dashboard-ai-gauges">
          <Suspense fallback={<DashboardSkeleton height="h-48" />}>
            <AIStatusGauges />
          </Suspense>
        </motion.div>
        <motion.div variants={scaleIn} className="space-y-6" data-testid="dashboard-controls">
          <Suspense fallback={<DashboardSkeleton height="h-24" />}>
            <AutoTradeToggle />
          </Suspense>
          <Suspense fallback={<DashboardSkeleton height="h-24" />}>
            <RiskSlider />
          </Suspense>
        </motion.div>
      </div>

      {/* Open Positions */}
      <motion.section variants={fadeSlideUp} data-testid="dashboard-positions">
        <Suspense fallback={<DashboardSkeleton height="h-64" />}>
          <OpenPositions />
        </Suspense>
      </motion.section>

      {/* Signals + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.section variants={fadeSlideLeft} data-testid="dashboard-signals">
          <Suspense fallback={<DashboardSkeleton height="h-64" />}>
            <SignalsList />
          </Suspense>
        </motion.section>
        <motion.section variants={scaleIn} data-testid="dashboard-activity">
          <Suspense fallback={<DashboardSkeleton height="h-64" />}>
            <RecentActivity />
          </Suspense>
        </motion.section>
      </div>

      {/* Shield Status */}
      <motion.section variants={fadeSlideUp} data-testid="dashboard-shield">
        <Suspense fallback={<DashboardSkeleton height="h-48" />}>
          <ShieldStatus />
        </Suspense>
      </motion.section>
    </motion.div>
  );
}
