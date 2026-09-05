owner: codex-root/niyama-flotte
phase: NIYAMA — contre-audit local D1/D2/D4
last_commit: 5f343a2 — [CODEX] midas: niyama — ferme les parcours crypto promotionnels
next: audit Claude Code ; suppression contrôlée du code historique dormant uniquement après validation explicite de ce chantier irréversible
sensible: src/middleware.ts; src/lib/phase.ts; src/lib/ai/system-prompts.ts; routes API de signaux/analyse
écarts: code historique de trading, Connect et affiliation conservé dans le dépôt mais rendu inaccessible par middleware; aucun script npm test unitaire générique; @anthropic-ai/sdk conserve 1 vulnérabilité modérée sans correctif disponible; task_plan.md contient des preuves historiques obsolètes, conservées comme historique
déploiement: différé (gel Vercel)
