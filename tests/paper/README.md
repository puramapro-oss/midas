# Paper execution verification

Use Node 24. These checks do not require production credentials, an exchange,
an LLM call or an application deployment.

From the repository root:

```sh
npm run test:unit
npm ci --prefix tests/paper --ignore-scripts --no-audit --fund=false
npm run test:paper
node scripts/check-niyama-decisions.mjs
```

The transaction suite runs the repository's real baseline table definitions and
migrations 007 and 20261011153000 in an in-memory PGlite PostgreSQL engine. It
injects an audit failure, replays lost receipts, rejects conflicting operation
identifiers, checks quotas and verifies the service-only function grant. PGlite
serializes one connection; its parallel-promise test is not a proof of
multi-session locking.

`postgres.integration.mjs` is a separate test against two PostgreSQL sessions.
The `postgres-concurrency` CI job provisions a disposable PostgreSQL 18 service
and verifies a real lock wait before committing the first transaction. The
script refuses non-local hosts and any database name other than `midas_ci`.
Do not point it at a shared or production database.

The executor and simulation suites import the actual TypeScript implementations
and replace external boundaries with controlled test doubles. They verify a
lost response after persistence, reconciliation before changing risk checks,
paper-only history, quote-override sizing, unavailable data and stale candles.
They are not browser, live-provider or full application tests.

## Integration requirements

- Preserve D2=A: the existing middleware restrictions remain in force.
- Reconcile the unpublished Mac branch `fix/midas-m3-risk-engine-security-20261007`
  and its dirty trading files before merging this candidate. Its existence was
  reported in the 10 October inventory; its source is not accessible here.
- Verify and apply migration `20261011153000_atomic_paper_execution.sql` only
  in an authorized isolated database first. Missing migration fails closed.
- A caller must generate one `idempotencyKey` UUID for an operation and retain
  both the key and the exact request for retries. A changed request needs a new
  identifier. A `reconciliation_required` response must never trigger a fresh key.
- Successful paper persistence is atomic with its audit and receipt. The
  function does not connect to an exchange. Its slippage and fees are explicitly
  educational assumptions, not observed market execution.
- Restore the actual shared PURAMA packages and authorized SMARANA installation
  before full typecheck, lint, Next.js build and Playwright validation. No shared
  package has been replaced by a placeholder.

Local validation on 11 October 2026: 101 unit tests and 18 transaction/boundary
tests passed; NIYAMA guard passed. A diagnostic typecheck using locked public
dependencies found the same 14 missing-PURAMA-package/type errors in baseline
`c688d764` and this candidate, with no added diagnostics. This is not a successful
full application build. Multi-session CI results must be checked independently.

GitHub Actions run `38154232610` also passed the 101 unit tests, 18 transaction
and boundary tests, and 2 real multi-session PostgreSQL tests for candidate
`f6e25743`. Playwright run `38154232553` failed during dependency installation
with `Permission denied (publickey)` for private SMARANA; its browser tests were
skipped. Its Node 20 runtime also conflicted with the locked packages' Node 22+
requirements, so the workflow now uses Node 24. This does not resolve the
separate private-package access requirement.
