'use client';

import { Camera, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

interface ProfilTabProps {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  bio: string;
  setBio: (v: string) => void;
}

function handleLogout() {
  try { localStorage.setItem('midas_forced_logout', 'true'); } catch { /* ignore */ }
  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0];
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('sb-') || key.startsWith('supabase')) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem('midas_remember');
    sessionStorage.removeItem('midas_session_valid');
  } catch { /* ignore */ }
  try { createClient().auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
  window.location.href = '/login';
}

export default function ProfilTab({ fullName, setFullName, email, bio, setBio }: ProfilTabProps) {
  return (
    <div className="space-y-6" data-testid="settings-profil">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/20 flex items-center justify-center text-2xl font-bold text-[#FFD700]">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#FFD700] text-[#0A0A0F] flex items-center justify-center hover:brightness-110 transition-all">
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{fullName}</h3>
          <p className="text-xs text-white/40">{email}</p>
          <Badge variant="gold" size="sm" className="mt-1">Pro</Badge>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} data-testid="settings-name-input" />
        <Input label="Email" value={email} disabled data-testid="settings-email-input" />
      </div>

      <div>
        <label className="block text-xs text-white/40 mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 outline-none resize-none transition-all duration-200 hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]"
          data-testid="settings-bio-input"
        />
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Sécurité</h3>
        <div className="space-y-3">
          <Button variant="secondary" size="sm">Changer le mot de passe</Button>
          <Button variant="secondary" size="sm">Activer la 2FA</Button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleLogout}
          data-testid="settings-signout-button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </button>
      </div>
    </div>
  );
}
