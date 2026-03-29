'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import DisclaimerBanner from '@/components/shared/DisclaimerBanner';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="min-h-screen bg-[#06080F] text-white" data-testid="dashboard-layout">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="md:ml-64">
        <Header
          profile={profile}
          onSignOut={handleSignOut}
          onOpenChat={handleOpenChat}
        />
        <main className="p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
      <DisclaimerBanner />
    </div>
  );
}
