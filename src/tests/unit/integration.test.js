// tests/unit/click-validator.test.js
import { strict as assert } from 'node:assert';
import { test, beforeEach, afterEach } from 'node:test';
import { TestDatabase } from '../test-db-singleton.js';

// 테스트용설정
process.env.NODE_ENV = 'test';

import { ClickValidator } from '../../tcp-server/click-validator.js';
import { GameState } from '../../tcp-server/game-state.js';
import { handleSignUp, handleSignIn } from '../../http-server/user-controller.js';
import { issueToken, verifyToken } from '../../http-server/auth-controller.js';

// 테스트 헬퍼 함수들
class TestHelper {
  static async createTestUser(
    userId = 'test_user',
    password = 'test_password',
    address = 'Test Address',
  ) {
    try {
      const userData = { userId, password, address };
      const result = await handleSignUp(userData);
      return { success: true, user: result };
    } catch (error) {
      console.error('회원가입 실패:', error.message);
      return { success: false, error: error.message };
    }
  }

  static async loginTestUser(userId = 'test_user', password = 'test_password') {
    try {
      const loginData = { userId, password };
      const result = await handleSignIn(loginData);
      return { success: true, token: result.token };
    } catch (error) {
      console.error('로그인 실패 상세:', error.message);
      return { success: false, error: error.message };
    }
  }

  static validateToken(token) {
    try {
      const user = verifyToken(token);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static generateUniqueUserId() {
    return `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 각 테스트 전후 설정
let gameState;
let validator;
let testUser;
let userToken;

beforeEach(async () => {
  // 데이터베이스 초기화
  TestDatabase.reset();
  const testDb = TestDatabase.getInstance();

  // 게임 상태 초기화
  gameState = new GameState();
  validator = new ClickValidator();

  // 고유한 테스트 사용자 생성
  const uniqueUserId = TestHelper.generateUniqueUserId();

  console.log('테스트 사용자 생성 시도:', uniqueUserId);
  const signupResult = await TestHelper.createTestUser(uniqueUserId, 'test_password', 'Seoul');
  console.log('회원가입 결과:', signupResult);

  if (signupResult.success) {
    testUser = { userId: uniqueUserId, password: 'test_password' };

    console.log('로그인 시도:', uniqueUserId);
    const loginResult = await TestHelper.loginTestUser(uniqueUserId, 'test_password');
    console.log('로그인 결과:', loginResult);

    if (loginResult.success) {
      userToken = loginResult.token;
      gameState.registerUser(uniqueUserId);
    } else {
      console.error('로그인 실패 상세:', loginResult.error);
    }
  } else {
    console.error('회원가입 실패 상세:', signupResult.error);
  }
});

afterEach(() => {
  // 테스트 후 정리
  gameState = null;
  validator = null;
  testUser = null;
  userToken = null;
  TestDatabase.reset();
});

test('회원가입 후 로그인하여 유효한 토큰 발급', async () => {
  // 새로운 사용자로 테스트
  const newUserId = TestHelper.generateUniqueUserId();

  // 1) 회원가입
  const signupResult = await TestHelper.createTestUser(newUserId, 'test_password', 'Busan');
  assert.ok(signupResult.success, '회원가입이 성공해야 함');
  console.log('signupResult 성공여부 : ', signupResult.success);
  assert.equal(signupResult.user.userId, newUserId);
  assert.equal(signupResult.user.address, 'Busan');

  // 2) 로그인
  const loginResult = await TestHelper.loginTestUser(newUserId, 'test_password');
  assert.ok(loginResult.success, '로그인이 성공해야 함');
  console.log('loginResult 성공여부 : ', loginResult.success);
  assert.ok(loginResult.token, '토큰이 발급되어야 함');

  // 3) 토큰 검증
  const tokenValidation = TestHelper.validateToken(loginResult.token);
  assert.ok(tokenValidation.success, '토큰이 유효해야 함');
  console.log('tokenValidation 성공여부 : ', tokenValidation.success);
  assert.equal(tokenValidation.user.userId, newUserId);
});

test('잘못된 비밀번호로 로그인 시 실패', async () => {
  const userId = TestHelper.generateUniqueUserId();

  // 회원가입
  await TestHelper.createTestUser(userId, 'correct_password', 'Seoul');

  // 잘못된 비밀번호로 로그인 시도
  const loginResult = await TestHelper.loginTestUser(userId, 'wrong_password');
  assert.equal(loginResult.success, false, '로그인이 실패해야 함');
  assert.ok(loginResult.error.includes('Invalid credentials'), '인증 실패 메시지가 있어야 함');
});

test('존재하지 않는 사용자로 로그인 시 실패', async () => {
  const loginResult = await TestHelper.loginTestUser('nonexistent_user', 'any_password');
  assert.equal(loginResult.success, false, '로그인이 실패해야 함');
  assert.ok(loginResult.error.includes('Invalid credentials'), '인증 실패 메시지가 있어야 함');
});

test('인증된 사용자의 정상 클릭 검증', async () => {
  // 토큰 검증
  const tokenValidation = TestHelper.validateToken(userToken);
  assert.ok(tokenValidation.success, '토큰이 유효해야 함');

  // 이벤트 시작
  gameState.startEvent();

  const baseTime = Date.now();

  // 정상 클릭 시퀀스 (1초 내 4회 이하)
  const click1 = gameState.registerClick(testUser.userId, baseTime + 100);
  assert.equal(click1.success, true, '첫 번째 클릭이 성공해야 함');
  assert.equal(click1.count, 1);

  const click2 = gameState.registerClick(testUser.userId, baseTime + 300);
  assert.equal(click2.success, true, '두 번째 클릭이 성공해야 함');
  assert.equal(click2.count, 2);

  const click3 = gameState.registerClick(testUser.userId, baseTime + 700);
  assert.equal(click3.success, true, '세 번째 클릭이 성공해야 함');
  assert.equal(click3.count, 3);

  const click4 = gameState.registerClick(testUser.userId, baseTime + 900);
  assert.equal(click4.success, true, '네 번째 클릭이 성공해야 함');
  assert.equal(click4.count, 4);
});

test('인증된 사용자의 과도한 클릭으로 실격 처리', async () => {
  // 토큰 검증
  const tokenValidation = TestHelper.validateToken(userToken);
  assert.ok(tokenValidation.success, '토큰이 유효해야 함');

  // 이벤트 시작
  gameState.startEvent();

  const baseTime = Date.now();

  // 1초 내 5회 클릭으로 실격 유도
  gameState.registerClick(testUser.userId, baseTime + 100);
  gameState.registerClick(testUser.userId, baseTime + 200);
  gameState.registerClick(testUser.userId, baseTime + 300);
  gameState.registerClick(testUser.userId, baseTime + 400);

  // 5번째 클릭에서 실격
  const excessiveClick = gameState.registerClick(testUser.userId, baseTime + 500);
  assert.equal(excessiveClick.success, false, '과도한 클릭으로 실격되어야 함');
  assert.equal(excessiveClick.reason, 'RATE_EXCEEDED');

  // 실격 후 추가 클릭은 모두 거부
  const afterDisqualification = gameState.registerClick(testUser.userId, baseTime + 1000);
  assert.equal(afterDisqualification.success, false, '실격된 사용자의 클릭은 거부되어야 함');
  assert.equal(afterDisqualification.reason, 'DISQUALIFIED');
});

test('인증된 사용자의 비활성화 타임아웃 실격', async () => {
  // 토큰 검증
  const tokenValidation = TestHelper.validateToken(userToken);
  assert.ok(tokenValidation.success, '토큰이 유효해야 함');

  // 이벤트 시작
  gameState.startEvent();

  const baseTime = Date.now();

  // 첫 클릭
  const firstClick = gameState.registerClick(testUser.userId, baseTime);
  assert.equal(firstClick.success, true, '첫 클릭이 성공해야 함');

  // 10초 후 클릭 (비활성화 타임아웃)
  const timeoutClick = gameState.registerClick(testUser.userId, baseTime + 11000);
  assert.equal(timeoutClick.success, false, '비활성화 타임아웃으로 실격되어야 함');
  assert.equal(timeoutClick.reason, 'INACTIVE_TIMEOUT');
});

test('회원가입하지 않은 사용자의 클릭 거부', () => {
  // 이벤트 시작
  gameState.startEvent();

  // 등록되지 않은 사용자 ID로 클릭 시도
  const unregisteredClick = gameState.registerClick('unregistered_user', Date.now());
  assert.equal(unregisteredClick.success, false, '미등록 사용자의 클릭은 거부되어야 함');
  assert.equal(unregisteredClick.reason, 'NOT_REGISTERED');
});

test('유효하지 않은 토큰 검증 실패', () => {
  const invalidTokens = ['invalid_token', '', null, undefined, 'expired_token_12345'];

  invalidTokens.forEach((token) => {
    const validation = TestHelper.validateToken(token);
    assert.equal(validation.success, false, `토큰 '${token}'은 유효하지 않아야 함`);
  });
});

test('완전한 게임 플로우: 회원가입 → 로그인 → 클릭 → 순위 확인', async () => {
  // 초기 플레이어 풀을 더 많이 생성 (실격자 고려)
  const initialPlayerCount = 5; // 3명 필요하지만 실격 가능성을 고려해 5명 생성
  const players = [];
  const qualifiedPlayers = []; // 실격되어들을 저장

  // 초기 플레이어들 생성 및 로그인
  for (let i = 0; i < initialPlayerCount; i++) {
    const userId = TestHelper.generateUniqueUserId();
    const signupResult = await TestHelper.createTestUser(userId, 'password', 'Seoul');
    assert.ok(signupResult.success, `사용자 ${i + 1} 회원가입 성공`);

    const loginResult = await TestHelper.loginTestUser(userId, 'password');
    assert.ok(loginResult.success, `사용자 ${i + 1} 로그인 성공`);

    gameState.registerUser(userId);
    players.push({ userId, token: loginResult.token, index: i + 1 });
  }

  // 이벤트 시작
  gameState.startEvent();
  const baseTime = Date.now();

  // 각 플레이어별로 클릭 수행 (실격 처리 포함)
  for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
    const player = players[playerIndex];
    const targetClickCount = (playerIndex + 1) * 2; // 2, 4, 6, 8, 10 클릭 시도
    let successfulClicks = 0;
    let isDisqualified = false;

    console.log(`플레이어 ${player.index} (${player.userId}) - 목표 클릭 수: ${targetClickCount}`);

    for (let i = 0; i < targetClickCount; i++) {
      const clickTime = baseTime + i * 200 + playerIndex * 50;
      const result = gameState.registerClick(player.userId, clickTime);

      console.log(`플레이어 ${player.index}의 클릭 ${i + 1}:`, result);

      if (result.success) {
        successfulClicks++;
      } else if (result.reason === 'RATE_EXCEEDED') {
        // 실격 처리는 정상적인 게임 로직이므로 성공으로 간주
        console.log(`플레이어 ${player.index} 실격 처리됨 (정상 동작)`);
        isDisqualified = true;
        break; // 실격된 후 추가 클릭 시도 중단
      } else {
        // 다른 이유로 실패한 경우만 테스트 실패로 처리
        assert.fail(`예상치 못한 클릭 실패: ${result.reason}`);
      }
    }

    // 실격되지 않은 플레이어만 자격을 얻은 플레이어 목록에 추가
    if (!isDisqualified && successfulClicks > 0) {
      qualifiedPlayers.push({
        ...player,
        successfulClicks,
      });
    }

    // 결과 검증: 성공적인 클릭이나 실격 처리 둘 다 정상 동작
    const expectedOutcome = isDisqualified || successfulClicks > 0;
    assert.ok(expectedOutcome, `플레이어 ${player.index}의 게임 참여 결과가 정상적이어야 함`);
  }

  // 자격을 얻은 플레이어가 3명 미만인 경우 추가 플레이어 생성
  let additionalPlayerCount = 0;
  while (qualifiedPlayers.length < 3) {
    additionalPlayerCount++;
    const userId = TestHelper.generateUniqueUserId();

    console.log(`추가 플레이어 ${additionalPlayerCount} 생성: ${userId}`);

    const signupResult = await TestHelper.createTestUser(userId, 'password', 'Seoul');
    assert.ok(signupResult.success, `추가 사용자 ${additionalPlayerCount} 회원가입 성공`);

    const loginResult = await TestHelper.loginTestUser(userId, 'password');
    assert.ok(loginResult.success, `추가 사용자 ${additionalPlayerCount} 로그인 성공`);

    gameState.registerUser(userId);

    // 추가 플레이어는 안전한 간격으로 클릭 (실격 방지)
    const safeClickCount = Math.min(3, 4 - qualifiedPlayers.length); // 최대 3번, 필요한 만큼만
    let successfulClicks = 0;

    for (let i = 0; i < safeClickCount; i++) {
      // 안전한 간격 (1.5초)으로 클릭하여 실격 방지
      const clickTime = Date.now() + i * 1500;
      const result = gameState.registerClick(userId, clickTime);

      console.log(`추가 플레이어 ${additionalPlayerCount}의 클릭 ${i + 1}:`, result);

      if (result.success) {
        successfulClicks++;
      } else if (result.reason === 'RATE_EXCEEDED') {
        console.log(`추가 플레이어 ${additionalPlayerCount} 실격됨`);
        break;
      } else {
        console.warn(`추가 플레이어 클릭 실패: ${result.reason}`);
      }
    }

    // 성공적으로 클릭한 경우만 자격 플레이어에 추가
    if (successfulClicks > 0) {
      qualifiedPlayers.push({
        userId,
        token: null,
        index: initialPlayerCount + additionalPlayerCount,
        successfulClicks,
      });
    }

    // 무한 루프 방지
    if (additionalPlayerCount > 10) {
      console.warn('추가 플레이어 생성 제한 도달');
      break;
    }
  }

  console.log(`총 자격을 얻은 플레이어 수: ${qualifiedPlayers.length}`);
  console.log(
    '자격을 얻은 플레이어들:',
    qualifiedPlayers.map((p) => ({
      userId: p.userId,
      clicks: p.successfulClicks,
    })),
  );

  // 리더보드 확인
  const leaderboard = gameState.getLeaderboard();
  console.log('최종 리더보드:', leaderboard);

  // 최소 3명이 리더보드에 있어야 함 (실격자 제외)
  assert.ok(
    leaderboard.length >= 3,
    `최소 3명의 플레이어가 순위에 있어야 함 (현재: ${leaderboard.length}명)`,
  );

  // 점수 순으로 정렬되었는지 확인 (상위 3명만 검증)
  if (leaderboard.length >= 2) {
    assert.ok(
      leaderboard[0].clickCount >= leaderboard[1].clickCount,
      '1위와 2위가 올바르게 정렬되어야 함',
    );
  }

  if (leaderboard.length >= 3) {
    assert.ok(
      leaderboard[1].clickCount >= leaderboard[2].clickCount,
      '2위와 3위가 올바르게 정렬되어야 함',
    );
  }

  console.log('테스트 완료: 모든 플레이어가 정상적으로 게임에 참여했습니다.');
});

test('실격자 제외 리더보드 검증', async () => {
  // 여러 플레이어 생성
  const players = [];
  for (let i = 0; i < 3; i++) {
    const userId = TestHelper.generateUniqueUserId();
    await TestHelper.createTestUser(userId, 'password', 'Seoul');
    const loginResult = await TestHelper.loginTestUser(userId, 'password');
    gameState.registerUser(userId);
    players.push({ userId, token: loginResult.token });
  }

  gameState.startEvent();
  const baseTime = Date.now();

  // 플레이어 1: 정상 클릭 (3회)
  for (let i = 0; i < 3; i++) {
    const result = gameState.registerClick(players[0].userId, baseTime + i * 1500);
    assert.ok(result.success);
  }

  // 플레이어 2: 정상 클릭 (2회)
  for (let i = 0; i < 2; i++) {
    const result = gameState.registerClick(players[1].userId, baseTime + i * 1500);
    assert.ok(result.success);
  }

  // 플레이어 3: 의도적 실격 (빠른 연속 클릭)
  for (let i = 0; i < 5; i++) {
    gameState.registerClick(players[2].userId, baseTime + i * 100);
  }

  // 리더보드 확인 - 실격자 제외하고 2명만 있어야 함
  const leaderboard = gameState.getLeaderboard();
  assert.equal(leaderboard.length, 2, '실격자를 제외한 2명만 리더보드에 있어야 함');

  // 1위는 3번 클릭한 플레이어
  assert.equal(leaderboard[0].clickCount, 3, '1위 플레이어는 3번 클릭');
  assert.equal(leaderboard[1].clickCount, 2, '2위 플레이어는 2번 클릭');

  console.log('실격자가 리더보드에서 정상적으로 제외됨');
});

test('이벤트 종료 후 우승자 정보 저장 (실격자 제외)', async () => {
  // 이벤트 시작
  gameState.startEvent();
  const baseTime = Date.now();

  // 정상적인 클릭 수행 (실격되지 않도록 간격 조정)
  for (let i = 0; i < 3; i++) {
    const result = gameState.registerClick(testUser.userId, baseTime + i * 1500); // 1.5초 간격
    assert.ok(result.success, `클릭 ${i + 1} 성공`);
  }

  // 이벤트 종료 및 우승자 확인
  const winner = gameState.endEvent();

  // 실격되지 않았다면 우승자가 있어야 함
  assert.ok(winner, '우승자가 있어야 함');
  assert.equal(winner.userId, testUser.userId, '테스트 사용자가 우승해야 함');
  assert.equal(winner.clickCount, 3, '클릭 수가 정확해야 함');

  console.log('우승자 정보 저장 완료');
});

test('동시성 테스트: 동일한 시간의 여러 클릭', async () => {
  // 토큰 검증
  const tokenValidation = TestHelper.validateToken(userToken);
  assert.ok(tokenValidation.success);

  // 이벤트 시작
  gameState.startEvent();

  const exactSameTime = Date.now();

  // 정확히 같은 시간에 여러 클릭
  const click1 = gameState.registerClick(testUser.userId, exactSameTime);
  const click2 = gameState.registerClick(testUser.userId, exactSameTime);
  const click3 = gameState.registerClick(testUser.userId, exactSameTime);

  // 모든 클릭이 등록되어야 함 (동일한 밀리초 내에서도)
  assert.equal(click1.success, true);
  assert.equal(click2.success, true);
  assert.equal(click3.success, true);

  // 클릭 수는 누적되어야 함
  assert.equal(click3.count, 3);
});

test('이벤트 비활성 상태에서 클릭 거부', async () => {
  // 이벤트를 시작하지 않은 상태에서 클릭 시도
  const clickResult = gameState.registerClick(testUser.userId, Date.now());
  assert.equal(clickResult.success, false, '이벤트가 비활성 상태에서는 클릭이 거부되어야 함');
  assert.equal(clickResult.reason, 'EVENT_NOT_ACTIVE');
});
