# Vérification locale NIYAMA — MIDAS

Décisions appliquées le 5 septembre 2026 :

- D1=C : wallet en points, carte/IBAN/retrait/cash et IAP forcés OFF sans bascule par environnement ;
- D2=A : seules les simulations éducatives sont acceptées ; la route refuse une demande réelle
  et l'exécuteur interne ne contient plus aucun appel de création d'ordre CCXT.

Ce verrou est technique. Il ne constitue ni un avis ni une certification juridique.

## Preuves exécutées

Le 5 septembre 2026 :

- `node scripts/check-niyama-decisions.mjs` : PASS ;
- `npx tsc --noEmit` : PASS ;
- `npm run lint` : PASS, 0 erreur et 276 avertissements préexistants ;
- `npm run build` : PASS, 173 routes générées ;
- `git diff --check` : PASS ;
- scan gitleaks du diff NIYAMA seul : PASS, 0 détection ;
- GitNexus `detect-changes --scope staged` : HIGH attendu, 5 fichiers, 14 symboles et
  8 flux ; périmètre limité à la fermeture de l'exécution réelle et du cash ;
- `gitleaks dir . --no-banner --redact` : FAIL préexistant, 288 détections dans
  l'arbre de travail ; `gitleaks git . --no-banner --redact` : FAIL préexistant,
  14 détections dans l'historique. Les valeurs n'ont pas été lues ;
- `npm audit --audit-level=high` : FAIL préexistant, 12 vulnérabilités dont 2 critiques et
  1 haute dans des dépendances legacy (`lodash` via la chaîne bitcore et `web3`). Aucun
  correctif automatique appliqué dans ce verrou NIYAMA.

## Commandes à rejouer

```bash
node scripts/check-niyama-decisions.mjs
npx tsc --noEmit
npm run lint
npm run build
git diff --check
gitleaks dir . --no-banner --redact
```

Aucun push ni déploiement n'est autorisé pendant le gel.
