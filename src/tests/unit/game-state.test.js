import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { GameState } from '../../tcp-server/game-state.js';

test('GameState.registerClick 및 getClickCount 동작', (t) => {
  const gs = new GameState();
  assert.equal(gs.getClickCount('alice'), 0);

  const c1 = gs.registerClick('alice');
  assert.equal(c1, 1);
  assert.equal(gs.getClickCount('alice'), 1);

  const c2 = gs.registerClick('alice');
  assert.equal(c2, 2);
  assert.equal(gs.getClickCount('bob'), 0);
});
