export type Step = 'overview' | 'identity' | 'address' | 'document' | 'review';

export const DOCUMENT_TYPES = [
  { id: 'passport' as const, label: "Passeport", icon: '🛂' },
  { id: 'id_card' as const, label: "Carte d'identité", icon: '🪪' },
  { id: 'driver_license' as const, label: 'Permis de conduire', icon: '🚗' },
];
