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
