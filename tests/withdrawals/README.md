# Qualification des retraits MIDAS

Ce lot corrige l’admission d’un retrait, la réception d’un transfert et la reprise
de sa demande. Il conserve la décision NIYAMA D1=C : les mutations monétaires
restent fermées dans les handlers. Aucun scénario ne contacte Stripe, un broker,
une banque ou une base de production.

## Contrat et données existantes

| Parcours | Journal existant | Solde existant | Mutation contrôlée |
| --- | --- | --- | --- |
| Stripe Connect | `public.connect_withdrawals` | `midas.profiles.wallet_balance` | `public.admit_connect_withdrawal` puis `public.reconcile_connect_withdrawal` |
| Admission et décision IBAN | `midas.withdrawal_requests` et `midas.wallet_transactions` | `midas.wallets.balance` | `midas.admit_wallet_withdrawal` puis `midas.decide_wallet_withdrawal` |

Les deux modèles restent distincts. La migration ne crée pas de nouveau wallet
et ne réécrit pas les soldes ou les preuves historiques ambiguës.

L’admission verrouille le profil avant la demande et conserve une intention
unique par utilisateur et clé. Son insertion et son débit sont une transaction.
La reprise retrouve le montant initial, y compris pour une demande sans montant
explicite ; elle refuse une réutilisation avec un autre montant ou destinataire.
Seule la première admission peut envoyer le transfert. Une reprise ne dépend pas
de la conservation temporaire de la clé d’idempotence par Stripe.

Une exception de transport ne prouve ni l’absence de transfert ni un remboursement.
La demande reste donc en attente de rapprochement ; une autre clé ne peut pas
contourner une admission sans reçu. Le retour synchrone de Stripe et les événements
signés passent par le même RPC, qui contrôle l’identité, le montant, la devise et
le destinataire. Le montant annulé est cumulatif : seul son delta positif est
recrédité. Une rediffusion ou un événement plus ancien ne crée pas de crédit
supplémentaire et ne rétablit pas un transfert entièrement annulé.

Un refus qui permet de créer une nouvelle demande doit aussi être durable.
`admission_rejection` réserve la clé dans le journal existant sans débit : état
`failed` pour Connect, `rejected` pour IBAN. Le reçu indique explicitement
`rejection_recorded=true`, `debit_confirmed=false` et `refunded=false`. Une ancienne
requête retardée conserve ce refus après un crédit du solde ou une nouvelle
admission. Une exception SQL, une prévalidation ou une écriture non confirmée
ne ferme jamais la clé. Un retrait Connect sans montant explicite dont le solde
est inférieur à 20 € reste une erreur sans fermeture : le minimum existant du
journal n’est pas abaissé pour y inventer un montant de refus.

La décision IBAN exige un débit lié exact, y compris en cas de reprise. Un rejet
rejoué exige aussi un crédit exact et son marqueur de persistance. Les crédits,
journaux et transitions sont atomiques. Les écritures attendues doivent réellement
retourner la ligne et la valeur prévues, même lorsqu’un trigger supprime une
opération sans lever d’erreur.

L’admission IBAN produit désormais cette preuve dans la même transaction que la
demande et le débit du wallet. Elle réutilise `withdrawal_requests.id` comme UUID
client. Son minimum de 5 € et le délai existant de 30 jours après souscription
restent inchangés. Une reprise peut envoyer uniquement la clé et l’utilisateur ;
elle ne peut pas créer de demande. Si elle arrive avant le premier POST, elle
ne ferme pas la clé, afin de permettre la réception tardive de ce POST.

Le navigateur conserve une clé et un montant par utilisateur et compte Stripe.
Une fermeture, un rechargement ou une baisse de solde ne remplace pas une demande
incertaine. Pour IBAN, il conserve une empreinte et les quatre derniers caractères
du destinataire, jamais l’IBAN complet. Il ignore les réponses d’un ancien compte et n’affiche un succès
qu’après validation d’un reçu lié à sa demande. Un rejet définitif sans admission
permet de saisir un nouveau montant ; une erreur réseau ne le permet pas.

## Vérifications indépendantes

| Suite | Commande | Ce qu’elle démontre |
| --- | --- | --- |
| Tentative persistée — 16 tests | `node --experimental-strip-types --test tests/withdrawals/attempt.test.mjs` | Clé stable, isolation des comptes, reçus exacts et refus enregistré. Aucun rendu React. |
| Handlers — 23 tests | `node --test tests/withdrawals/handlers.test.mjs` | Vraies sources TypeScript et parsing, avec authentification, DB et Stripe explicitement simulés. Une dépendance non prévue est refusée. |
| PostgreSQL natif — 45 tests | `node --test tests/withdrawals/postgres.test.mjs` | Compilation de la migration, véritables contentions entre sessions, rollback, refus des anciens writers, provenance, requêtes tardives et suppressions silencieuses. |
| Navigateur — 17 scénarios | `node tests/withdrawals/browser.mjs` | Composants React réels, reprises et changements de compte ; API simulée sur boucle locale, trafic externe refusé. |

La suite native réutilise `pg` depuis le verrou existant de `tests/paper`. Elle
exige `MIDAS_TEST_DATABASE_IS_DISPOSABLE=true` et une `TEST_DATABASE_URL` explicite
vers `localhost` ou `127.0.0.1`, avec port et base `midas_ci`, sans options d’URL.
Elle refuse une base contenant déjà les schémas applicatifs. Elle charge les
définitions de tables et anciennes RPC du dépôt, puis la nouvelle migration.
Les prérequis comprennent les tables de `schema.sql`, les migrations Connect V4.1
et les colonnes de profil définies dans `migrations/v6_paiement.sql`.
Les assertions de permissions portent sur les surfaces de retrait exercées ;
elles ne qualifient pas toutes les politiques RLS du projet.

Le workflow Core exécute les helpers et un job PostgreSQL 18 séparé. Le workflow
Playwright utilise l’installation verrouillée du projet pour les handlers, le
lint des sources modifiées, les types et le build complet, puis les scénarios
navigateur. Un échec n’est pas transformé en succès ou en test ignoré. Les
artefacts conservent les TAP et le rapport navigateur. Le navigateur utilise le
sandbox Chromium ; un lancement impossible reste un échec avant assertions.
Les cas Wallet sont importés depuis `wallet-browser-cases.mjs` par le même
runner ; il n’existe pas de second serveur ou de campagne navigateur concurrente.

## Limites et coordination avant une activation future

- Déployer la migration et ses consommateurs ensemble : les anciennes RPC de
  débit/remboursement Connect et les écritures directes des deux journaux de
  demandes sont révoquées. Un ancien handler IBAN ne doit pas continuer son
  débit ou son rollback isolé à côté du nouveau protocole.
- Les lignes Connect sans `ledger_version=1` et les demandes IBAN sans débit lié
  nécessitent un rapprochement historique. Aucun lien ou remboursement n’est
  fabriqué pour les rendre artificiellement compatibles.
- Une issue fournisseur inconnue, ou un refus définitif sans reçu de reversal,
  après une admission débitée n’est pas automatiquement remboursé. La résolution doit établir ce qui s’est
  réellement passé ; ce lot ne fournit pas d’outil opérateur de rapprochement.
- L’appel existant de détection de collusion avec un seul utilisateur ne qualifie
  pas une détection entre comptes. Ce lot ne constitue pas un audit antifraude
  complet, une validation réglementaire ou une validation bancaire.
- Les fixtures HTTP, SQL et React n’établissent pas une intégration Stripe réelle,
  une arrivée bancaire ou un déploiement de production. La vérification locale
  avec des dépendances empruntées ne remplace pas l’installation verrouillée en CI.

## Sources du protocole fournisseur

- [Idempotence Stripe et durée de conservation des clés](https://docs.stripe.com/api/idempotent_requests)
- [Objet Transfer : cumul `amount_reversed` et indicateur `reversed`](https://docs.stripe.com/api/transfers/object)
- [Webhooks Stripe : signature et rediffusion](https://docs.stripe.com/webhooks)

La reconstruction après l’interruption du runtime a été requalifiée depuis la
base `fc96e370ec60d3032e64a17d74fed7e5fd2a6217`. Les résultats antérieurs à cette
reconstruction ne constituent pas sa preuve de validation.
