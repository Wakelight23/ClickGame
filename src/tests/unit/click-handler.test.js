import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { handleClick } from '../../tcp-server/click-handler.js';
import { GameState } from '../../tcp-server/game-state.js';

test('handleClick: 올바른 클릭 요청 처리', (t) => {
  const gs = new GameState();
  const req = JSON.stringify({ type: 'CLICK', userId: 'alice' });
  const res = handleClick(gs, req, null);
  const parsed = JSON.parse(res);
  assert.equal(parsed.success, true);
  assert.equal(parsed.count, 1);
});

test('handleClick: 잘못된 JSON 포맷', (t) => {
  const gs = new GameState();
  const res = handleClick(gs, 'invalid', null);
  const err = JSON.parse(res);
  assert.equal(err.error, 'INVALID_FORMAT');
});

test('handleClick: 잘못된 요청 타입', (t) => {
  const gs = new GameState();
  const res = handleClick(gs, JSON.stringify({ foo: 'bar' }), null);
  const err = JSON.parse(res);
  assert.equal(err.error, 'INVALID_REQUEST');
});
