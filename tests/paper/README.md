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
migrations 007, 20261011153000 and 20261011194000 in an in-memory PGlite PostgreSQL engine. It
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

## Follow-up audit, 11 October 2026

Candidate `476535e` passed **122 unit tests and 22 SQL/boundary tests**
with no failures or skipped tests. NIYAMA passes. The diagnostic typecheck still
reports the same 14 missing-shared-package/type errors, without additional
diagnostics. The CI results above describe earlier commits; inspect the current
PR checks for the new commit's PostgreSQL and browser results.

Reproduced defects corrected in this pass:

- Closing a backtest position added its principal to capital even though opening
  had not deducted it. Capital now reconciles with initial capital plus net P&L;
  trade results include both entry and exit fees.
- Signals computed from a completed bar execute at the next opening. Stops use
  adverse opening gaps, trailing levels use previously known extremes, and the
  final equity point includes forced-close costs. Monthly realized returns use
  opening capital. Invalid dates cannot mutate capital before failing.
- Recorded trade P&L and recorded fees are separate database columns. Memory,
  paper loss limits and SQL available capital now use their net difference;
  malformed financial history blocks execution. This helper must not be applied
  to backtest P&L, which is already net.
- Uppercase operation UUIDs are normalized before lookup, persistence and receipt
  validation, preserving one operation across retries.
- Exchange candles must preserve pair, interval, chronological continuity, OHLC
  consistency and volume validity. Requests abort after four seconds per
  attempt; identical in-flight reads share one request. A transient failure can
  use a configured HTTPS relay. Provider refusals or quota errors never trigger
  relay retries; credentials cannot follow redirects or travel over HTTP.

CoinGecko OHLC is no longer silently substituted for exchange candles. The
separate `fetchCoinGeckoOhlc` helper explicitly returns USD observations, actual
automatic granularity and unavailable volume. It converts closing timestamps
to opening timestamps. This helper is tested with controlled responses but is
not connected to a user interface. The market route returns 503 when exact
candles are unavailable. Other price-data providers remain available for their
existing uses. Historical descriptions of the old candle fallback cascade do
not describe this candidate.

Source contracts consulted:

- https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/market
- https://docs.coingecko.com/demo/reference/coins-id-ohlc

At candidate `476535e`, remaining audit work included the legacy Sharpe/Sortino annualization from trade
returns, non-annualized Calmar calculation, and profit-factor sentinel `999`.
Those statistics are not validated performance measures. Bar-based fills still
use a conservative stop-before-target convention when both levels occur in one
bar; exact intrabar sequencing requires finer data. Paper closing/monitoring,
full browser flows, actual provider availability and user-facing latency also
need end-to-end validation after the shared packages and unpublished M3 work
are recovered. No production-readiness claim follows from these unit results.


## Current consolidation, 11 October 2026

This section supersedes the earlier outstanding list for ratios and the paper
closing implementation. The earlier counts above remain historical evidence.
Current local verification: **146 unit tests and 35 SQL/boundary tests passed**,
NIYAMA passed, and the diagnostic typecheck still has the 14 pre-existing
missing-PURAMA-package/type errors. Full build/lint/browser checks remain blocked.
The PostgreSQL suite now has three independent-session tests; its result for the
published commit must be read from the PR checks, not inferred from PGlite.

Changes verified with controlled inputs and the actual implementation:

- The backtesting page no longer returns a fixed sample after a timer. It calls
  the authenticated route and reports errors, cancellation, real coverage, source
  and simulation fees. The response must match the selected pair, strategy,
  period, capital and stop/target percentages. Historical reads paginate exact
  requested dates, up to 5,000 complete candles; gaps and partial windows fail.
- Stop/target percentages no longer undergo an erroneous division by 100 in the
  route. Entry size fits capital including fees, including the default 2% stop.
  Opening gaps are processed before the intrabar range; the tighter previously
  known trailing stop takes precedence. Unknown intrabar order remains a
  conservative stop-before-target assumption, not tick-level execution.
- Sharpe and Sortino use uniform portfolio equity returns. Their zero reference
  rate/MAR, 365-day convention and square-root annualization assumption are
  explicit. Calmar uses geometric annualized return. Undefined ratios are null,
  not 999 or zero; flat trades are distinguished from losses. The strategy engine
  rejects unsupported leverage/AI options and discards failed analyses.
- Portfolio and JSON/CSV exports share recorded net-P&L calculations. Counts,
  true rolling periods and profit factor use net results. The portfolio drawdown
  is realized cash drawdown in USDT, not an equity percentage without a capital
  and cash-flow history. The views are explicitly paper-only and do not mix a
  live exchange balance with simulated P&L. CSV uses actual quantity/fees column
  names and escapes spreadsheet formulas in text cells.
- Report reads paginate, verify counts, detect duplicates/invalid accounts and
  reject observed concurrent changes. They have a 15-second read deadline and
  a 10,000-position ceiling. They are not a transactional database snapshot;
  oversize, failed or incomplete reads return errors rather than partial totals.
  Realized aggregate reports currently require USDT pairs.
- Manual close and the existing `check-positions` cron now share the atomic
  observation function. The old cron no longer substitutes CoinGecko USD prices
  for exchange pair prices or omits exit fees. A lost response or competing close
  cannot overwrite the first close or add a second exit fee. Audit failure rolls
  back the state change. The function refuses live rows and untrusted SQL roles.
- Marks require a recent Binance aggregate-trade timestamp (120 seconds maximum,
  five seconds future tolerance). They remain last-trade educational marks, not
  executable bid/ask quotes or guaranteed fills. The monitoring queries/RPCs have
  eight-second deadlines; batches stop starting after 20 seconds. The global
  read requires a complete inventory of at most 500 positions, and an individual
  read at most 100. Errors or unfinished work never yield a complete cron result.
  The existing five-minute scheduling frequency is unchanged; this is not a
  continuous exchange-side protective stop.
- The crash cron rejects missing, nonnumeric, wrong-asset or stale observations
  instead of declaring a stable zero. It checks persistence failures. The weekly
  signal inventory identifies itself as an inventory, not an executed backtest.

Apply **both** `20261011153000_atomic_paper_execution.sql` and
`20261011194000_atomic_paper_observation.sql` in an isolated authorized database
before integration. Neither has been applied to a production database here.
No live order, provider purchase, deployment, merge or Mac-worker modification
was performed. D2=A and the Vercel freeze remain unchanged. Reconcile the local
unpublished M3 work first; the pipeline's source/package access remains required
for browser flows and real-provider checks. Production latency, accessibility,
scientific validity of every strategy, and the three proposed financial agents
are **not** validated by these core tests.

Primary contracts and metric references consulted:

- https://web.stanford.edu/~wfsharpe/art/sr/sr.htm
- https://cran.r-project.org/web/packages/PerformanceAnalytics/PerformanceAnalytics.pdf
- https://docs.coingecko.com/reference/coins-markets
- Binance market-data contract linked above.

## Integration and paper loss admission, 9 November 2026

This candidate combines PR #24 (`e3ae5f817bcd1a5d543f09b7da9691e862fcd42e`)
with PR #26 (`9606e13cbf583705bd55dc317377d8a105afe302`). Quote forwarding,
the shared `paper_capital`, atomic receipts, retries and closing come from
PR #24 and are reused. The new change is the complete paper risk admission
contract, including the transaction boundary.

### Admission rule and ownership

The new `20261109193000_paper_risk_budget.sql` migration extends the existing
`midas_execute_paper_trade` function. It uses the same profile row lock as
opening and closing, the existing trade rows as reservations, and the existing
execution ledger as the receipt source. It does not create a second ledger.
New openings require `READ COMMITTED`; an older repeatable-read snapshot is
rejected before it can miss a transaction that committed while waiting.

For every opening, the transaction checks realized net losses in rolling
24-hour, 168-hour and 720-hour windows, plus risk reserved by all open positions,
plus the proposed fill's risk. Profitable closed trades do not offset losses.
The daily ceiling is the minimum of the user's configured daily limit,
500 quote units, and 1% of configured `paper_capital`; weekly and monthly
ceilings use their existing settings. A zero or invalid limit blocks opening.
Existing receipts replay before policy checks, including after a limit change.

Proposed risk uses the actual rounded execution price, truncated quantity,
entry fee and assumed exit fee. Open risk uses the persisted effective stop
(including trailing/breakeven moves), or a worse last observed mark, and the
recorded entry fee plus an assumed exit fee. The audit stores these amounts
and the limits. Closing releases the open reservation and records net realized
loss through the existing atomic observation function. The risk/reward field
now describes net target gain divided by net stop loss, using the stored
execution price and both entry and exit fees.

The preflight receives the same explicit quote and paper capital, uses the
same 0.05%/0.10% slippage assumptions and 0.1% fee assumption, includes open
positions, and rejects incomplete inventories by comparing exact counts.
Its floating-point estimate includes a small rounding reserve; SQL decimal
arithmetic is authoritative. A `PT409` budget refusal is reported as a known
non-execution. An unknown transport outcome remains subject to reconciliation
with the same operation identifier.

L3's minimum risk/reward of 1.5 is enforced after slippage and both fees in
the real preflight and the atomic SQL admission. A nominal ratio of 1.6 can
fail this test even when its post-slippage gross ratio still exceeds 1.5.
The effective ratio is recorded with the trade and its audit; the configured
minimum is not relaxed to accommodate costs.

All amounts in this paper ledger use canonical USDT pairs. Incompatible
currencies and malformed legacy records block new openings pending data
reconciliation. The legacy settings names ending in `_usd` are retained for
compatibility; no foreign exchange conversion or USDT peg guarantee is implied.
The percentage basis is configured paper capital, not live account equity.
The stop is a simulation estimate: price gaps and the existing five-minute
monitoring schedule can produce larger realized losses.

The baseline owner policy allowed direct table mutations when clients had
table write grants. The migration replaces it with owner-scoped `SELECT` and
revokes client table mutations. Direct client deletion of profiles is also
revoked, because that foreign-key cascade could erase the same history.
Server writes, both RPCs and authorized server-side account deletion retain
their existing ownership. This closes direct client rewriting/deletion of
loss history; privileged maintenance must still use the account lock protocol.

### Verification and remaining gates

Before fixes, 8 SQL budget cases, 5 preflight cases and 2 direct-client-history
cases failed on the real implementation. After correction, local verification
passes **176 unit tests and 74 paper SQL/boundary tests**. Seven of the latter
exercise the actual `executeTrade -> simulate -> RiskManager -> paper engine
-> SQL` chain with only database transport and the external market feed
controlled. They include effective risk/reward, an intervening state change
after preflight and a response lost after commit. No exchange account or connected paper session is
used. PGlite validates SQL semantics and RLS; it is not a multi-session proof.

The exact source `4f775b0a1010bd91f9036718361fe99330247d43` passed
**16 native PostgreSQL tests** on a newly initialized, isolated PostgreSQL
18.4 cluster (Node 26.0.0, existing authentic `pg` 8.23.0). These comprise
6 independent-session cases with observed row-lock waits, 4 URL guards, and
6 fixed-date daylight-saving checks. The independent-session cases include
two openings competing for the last loss allowance and an opening waiting
behind a profitable close or a loss gap. All 9 source-file hashes matched
the manifest. The cluster's own data directory was checked before database
creation; its shutdown and absent server were verified after the tests.
This used no existing application database or connected trading runtime.

The daylight-saving tests extract the actual intervals from the installed
function with `pg_get_functiondef`, then evaluate both March and October
boundaries in `Europe/Paris`. Before the fix, weekly windows became 167/169
hours and monthly windows 719/721 hours. All three periods now use elapsed
hours, with inclusive/exclusive boundaries checked one second either side.
The PGlite and native suites share these six cases; their counts are not
additional unique tests.

The runner's URL guard requires postgres/postgresql, an explicit numeric port,
localhost/127.0.0.1, database `midas_ci`, explicit disposable opt-in, and empty
query/fragment. Tests use the real pg parser to reproduce how `?host=` could
otherwise replace the apparent local host. Two failing guard cases and three
failing effective-risk/reward cases were reproduced before their fixes.

The initial application typecheck was **BLOCKED** by the missing authentic
`@purama/antifraud`, `@purama/entraide` and `@purama/retention` packages (12
diagnostics: 11 missing-module reports and one dependent inferred type).
The exact locked SMARANA source, shared ESLint package, and all 22 runtime
package files have since been recovered and verified against source hashes.
No runtime package was replaced with a stub. On application source `e4a7eef1`,
the full typecheck passed; ESLint checked 762 files with zero errors and zero
warnings; the default Next 16.3.5 Turbopack build passed and generated 174
pages. The build used disconnected synthetic environment values, not provider
credentials. The subsequent `4f775b0a` change affects only SQL and its test
fixtures; those were separately revalidated as described above. Dependency
security changes are a separate follow-up and require their own fresh gates.
These checks do not qualify browser flows or real external providers.

Apply all three paper migrations together only in an authorized isolated
database first. No production migration, order, live activation, project
worktree modification or deployment is part of this candidate. After the
initial offline device error, a fresh read confirmed M3 head `9cf7b1d` and
T5 head `949b308`, including the five relevant file hashes. The latest T5
receipt/quantity work concerns the live execution engine; its writer is
inactive but its reservation remains. Reconcile unpublished M3 work before
integration. D2=A and the branch deployment freeze remain enabled.

Additional primary contracts checked:

- https://www.postgresql.org/docs/18/applevel-consistency.html
- https://www.postgresql.org/docs/18/explicit-locking.html
- https://docs.postgrest.org/en/stable/references/transactions.html
- https://docs.postgrest.org/en/v16/references/errors.html
