import test from 'node:test';
import assert from 'node:assert/strict';
import { createSingleFlight } from './single-flight.ts';

test('100 concurrent requests for the same key perform one fetch', async () => {
  const run = createSingleFlight();
  let calls = 0;
  let release!: (value: number) => void;
  const load = () => { calls++; return new Promise<number>(resolve => { release = resolve; }); };
  const requests = Array.from({ length: 100 }, () => run('same', load));
  await Promise.resolve();
  assert.equal(calls, 1);
  release(42);
  assert.deepEqual(await Promise.all(requests), Array(100).fill(42));
});
test('rejected and synchronously thrown loads release the slot for a retry', async () => {
  const run = createSingleFlight(1);
  await assert.rejects(run('key', () => { throw new Error('failed'); }), /failed/);
  assert.equal(await run('key', async () => 7), 7);
});
test('different account keys never share a result', async () => {
  const run = createSingleFlight();
  assert.deepEqual(await Promise.all([run('user:a', async () => 'a'), run('user:b', async () => 'b')]), ['a', 'b']);
});
test('capacity is bounded without rejecting callers joining an existing load', async () => {
  const run = createSingleFlight(1);
  let release!: (value: string) => void;
  const first = run('a', () => new Promise<string>(resolve => { release = resolve; }));
  const same = run('a', async () => 'wrong');
  await assert.rejects(run('b', async () => 'b'), /concurrent/);
  release('ok');
  assert.deepEqual(await Promise.all([first, same]), ['ok', 'ok']);
  assert.equal(await run('b', async () => 'b'), 'b');
});
