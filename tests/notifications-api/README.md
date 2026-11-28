# Contrats des notifications et des signaux

Exécuter depuis la racine avec Node 24 et les dépendances du dépôt installées :

```sh
node --experimental-strip-types --import ./tests/notifications-api/register.mjs --test tests/notifications-api/routes.test.mjs
```

Ces tests importent les vrais handlers TypeScript et `NextResponse`. Les seuls
doubles sont le client Supabase authentifié et l'analyse externe marché/modèle
du pipeline des signaux. Le transport réseau est refusé pendant les tests.

Le client de base en mémoire applique les filtres, le tri, la limite et les
mutations à des lignes de deux propriétaires. Les assertions portent sur les
effets observés : isolation, acquittement idempotent, compteur global, absence
de mutation sur lecture, erreurs visibles, absence de faux enregistrement et
expiration. Il ne qualifie pas les politiques RLS de la base déployée.

La garde de service D2=A et le middleware restent inchangés. Le test direct du
handler de lecture des signaux ne constitue pas une activation de cette route
en déploiement. Les analyses du test de génération sont fictives. Aucun ordre,
mandat, courtier, compte réel, transport email/push ou livraison réelle n'est
testé ni activé par cette suite.
