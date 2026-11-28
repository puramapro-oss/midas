import assert from 'node:assert/strict';

export const ACCOUNT_A = 'a0000000-0000-4000-8000-000000000001';
export const ACCOUNT_B = 'b0000000-0000-4000-8000-000000000002';
export const state = {};

export function reset(overrides = {}) {
  Object.assign(state, {
    user: { id: ACCOUNT_A }, authError: null, authThrow: false,
    notifications: [], preferences: [], signals: [], calls: [], mutations: [],
    fail: null, throwQuery: false, noRow: false, countMissing: false, transformData: null,
    analyzed: [], analysisFailures: [],
    ...overrides,
  });
}

function builder(schema, table) {
  assert.ok(['public.notifications', 'midas.notification_preferences', 'public.signals'].includes(`${schema}.${table}`),
    `Unexpected table or financial effect: ${schema}.${table}`);
  const query = { schema, table, action: 'select', filters: [], limit: Infinity, options: {} };
  state.calls.push(query);
  const methods = {
    select(columns = '*', options = {}) { query.columns = columns; query.options = options; return this; },
    eq(column, value) { query.filters.push(['eq', column, value]); return this; },
    not(column, operator, value) { assert.equal(operator, 'is'); query.filters.push(['not.is', column, value]); return this; },
    in(column, values) { query.filters.push(['in', column, values]); return this; },
    gt(column, value) { query.filters.push(['gt', column, value]); return this; },
    lt(column, value) { query.filters.push(['lt', column, value]); return this; },
    lte(column, value) { query.filters.push(['lte', column, value]); return this; },
    order(column, options) { query.order = { column, ...options }; return this; },
    limit(amount) { query.limit = amount; return this; },
    maybeSingle() { query.single = 'maybe'; return this; },
    single() { query.single = 'required'; return this; },
    update(payload) { query.action = 'update'; query.payload = payload; return this; },
    upsert(payload, options) { query.action = 'upsert'; query.payload = payload; query.upsertOptions = options; return this; },
    insert(payload) { query.action = 'insert'; query.payload = payload; return this; },
    then(resolve, reject) { return Promise.resolve().then(() => run(query)).then(resolve, reject); },
  };
  return methods;
}

function run(query) {
  if (state.throwQuery) throw new Error('PRIVATE_DATABASE_EXCEPTION');
  if (state.fail?.(query)) return { data: null, count: null, error: { message: 'PRIVATE_DATABASE_ERROR' } };
  const key = query.table === 'notification_preferences' ? 'preferences' : query.table;
  const matches = (row) => query.filters.every(([op, column, value]) => {
    if (op === 'eq') return row[column] === value;
    if (op === 'not.is') return row[column] !== value;
    if (op === 'in') return value.includes(row[column]);
    if (row[column] == null) return false;
    if (op === 'gt') return row[column] > value;
    if (op === 'lte') return row[column] <= value;
    return row[column] < value;
  });
  let rows = state[key].filter(matches);
  if (query.action !== 'select') {
    state.mutations.push(structuredClone(query));
    if (query.action === 'update') rows.forEach((row) => Object.assign(row, query.payload));
    if (query.action === 'upsert') {
      assert.equal(query.upsertOptions.onConflict, 'user_id');
      let row = state[key].find((item) => item.user_id === query.payload.user_id);
      if (!row) { row = {}; state[key].push(row); }
      Object.assign(row, query.payload);
      rows = [row];
    }
    if (query.action === 'insert') {
      rows = query.payload.map((item, index) => ({ id: `d0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, ...item }));
      state[key].push(...rows);
    }
  }
  if (query.options.head) return { data: null, count: state.countMissing ? null : rows.length, error: null };
  if (query.order) rows.sort((a, b) => String(b[query.order.column]).localeCompare(String(a[query.order.column])));
  rows = rows.slice(0, query.limit);
  const data = state.noRow ? null : query.single ? rows[0] ?? null : rows;
  return { data: structuredClone(state.transformData ? state.transformData(query, data) : data), error: null };
}

export async function createClient() {
  return {
    auth: {
      async getUser() {
        if (state.authThrow) throw new Error('PRIVATE_AUTH_EXCEPTION');
        return { data: { user: state.user }, error: state.authError };
      },
    },
    from(table) { return builder('public', table); },
    schema(schema) { return { from: (table) => builder(schema, table) }; },
  };
}

export async function generateVerifiedSignal(pair) {
  state.analyzed.push(pair);
  if (state.analysisFailures.includes(pair)) throw new Error('Market analysis unavailable');
  return { pair, is_active: true, expires_at: new Date(Date.now() + 60_000).toISOString() };
}

reset();
