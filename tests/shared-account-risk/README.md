# Contrat du budget commun JEV / MIDAS

La migration utilise la base PostgreSQL existante. Elle ne crée ni service,
ni moteur d'exécution, ni compte activé. L'admission est fermée par défaut.
Les simulations éducatives MIDAS et le moteur JEV `paper-only` ne consomment
pas ce budget physique.

Le raccord financier exige les sources effectives des moteurs OVH, un observateur
authentifié du compte et un transport serveur existant. Les indicateurs de preuve
du contrat sont des affirmations de cet observateur : leur validation syntaxique
ne constitue pas une authentification auprès du broker. L'observateur doit lier
compte, devise, positions, ordres, historique, frais et rapprochements au même
compte physique. Les deux moteurs doivent utiliser la même autorité ; les six
rôles JEV partagent l'identité de moteur `jev`.

Les adaptateurs Python et TypeScript refusent de fonctionner sans transport.
Le `service_role` peut appeler les trois RPC, sans pouvoir activer directement
un compte via les droits de table. L'enrôlement administratif doit vérifier
l'identité physique, la devise, le fuseau de remise à zéro et exactement les
deux moteurs `jev` et `midas`.

## Vérifications sans broker

Depuis la racine du dépôt, avec Node 24 ou une version compatible :

```sh
npm ci --prefix tests/shared-account-risk/runtime --ignore-scripts --no-audit --no-fund
node tests/shared-account-risk/runtime/node_modules/@embedded-postgres/linux-x64/scripts/hydrate-symlinks.js
npm run test:shared-risk
```

Ce runtime de test minimal, verrouillé séparément, cible Linux x64 et ne demande
aucune dépendance applicative privée ni clé. `test:shared-risk` exécute les tests
d'adaptateur puis la recette native complète ; `test:all` inclut maintenant ce
contrôle obligatoire. Le workflow de cœur conserve les tests existants et ajoute
un job PostgreSQL jetable. Les deux workflows de PR couvrent aussi les branches
servant de base aux PR empilées.

L'installation désactive les scripts automatiques des paquets. La commande
explicite suivante restaure uniquement les liens locaux des bibliothèques du
paquet PostgreSQL verrouillé, à partir de son manifeste ; elle ne télécharge
rien. Sans cette restauration, une installation neuve ne peut pas démarrer le
binaire PostgreSQL. Le contrôle natif vérifie ensuite son fonctionnement réel.

Pour réutiliser un runtime déjà installé et un emplacement de preuves explicite :

```sh
SHARED_RISK_PG_RUNTIME=/chemin/runtime-postgres \
SHARED_RISK_EVIDENCE=/chemin/dossier-preuves \
npm run test:shared-risk
```

Le lanceur crée un sous-dossier de preuves neuf à chaque invocation, par défaut
sous `test-results/shared-account-risk/`. Il refuse `SHARED_RISK_TEST_FILTER`,
vérifie l'absence de scénario ignoré et exige les preuves d'arrêt et de suppression
du cluster. Un runtime absent fait échouer le contrôle ; il n'est ni téléchargé
automatiquement ni remplacé par une simulation.

Le runtime isolé doit fournir `pg` et
`node_modules/@embedded-postgres/linux-x64/native/bin/{postgres,initdb,pg_ctl}`.
La recette vérifiée emploie PostgreSQL 18.6. Le test crée son propre cluster
temporaire, limité à `127.0.0.1`, avec mot de passe aléatoire et comptes
synthétiques. Il refuse une identité système root et les variables PostgreSQL
externes ; il n'accepte aucune URL de base de données de production. Le cluster
est arrêté et supprimé à la fin. Les deux fichiers JSON de preuve conservent les
scénarios, les empreintes, les paramètres de durabilité et le nettoyage.

Le script `native-contract.mjs` reste disponible directement pour les diagnostics
filtrés. Ces diagnostics ne satisfont pas la recette complète et ne sont pas
comptés comme une validation globale. La CI conserve les reçus natifs en artefact,
y compris après un échec.

## Conditions conservées

Le plafond par position est de 1 % du capital hors crédit. Le plafond quotidien
commun est de 1 % du minimum entre capital courant hors crédit et référence
quotidienne immuable. Positions et ordres existants, pertes et réservations
consomment ce même budget. Le risque des tickets inclut les coûts une seule fois.

Les identités d'opération et d'intention restent persistantes, même après
libération. `applied=false` ne permet jamais un nouvel envoi. Une réservation
`SUBMITTING` ou `UNKNOWN` ne se libère pas à l'expiration d'un délai. Le
rapprochement doit expliquer intégralement l'exécution et le reliquat avant de
remplacer une réservation par le risque observé.

Toute réponse conserve `execution_authority=false` et `live_release=LOCKED`.
Les journaux et protections des moteurs existants restent obligatoires.
Ces tests ne prouvent ni l'installation distante, ni l'authentification du
compte, ni une exécution LIVE. Aucune migration de production n'est effectuée.
