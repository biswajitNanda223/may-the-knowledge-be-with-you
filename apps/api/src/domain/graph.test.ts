import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeCursor, encodeCursor } from './graph.js';
describe('graph cursor', () => { it('round trips unicode', () => assert.deepEqual(decodeCursor(encodeCursor('CAPEX ₹', 'ENT_1')), { name: 'CAPEX ₹', id: 'ENT_1' })); });
