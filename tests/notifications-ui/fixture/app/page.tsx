import NotificationBell from '@/components/layout/NotificationBell';
import NotificationsTab from '@/components/settings/NotificationsTab';

export default function NotificationsFixture() {
  return <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
    <header className="flex justify-between items-center gap-4 mb-8">
      <h1 className="text-xl font-semibold">MIDAS — vérification des notifications</h1>
      <NotificationBell />
    </header>
    <section aria-label="Préférences de notification" className="rounded-2xl border border-[var(--border-default)] p-4 md:p-6">
      <NotificationsTab />
    </section>
  </main>;
}
