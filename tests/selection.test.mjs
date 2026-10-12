import test from 'node:test';
import assert from 'node:assert/strict';
import { Picker } from '../public/js/game/selection.js';

test('3つまで選べて、4つ目は入らない', () => {
  const p = new Picker(3);
  assert.equal(p.toggle('meat'), 'added');
  assert.equal(p.toggle('rice'), 'added');
  assert.equal(p.isComplete(), false);
  assert.equal(p.toggle('egg'), 'added');
  assert.equal(p.isComplete(), true);
  assert.equal(p.toggle('onion'), 'full');
  assert.deepEqual(p.values, ['meat', 'rice', 'egg']);
});

test('選んだものを押すと外れて選び直せる', () => {
  const p = new Picker(3);
  p.toggle('meat');
  p.toggle('rice');
  p.toggle('egg');
  assert.equal(p.toggle('rice'), 'removed');
  assert.equal(p.isComplete(), false);
  assert.equal(p.toggle('onion'), 'added');
  assert.deepEqual(p.values, ['meat', 'egg', 'onion']);
});

test('1つ選ぶときは押すと入れ替わる', () => {
  const p = new Picker(1);
  assert.equal(p.toggle('roux'), 'added');
  assert.equal(p.toggle('mayo'), 'replaced');
  assert.deepEqual(p.values, ['mayo']);
  assert.equal(p.isComplete(), true);
  assert.equal(p.toggle('mayo'), 'removed');
  assert.equal(p.isComplete(), false);
});
