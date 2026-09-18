-- =============================================================================
-- Migration 006: Add pending_review status for anti-fraud flagged commissions
-- Pour @purama/antifraud — MOULE-ANTIFRAUDE.md layer 3 (collusion detection)
-- =============================================================================

-- Ajouter 'pending_review' au CHECK constraint du statut commission
-- (détecté lors du rollout antifraud — status existants: pending, approved, paid, rejected)
ALTER TABLE public.partner_commissions
  DROP CONSTRAINT IF EXISTS partner_commissions_status_check;

ALTER TABLE public.partner_commissions
  ADD CONSTRAINT partner_commissions_status_check
  CHECK (status IN ('pending', 'pending_review', 'approved', 'paid', 'rejected'));

COMMENT ON COLUMN public.partner_commissions.status IS 'pending = en attente approbation normale | pending_review = flaggé anti-fraude (collusion) → revue humaine requise avant payout | approved = approuvé pour payout | paid = payé | rejected = rejeté définitif';
