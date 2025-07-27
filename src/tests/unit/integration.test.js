// tests/unit/click-validator.test.js
import { strict as assert } from 'node:assert';
import { test, beforeEach, afterEach } from 'node:test';
import { ClickValidator } from '../../tcp-server/click-validator.js';
import { GameState } from '../../tcp-server/game-state.js';
import { handleSignUp, handleSignIn } from '../../http-server/user-controller.js';
import { issueToken, verifyToken } from '../../http-server/auth-controller.js';
import { DatabaseSync } from 'node:sqlite';

// 테스트용설정

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
      return { success: false, error: error.message };
    }
  }

  static async loginTestUser(userId = 'test_user', password = 'test_password') {
    try {
      const loginData = { userId, password };
      const result = await handleSignIn(loginData);
      return { success: true, token: result.token };
    } catch (error) {
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
let db;

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
  // 여러 사용자 생성 및 로그인
  const players = [];

  for (let i = 0; i < 3; i++) {
    const userId = TestHelper.generateUniqueUserId();
    const signupResult = await TestHelper.createTestUser(userId, 'password', 'Seoul');
    assert.ok(signupResult.success, `사용자 ${i + 1} 회원가입 성공`);

    const loginResult = await TestHelper.loginTestUser(userId, 'password');
    assert.ok(loginResult.success, `사용자 ${i + 1} 로그인 성공`);

    // 게임에 등록
    gameState.registerUser(userId);

    players.push({
      userId,
      token: loginResult.token,
    });
  }

  // 이벤트 시작
  gameState.startEvent();

  const baseTime = Date.now();

  // 각 플레이어별로 다른 수의 클릭 수행
  players.forEach((player, index) => {
    const clickCount = (index + 1) * 2; // 2, 4, 6 클릭

    for (let i = 0; i < clickCount; i++) {
      const result = gameState.registerClick(player.userId, baseTime + i * 200 + index * 50);
      assert.equal(result.success, true, `플레이어 ${index + 1}의 클릭 ${i + 1} 성공`);
    }
  });

  // 리더보드 확인
  const leaderboard = gameState.getLeaderboard();
  assert.equal(leaderboard.length, 3, '3명의 플레이어가 순위에 있어야 함');

  // 점수 순으로 정렬되었는지 확인
  assert.ok(
    leaderboard[0].clickCount >= leaderboard[1].clickCount,
    '순위가 올바르게 정렬되어야 함',
  );
  assert.ok(
    leaderboard[1].clickCount >= leaderboard[2].clickCount,
    '순위가 올바르게 정렬되어야 함',
  );

  // 최고 점수 확인 (6 클릭)
  assert.equal(leaderboard[0].clickCount, 6, '1위 플레이어는 6번 클릭해야 함');
});

test('이벤트 종료 후 우승자 정보 저장', async () => {
  // 이벤트 시작
  gameState.startEvent();

  // 클릭 수행
  const baseTime = Date.now();
  for (let i = 0; i < 5; i++) {
    gameState.registerClick(testUser.userId, baseTime + i * 200);
  }

  // 이벤트 종료 및 우승자 확인
  const winner = gameState.endEvent();
  assert.ok(winner, '우승자가 있어야 함');
  assert.equal(winner.userId, testUser.userId, '테스트 사용자가 우승해야 함');
  assert.equal(winner.clickCount, 5, '클릭 수가 정확해야 함');
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
