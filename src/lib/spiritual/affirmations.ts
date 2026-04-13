// MIDAS domain = abondance/abundance affirmations
export const AFFIRMATIONS = [
  "L'abondance coule naturellement vers moi.",
  "Chaque decision financiere que je prends est guidee par la sagesse.",
  "Je merite la prosperite et je l'accueille avec gratitude.",
  "Mon intuition et l'intelligence artificielle travaillent ensemble pour ma reussite.",
  "Je suis aligne avec le flux de la richesse.",
  "Chaque trade est une opportunite d'apprendre et de grandir.",
  "La patience est ma plus grande force sur les marches.",
  "Je fais confiance au processus et je reste discipline.",
  "Mon capital grandit parce que je prends des decisions eclairees.",
  "Je suis reconnaissant pour chaque gain, petit ou grand.",
  "La clarte mentale est mon avantage sur le marche.",
  "Je suis capable de creer la vie financiere que je desire.",
  "Chaque jour, je deviens un meilleur investisseur.",
  "Je lache prise sur la peur et j'accueille les opportunites.",
  "Mon portefeuille reflete ma discipline et ma vision.",
];

export const WISDOM_QUOTES = [
  { text: "Le marche est un transfert de richesse des impatients vers les patients.", author: "Warren Buffett" },
  { text: "Le vrai pouvoir vient de la discipline interieure.", author: "Bouddha" },
  { text: "La fortune sourit aux esprits prepares.", author: "Louis Pasteur" },
  { text: "Ce n'est pas le vent qui decide de ta destination, c'est l'orientation de tes voiles.", author: "Jim Rohn" },
  { text: "Celui qui connait les autres est sage. Celui qui se connait lui-meme est eclaire.", author: "Lao Tseu" },
  { text: "La patience est amere, mais son fruit est doux.", author: "Aristote" },
  { text: "Sois le changement que tu veux voir dans le monde.", author: "Gandhi" },
  { text: "L'excellence n'est pas un acte, mais une habitude.", author: "Aristote" },
  { text: "Ne crains pas d'avancer lentement, crains seulement de t'arreter.", author: "Proverbe chinois" },
  { text: "Le succes est la somme de petits efforts repetes jour apres jour.", author: "Robert Collier" },
];

export const EMPOWERING_TEXTS: Record<string, string> = {
  loading: "Ton espace se prepare...",
  error: "Petit detour, on revient plus fort.",
  empty: "L'espace de toutes les possibilites.",
  welcome: "Bienvenue chez toi.",
  logout: "A tres vite, belle ame.",
  success: "Tu vois ? Tu es capable de tout.",
  waiting: "La patience est une force.",
  analyzing: "MIDAS analyse les marches pour toi...",
  trade_win: "Excellente decision, continue comme ca !",
  trade_loss: "Chaque recul prepare un bond en avant.",
};

export function getRandomAffirmation(): string {
  return AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
}

export function getRandomQuote(): { text: string; author: string } {
  return WISDOM_QUOTES[Math.floor(Math.random() * WISDOM_QUOTES.length)];
}

export function getEmpoweringText(key: string): string {
  return EMPOWERING_TEXTS[key] ?? key;
}

export const AWAKENING_LEVELS = [
  { level: 1, name: 'Eveille', minXp: 0 },
  { level: 2, name: 'Conscient', minXp: 500 },
  { level: 3, name: 'Aligne', minXp: 2000 },
  { level: 4, name: 'Illumine', minXp: 5000 },
  { level: 5, name: 'Transcendant', minXp: 15000 },
  { level: 6, name: 'Unifie', minXp: 50000 },
];

export function getAwakeningLevel(xp: number): { level: number; name: string } {
  for (let i = AWAKENING_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= AWAKENING_LEVELS[i].minXp) return AWAKENING_LEVELS[i];
  }
  return AWAKENING_LEVELS[0];
}
