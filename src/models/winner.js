import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./game.db', { enableForeignKeyConstraints: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_time TEXT NOT NULL,
    user_id TEXT NOT NULL,
    address TEXT NOT NULL,
    click_count INTEGER NOT NULL,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
  ) STRICT;
`);

export class WinnerModel {
  static saveWinner(eventTime, userId, address, clickCount) {
    const stmt = db.prepare(`
      INSERT INTO winners (event_time, user_id, address, click_count)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(eventTime, userId, address, clickCount);
  }

  static getWinners() {
    const stmt = db.prepare(`
      SELECT w.event_time, w.user_id, w.address, w.click_count, w.recorded_at,
             u.user_id as winner_id
      FROM winners w
      JOIN users u ON w.user_id = u.user_id
      ORDER BY w.recorded_at DESC
    `);
    return stmt.all();
  }

  static getLatestWinner() {
    const stmt = db.prepare(`
      SELECT w.event_time, w.user_id, w.address, w.click_count, w.recorded_at
      FROM winners w
      JOIN users u ON w.user_id = u.user_id
      ORDER BY w.recorded_at DESC
      LIMIT 1
    `);
    return stmt.get();
  }
}
