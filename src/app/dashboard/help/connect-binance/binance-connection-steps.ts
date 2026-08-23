export interface Step {
  title: string;
  description: string;
  warning?: string;
  imageAlt: string;
}

export const BINANCE_REFERRAL = 'https://www.binance.com/en/register';

export const STEPS: Step[] = [
  {
    title: 'Créer un compte Binance',
    description: "Si tu n'as pas encore de compte Binance, clique sur le bouton ci-dessous. C'est gratuit et ça prend 2 minutes. MIDAS ne perçoit aucune commission sur la création de ton compte.",
    imageAlt: "Page d'accueil Binance",
  },
  {
    title: 'Se connecter à Binance',
    description: 'Connecte-toi à ton compte Binance avec ton email et ton mot de passe.',
    imageAlt: 'Page de login Binance',
  },
  {
    title: 'Aller dans les paramètres API',
    description: "Clique sur ton avatar en haut à droite, puis sur 'Gestion API'. Tu peux aussi aller directement sur binance.com/fr/my/settings/api-management",
    imageAlt: 'Menu avec flèche sur Gestion API',
  },
  {
    title: 'Créer une nouvelle clé API',
    description: "Clique sur 'Créer une API'. Choisis un nom, par exemple 'MIDAS'. Binance va te demander une vérification (email ou 2FA).",
    imageAlt: 'Bouton Créer une API',
  },
  {
    title: 'Configurer les permissions',
    description: 'Coche UNIQUEMENT ces 2 permissions : Lecture des informations et Activer le trading Spot.',
    warning: "NE COCHE JAMAIS 'Activer les retraits'. MIDAS n'a pas besoin de retirer ton argent. Ton argent reste sur TON compte Binance.",
    imageAlt: 'Cases à cocher permissions',
  },
  {
    title: 'Copier la clé API',
    description: 'Binance affiche ta clé API (API Key). Copie-la et garde-la en sécurité. Tu ne pourras plus la revoir après.',
    imageAlt: 'Clé API affichée',
  },
  {
    title: 'Copier la clé secrète',
    description: 'Binance affiche aussi ta clé secrète (Secret Key). Copie-la immédiatement. Elle ne sera plus jamais visible après cette page.',
    imageAlt: 'Clé secrète affichée',
  },
  {
    title: 'Coller dans MIDAS',
    description: 'Retourne sur MIDAS. Colle ta clé API et ta clé secrète dans les champs ci-dessous. MIDAS les chiffre automatiquement (AES-256). Personne ne peut les voir, même pas nous.',
    imageAlt: 'Formulaire MIDAS',
  },
];
