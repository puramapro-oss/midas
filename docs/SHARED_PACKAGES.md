# Reproducible private package setup

MIDAS uses four sibling `file:../packages/...` dependencies. Their source files
remain in the private `puramapro-oss/purama-master` repository. The public MIDAS
repository contains only the acquisition code and a manifest of file names,
lengths and SHA-256 digests in `tooling/shared-packages.lock.json`.

The source revision is the immutable commit
`6e50837af08ad57d8db37077f0363b3e05289e31`. It contains the 22 authentic runtime
files and the two ESLint configuration files, without changes to those sources.
The Git tree and the 24 file digests were checked against the recovered sources.

## Continuous integration

The Playwright workflow checks out MIDAS under `midas/`, retrieves only the four
private package directories at the manifest revision under `shared-source/`,
and verifies every file before creating the sibling `packages/` directory.
Missing, modified or unlisted files fail the setup. For a new or empty destination,
one atomic directory rename publishes the complete four-package layout. A
destination symlink introduced during staging is rejected. The parent workspace
must remain under the caller's control throughout setup.

If all four packages already exist and match, setup verifies them without writing.
Existing partial or divergent layouts are preserved and cause an error; the
bootstrap never merges into them or removes unrelated content. A partial shared
`../packages` directory on a development machine therefore requires a new
isolated MIDAS workspace, not deletion or normalization of the shared directory.
A second setup against matching directories is idempotent.

Private source retrieval needs `PURAMA_PACKAGES_READ_TOKEN` with read access to
`puramapro-oss/purama-master`. It can fall back to `SMARANA_READ_TOKEN` only if
that token also has access to this repository. The SMARANA dependency needs
`SMARANA_READ_TOKEN` with read access to `puramapro-oss/purama-smarana`.
Both checkouts use `persist-credentials: false`.
No dependency cache is uploaded from this public repository's workflow, so the
private source archives are not exposed through a shared Actions cache.

`scripts/install-private-dependencies.mjs` runs `npm ci --ignore-scripts
--no-audit --no-fund`. Its Git authorization header applies only to the exact
SMARANA repository, redirects are disabled, and inherited Git tracing and
credential helpers are removed from the subprocess environment. It writes no
Git configuration file. The following `npm rebuild` step runs lifecycle scripts
without the repository token or installation environment.

The workflow uses ordinary `pull_request` events. A fork without private read
credentials fails the application setup explicitly. The independent core,
bootstrap and SQL checks do not require those private credentials. Do not switch
to `pull_request_target` to give untrusted pull request code access to secrets.

The source identity, offline bootstrap and authentication scoping have local
test evidence. Access through the configured GitHub Actions secrets and a full
hosted workflow remain **NON TESTÉ** until a successful authorized run is
available. A successful local build does not establish that hosted access.

## Local use

Use an authenticated Git checkout of the private source repository at the exact
manifest revision. Select only these directories with sparse checkout:

- `packages/purama-antifraud`
- `packages/purama-entraide`
- `packages/purama-retention`
- `packages/eslint-config-purama`

From the MIDAS checkout, with that source checkout at `../shared-source`:

```sh
node scripts/bootstrap-shared-packages.mjs ../shared-source ../packages
node scripts/install-private-dependencies.mjs
npm rebuild --no-audit --no-fund
```

The installer expects `SMARANA_READ_TOKEN` to be provided by the caller's
authorized secret mechanism. Never put a credential in a repository file or
command argument. The bootstrap itself needs no network access or token.

For the credential-free regression checks:

```sh
node --test scripts/bootstrap-shared-packages.test.mjs scripts/install-private-dependencies.test.mjs
```

When changing a shared package, first publish the authorized private source
revision, then update its commit and all affected digests together. Do not copy
private package source into this public repository or replace it with stubs.
