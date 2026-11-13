'use strict';
// Loaded only by the isolated test launcher. This is a test transport, not a
// production endpoint override or a substitute for real provider qualification.
const { createFetchTransport } = require('./fixtures.cjs');
if (process.env.MIDAS_E2E_ISOLATED !== '1' || !process.env.MIDAS_E2E_JOURNAL) {
  throw new Error('The E2E fetch transport requires the isolated launcher');
}
globalThis.fetch = createFetchTransport(globalThis.fetch, process.env.MIDAS_E2E_JOURNAL);
