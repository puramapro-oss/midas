'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import DisclaimerBanner from '@/components/shared/DisclaimerBanner';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleOpenChat = () => {
    setChatOpen((prev) => !prev);
  };

  void chatOpen;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white flex" data-testid="dashboard-layout">
      {/* Sidebar — desktop only */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header
          profile={profile}
          onSignOut={handleSignOut}
          onOpenChat={handleOpenChat}
        />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 bg-[var(--bg-primary)]">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
      <DisclaimerBanner />
    </div>
  );
}
