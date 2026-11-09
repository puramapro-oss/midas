import { db } from './fixture.mjs';
import { registerRiskWindowTests } from './risk-windows.mjs';

registerRiskWindowTests((...args) => db.query(...args));
