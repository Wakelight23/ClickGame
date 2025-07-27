import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class ClusterDatabase {
  constructor() {
    if (ClusterDatabase.instance) {
      return ClusterDatabase.instance;
    }

    // 클러스터 환경에서는 파일 기반 DB 사용 (워커 간 공유 가능)
    const dbPath = this.getDbPath();
    this.ensureDbDirectory(dbPath);

    this.db = new DatabaseSync(dbPath, { enableForeignKeyConstraints: true });
    this.initializeTables();
    ClusterDatabase.instance = this;
  }

  getDbPath() {
    // 테스트 환경에 따라 DB 경로 결정
    if (process.env.NODE_ENV === 'test') {
      return './tmp/cluster_test.db';
    }
    return './cluster_game.db';
  }

  ensureDbDirectory(dbPath) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  initializeTables() {
    // 1) 테이블 먼저 생성
    this.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      address     TEXT NOT NULL,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    
    CREATE TABLE IF NOT EXISTS click_events (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id     TEXT NOT NULL,
      user_id        TEXT NOT NULL,
      worker_id      INTEGER NOT NULL,
      click_timestamp INTEGER NOT NULL,
      created_at     TEXT DEFAULT CURRENT_TIMESTAMP
    ) STRICT;

    CREATE TABLE IF NOT EXISTS disqualified_users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id      TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      reason          TEXT NOT NULL,
      disqualified_at INTEGER NOT NULL,
      worker_id       INTEGER NOT NULL,
      UNIQUE (session_id, user_id)            -- 중복 실격 방지
    ) STRICT;

    CREATE TABLE IF NOT EXISTS game_sessions (
      id          TEXT PRIMARY KEY,
      started_at  INTEGER NOT NULL,
      ended_at    INTEGER,
      status      TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ENDED'))
    ) STRICT;

    CREATE TABLE IF NOT EXISTS worker_info (
      worker_id     INTEGER PRIMARY KEY,
      process_pid   INTEGER,
      started_at    INTEGER NOT NULL,
      last_heartbeat INTEGER,
      status        TEXT DEFAULT 'ACTIVE'
    ) STRICT;
  `);

    // 2) 필요한 인덱스는 따로 생성
    this.db.exec(`
    CREATE INDEX IF NOT EXISTS idx_click_events_session
      ON click_events (session_id);

    CREATE INDEX IF NOT EXISTS idx_click_events_user
      ON click_events (user_id);

    CREATE INDEX IF NOT EXISTS idx_disqualified_session_user
      ON disqualified_users (session_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_worker_last_heartbeat
      ON worker_info (last_heartbeat);
  `);
  }

  // 워커 등록 메서드
  registerWorker(workerId, processPid) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO worker_info (worker_id, process_pid, started_at, last_heartbeat, status)
      VALUES (?, ?, ?, ?, 'ACTIVE')
    `);
    const now = Date.now();
    stmt.run(workerId, processPid, now, now);
  }

  // 워커 하트비트 업데이트
  updateWorkerHeartbeat(workerId) {
    const stmt = this.db.prepare(`
      UPDATE worker_info SET last_heartbeat = ? WHERE worker_id = ?
    `);
    stmt.run(Date.now(), workerId);
  }

  // 클릭 이벤트 기록 (워커별)
  recordClick(sessionId, userId, workerId, timestamp) {
    const stmt = this.db.prepare(`
      INSERT INTO click_events (session_id, user_id, worker_id, click_timestamp)
      VALUES (?, ?, ?, ?)
    `);
    try {
      return stmt.run(sessionId, userId, workerId, timestamp);
    } catch (error) {
      console.error('클릭 기록 실패:', error.message);
      throw error;
    }
  }

  // 실격 사용자 기록
  recordDisqualification(sessionId, userId, reason, workerId, timestamp) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO disqualified_users 
      (session_id, user_id, reason, disqualified_at, worker_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(sessionId, userId, reason, timestamp, workerId);
  }

  // 실격 여부 확인
  isUserDisqualified(sessionId, userId) {
    const stmt = this.db.prepare(`
      SELECT 1 FROM disqualified_users 
      WHERE session_id = ? AND user_id = ?
    `);
    return stmt.get(sessionId, userId) !== undefined;
  }

  // 리더보드 조회 (모든 워커의 클릭 집계)
  getLeaderboard(sessionId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT 
        ce.user_id,
        COUNT(*) as click_count,
        MAX(ce.click_timestamp) as last_click_time
      FROM click_events ce
      LEFT JOIN disqualified_users du ON ce.session_id = du.session_id AND ce.user_id = du.user_id
      WHERE ce.session_id = ? AND du.user_id IS NULL
      GROUP BY ce.user_id
      ORDER BY click_count DESC, last_click_time ASC
      LIMIT ?
    `);
    return stmt.all(sessionId, limit);
  }

  // 사용자별 클릭 수 조회
  getUserClickCount(sessionId, userId) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM click_events 
      WHERE session_id = ? AND user_id = ?
    `);
    const result = stmt.get(sessionId, userId);
    return result ? result.count : 0;
  }

  // 게임 세션 시작
  startGameSession(sessionId) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO game_sessions (id, started_at, status)
      VALUES (?, ?, 'ACTIVE')
    `);
    return stmt.run(sessionId, Date.now());
  }

  // 게임 세션 종료
  endGameSession(sessionId) {
    const stmt = this.db.prepare(`
      UPDATE game_sessions SET ended_at = ?, status = 'ENDED'
      WHERE id = ?
    `);
    return stmt.run(Date.now(), sessionId);
  }

  // 세션 상태 확인
  isSessionActive(sessionId) {
    const stmt = this.db.prepare(`
      SELECT status FROM game_sessions WHERE id = ?
    `);
    const result = stmt.get(sessionId);
    return result && result.status === 'ACTIVE';
  }

  // 활성 워커 목록 조회
  getActiveWorkers() {
    const stmt = this.db.prepare(`
      SELECT worker_id, process_pid, last_heartbeat
      FROM worker_info 
      WHERE status = 'ACTIVE'
      ORDER BY worker_id
    `);
    return stmt.all();
  }

  getDb() {
    return this.db;
  }

  static getInstance() {
    if (!ClusterDatabase.instance) {
      new ClusterDatabase();
    }
    return ClusterDatabase.instance;
  }

  static reset() {
    if (ClusterDatabase.instance) {
      ClusterDatabase.instance.db.close();
      ClusterDatabase.instance = null;
    }
  }

  // 테스트 후 정리
  cleanup() {
    try {
      // 테스트 데이터만 삭제 (테이블 구조는 유지)
      this.db.exec('DELETE FROM click_events');
      this.db.exec('DELETE FROM disqualified_users');
      this.db.exec('DELETE FROM game_sessions');
      this.db.exec('DELETE FROM worker_info');
      this.db.exec('DELETE FROM users WHERE user_id LIKE "test_%"');
    } catch (error) {
      console.error('DB 정리 실패:', error.message);
    }
  }
}
