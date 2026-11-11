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

Private source retrieval needs two different repository deploy keys, each
registered with `read_only: true`:

- `PURAMA_PACKAGES_READ_SSH_KEY`: a private-key Actions secret in MIDAS; its
  public key belongs only to `puramapro-oss/purama-master`.
- `SMARANA_READ_SSH_KEY`: a separate private-key Actions secret in MIDAS; its
  public key belongs only to `puramapro-oss/purama-smarana`.

Deploy keys grant read access to the entire corresponding repository. Sparse
checkout and the manifest reduce the files retrieved and admitted, but do not
restrict the key to those directories or to one commit. These keys do not grant
GitHub API access and have no built-in expiration; record their repository key
IDs and rotate or revoke them when this access is no longer needed. Never use a
personal SSH key or the administrator's GitHub token as either CI secret.

The pinned checkout action retrieves master with strict SSH host checking and
`persist-credentials: false`; its source removes authentication in `finally`
and in the post-job hook. Since that action can warn instead of failing on a
cleanup error, the workflow snapshots only temporary-file metadata before the
private checkout. Immediately afterwards, a bounded guard rejects newly
created or changed UUID identity/known-hosts files and persistent Git
authentication configuration. It reads configuration names, never values,
does not read or delete residual key files, and blocks subsequent steps on
failure. Hosted verification must still review checkout cleanup warnings.
The SMARANA package keeps its existing locked SSH URL
and commit. Each acquisition receives only its own key; no shared SSH agent or
global Git/SSH configuration is installed.
No dependency cache is uploaded from this public repository's workflow, so the
private source archives are not exposed through a shared Actions cache.

`scripts/install-private-dependencies.mjs` runs `npm ci --ignore-scripts
--no-audit --no-fund`. In SSH mode it creates a directory with mode 0700 and key
and known-hosts files with mode 0600, pins GitHub's published Ed25519 host key,
disables password/agent fallback, and removes inherited Git/SSH configuration
and credential variables from the npm environment. The key content is not put
in a command argument or Git configuration file. A `finally` block removes the
temporary files on ordinary success and errors. A separate `always()` workflow
step removes the installation's owned temporary directory before `npm rebuild`.
Forced runner termination cannot execute JavaScript cleanup; this workflow uses
disposable GitHub-hosted runners. The following lifecycle and browser steps
receive neither repository key nor installation environment.

The workflow checks that `package.json`, `package-lock.json` and
`tooling/shared-packages.lock.json` remain unchanged. The master commit and all
24 file digests remain exactly the same as with HTTPS acquisition.

The workflow uses ordinary `pull_request` events. A fork without private read
credentials fails the application setup explicitly. The independent core,
bootstrap and SQL checks do not require those private credentials. Do not switch
to `pull_request_target` to give untrusted pull request code access to secrets.

The offline bootstrap and credential/temporary-file contracts can be checked
without real credentials. Access through newly configured deploy keys and a
full hosted workflow remain **NON TESTÉ** until a successful authorized run is
available. A successful local test does not establish that hosted access.

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
env -u SMARANA_READ_SSH_KEY -u SMARANA_READ_TOKEN \
  -u PURAMA_PACKAGES_READ_SSH_KEY -u PURAMA_PACKAGES_READ_TOKEN \
  -u GH_TOKEN -u GITHUB_TOKEN -u SSH_AUTH_SOCK -u SSH_AGENT_PID \
  -u SSH_ASKPASS npm rebuild --no-audit --no-fund
```

The installer accepts either `SMARANA_READ_SSH_KEY` or the existing local HTTPS
mode, `SMARANA_READ_TOKEN`, from the caller's authorized secret mechanism. Supply
only one; it rejects ambiguous transport selection. HTTPS mode keeps its
repository-specific authorization header and disabled redirects. Never put a
credential in a repository file or command argument. The bootstrap itself
needs no network access or credential.

The installer preserves its caller's environment. The `env -u` invocation
above removes the listed package/GitHub credentials and SSH-agent variables
from the local lifecycle command without changing that caller. It does not
audit unrelated credentials configured elsewhere on a development machine.

For the credential-free regression checks:

```sh
node --test scripts/bootstrap-shared-packages.test.mjs scripts/install-private-dependencies.test.mjs
```

When changing a shared package, first publish the authorized private source
revision, then update its commit and all affected digests together. Do not copy
private package source into this public repository or replace it with stubs.
