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


### Réception fonctionnelle du 28 novembre 2026 — notifications et signaux

Ce lot prolonge les deux modes existants. Les neuf fichiers de départ liés aux modes, aux notifications et aux signaux ont été comparés octet pour octet entre la tête de PR34 `10f38d06918ed631a07d58e82185ab8e7c1ca97d` et le candidat consolidé `b1d36246a118c0a0428b29424f3c2f109068a68d` : identité confirmée. Le bundle de ce candidat, retrouvé sur le Mac, a été vérifié et importé en lecture de référence ; son prérequis est PR27 `fd5e69ff847bd952966804d9c2064d9895dfe10c`. Aucun nouveau moteur d'analyse, connecteur ou suivi de positions n'est créé.

**Comportement réalisé :**

- L'acquittement exige soit une liste non vide de 1 à 100 UUID, soit `all:true`, exclusivement. Les requêtes vides, ambiguës et les champs d'autorité supplémentaires sont refusés. Seul l'état lu des notifications du compte authentifié est modifié, y compris les anciennes lignes `read=NULL`.
- La boîte distingue une panne d'une liste vide. Le compteur porte sur toutes les notifications non lues du compte, indépendamment des 50 dernières affichées. La liste et le compteur proviennent de deux lectures : aucun instantané transactionnel commun n'est revendiqué.
- La cloche attend l'acquittement puis relit le serveur. Double clic, réponse tardive, notification arrivée entre-temps et rafraîchissement échoué sont traités sans faux succès.
- L'onglet Notifications utilise l'API de préférences existante. GET ne crée plus de ligne. Une absence prouvée affiche des valeurs par défaut non enregistrées ; une panne ne fabrique pas de valeurs. PATCH valide les champs existants et attend le retour de la même écriture.
- Le formulaire envoie seulement les champs modifiés ou dont la dernière écriture est incertaine. Une réponse perdue après écriture ne permet plus d'afficher « enregistré » sur la seule comparaison avec l'ancien état. Les réglages sans persistance individuelle restent explicitement indisponibles.
- Les deux composants sont isolés par compte et génération de session. Le serveur compare le compte attendu par le client à l'identité authentifiée, puis utilise uniquement cette dernière pour la base. Une différence produit 409 avant toute requête DB. Le retour rapide A → B → A est couvert.
- La lecture des signaux exclut ceux dont l'expiration est dépassée ou inconnue. Une erreur de désactivation arrête la génération avant analyse. Une insertion ne réussit qu'avec un reçu complet d'UUID uniques ; un reçu perdu ou incohérent laisse l'état explicitement non confirmé, sans nouvelle insertion ni rollback supposé.
- Les états clair/sombre réutilisent les composants existants. Le contraste de l'interrupteur éteint a été corrigé localement, sans modifier le Toggle partagé.

**PASS :** 87 tests unitaires existants ; 75 tests de contrats des vrais handlers ; TypeScript strict ciblé des routes ; construction réelle de la fixture Next 16.3.5 / React 19.2.4 et typage des tests ; 38 scénarios navigateur (19 à 375 px et 19 à 1 280 px), zéro échec, reprise ou test ignoré dans la campagne finale. NIYAMA D1=C / D2=A et `git diff --check` passent. Les captures mobile sombre et ordinateur clair ont été examinées. Contrastes mesurés : curseur éteint 16,29:1, contour 4,22:1, texte du bouton actif 5,25:1.

Les preuves et commandes sont dans `tests/notifications-api/` et `tests/notifications-ui/`. Les premiers essais du navigateur ont rencontré des erreurs de harnais et des arrêts de processus ; ils sont distincts du reçu final. La campagne finale utilise un binaire Chromium 152.0.7977.0 identifié par SHA256 dans le workspace, pas un chemin temporaire dont la version serait supposée.

**PARTIEL pour le service MIDAS complet.** Ces tests exécutent les composants et les handlers réels avec frontières auth, base et HTTP simulées ; ils ne prouvent pas la base déployée, les politiques RLS, l'authentification réelle ou le dashboard complet. Le build complet de MIDAS et ESLint ne sont pas revendiqués pour ce lot. Les alertes actionnables, leur distribution réelle, les mandats, la séparation serveur complète assisté/automatique, les connecteurs et le déploiement restent à qualifier. Les mécanismes paper et de risque de PR27 restent à préserver lors de la consolidation.

Le lot opérationnel Capital.com du 27 novembre demeure distinct, sur OVH, avec MetaApi/Vantage conservés. Le rapport filtré disponible sur OVH, relu le 28 novembre et daté du 27 novembre à 00:54 UTC, porte encore `BLOCKED` : il ne constitue pas une authentification ou une qualification d'exécution réussie. Aucun secret, ordre, envoi réel de notification ou service de production n'est modifié par cette réception.


<!-- MIDAS:ASSISTED_AUTOMATIC:20261126:END -->
