# Vérification navigateur des notifications MIDAS

Ce harnais compile avec Next.js les vrais composants `NotificationBell`,
`NotificationsTab` et `useNotificationSession`. Il ne duplique pas leur logique
et n'ajoute aucune route de test au produit.

## Exécution

Depuis la racine, avec les dépendances du dépôt installées :

```sh
npm run build --prefix tests/notifications-ui/fixture
npx playwright test --config tests/notifications-ui/playwright.config.ts
```

Un Chromium déjà installé peut être sélectionné explicitement :

```sh
MIDAS_CHROMIUM_PATH=/chemin/vers/chromium npx playwright test --config tests/notifications-ui/playwright.config.ts
```

Le serveur local utilise `127.0.0.1:3092`. Deux projets parcourent les mêmes
scénarios : 375 × 812 et 1280 × 900. Les reprises automatiques sont désactivées.
Chaque scénario lance un navigateur isolé et consigne sa version réelle dans
le rapport. Utiliser un chemin persistant vérifié : un binaire préexistant dans
`/tmp/chromium` peut différer de celui du package installé. Aucun argument de
désactivation de la sécurité web n'est ajouté. Les seuls arguments explicites
retenus dans le conteneur sont `--no-sandbox` et `--disable-dev-shm-usage`.

## Frontières simulées

- Le client d'authentification de la fixture émet `INITIAL_SESSION`, puis les
  changements de compte pilotés par le test. Le hook produit est inchangé.
- Playwright simule les réponses HTTP des deux API de notification. Les
  réponses retardées utilisent des promesses contrôlées ; le polling est
  déclenché par l'horloge de test. Aucun sommeil arbitraire ne synchronise les
  courses.
- Les requêtes vers tout autre endpoint API ou tout domaine externe sont
  refusées et font échouer la vérification.
- Les états de deux comptes sont distincts. Aucun identifiant secret, session
  réelle, transport email/push ou adaptateur de trading n'est utilisé.

## Contrats observés

La suite vérifie les erreurs de lecture et d'acquittement, les payloads
malformés, le double clic, l'arrivée d'une alerte pendant un acquittement,
l'absence d'écrasement par un ancien GET, la distinction entre acquittement
confirmé et rafraîchissement échoué, les changements A → B → A et la
déconnexion.

Pour les préférences : absence de faux réglage après erreur de lecture,
valeurs par défaut explicitement non enregistrées, sauvegarde suivie d'un
rechargement, envoi des seuls champs modifiés, conservation des choix après
échec, réponse perdue après écriture puis retour à l'ancienne valeur,
réponse d'une ancienne session et traitement du conflit de compte HTTP 409.

Le parcours clavier ouvre et ferme le panneau, vérifie le retour du focus et
l'absence de débordement horizontal. Le thème clair contrôle les couleurs
réellement rendues, le contraste de l'interrupteur désactivé et celui du
bouton de sauvegarde actif. Les captures attendent la fin de l'animation.

## Preuves et limites

Le résultat machine est `test-results/results.json`. Les captures et traces
restent des artefacts locaux ignorés par Git. Les tests serveur complémentaires
sont dans `tests/notifications-api/`.

Cette suite qualifie les interactions des composants avec leur contrat HTTP.
Elle ne prouve pas les politiques RLS, la persistance de la base déployée,
l'authentification réelle, le dashboard authentifié complet, la livraison
réelle des alertes, un mandat automatique ou une connexion courtier. Le build
de cette fixture est distinct du build complet de MIDAS.

## Qualification du 28 novembre 2026

La campagne finale compte **38 succès : 19 scénarios sur deux dimensions**,
sans échec, test ignoré ou reprise automatique. Le build de la fixture et le
contrôle TypeScript des tests passent aussi. Les empreintes des composants,
les versions et les résultats détaillés sont consignés dans
`verification-20261128.json`.

Versions exécutées : Next 16.3.5, React 19.2.4, Playwright 1.62.1 et Chromium
152.0.7977.0. Chromium a été extrait dans un chemin persistant du workspace,
puis sa version et son SHA256 ont été vérifiés. Ce navigateur personnalisé
diffère de la cible Chromium 151 du paquet Playwright ; aucune version 151 du
paquet de distribution utilisé n'était publiée lors de la vérification.

Dans les deux dimensions, les contrastes mesurés du thème clair sont de
16,29:1 pour le curseur de l'interrupteur éteint, 4,22:1 pour son contour et
5,25:1 pour le texte du bouton de sauvegarde actif. Les captures sombre mobile
et claire desktop ont été inspectées après la campagne.
