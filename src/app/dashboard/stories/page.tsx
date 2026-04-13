'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Image,
  Share2,
  Trophy,
  Flame,
  TrendingUp,
  Target,
  Award,
  Download,
  Loader2,
  Sparkles,
} from 'lucide-react';

type StoryType = 'streak' | 'palier' | 'gains' | 'classement' | 'achievement';

interface StoryTemplate {
  type: StoryType;
  label: string;
  icon: typeof Trophy;
  gradient: string;
  description: string;
}

const TEMPLATES: StoryTemplate[] = [
  { type: 'streak', label: 'Streak', icon: Flame, gradient: 'from-amber-500 to-orange-600', description: 'Montre ta discipline de trading' },
  { type: 'palier', label: 'Palier', icon: Target, gradient: 'from-emerald-500 to-teal-600', description: 'Celebre un nouveau palier atteint' },
  { type: 'gains', label: 'Gains', icon: TrendingUp, gradient: 'from-green-500 to-emerald-600', description: 'Partage ta performance' },
  { type: 'classement', label: 'Classement', icon: Trophy, gradient: 'from-[var(--gold-primary)] to-amber-600', description: 'Ta position dans le classement' },
  { type: 'achievement', label: 'Achievement', icon: Award, gradient: 'from-purple-500 to-indigo-600', description: 'Un badge debloque' },
];

export default function StoriesPage() {
  const [selectedType, setSelectedType] = useState<StoryType>('streak');
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const selectedTemplate = TEMPLATES.find(t => t.type === selectedType)!;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/story?type=${selectedType}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setGeneratedUrl(url);
      }
    } catch {
      /* silent */
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedUrl) return;
    const a = document.createElement('a');
    a.href = generatedUrl;
    a.download = `midas-story-${selectedType}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!generatedUrl) return;
    try {
      const response = await fetch(generatedUrl);
      const blob = await response.blob();
      const file = new File([blob], `midas-story-${selectedType}.png`, { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          title: 'Mon MIDAS Story',
          files: [file],
        });
        // Record share
        await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'story' }),
        });
      }
    } catch {
      /* fallback: copy link */
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-[var(--gold-primary)]" />
          Stories
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Cree et partage des stories de tes performances (+300 pts)
        </p>
      </div>

      {/* Templates */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.type}
            onClick={() => { setSelectedType(t.type); setGeneratedUrl(null); }}
            className={`glass-card p-4 text-center transition-all ${
              selectedType === t.type
                ? 'border-[var(--gold-primary)]/30 ring-1 ring-[var(--gold-primary)]/20'
                : 'hover:bg-white/[0.04]'
            }`}
            data-testid={`story-template-${t.type}`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center mx-auto mb-2`}>
              <t.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-[var(--text-primary)]">{t.label}</p>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <selectedTemplate.icon className="w-5 h-5 text-[var(--gold-primary)]" />
          <p className="text-sm font-medium text-[var(--text-primary)]">{selectedTemplate.label}</p>
          <span className="text-xs text-[var(--text-secondary)]">{selectedTemplate.description}</span>
        </div>

        {/* Preview area */}
        <div className="aspect-[9/16] max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-[#0A0A0F] to-[#1a1a2e] relative">
          {generatedUrl ? (
            <img src={generatedUrl} alt="Story preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedTemplate.gradient} flex items-center justify-center mb-4`}>
                <selectedTemplate.icon className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/60 text-sm">Clique sur Generer pour creer ta story</p>
              <p className="text-white/30 text-xs mt-2">Format 1080 x 1920</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold-primary)] to-amber-600 text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            data-testid="generate-story"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
            Generer
          </button>
          {generatedUrl && (
            <>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] text-[var(--text-primary)] font-semibold text-sm hover:bg-white/[0.1] transition-colors"
                data-testid="download-story"
              >
                <Download className="w-4 h-4" />
                Telecharger
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                data-testid="share-story"
              >
                <Share2 className="w-4 h-4" />
                Partager
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
