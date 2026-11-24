/** Coalesce concurrent reads within one process; this is not a distributed lock. */
export function createSingleFlight(maxPending = 256) {
  if (!Number.isInteger(maxPending) || maxPending < 1) throw new Error('Invalid pending-load limit');
  const pending = new Map<string, Promise<unknown>>();
  return function singleFlight<T>(key: string, load: () => Promise<T>): Promise<T> {
    const current = pending.get(key);
    if (current) return current as Promise<T>;
    if (pending.size >= maxPending) return Promise.reject(new Error('Too many concurrent cache loads'));
    // Deferring load also handles synchronous throws and registers the promise
    // before another request can start the same work.
    const work = Promise.resolve().then(load);
    pending.set(key, work);
    void work.then(
      () => { if (pending.get(key) === work) pending.delete(key); },
      () => { if (pending.get(key) === work) pending.delete(key); },
    );
    return work;
  };
}
