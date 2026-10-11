owner: codex-root/niyama-flotte
phase: NIYAMA — contre-audit local D1/D2/D4
last_commit: 5f343a2 — [CODEX] midas: niyama — ferme les parcours crypto promotionnels
next: audit Claude Code ; suppression contrôlée du code historique dormant uniquement après validation explicite de ce chantier irréversible
sensible: src/middleware.ts; src/lib/phase.ts; src/lib/ai/system-prompts.ts; routes API de signaux/analyse
écarts: code historique de trading, Connect et affiliation conservé dans le dépôt mais rendu inaccessible par middleware; aucun script npm test unitaire générique; @anthropic-ai/sdk conserve 1 vulnérabilité modérée sans correctif disponible; task_plan.md contient des preuves historiques obsolètes, conservées comme historique
déploiement: différé (gel Vercel)

reprise_2026-10-11: correctif candidat préparé dans une copie isolée de c688d764, pour la PR 24 existante ; aucun terminal Mac ni autre dépôt de travail modifié
corrections_2026-10-11: historique personnel filtré par compte/mode et exclu du bus global ; JSON IA validé ; lectures cache concurrentes regroupées ; labels d'agents alignés ; simulation sans connexion exchange, montants effectifs et fraîcheur vérifiés ; persistance paper/journal/reçu atomique sur le registre existant
preuves_locales_2026-10-11: 101 tests unitaires PASS ; 18 tests SQL/frontières PASS ; garde NIYAMA PASS ; comparaison TypeScript diagnostique = 14 erreurs de dépendances PURAMA déjà présentes, aucune ajoutée ; build/lint/E2E complets non validés
coordination_2026-10-11: PURAMA_ETAT_REEL du 10 octobre mentionne fix/midas-m3-risk-engine-security-20261007 et des fichiers src/lib/trading/* locaux modifiés ; cette branche est absente de GitHub, Mac distant hors ligne et MacDevBridge en erreur ; réconciliation obligatoire avant fusion
migration_2026-10-11: 20261011153000_atomic_paper_execution.sql préparée et testée localement uniquement ; jamais appliquée à une base réelle ; contrôle multi-session PostgreSQL prévu dans core-verification.yml
reste_2026-10-11: accès aux sources/packages locaux et installation CI privée SMARANA ; consolidation M3 ; compilation et recette navigateur ; intégration des trois agents financiers Anthropic ; aucune validation de production ni de latence utilisateur
