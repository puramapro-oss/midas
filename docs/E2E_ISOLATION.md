# Qualification navigateur isolée

La CI Playwright prépare un environnement anonyme et synthétique. Elle vérifie
l'application éducative et ses refus, sans compte fournisseur, session réelle,
ordre financier, email envoyé ou déploiement. Les restrictions du middleware
restent celles du produit.

## Ordre et frontières

Après acquisition des packages privés, vérification des 24 fichiers et suppression
des deux authentifications temporaires, le workflow exécute les contrats locaux,
prépare les neuf fichiers WOFF2 épinglés puis installe les navigateurs verrouillés.

Le lanceur doit démarrer comme utilisateur ordinaire du runner Linux. Il crée un
nouveau namespace réseau avec sudo/unshare, confirme qu'il diffère du namespace
parent, et active uniquement son loopback. setpriv rend immédiatement les UID/GID
au runner, vide toutes les capacités et active no_new_privs avant le code de test.
Aucune interface, route, règle réseau ou configuration de sécurité de l'hôte
n'est modifiée.

Avant tout serveur de fixture, Next ou navigateur, le processus non privilégié
vérifie l'identité du namespace, les UID, les capacités nulles, no_new_privs,
l'interface loopback seule et les tables de routage. Il exige un écho TCP local
avec nonce et un refus réseau immédiat vers des adresses réservées IPv4/IPv6.
Une précondition absente arrête le job. Ce mécanisme doit être réellement qualifié
sur le runner ; un contrôle de métadonnées synthétiques en test unitaire ne
constitue pas cette preuve.

Next écoute sur 127.0.0.1:3001, derrière un frontal de test sur 127.0.0.1:3000.
Les fixtures et les navigateurs sont dans le même namespace. Les variables
d'environnement des descendants sont construites par liste explicite ; elles ne
reprennent aucun secret du runner. Les seules valeurs Supabase/Stripe sont des
chaînes de test sans autorité. Leur présence ne qualifie aucun fournisseur.

Les options Chromium restent celles de Playwright avant cette correction :
aucun réglage de sandbox n'est ajouté pour contourner un échec. Le préflight
consigne les arguments effectifs liés à la sandbox. Playwright 1.62.1 utilise
--no-sandbox lorsque chromiumSandbox n'est pas explicitement true ; l'isolation
réseau et les capacités nulles ne prouvent donc pas une sandbox interne Chromium.
Aucun changement AppArmor, sysctl ou protection de l'hôte n'est autorisé par ce
lanceur.

## Gardes avant la campagne

La disponibilité TCP seule ne suffit plus. Le budget de démarrage reste de
60 secondes. Le préflight exige /login HTTP 200, HTML et marqueurs du formulaire,
puis trois réponses JSON exactes sans redirection :

| Requête | Résultat |
| --- | --- |
| POST /api/chat anonyme | 401, Non autorise |
| POST /api/trade/execute | 403, restriction éducative |
| POST /api/signals/generate | 403, restriction éducative |

La vérification de fontes charge les trois familles et leurs 15 couples
famille/poids via les variables CSS et document.fonts. Elle décode également les
neuf WOFF2 avec FontFace et refuse les erreurs de fontes/CSP et les requêtes
externes observées.

La suite existante reste ensuite exécutée avec ses deux projets, ses retries et
ses délais. Les 25 fichiers historiquement désactivés avant NIYAMA restent
désactivés ; un cas annoncé ou skipped n'est pas un cas validé. Le compte final
vient du rapport réel, jamais d'une constante. Les anciens tests permissifs
restants ne suffisent pas à qualifier chaque refus : le journal des erreurs
applicatives fournit une garde globale complémentaire.

## Contrats de fixture

Le préfixe /__e2e/ existe uniquement dans le frontal du lanceur, pas dans Next
ou le déploiement produit. Toute requête sans contrat exact reçoit un refus
et rend la qualification négative.

- CoinGecko : un seul GET simple/price avec les quatre paramètres exacts, les
  huit identifiants attendus et Accept JSON. Les nombres sont synthétiques.
  La vraie route MIDAS restitue ces données ; une réponse fournisseur en échec
  doit rester une erreur 502, jamais des prix valides.
- Binance : GET api/v3/ping sans query, réponse synthétique vide. La vraie route
  MIDAS construit son propre statut. Ce endpoint n'est pas la garde de readiness.
- Métadonnées Next : seul le GET sans corps vers l'URL exacte
  `https://registry.npmjs.org/-/package/next/dist-tags` reçoit localement un
  HTTP 503 vide avec `Cache-Control: no-store`, sans appel réseau ni délégation
  à `originalFetch`. Next 16.4.5 conserve sa version installée et l'état
  `staleness: 'unknown'`. Le journal enregistre `type: 'fixture'` et le contrat
  `next-dev-version-metadata-unavailable`. Ce refus synthétique de métadonnées
  ne constitue pas une réponse 5xx de l'application.
- Supabase password : POST token?grant_type=password refuse les identifiants avec
  HTTP 400 invalid_credentials ; aucun token, utilisateur ou session n'est créé.
- OAuth : la demande Google retourne un refus local 403, sans Location externe.
  Un ancien test qui accepte cette navigation ne prouve pas un OAuth réel.
- FAQ : lecture publique du schéma midas, sélection et ordre exacts, collection
  synthétique vide.
- Contact : insertion locale des quatre champs validés, comptée puis perdue à
  l'arrêt. Le véritable garde Upstash de l'application est conservé. Son absence
  ou son échec peut empêcher ce parcours ; aucune réponse générique de succès
  ni faux limiteur n'est ajouté pour le masquer.

Le transport fetch de test redirige uniquement les deux GET publics connus et
préserve les métadonnées Request. Le contrat Next ci-dessus est traité localement,
sans redirection ni transport. Toute autre requête externe, y compris une variante
non prévue de ce contrat, est refusée et journalisée `unexpected-external-fetch`.
Le namespace ferme aussi les autres transports du serveur et du navigateur.
Après readiness, toute erreur du proxy ou réponse applicative 5xx
rend le bilan négatif, même si une ancienne assertion l'accepte.

## Fontes, provenance et licence

Les trois CSS officiels sont figés dans scripts/e2e/fonts. Leurs URL, l'User-Agent
Next 16.4.5, tailles et SHA256, ainsi que les neuf URL WOFF2, figurent dans
scripts/e2e/fonts.lock.json. La préparation lit ces CSS locaux et ne télécharge
que les WOFF2 par HTTPS avec validation TLS et empreintes strictes. Une divergence
arrête la préparation ; les empreintes ne sont jamais actualisées automatiquement.

Le premier CSS DM Sans observé le 11 novembre 2026 faisait 4 940 octets. Une lecture
suivante, reproduite par Node et Python, a retourné une autre réponse officielle de
4 405 octets. Cette réponse actuelle a été explicitement relue puis figée : cinq
poids, deux sous-ensembles, style normal et display swap, sans affirmation
d'identité de métriques avec un ancien corps non retenu. Les sept WOFF2 Orbitron
et JetBrains Mono sont restés inchangés. Les deux nouveaux DM Sans et le CSS
actuel ont des pins distincts, revus avant publication.

Les familles sont distribuées sous SIL Open Font License. Sources et notices :

- [Orbitron](https://github.com/google/fonts/tree/main/ofl/orbitron) et
  [licence](https://github.com/google/fonts/blob/main/ofl/orbitron/OFL.txt).
- [DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans) et
  [licence](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt).
- [JetBrains Mono](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono) et
  [licence](https://github.com/google/fonts/blob/main/ofl/jetbrainsmono/OFL.txt).

Les binaires ne sont pas versionnés ici et le workflow retire leur répertoire
temporaire. Toute redistribution ultérieure d'un bundle doit conserver les
licences et notices de copyright applicables.

NEXT_FONT_GOOGLE_MOCKED_RESPONSES est un mécanisme de test observé dans la source
exacte [Next 16.4.5](https://github.com/vercel/next.js/blob/v16.4.5/crates/next-core/src/next_font/google/mod.rs).
Sous Turbopack il remplace seulement le CSS. Le lanceur sert donc les vrais WOFF2
vérifiés sur loopback ; il ne fabrique pas de Buffer et ne change pas le layout.
Ce hook n'est pas présenté comme une API de production stable. Une évolution de
Next impose une nouvelle revue de ce contrat.

## Preuves et nettoyage

Les reçus se trouvent dans test-results/e2e-isolation. Playwright nettoie uniquement
test-results/browser, ce qui préserve les preuves avant campagne et leur journal.
L'action d'upload couvre ces reçus et le rapport HTML, y compris sur échec.

Le lanceur termine uniquement ses groupes de processus, attend leur absence dans
une borne, ferme son frontal et retire son HOME temporaire. Une interruption
produit un reçu PARTIEL et une sortie non nulle, même pendant le nettoyage.
Une absence non prouvée reste une erreur. Un arrêt forcé du runner peut empêcher
la finalisation ; les journaux partiels ne doivent pas être présentés comme un
nettoyage observé. Ce dispositif ne modifie aucun service existant.
