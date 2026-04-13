'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import ChatModal from '@/components/chat/ChatModal';
import DisclaimerBanner from '@/components/shared/DisclaimerBanner';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

const ParticleBackground = dynamic(() => import('@/components/shared/ParticleBackground'), {
  ssr: false,
});

const TutorialOverlay = dynamic(() => import('@/components/shared/TutorialOverlay'), {
  ssr: false,
});

const DailyGiftModal = dynamic(() => import('@/components/shared/DailyGiftModal'), {
  ssr: false,
});

const CinematicIntro = dynamic(() => import('@/components/shared/CinematicIntro'), {
  ssr: false,
});

const AffirmationModal = dynamic(() => import('@/components/shared/AffirmationModal'), {
  ssr: false,
});

const WisdomFooter = dynamic(() => import('@/components/shared/WisdomFooter'), {
  ssr: false,
});

const SpiritualLayer = dynamic(() => import('@/components/shared/SpiritualLayer'), {
  ssr: false,
});

const SubconsciousEngine = dynamic(() => import('@/components/shared/SubconsciousEngine'), {
  ssr: false,
});

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // Check if cinematic intro should play
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('midas-intro-seen')) {
      setShowIntro(true);
    }
  }, []);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!loading && profile && !profile.onboarding_completed) {
      router.replace('/onboarding');
    }
  }, [loading, profile, router]);

  // Check tutorial status (read directly from DB since Profile type may not have field yet on server)
  useEffect(() => {
    if (!loading && profile && profile.onboarding_completed && user && !tutorialChecked) {
      setTutorialChecked(true);
      const supabase = createClient();
      supabase
        .from('profiles')
        .select('tutorial_completed')
        .eq('id', user.id)
        .single()
        .then(({ data }: { data: { tutorial_completed: boolean } | null }) => {
          if (data && !data.tutorial_completed) {
            // Small delay to let dashboard render first
            setTimeout(() => setShowTutorial(true), 1500);
          }
        });
    }
  }, [loading, profile, user, tutorialChecked]);

  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)] text-white flex" data-testid="dashboard-layout">
      {/* Ambient particles */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <ParticleBackground variant="dashboard" />
      </div>

      {/* Sidebar — desktop only */}
      <Sidebar />

      {/* Subliminal empowering words */}
      <SubconsciousEngine />

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen min-w-0">
        <Header
          profile={profile}
          onOpenChat={() => setChatOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <SpiritualLayer>
            {children}
          </SpiritualLayer>
          <WisdomFooter />
        </main>
      </div>

      {/* Affirmation modal — once per session */}
      <AffirmationModal />

      {/* Bottom nav — mobile only */}
      <BottomNav />

      {/* Chat modal — accessible from every dashboard page */}
      <ChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      <DisclaimerBanner />

      {/* Daily gift modal — shows once per day */}
      <DailyGiftModal />

      {/* Interactive tutorial — first login only */}
      {showTutorial && user && (
        <TutorialOverlay
          userId={user.id}
          onComplete={() => setShowTutorial(false)}
        />
      )}

      {/* Cinematic intro — first visit only */}
      {showIntro && (
        <CinematicIntro onComplete={() => setShowIntro(false)} />
      )}
    </div>
  );
}
