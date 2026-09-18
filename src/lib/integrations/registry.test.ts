import test from 'node:test';
import assert from 'node:assert/strict';
import { getIntegrationConfiguration, INTEGRATIONS, KEYLESS_DATA_SOURCES } from './registry.ts';

test('integration registry never exposes secret values', () => {
  const snapshot = JSON.stringify(getIntegrationConfiguration());
  for (const integration of INTEGRATIONS) {
    for (const variable of integration.env) {
      const value = process.env[variable];
      if (value) assert.equal(snapshot.includes(value), false);
    }
  }
});

test('every integration has a stable unique id', () => {
  const ids = INTEGRATIONS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('MIDAS keeps several keyless market-data fallbacks', () => {
  assert.ok(KEYLESS_DATA_SOURCES.length >= 5);
});
