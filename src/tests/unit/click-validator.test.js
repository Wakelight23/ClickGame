import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ClickValidator } from '../../tcp-server/click-validator.js';

test('슬라이딩 윈도우 검증: 정상 클릭', () => {
  const validator = new ClickValidator();
  const userId = 'test_user';
  const baseTime = Date.now();

  // 0.3초, 0.7초, 0.9초에 클릭 (정상)
  assert.ok(validator.validateClick(userId, baseTime + 300).valid);
  assert.ok(validator.validateClick(userId, baseTime + 700).valid);
  assert.ok(validator.validateClick(userId, baseTime + 900).valid);
});

test('슬라이딩 윈도우 검증: 초과 클릭으로 실격', () => {
  const validator = new ClickValidator();
  const userId = 'test_user';
  const baseTime = Date.now();

  // 5회 연속 클릭으로 실격 처리
  assert.ok(validator.validateClick(userId, baseTime + 100).valid);
  assert.ok(validator.validateClick(userId, baseTime + 200).valid);
  assert.ok(validator.validateClick(userId, baseTime + 300).valid);
  assert.ok(validator.validateClick(userId, baseTime + 400).valid);

  // 5번째 클릭에서 실격
  const result = validator.validateClick(userId, baseTime + 500);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'RATE_EXCEEDED');
});

test('10초 비활성화 실격 처리', () => {
  const validator = new ClickValidator();
  const userId = 'test_user';
  const baseTime = Date.now();

  // 첫 클릭
  assert.ok(validator.validateClick(userId, baseTime).valid);

  // 10초 후 클릭 (실격)
  const result = validator.validateClick(userId, baseTime + 11000);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'INACTIVE_TIMEOUT');
});
