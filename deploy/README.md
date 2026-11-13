# Qualification des quatre composants MIDAS

Ce dossier ne définit et ne démarre aucun nouveau service. Le candidat Git ne
contient pas les unités OVH de `app`, `watchdog`, `live-worker` et
`analysis-worker`. Les quatre versions attendues restent donc `null` jusqu'à
réconciliation avec leurs sources et leur inventaire effectif.

## Contrôle local, sans installation ni réseau

```sh
node scripts/qualify-ovh.mjs --inventory /chemin/inventaire-ovh.json
node --test scripts/qualify-ovh.test.mjs
node --experimental-vm-modules --test scripts/status-contract.test.mjs
```

Le code de sortie est `0` si le contrat des observations fournies est cohérent,
`2` si une condition manque ou échoue. La sortie conserve toujours
`migrationAuthorized: false` : ce contrôle ne donne aucune autorisation de
migration, n'accède à aucun hôte et ne constitue pas une attestation distante.

## Données obligatoires

Le manifeste `ovh-qualification.json` épingle séparément une révision Git complète
ou une empreinte d'image `sha256:` pour chacun des quatre composants. Aucune
version de worker ne doit être déduite de celle de l'application Next.

L'inventaire JSON normalise des observations réelles, avec les champs suivants :

- `schemaVersion: 1`, `environment: "ovh"`, `capturedAt` en ISO UTC.
- `evidence: { source, sha256 }`, référence de la capture et son empreinte.
- `safety: { liveEnabled: false, realOrdersEnabled: false }`.
- `components`, exactement une entrée par composant : `name`,
  `effectiveVersion`, `observedAt`, `evidence`, `processState` et
  `health: { status, observedAt }`.
- `hostinger: { provider: "hostinger", capturedAt, evidence, resources }`.
  Chaque ressource `cpu`, `memory`, `disk` possède `usedPercent` et
  `additionalPeakPercent`, tous deux mesurés ou estimés explicitement.

Les observations ne peuvent être futures ou avoir plus de cinq minutes. Les
processus requis doivent être `running` avec une santé `healthy`. Le worker LIVE
peut rester `stopped` ou `disabled` ; le contrôle ne demande jamais son activation.
S'il tourne déjà, sa santé est également vérifiée et les deux gardes restent
obligatoirement désactivées.

Pour chaque ressource Hostinger, le contrôle impose :

```text
100 - usedPercent - additionalPeakPercent >= minimumHostingerReservePercent
```

Le minimum ne peut pas descendre sous 20 %. Les valeurs absentes, négatives,
non numériques ou non finies sont refusées. Les références et empreintes sont
exigées ; leur authenticité distante reste à établir par la collecte autorisée.
Les fixtures synthétiques des tests ne sont jamais des preuves d'exploitation.

## Contrats d'état applicatifs

`/api/status` expose uniquement les données de marché publiques. Une dégradation
renvoie 503 et les réponses ne sont pas mises en cache. La page `/status` affiche
uniquement les services présents dans la réponse ; une preuve absente reste
« Non vérifié ».

Le cron de santé ne renvoie un succès que si toutes ses vérifications sont
positives. La présence d'une clé Anthropic est marquée `unverified`, avec
`verification: "configuration-only"` : elle ne démontre ni authentification ni
disponibilité. Ce contrôle restera donc dégradé tant qu'une vérification réelle
de cette disponibilité n'existe pas. Les tests des routes substituent les
transports externes et la construction de réponse Next, pas la logique des routes.

Ces routes ne qualifient pas les quatre composants OVH.
