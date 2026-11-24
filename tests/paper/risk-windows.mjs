import test from 'node:test';
import assert from 'node:assert/strict';

// Read the intervals from the installed function, then evaluate them in the
// same PostgreSQL engine at fixed DST boundaries. No wall-clock dependency.
export function registerRiskWindowTests(query) {
  const seasons = [
    ['spring', '2026-03-30T00:30:00+02:00'],
    ['autumn', '2026-10-26T00:30:00+01:00'],
  ];
  const windows = [['daily', 24], ['weekly', 168], ['monthly', 720]];
  for (const [season, anchor] of seasons) {
    for (const [index, [label, expectedHours]] of windows.entries()) {
      test(`${label} paper loss window remains ${expectedHours} elapsed hours across Paris ${season} DST`, async () => {
        const installed = await query(`SELECT pg_get_functiondef(
          'public.midas_execute_paper_trade(uuid,uuid,jsonb,numeric,integer,integer)'::regprocedure
        ) AS definition`);
        const intervals = [...installed.rows[0].definition.matchAll(
          /closed_at\s*>=\s*v_now\s*-\s*interval\s*'([^']+)'/gi,
        )].map(match => match[1]);
        assert.equal(intervals.length, 3, 'Read all three actual admission windows');
        await query('BEGIN');
        try {
          await query("SET LOCAL TIME ZONE 'Europe/Paris'");
          const result = await query(`SELECT
            extract(epoch FROM ($1::timestamptz - ($1::timestamptz - $2::interval)))::float8 / 3600 AS elapsed_hours,
            $1::timestamptz - make_interval(secs => $3 * 3600 - 1) >= $1::timestamptz - $2::interval AS includes_inside,
            $1::timestamptz - make_interval(secs => $3 * 3600 + 1) >= $1::timestamptz - $2::interval AS includes_outside`,
          [anchor, intervals[index], expectedHours]);
          assert.equal(result.rows[0].elapsed_hours, expectedHours);
          assert.equal(result.rows[0].includes_inside, true);
          assert.equal(result.rows[0].includes_outside, false);
        } finally {
          await query('ROLLBACK');
        }
      });
    }
  }
}
