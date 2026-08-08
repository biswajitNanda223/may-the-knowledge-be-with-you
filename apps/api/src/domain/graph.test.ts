import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './graph.js';
describe('graph cursor', () => { it('round trips unicode', () => expect(decodeCursor(encodeCursor('CAPEX ₹', 'ENT_1'))).toEqual({ name: 'CAPEX ₹', id: 'ENT_1' })); });

