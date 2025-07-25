import { DatabaseSync } from 'node:sqlite';
import { issueToken } from './auth-controller.js';

const db = new DatabaseSync('./game.db', { enableForeignKeyConstraints: true });

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

/**
 * 회원가입 처리
 * @param {{ userId:string, password:string, address:string }} body
 * @returns {{ userId:string, address:string }}
 */
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
    throw new ApiError(400, 'Missing fields');
  }
  // 사용자 조회
  const stmt = db.prepare(`
    SELECT password AS pw FROM users WHERE user_id = ?
  `);
  const row = stmt.get(userId);
  if (!row) {
    throw new ApiError(401, 'Invalid credentials');
  }
  // 비밀번호 검증 (평문 비교)
  if (row.pw !== password) {
    throw new ApiError(401, 'Invalid credentials');
  }
  // 토큰 발급
  const token = issueToken(userId);
  return { token };
}
