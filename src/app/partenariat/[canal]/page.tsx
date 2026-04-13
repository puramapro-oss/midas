'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check, Mic, Globe, Zap, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { PartnerChannel } from '@/types/partnership';

const CHANNEL_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  description: string;
  fields: { name: string; label: string; placeholder: string; type: string; required?: boolean }[];
}> = {
  influencer: {
    label: 'Influenceur',
    icon: Mic,
    description: 'Creez du contenu autour de MIDAS et gagnez des commissions sur chaque inscription.',
    fields: [
      { name: 'youtube', label: 'Chaine YouTube', placeholder: 'https://youtube.com/@votre-chaine', type: 'url' },
      { name: 'twitter', label: 'Compte X/Twitter', placeholder: 'https://x.com/votre-compte', type: 'url' },
      { name: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/votre-compte', type: 'url' },
      { name: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@votre-compte', type: 'url' },
    ],
  },
  website: {
    label: 'Site web',
    icon: Globe,
    description: 'Integrez MIDAS sur votre site et generez des revenus passifs avec votre trafic.',
    fields: [
      { name: 'website_url', label: 'URL du site', placeholder: 'https://votre-site.com', type: 'url', required: true },
      { name: 'monthly_visitors', label: 'Visiteurs mensuels estimes', placeholder: '10000', type: 'text' },
    ],
  },
  media: {
    label: 'Media',
    icon: Zap,
    description: 'Partagez MIDAS via vos canaux mediatiques et gagnez sur chaque nouvel abonne.',
    fields: [
      { name: 'media_name', label: 'Nom du media', placeholder: 'CryptoNews FR', type: 'text', required: true },
      { name: 'newsletter', label: 'Newsletter', placeholder: 'https://votre-newsletter.com', type: 'url' },
      { name: 'podcast', label: 'Podcast', placeholder: 'https://votre-podcast.com', type: 'url' },
    ],
  },
  physical: {
    label: 'Physique',
    icon: MapPin,
    description: 'Organisez des evenements ou formations et recevez des bonus physiques en plus.',
    fields: [
      { name: 'city', label: 'Ville', placeholder: 'Paris', type: 'text', required: true },
      { name: 'event_type', label: 'Type d\'evenement', placeholder: 'Meetup, Formation, Conference', type: 'text' },
    ],
  },
};

export default function ChannelRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const canal = (params?.canal as string) ?? 'influencer';

  const config = CHANNEL_CONFIG[canal];

  const [formData, setFormData] = useState<Record<string, string>>({
    display_name: '',
    bio: '',
    motivation: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.display_name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Build social_links from channel-specific fields
      const socialLinks: Record<string, string> = {};
      if (config?.fields) {
        for (const field of config.fields) {
          const val = formData[field.name];
          if (val) {
            socialLinks[field.name] = val;
          }
        }
      }

      const res = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: canal as PartnerChannel,
          display_name: formData.display_name.trim(),
          bio: formData.bio?.trim() || undefined,
          website_url: formData.website_url || socialLinks.website_url || undefined,
          social_links: socialLinks,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? 'Erreur lors de l\'inscription');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/partenaire');
      }, 2000);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  }, [formData, submitting, canal, config, router]);

  if (!config) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">Canal invalide</p>
          <Link href="/partenariat" className="text-[var(--gold-primary)] underline">
            Retour au programme partenaire
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--gold-primary)] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Connexion requise
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Vous devez etre connecte pour devenir partenaire MIDAS.
          </p>
          <Link
            href={`/login?next=/partenariat/${canal}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold hover:opacity-90 transition-opacity"
            data-testid="partner-login-cta"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const ChannelIcon = config.icon;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/partenariat"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8"
          data-testid="partner-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au programme partenaire
        </Link>

        {success ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-[var(--success)]/20 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[var(--success)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-orbitron)' }}>
              Bienvenue dans le programme !
            </h2>
            <p className="text-[var(--text-secondary)]">
              Redirection vers votre dashboard partenaire...
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 md:p-8"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                <ChannelIcon className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  Partenaire {config.label}
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">{config.description}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Display name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Nom d&apos;affichage *
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => handleChange('display_name', e.target.value)}
                  placeholder="Votre nom ou pseudo"
                  required
                  className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold-primary)]/30"
                  data-testid="partner-name"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Bio / Presentation
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Decrivez votre activite en quelques mots"
                  rows={3}
                  maxLength={500}
                  className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold-primary)]/30 resize-none"
                  data-testid="partner-bio"
                />
              </div>

              {/* Channel-specific fields */}
              {config.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    {field.label} {field.required && '*'}
                  </label>
                  <input
                    type={field.type}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold-primary)]/30"
                    data-testid={`partner-${field.name}`}
                  />
                </div>
              ))}

              {/* Motivation */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Pourquoi voulez-vous devenir partenaire ?
                </label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => handleChange('motivation', e.target.value)}
                  placeholder="Dites-nous ce qui vous motive..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold-primary)]/30 resize-none"
                  data-testid="partner-motivation"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="partner-submit"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Devenir partenaire</>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
