import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSignature } from '../Netlify/Funtions/lib/signature-validation.mjs';

const valid = () => ({ width: 600, height: 240, strokes: [[[10, 20], [100, 80], [180, 40]]] });
test('stores numeric strokes as Firestore-compatible maps and flat arrays', () => {
  assert.deepEqual(validateSignature(valid()), { version: 1, width: 600, height: 240,
    strokes: [{ points: [10, 20, 100, 80, 180, 40] }] });
});
test('rejects missing, empty and stationary signatures', () => {
  for (const signature of [undefined, {}, { ...valid(), strokes: [] },
    { ...valid(), strokes: [[[2, 2], [2, 2]]] }]) assert.throws(() => validateSignature(signature));
});
test('rejects malformed coordinates, injected strings and oversized drawings', () => {
  for (const points of [[[1, 1], [601, 2]], [[1, 1], [2, -1]], [[1, 1], [2, NaN]],
    [[1, 1], ['<script>', 2]], [[1, 1], [2, 3, 4]], Array(4001).fill([10, 20])]) {
    assert.throws(() => validateSignature({ ...valid(), strokes: [points] }));
  }
});
