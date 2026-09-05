# Pré-certification locale NIYAMA — MIDAS

Date : 2026-09-05. Statut : prêt pour l'audit Claude Code sur le périmètre NIYAMA ; aucun déploiement ni push.

Commit d'implémentation local : `5f343a2` (`[CODEX] midas: niyama — ferme les parcours crypto promotionnels`).

## Décisions vérifiées

- D1=C : mode points forcé, retrait et parcours Connect/KYC/prime monétaire neutralisés.
- D2=A : information générale et simulation éducative uniquement ; promotion crypto France, conseil personnalisé, signaux, bots, copy-trading, clés d'exchange et exécution réelle neutralisés.
- D3=C : non applicable directement ; aucune promesse fiscale MIDAS exposée.
- D4=A : aucun achat ni lien d'achat mobile par défaut ; l'abonnement propre MIDAS est retiré de l'offre exposée.

Les implémentations historiques restent présentes pour préserver l'historique et éviter une suppression irréversible sans audit d'impact complet. Le middleware les rend inaccessibles et le contrôle dédié verrouille cette frontière.

## Preuves locales

```text
node scripts/check-niyama-decisions.mjs
NIYAMA MIDAS D1=C D2=A: PASS

npx tsc --noEmit
PASS — 0 erreur

npm run lint -- --quiet
PASS — 0 erreur

npm run build
PASS — Next.js 16.2.11, 173 pages générées

cd mobile && npx tsc --noEmit
PASS — 0 erreur

jq empty mobile/store.config.json
PASS — métadonnées stores valides ; connexion seule, aucun achat/lien d'achat

npm audit --omit=dev --audit-level=high
PASS — 0 vulnérabilité high/critical ; 1 modérée dans @anthropic-ai/sdk, sans correctif disponible

git diff --check
PASS
```

Seul avertissement de build : convention `middleware` dépréciée au profit de `proxy` par Next.js ; sans incidence sur le gate actuel. Le dépôt ne déclare pas de script npm `test` unitaire générique. Les tests E2E historiques de trading/retrait ne sont plus une preuve valable car ces parcours sont volontairement désactivés ; le contrôle NIYAMA dédié vérifie les verrous applicables sur les sources web et mobile. Les deux compilations TypeScript couvrent séparément ces surfaces.

La dépendance directe inutilisée `javascript-opentimestamps@0.4.5` a été retirée. Elle apportait seule la chaîne historique `bitcore/request/web3/lodash` responsable de 2 vulnérabilités critiques et 10 autres alertes ; aucune importation applicative n'existait.

## Limites externes

- Pas de vérification production : gel Vercel actif.
- Pas de migration destructive ni suppression du code dormant.
- Pas de validation E2E production ni de soumission stores : gel actif et D4=A.
- Aucun secret lu, écrit ou journalisé.
