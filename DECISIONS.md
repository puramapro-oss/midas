# DECISIONS.md — MIDAS

## Retention (RETENTION-BRIEF.md, décision Tissma 02/09/2026, pilote #10 @purama/retention)
| ID | Décision |
|---|---|
| D-MI01 | `public.subscriptions` n'existe pas en base (vérifié `to_regclass('public.subscriptions')` NULL, VPS 2026-09-03) alors que `portal/route.ts`, `handlers-subscription.ts`, `handlers-payment.ts`, `handlers-fulfillment.ts` font tous `.from('subscriptions').upsert/update(...)` — dead code silencieux depuis le lancement (Supabase ne remonte pas d'erreur bloquante sur un upsert vers une table absente selon le contexte, ou l'erreur est avalée). `public.profiles` (plan, plan_period, stripe_customer_id, stripe_subscription_id) est la source de vérité locale ; Stripe reste la source de vérité pour le statut/dates live. `src/lib/retention.ts` lit exclusivement `profiles`+Stripe, jamais `subscriptions`. Le nettoyage des autres appels `.from('subscriptions')` (webhook handlers) est HORS PÉRIMÈTRE de ce chantier retention — tracé ici, pas silencieusement oublié. |
| D-MI02 | MIDAS a 2 paliers payants réels (Pro 39€/79€ ultra, price_id vérifiés live via l'API Stripe 2026-09-03, aucun écart code/Stripe). `palier` de l'échelle = ultra→pro uniquement, absent pour les abonnés Pro (pas de palier payant inférieur) et absent pour les abonnés Free (pas un "palier" Stripe). |
| D-MI03 | La page `/dashboard/settings/abonnement` était **cassée en production** : `getData()` sélectionnait `billing_period, subscription_status, subscription_started_at, wallet_balance, prime_total_credited, streak` — colonnes toutes absentes de `public.profiles` (vérifié `information_schema.columns`, 0 résultat sur les 6). PostgREST renvoie une erreur sur une colonne inexistante ⇒ `profile` restait `null` ⇒ la page affichait "Chargement…" à l'infini, `CancelModal` (et donc toute résiliation) était **inatteignable**. Corrigé : colonnes réelles (`plan, plan_period, stripe_subscription_id, streak_days`), statut résolu en direct sur Stripe. Portée strictement nécessaire à ce chantier (rendre la page fonctionnelle + y brancher l'échelle), pas un audit complet de l'app. |
| D-MI04 | `prime_tranches` (table référencée par l'ancien `getData()`) n'existe pas non plus (`to_regclass` NULL). Feature "Prime de bienvenue" jamais construite côté DB — section supprimée de la page plutôt que de continuer à interroger une table absente. Hors périmètre de reconstruire cette feature ici (aucun lien avec la rétention). |
| D-MI05 | Aucun coupon "-50% à vie" ou similaire pré-existant trouvé dans MIDAS (contrairement à DRISHTI/LUMIOS/VIDA-LANGUE) — rien à retirer, coupon écosystème `WEw79rus` réutilisé directement, vérifié live (`repeating`, 3 mois, 50%, valid) avant intégration. |
| D-MI06 | Pas d'infra Playwright dans MIDAS pour cette page — preuve "Résilier quand même" structurelle (présente sur chaque écran sauf `feedback`, lecture de code), pas automatisée. Cohérent avec la majorité des pilotes précédents. |
| D-MI07 | Anti-abus multi-comptes KYC : non implémenté (MIDAS n'a pas de KYC natif pour la rétention) — clé d'unicité reste `user_id`, documenté ici plutôt qu'un KYC inventé. |
| D-EN01 | Intégration @purama/entraide (2026-09-04) : 5 tables créées dans schéma midas (entraide_profils, entraide_blocages, missions_collectives + participants, entraide_contact_requests, entraide_signalements). Distincte de la table collaborative_missions pré-existante (feature différente, pas de réutilisation). Adaptation domaine trading : vocabulaire "Cercle de Traders", "binôme analyse marché", "partage stratégies entre pairs" (CLAUDE.md Loi 12). |
| D-EN02 | Routes API créées : /api/entraide/matches (GET suggestions compatibilité), /api/entraide/missions (GET/POST), /api/entraide/missions/[id]/actions (POST join/leave/start/complete/cancel), /api/entraide/contacts (GET/POST), /api/entraide/contacts/[id]/respond (POST accept/decline/block). Toutes les écritures passent par service_role via fonctions pures @purama/entraide, jamais d'écrit direct client (respect MOULE-ENTRAIDE §3 verrou anti-doublon/quorum). |
| D-EN03 | Adapter src/lib/entraide.ts implémente MOULE-ENTRAIDE.md §1 contre schéma midas, réutilise clients Supabase existants. Schéma explicite 'midas' dans les requêtes `.from('midas.entraide_*')` car client configuré avec `schema: 'public'` par défaut — pas de `NEXT_PUBLIC_SUPABASE_DB_SCHEMA` dans .env.local (choix hérité, pas modifié). |
| D-EN04 | Contact sécurisé : `resolveContactChannel()` crée/récupère une conversation dans midas.chat_conversations (table pré-existante). Jamais d'email/téléphone brut exposé côté client (MOULE-ENTRAIDE §4). Blocage → entraide_blocages (unilatéral, pas symétrique). |
| D-EN05 | UI /dashboard/entraide : 3 tabs (Missions Collectives, Traders Compatibles, Demandes Contact). Vocabulaire adapté domaine trading. Design GOD MODE (tokens CSS, glass cards, responsive 375px, dark mode). Sidebar ajouté : "Cercle de Traders" (icône Users2) après "Communauté". VRAIES lectures/écritures DB dès l'écriture initiale (0 mock) — respect consigne critique. |
| D-EN06 | Limites assumées : anti-abus multi-comptes KYC non implémenté (MIDAS n'a pas de KYC natif pour entraide, clé reste `user_id` comme 13 pilotes @purama/retention précédents, MOULE-ENTRAIDE §5). Bug public.subscriptions pré-existant (D-MI01) non corrigé, hors périmètre. |
| D-EN07 | Bug bloquant corrigé (2026-09-04) : la feature entraide était **inutilisable** — aucune route ni formulaire pour créer/éditer son propre profil entraide (midas.entraide_profils). Sans profil créé, `/api/entraide/matches` retourne TOUJOURS liste vide (0 traders compatibles), aucun matching possible (Loi 9 CLAUDE.md). Ajouté : `/api/entraide/profil/route.ts` (GET : lit profil via service_role scoped auth.uid(), retourne null si absent ; PUT : upsert skills_offered/needed, availability_days, radius_km, location_lat/lng, validation Zod). UI : nouvel onglet "Mon Profil" (distinct de "Traders Compatibles" qui affiche les matches) avec formulaire réel : compétences trading offertes/demandées (input texte séparé virgules), disponibilités (boutons jours semaine), rayon km (range 5-500). États loading/saving/error réels, vocabulaire domaine trading (CLAUDE.md Loi 12). Prouvé : tsc 0 erreur, build réussi. |


<!-- MIDAS:ASSISTED_AUTOMATIC:20261126:BEGIN -->
## Deux modes MIDAS et responsabilité des ordres

Décision de Matiss du 26 novembre 2026 (Europe/Paris), précisant le parcours multi-actifs existant. Deux choix principaux, un seul MIDAS et un moteur d’analyse partagé. Le mode manuel demandé est une assistance par analyse et notifications ; il ne donne aucune autorisation d’exécuter à l’IA, même après lecture ou validation d’une alerte.

| Mode | Travail de MIDAS | Autorité sur les ordres |
| --- | --- | --- |
| Assisté — je passe mes ordres | Analyser les marchés couverts, expliquer les conditions et risques, notifier une entrée, une modification, une invalidation ou une sortie. | L’utilisateur ouvre, modifie, annule et ferme lui-même via le parcours de courtage autorisé. Aucun ordre IA en réponse à une alerte, à son acquittement ou au silence. |
| Automatique — MIDAS exécute | Réutiliser la même analyse puis gérer les positions dans le cadre du mandat. | Chaque action IA exige le mandat actif, le compte et les droits vérifiés, le périmètre d’actifs/actions et les limites applicables. Pause et révocation restent possibles. |

### Réutilisation et compatibilité

- Conserver `InvestmentModeActions` comme présentation partagée pour l’accueil, le panneau de trading et les paramètres. Ne pas créer une seconde application, un second moteur ou un registre financier parallèle.
- Réutiliser `generate-and-persist`, les signaux, les préférences et composants de notifications, le suivi des positions et les contrôles de risque existants après qualification. Un code présent ne prouve pas un circuit opérationnel.
- Le champ historique `auto_trade_enabled` reste en place ; il ne constitue ni un mandat signé, ni une preuve d’habilitation, ni une activation réelle. Aucun nouveau champ concurrent de mode n’est créé dans ce lot.
- Si un ancien parcours « je valide puis MIDAS transmet » est retrouvé, préserver son historique et le distinguer du mode assisté. Ne pas le migrer silencieusement et ne pas ajouter un troisième choix dans l’interface principale.
- Un plan d’investissement que le client a programmé explicitement conserve sa nature d’instruction programmée. Il ne transforme pas une notification en ordre et ne constitue pas le mode assisté par alertes.
- Les règles existantes de frais, de performance et de réserve des gains restent attachées à des opérations confirmées. Une alerte, sa lecture ou une simulation ne crée ni gain réalisé ni commission ; changer de mode ne facture pas une seconde fois le même événement.

### Contrat à qualifier avant ouverture du service

Une alerte exploitable doit identifier l’instrument et son marché, le sens, les conditions d’entrée ou de sortie, l’invalidation, les risques et coûts connus, la source et l’âge des données, sa version et son expiration. Le niveau de confiance n’est pas une probabilité de gain garantie. Une donnée essentielle absente, une alerte périmée ou une opportunité invalidée empêche de présenter l’idée comme active. L’inaction est un résultat possible.

Une alerte n’est pas une position. Distinguer une opération confirmée par le courtier, une opération déclarée par l’utilisateur et un état inconnu. Si le compte n’est pas lisible, MIDAS ne peut pas attester que l’entrée ou la sortie a eu lieu. Une recommandation de sortie en mode assisté déclenche uniquement une notification.

Au dernier point avant tout appel courtier, le serveur doit recontrôler l’autorité de l’action, le mode actuel, la version du mandat, sa révocation et les limites. Cela couvre agents, files, crons, webhooks, contrôles de risque et reprises. Le parcours manuel initié explicitement par l’utilisateur conserve ses propres vérifications.

Le passage automatique → assisté bloque les nouvelles initiatives IA et invalide les travaux non transmis. Les appels déjà engagés et les réponses incertaines doivent être rapprochés ; le changement de mode ne liquide pas les positions et n’annule pas les stops ou objectifs existants chez le courtier. Ceux-ci peuvent encore se déclencher. Le passage assisté → automatique ne rejoue pas les anciennes alertes et n’adopte pas les positions manuelles hors du mandat. Dédupliquer séparément recommandations, notifications et ordres.

| Vérification future | Résultat attendu |
| --- | --- |
| Lecture, validation ou notification répétée en assisté | Aucun appel d’ouverture, modification, annulation ou clôture par l’IA. |
| Recommandation de sortie | Notification seulement ; la position ne devient pas « fermée » sans preuve. |
| Mode modifié ou mandat révoqué pendant un travail en attente | Refus au contrôle final ; rapprochement des effets déjà engagés. |
| Activation automatique avec anciennes alertes ou positions manuelles | Aucun rejeu ni prise en charge silencieuse. |
| Timeout courtier ou état incomplet | État incertain conservé et rapproché avant nouvelle tentative. |
| Notification expirée, donnée manquante ou livraison non confirmée | Statut explicite ; aucune exécution déduite d’un accusé ou d’une absence de réponse. |

### Portée du correctif

Base examinée : PR #34, `56da045e6fc32d47f9709b8ec73c89ab98917bea`. La présentation partagée distingue les deux modes et leur indisponibilité actuelle ; les faux interrupteurs locaux d’activation du trading et de protection Shield sont remplacés par cette présentation et un état explicite. Les réglages de démonstration sont signalés comme non enregistrés. Les API d’ordres, la persistance des mandats, les alertes en direct et leur livraison ne sont pas implémentées par ce changement de présentation. Le contrôle D2=A existant reste appliqué.

L’absence d’exécution automatique ne dispense pas de qualifier une recommandation personnalisée : voir [ESMA, définition du conseil sous MiFID II, §26 et §33](https://www.esma.europa.eu/sites/default/files/2023-07/ESMA35-43-3861_Supervisory_briefing_on_understanding_the_definition_of_advice_under_MiFID_II.pdf). L’ouverture des alertes actionnables et de la gestion déléguée exige leurs capacités, autorisations et qualifications propres.
### Vérification de cette présentation

Contrôle du 26 novembre 2026, après correction du contraste clair détecté à 4,338:1 :

- **PASS** — 87 tests unitaires existants ; modules métier testés non modifiés par ce lot.
- **PASS** — TypeScript ciblé sur le composant partagé, `TradingTab`, leurs dépendances et les tests de l’accueil ; contrôle `git diff --check` et contrat NIYAMA existant.
- **PASS** — construction Next.js 16.3.5 / React 19.2.4 d’un hôte isolé utilisant la page publique réelle et les composants réels du dépôt. Cet hôte n’inclut pas les API financières et ne remplace pas un build complet de MIDAS.
- **PASS** — 15 scénarios de `e2e/landing.spec.ts` exécutés à 375 et 1 280 pixels, soit 30 exécutions. Deux contrôles supplémentaires du composant paramètres (clair/sombre), aux deux largeurs, donnent 4 exécutions. Total : **34 réussites, aucun échec, aucun test ignoré, aucune reprise** sur la campagne finale.
- **PASS au périmètre observé** — contenu des deux modes, ouverture/fermeture des détails au clavier, comparaison et favori existants, absence de requête d’écriture/d’ordre pendant les interactions testées, absence de débordement horizontal et contraste d’au moins 4,5:1 pour les textes visibles des deux modes en paramètres. Captures mobile sombre et ordinateur clair examinées.
- Le bouton de sauvegarde est masqué pour l’onglet Trading, dont les réglages restent un aperçu sans persistance ; cette condition du parent a été revue statiquement. Le parent complet avec authentification n’a pas été exécuté dans l’hôte de vérification.
- **NON TESTÉ** — application complète avec dépendances privées, authentification réelle, iOS/Android natifs, alertes actionnables, livraison de notifications, mandats et contrôle serveur spécifique des deux modes, ordres courtier et service déployé. Les contrôles d’interface ne prouvent aucun de ces services.

La livraison complète la PR #34 existante ; les déploiements Git Vercel sont désactivés uniquement pour sa branche `feat/trading-cost-comparison` afin de conserver le brouillon sans publication automatique. Aucune autre branche ni règle d’accès n’est modifiée.

<!-- MIDAS:ASSISTED_AUTOMATIC:20261126:END -->
