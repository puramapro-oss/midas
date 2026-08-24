export interface Aide {
  id: string;
  nom: string;
  type_aide: string;
  montant_max: number | null;
  description: string | null;
  url_officielle: string | null;
  probability?: 'probable' | 'possible' | 'verifier';
}

export interface Dossier {
  id: string;
  aide_id: string;
  statut: string;
  created_at: string;
  aide?: Aide;
}
