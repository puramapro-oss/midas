-- MIDAS Seed Data
-- Run via: sshpass -p '+Awy3cwg;NoutOTH' ssh -o StrictHostKeyChecking=no root@72.62.191.111 "docker exec -i supabase-db psql -U supabase_admin -d postgres" < seed.sql

-- ==========================================
-- Boutique Items
-- ==========================================
INSERT INTO midas.point_shop_items (category, name, description, cost_points, value, is_active) VALUES
  ('reduction', '-10% sur ton abonnement', 'Applique une reduction de 10% sur ton prochain renouvellement', 1000, '10', true),
  ('reduction', '-30% sur ton abonnement', 'Grosse reduction de 30% sur ton prochain mois', 3000, '30', true),
  ('reduction', '-50% sur ton abonnement', 'Reduction massive de 50% — la meilleure affaire', 5000, '50', true),
  ('subscription', '1 mois GRATUIT', 'Un mois complet offert sur ton plan actuel', 10000, '1_month_free', true),
  ('subscription', '1 mois Starter', 'Debloque le plan Starter pendant 1 mois', 15000, '1_month_starter', true),
  ('subscription', '1 mois Pro', 'Passe au plan Pro pendant 1 mois complet', 30000, '1_month_pro', true),
  ('subscription', '1 mois Ultra', 'Acces Ultra pendant 1 mois — toutes les features', 50000, '1_month_ultra', true),
  ('ticket', '1 Ticket Tirage', 'Un ticket supplementaire pour le prochain tirage mensuel', 500, '1_ticket', true),
  ('ticket', '5 Tickets Tirage', 'Pack de 5 tickets — maximise tes chances', 2000, '5_tickets', true),
  ('feature', 'Badge VIP', 'Affiche un badge VIP dore sur ton profil pendant 30 jours', 2500, 'vip_badge_30d', true),
  ('feature', 'Theme Gold', 'Debloque le theme exclusif Gold pour ton dashboard', 5000, 'theme_gold', true),
  ('cash', '1 euro en wallet', 'Convertis tes points en euros reels dans ton wallet', 10000, '1_eur', true),
  ('cash', '5 euros en wallet', 'Conversion avantageuse : 5 euros credits en wallet', 45000, '5_eur', true),
  ('cash', '10 euros en wallet', 'Le meilleur ratio points/euros disponible', 80000, '10_eur', true)
ON CONFLICT DO NOTHING;

-- ==========================================
-- FAQ Articles
-- ==========================================
INSERT INTO midas.faq_articles (category, question, answer, search_keywords, view_count, helpful_count) VALUES
  ('general', 'Qu''est-ce que MIDAS ?', 'MIDAS est ton assistant de trading IA. Il analyse les marches crypto en temps reel grace a 8 agents specialises (technique, sentiment, on-chain, calendrier, pattern, risque) et te propose des signaux de trading avec un niveau de confiance. Tu peux aussi activer le bot de trading automatique.', ARRAY['midas', 'trading', 'ia', 'crypto', 'bot'], 0, 0),
  ('general', 'MIDAS est-il gratuit ?', 'Oui ! Le plan Free te donne acces a 5 questions IA par jour et aux signaux de base. Pour des analyses illimitees, le bot automatique et les alertes en temps reel, passe au plan Pro ou Ultra.', ARRAY['gratuit', 'prix', 'plan', 'abonnement', 'free'], 0, 0),
  ('general', 'Comment fonctionne l''IA de MIDAS ?', 'MIDAS utilise 8 agents IA specialises qui analysent simultanement : l''analyse technique (RSI, MACD, Bollinger), le sentiment du marche, les donnees on-chain, le calendrier economique, la reconnaissance de patterns, et le risque. Un coordinateur synthetise tout ca en un signal clair.', ARRAY['ia', 'agent', 'analyse', 'technique', 'fonctionnement'], 0, 0),
  ('trading', 'Comment connecter mon compte Binance ?', 'Va dans Parametres > Exchanges, clique sur "Connecter Binance". Tu auras besoin de ta cle API et de ta cle secrete. Important : active uniquement les permissions de lecture et de trading spot, jamais les retraits. Un guide detaille est disponible dans l''aide.', ARRAY['binance', 'api', 'connexion', 'exchange', 'cle'], 0, 0),
  ('trading', 'Qu''est-ce que le paper trading ?', 'Le paper trading te permet de simuler des trades sans risquer d''argent reel. C''est ideal pour tester les strategies de MIDAS avant de passer en reel. Tous les nouveaux comptes commencent en paper trading pendant 14 jours.', ARRAY['paper', 'simulation', 'demo', 'virtuel', 'test'], 0, 0),
  ('trading', 'Comment fonctionne le bot automatique ?', 'Le bot execute automatiquement les signaux valides par l''IA quand la confiance depasse ton seuil configure (70% par defaut). Il gere les stop-loss, take-profit et trailing stops. Tu gardes toujours le controle et peux l''arreter a tout moment.', ARRAY['bot', 'automatique', 'auto', 'execution', 'trading'], 0, 0),
  ('trading', 'Quels sont les frais de trading ?', 'MIDAS ne preleve aucun frais sur tes trades. Les seuls frais sont ceux de l''exchange (Binance, etc.). Ton abonnement MIDAS te donne acces a l''IA et aux outils, pas de commission cachee.', ARRAY['frais', 'commission', 'cout', 'prix', 'fee'], 0, 0),
  ('wallet', 'Comment fonctionne le wallet ?', 'Ton wallet MIDAS accumule tes gains de parrainage, concours et tirages. Tu peux retirer des 5 euros par virement IBAN. Les retraits sont traites sous 48h ouvrees.', ARRAY['wallet', 'portefeuille', 'retrait', 'argent', 'iban'], 0, 0),
  ('wallet', 'Comment retirer mes gains ?', 'Va dans Dashboard > Wallet, clique sur "Retirer". Saisis le montant (minimum 5 euros) et ton IBAN. Le virement sera effectue sous 48h ouvrees. Tu recevras un email de confirmation.', ARRAY['retirer', 'retrait', 'virement', 'iban', 'gains'], 0, 0),
  ('parrainage', 'Comment fonctionne le parrainage ?', 'Partage ton code de parrainage unique. Pour chaque filleul qui s''inscrit et souscrit un abonnement, tu gagnes une commission : 50% du premier paiement + 10% a vie sur les paiements recurrents. Les gains sont verses dans ton wallet.', ARRAY['parrainage', 'referral', 'filleul', 'commission', 'partager'], 0, 0),
  ('parrainage', 'Quels sont les paliers de parrainage ?', 'Bronze (5 filleuls), Argent (10), Or (25), Platine (50), Diamant (75), Legende (100). Chaque palier debloque des avantages exclusifs : plan gratuit, early access, page personnalisee, et plus encore !', ARRAY['palier', 'bronze', 'argent', 'or', 'platine', 'diamant'], 0, 0),
  ('points', 'Comment gagner des Purama Points ?', 'Tu gagnes des points partout : inscription (+100), parrainage (+200), partage sur les reseaux (+300, max 3/jour), streak quotidien (+10/jour avec multiplicateur), achievements, feedback (+200), et bien plus. 1 point = 0.01 euro.', ARRAY['points', 'gagner', 'purama', 'recompense'], 0, 0),
  ('points', 'A quoi servent les Purama Points ?', 'Les points te permettent d''acheter des reductions (-10% a -50%), des mois d''abonnement gratuits, des tickets de tirage, des badges VIP, ou de les convertir directement en euros dans ton wallet. Visite la Boutique pour voir toutes les offres !', ARRAY['points', 'utiliser', 'depenser', 'boutique', 'reduction'], 0, 0),
  ('securite', 'Mes donnees sont-elles en securite ?', 'Absolument. MIDAS utilise le chiffrement de bout en bout, tes cles API sont stockees de maniere securisee et jamais partagees. Nous ne pouvons jamais retirer de fonds de ton exchange. Conforme RGPD et ePrivacy.', ARRAY['securite', 'donnees', 'rgpd', 'chiffrement', 'protection'], 0, 0),
  ('securite', 'MIDAS peut-il retirer de l''argent de mon exchange ?', 'Non, jamais. Quand tu connectes ton exchange, tu ne donnes que les permissions de lecture et de trading spot. Les permissions de retrait ne sont jamais demandees. Tu gardes le controle total de tes fonds.', ARRAY['retrait', 'exchange', 'permission', 'fonds', 'securite'], 0, 0)
ON CONFLICT DO NOTHING;

-- ==========================================
-- Lottery Draw (prochain tirage)
-- ==========================================
INSERT INTO midas.lottery_draws (draw_date, pool_amount, status)
SELECT '2026-04-30 23:59:00+02', 0, 'upcoming'
WHERE NOT EXISTS (SELECT 1 FROM midas.lottery_draws WHERE status = 'upcoming');

-- ==========================================
-- Pool Balances init
-- ==========================================
INSERT INTO midas.pool_balances (pool_type, balance, total_in, total_out)
VALUES
  ('reward', 0, 0, 0),
  ('asso', 0, 0, 0),
  ('partner', 0, 0, 0)
ON CONFLICT DO NOTHING;

-- ==========================================
-- Seed super admin profile if auth user exists
-- ==========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'matiss.frasne@gmail.com') THEN
    INSERT INTO midas.profiles (id, email, full_name, role, plan, subscription_status, wallet_balance, xp, level, streak, onboarding_completed, referral_code)
    SELECT id, 'matiss.frasne@gmail.com', 'Matiss', 'super_admin', 'ultra', 'active', 999999, 99999, 99, 365, true, 'MIDAS-ADMIN'
    FROM auth.users WHERE email = 'matiss.frasne@gmail.com'
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      plan = 'ultra',
      subscription_status = 'active',
      wallet_balance = 999999,
      xp = 99999,
      level = 99;
  END IF;
END $$;

-- Seed purama_points for super admin
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'matiss.frasne@gmail.com';
  IF admin_id IS NOT NULL THEN
    INSERT INTO midas.purama_points (user_id, balance, lifetime_earned)
    VALUES (admin_id, 999999, 999999)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
