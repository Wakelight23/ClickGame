import { DatabaseSync } from 'node:sqlite';

const USE_DB = false;
let db, clickStore;

if (USE_DB) {
  db = new DatabaseSync('./game.db', { enableForeignKeyConstraints: true });
  db.exec(`
    CREATE TABLE IF NOT EXISTS click_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    INTEGER NOT NULL,
      user_id       TEXT NOT NULL,
      click_count   INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES game_sessions(id),
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    ) STRICT;
  `);
} else {
  clickStore = new Map();  
  // key: `${sessionId}:${userId}` → clickCount
}

export class ClickEventModel {
  static record(sessionId, userId) {
    if (USE_DB) {
      // upsert: SQLite 3.24부터 지원하는 UPSERT
      const stmt = db.prepare(`
        INSERT INTO click_events (session_id, user_id, click_count)
        VALUES (?, ?, 1)
        ON CONFLICT(session_id, user_id)
        DO UPDATE SET click_count = click_count + 1
      `);
      stmt.run(sessionId, userId);
    } else {
      const key = `${sessionId}:${userId}`;
      const prev = clickStore.get(key) || 0;
      clickStore.set(key, prev + 1);
    }
  }

  static getCount(sessionId, userId) {
    if (USE_DB) {
      const stmt = db.prepare(`
        SELECT click_count AS count
        FROM click_events
        WHERE session_id = ? AND user_id = ?
      `);
      const row = stmt.get(sessionId, userId);
      return row ? row.count : 0;
    } else {
      return clickStore.get(`${sessionId}:${userId}`) || 0;
    }
  }

  static getWinners(sessionId, topN = 1) {
    if (USE_DB) {
      const stmt = db.prepare(`
        SELECT user_id AS userId, click_count AS count
        FROM click_events
        WHERE session_id = ?
        ORDER BY click_count DESC
        LIMIT ?
      `);
      return stmt.all(sessionId, topN);
    } else {
      const entries = Array.from(clickStore.entries())
        .filter(([key, _]) => key.startsWith(`${sessionId}:`))
        .map(([key, count]) => {
          const userId = key.split(':')[1];
          return { userId, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
      return entries;
    }
  }
}
