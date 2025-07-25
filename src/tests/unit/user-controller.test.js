import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { handleSignUp } from '../../http-server/user-controller.js';
import { DatabaseSync } from 'node:sqlite';

test('handleSignUp: 필드 누락 시 400 에러', async (t) => {
  await assert.rejects(() => handleSignUp({ userId: 'u1' }), { message: 'Missing fields' });
});

test('handleSignUp: 중복 사용자 등록 시 409 에러', async (t) => {
  // 같은 DB 파일을 쓰므로 유저 생성 후 중복 테스트
  await handleSignUp({ userId: 'u2', password: 'p', address: '서울' });
  await assert.rejects(() => handleSignUp({ userId: 'u2', password: 'p', address: '서울' }), {
    message: 'User already exists',
  });
});

test('handleSignUp: 정상 등록', async (t) => {
  const result = await handleSignUp({ userId: 'u3', password: 'p', address: '부산' });
  assert.equal(result.userId, 'u3');
  assert.equal(result.address, '부산');
});
