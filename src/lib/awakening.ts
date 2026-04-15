// =============================================================================
// MIDAS — V6 Awakening Helper
// Couche éveil : affirmations, niveaux, messages subconscients.
// Utilisé par SpiritualLayer, AffirmationModal, WisdomFooter, SubconsciousEngine.
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';

export type AffirmationCategory =
  | 'love'
  | 'power'
  | 'abundance'
  | 'health'
  | 'wisdom'
  | 'gratitude';

export interface Affirmation {
  id: string;
  category: AffirmationCategory;
  text_fr: string;
  text_en: string;
  frequency_weight: number;
}

// Fallback si DB vide ou erreur — JAMAIS laisser l'écran vide.
const FALLBACK: Record<AffirmationCategory, string> = {
  love: "Je mérite l'abondance qui vient à moi avec grâce.",
  power: "Je suis l'architecte de ma propre réussite.",
  abundance: 'Chaque trade me rapproche de ma liberté financière.',
  health: 'Mon esprit est calme, mes décisions sont claires.',
  wisdom: 'La patience est mon plus grand avantage sur les marchés.',
  gratitude: 'Je suis reconnaissant pour chaque opportunité du jour.',
};

/**
 * Tire une affirmation pondérée par frequency_weight.
 * Préfère DB (table `affirmations`) — fallback statique sinon.
 */
export async function getAffirmation(
  category?: AffirmationCategory,
  locale: 'fr' | 'en' = 'fr',
): Promise<{ text: string; category: AffirmationCategory }> {
  try {
    const supabase = createServiceClient();
    let query = supabase.from('affirmations').select('*');
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      const cat: AffirmationCategory = category ?? pickCategoryOfDay();
      return { text: FALLBACK[cat], category: cat };
    }
    // Pondération par frequency_weight
    const total = data.reduce((sum, a: Affirmation) => sum + (a.frequency_weight ?? 1), 0);
    let pick = Math.random() * total;
    for (const a of data as Affirmation[]) {
      pick -= a.frequency_weight ?? 1;
      if (pick <= 0) {
        return {
          text: locale === 'en' ? a.text_en : a.text_fr,
          category: a.category,
        };
      }
    }
    const fallbackAff = (data as Affirmation[])[0];
    return {
      text: locale === 'en' ? fallbackAff.text_en : fallbackAff.text_fr,
      category: fallbackAff.category,
    };
  } catch {
    const cat: AffirmationCategory = category ?? pickCategoryOfDay();
    return { text: FALLBACK[cat], category: cat };
  }
}

/**
 * Catégorie du jour — rotation déterministe sur 6 jours.
 */
export function pickCategoryOfDay(): AffirmationCategory {
  const cats: AffirmationCategory[] = ['power', 'abundance', 'wisdom', 'gratitude', 'health', 'love'];
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return cats[day % cats.length];
}

/**
 * Track un événement d'éveil (affirmation vue, respiration, gratitude…) +XP.
 */
export async function trackAwakening(
  userId: string,
  eventType:
    | 'affirmation_seen'
    | 'breath_session'
    | 'gratitude_entry'
    | 'intention_set'
    | 'meditation_done',
  xpGained = 10,
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('awakening_events').insert({
      user_id: userId,
      event_type: eventType,
      xp_gained: xpGained,
    });
    if (eventType === 'affirmation_seen') {
      await supabase.rpc('increment_affirmations_seen', { uid: userId }).throwOnError();
    }
  } catch {
    // Silencieux — l'éveil ne doit jamais bloquer l'UX.
  }
}

/**
 * Messages subconscients — intégrés naturellement dans les réponses IA.
 * Ne jamais apparaître comme tels — toujours tissés dans un contexte plus large.
 */
const SPIRITUAL_SEEDS = [
  "L'abondance suit l'alignement.",
  'La patience est une forme de confiance.',
  'Chaque perte est une leçon qui paye ses propres dividendes.',
  'Le marché récompense la discipline, pas l\'urgence.',
  "L'intuition bien nourrie devient prévision.",
  'Respirer avant de cliquer.',
];

export function getSpiritualMessage(): string {
  return SPIRITUAL_SEEDS[Math.floor(Math.random() * SPIRITUAL_SEEDS.length)];
}

/**
 * Niveau d'éveil basé sur affirmations_seen.
 * 0-10 = Éveil naissant | 11-50 = Conscience | 51-150 = Présence | 151+ = Sagesse
 */
export function getAwakeningLevel(affirmationsSeen: number): {
  level: number;
  label: string;
  next: number;
} {
  if (affirmationsSeen < 10) return { level: 1, label: 'Éveil naissant', next: 10 };
  if (affirmationsSeen < 50) return { level: 2, label: 'Conscience', next: 50 };
  if (affirmationsSeen < 150) return { level: 3, label: 'Présence', next: 150 };
  return { level: 4, label: 'Sagesse', next: 0 };
}
