import { DatabaseSync } from 'node:sqlite';
import { issueToken } from './auth-controller.js';

let db;

// 테스트 환경 감지
// CLI에 'set NODE_ENV=test' 입력하여 테스트 환경 설정
if (process.env.NODE_ENV === 'test') {
  // 동적 import를 사용하여 TestDatabase 가져오기
  const { TestDatabase } = await import('../tests/utils/test-database.js');
  db = TestDatabase.getInstance().getDb();
} else {
  db = new DatabaseSync('./game.db', { enableForeignKeyConstraints: true });
  // 프로덕션 테이블 초기화
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id  TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      address  TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
  `);
}

// 회원가입 처리 함수
export async function handleSignUp(body) {
  const { userId, password, address } = body;
  if (!userId || !password || !address) {
    const err = new Error('Missing fields');
    err.status = 400;
    throw err;
  }
  const stmt = db.prepare(`
    INSERT INTO users (user_id, password, address)
    VALUES (?, ?, ?)
  `);
  try {
    stmt.run(userId, password, address);
  } catch {
    const err = new Error('User already exists');
    err.status = 409;
    throw err;
  }
  return { userId, address };
}

// 로그인 처리 함수
export async function handleSignIn(body) {
  const { userId, password } = body;
  if (!userId || !password) {
    const err = new Error('Missing fields');
    err.status = 400;
    throw err;
  }

  const stmt = db.prepare(`
    SELECT password AS pw FROM users WHERE user_id = ?
  `);
  const row = stmt.get(userId);

  if (!row) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  // 비밀번호 검증
  if (row.pw !== password) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const token = issueToken(userId);
  return { token };
}
