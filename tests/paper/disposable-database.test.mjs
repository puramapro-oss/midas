import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { requireDisposableDatabase } from './disposable-database.mjs';

const local = 'postgres://postgres:local-ci-only@localhost:5432/midas_ci';
test('the PostgreSQL guard accepts an explicitly opted-in local disposable database', () => {
  for (const value of [local, 'postgresql://test@127.0.0.1:5433/midas_ci']) {
    assert.equal(requireDisposableDatabase(value, 'true'), value);
  }
});
test('the PostgreSQL guard rejects missing opt-in, foreign hosts and foreign databases', () => {
  assert.throws(() => requireDisposableDatabase(local, undefined));
  assert.throws(() => requireDisposableDatabase(local, 'false'));
  assert.throws(() => requireDisposableDatabase('postgres://example.org:5432/midas_ci', 'true'));
  assert.throws(() => requireDisposableDatabase('postgres://localhost:5432/production', 'true'));
});
test('the PostgreSQL guard rejects a query that replaces the host in the real pg parser', () => {
  const value = `${local}?host=remote.example`;
  // Constructing the real client parses the configuration without connecting.
  assert.equal(new pg.Client({ connectionString: value }).host, 'remote.example', 'Prove the real parser overrides the visible URL host');
  assert.throws(() => requireDisposableDatabase(value, 'true'));
});
test('the PostgreSQL guard requires a database protocol, explicit port and no URL options', () => {
  for (const value of [
    'http://localhost:5432/midas_ci', 'file://localhost:5432/midas_ci',
    'postgres://localhost/midas_ci', 'postgres://localhost:0/midas_ci',
    `${local}?port=5434`, `${local}?dbname=production`, `${local}#fragment`,
  ]) assert.throws(() => requireDisposableDatabase(value, 'true'), value);
});
