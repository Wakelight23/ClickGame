import { DatabaseSync } from 'node:sqlite';

const USE_DB = false;
let db,
  sessionStore,
  nextSessionId = 1;

if (USE_DB) {
  db = new DatabaseSync('./game.db', { enableForeignKeyConstraints: true });
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at  TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at    TEXT
    ) STRICT;
  `);
} else {
  sessionStore = new Map();
}

export class GameSessionModel {
  static create() {
    if (USE_DB) {
      const stmt = db.prepare(`INSERT INTO game_sessions DEFAULT VALUES`);
      const info = stmt.run();
      return { id: info.lastInsertRowid, startedAt: new Date(), endedAt: null };
    } else {
      const session = {
        id: nextSessionId++,
        participants: new Set(),
        startedAt: new Date(),
        endedAt: null,
      };
      sessionStore.set(session.id, session);
      return session;
    }
  }

  static end(sessionId) {
    if (USE_DB) {
      const stmt = db.prepare(`UPDATE game_sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?`);
      stmt.run(sessionId);
      const getStmt = db.prepare(`SELECT * FROM game_sessions WHERE id = ?`);
      return getStmt.get(sessionId);
    } else {
      const session = sessionStore.get(sessionId);
      if (!session) throw new Error('Session not found');
      session.endedAt = new Date();
      return session;
    }
  }

  static listActive() {
    if (USE_DB) {
      const stmt = db.prepare(`SELECT * FROM game_sessions WHERE ended_at IS NULL`);
      return stmt.all();
    } else {
      return Array.from(sessionStore.values()).filter((s) => !s.endedAt);
    }
  }
}
