import { DatabaseSync } from 'node:sqlite';

const USE_DB = false; // true로 변경 시 DB 사용
let db, userStore;

if (USE_DB) {
  db = new DatabaseSync('./game.db', { enableForeignKeyConstraints: true });
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id  TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      address  TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
  `);
} else {
  userStore = new Map(); // userId → { password, address, createdAt }
}

export class UserModel {
  static create({ userId, password, address }) {
    if (USE_DB) {
      const stmt = db.prepare(`
        INSERT INTO users (user_id, password, address)
        VALUES (?, ?, ?)
      `);
      stmt.run(userId, password, address);
      return { userId, address };
    } else {
      if (userStore.has(userId)) {
        throw new Error('User already exists');
      }
      const record = { password, address, createdAt: new Date() };
      userStore.set(userId, record);
      return { userId, address };
    }
  }

  static findById(userId) {
    if (USE_DB) {
      const stmt = db.prepare(`
        SELECT user_id AS userId, address, created_at AS createdAt
        FROM users WHERE user_id = ?
      `);
      return stmt.get(userId) || null;
    } else {
      const rec = userStore.get(userId);
      if (!rec) return null;
      return { userId, address: rec.address, createdAt: rec.createdAt };
    }
  }
}
