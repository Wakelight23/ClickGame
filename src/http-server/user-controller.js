import { DatabaseSync } from 'node:sqlite';
import { issueToken } from './auth-controller.js';

let db;

// 테스트 환경에서는 싱글톤 DB 사용
if (process.env.NODE_ENV === 'test') {
  const TestDatabase = require('../tests/test-db-singleton.js');
  db = TestDatabase.getInstance().getDb();
} else {
  db = new DatabaseSync('./game.db', { enableForeignKeyConstraints: true });
  // 프로덕션용 테이블 초기화
}

// users 테이블 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    address  TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  ) STRICT;
`);

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

  if ('Invalid credentials') {
    err.status = 401;
    throw err;
  }

  const token = issueToken(userId);
  return { token };
}
