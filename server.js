import cluster from 'node:cluster';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { GameState } from './tcp-server/game-state.js';
import { handleClick } from './tcp-server/click-handler.js';

// 환경 설정
const ENV = process.env;
const TCP_PORT = Number(ENV.TCP_PORT || 4001);
const HTTP_PORT = Number(ENV.HTTP_PORT || 3002);
const WORKER_COUNT = Number(ENV.WORKER_COUNT || os.cpus().length);
const DB_FILE = ENV.DB_FILE || './cluster_game.db';
const HEARTBEAT_MS = 5_000; // 워커 하트비트 주기

// DB 싱글턴 (마스터·워커 모두 동일 파일 사용)
const db = new DatabaseSync(DB_FILE, { enableForeignKeyConstraints: true });

// DB DDL (처음 한 번만 실행)
function initSchema() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      password TEXT,
      address  TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    ) STRICT;

    CREATE TABLE IF NOT EXISTS click_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      worker_id INTEGER NOT NULL,
      click_timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_click_session
      ON click_events (session_id);

    CREATE TABLE IF NOT EXISTS disqualified_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      disqualified_at INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      UNIQUE (session_id, user_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      started_at INTEGER NOT NULL,
      ended_at   INTEGER,
      status TEXT DEFAULT 'ACTIVE'
    ) STRICT;

    CREATE TABLE IF NOT EXISTS worker_info (
      worker_id INTEGER PRIMARY KEY,
      process_pid INTEGER,
      started_at INTEGER NOT NULL,
      last_heartbeat INTEGER,
      status TEXT DEFAULT 'ACTIVE'
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_worker_hb
      ON worker_info (last_heartbeat);
  `);
}

// 메인 프로세스
if (cluster.isPrimary) {
  initSchema();

  console.log(
    `Primary ${process.pid} online  | TCP:${TCP_PORT} HTTP:${HTTP_PORT} ` +
      `WORKERS:${WORKER_COUNT}`,
  );

  // 지정 개수만큼 워커 fork
  for (let i = 0; i < WORKER_COUNT; i++) cluster.fork();

  // 워커 사망 시 재기동
  cluster.on('exit', (worker, code, signal) => {
    console.error(`Worker ${worker.process.pid} died`, { code, signal });
    cluster.fork();
  });

  // 워커 하트비트 수신
  cluster.on('message', (_worker, msg) => {
    if (msg?.type === 'heartbeat') {
      db.prepare(
        `
        INSERT OR REPLACE INTO worker_info
          (worker_id, process_pid, started_at, last_heartbeat, status)
        VALUES (?, ?, COALESCE(
                  (SELECT started_at FROM worker_info WHERE worker_id=?),
                  ?
                ), ?, 'ACTIVE')
      `,
      ).run(msg.id, msg.pid, msg.id, msg.now, msg.now);
    }
  });

  return; // 마스터는 더 이상 아무것도 안 함
}

// 워커 로직
/* eslint-disable no-undef */
(async () => {
  const workerId = cluster.worker.id;
  const gameState = new GameState();

  // 하트비트 전송
  setInterval(() => {
    process.send?.({ type: 'heartbeat', id: workerId, pid: process.pid, now: Date.now() });
  }, HEARTBEAT_MS);

  // TCP 서버
  const tcpServer = net.createServer((socket) => {
    socket.setNoDelay(true);
    socket.setEncoding('utf8');

    socket.on('data', (raw) => {
      const response = handleClick(gameState, raw, socket);
      if (!response) return;

      // 응답 보내기
      socket.write(response);

      // DB 기록
      try {
        const payload = JSON.parse(raw);
        if (payload.type === 'CLICK' && payload.sessionId && payload.userId) {
          db.prepare(
            `
            INSERT INTO click_events
              (session_id, user_id, worker_id, click_timestamp)
            VALUES (?, ?, ?, ?)
          `,
          ).run(payload.sessionId, payload.userId, workerId, payload.timestamp ?? Date.now());
        }
      } catch {
        /* ignore malformed */
      }
    });
  });

  tcpServer.listen(TCP_PORT, () => console.log(`Worker ${workerId} TCP listening on ${TCP_PORT}`));

  // ──────────────── HTTP 서버 (API) ────────────────
  const httpServer = http.createServer(async (req, res) => {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    // POST /event/start  { sessionId }
    if (req.url === '/event/start' && req.method === 'POST') {
      const body = await readJson(req).catch(() => null);
      if (!body?.sessionId) return send(res, 400, { error: 'sessionId required' });

      db.prepare(
        `INSERT OR REPLACE INTO game_sessions (id, started_at, status)
                  VALUES (?, ?, 'ACTIVE')`,
      ).run(body.sessionId, Date.now());

      return send(res, 200, { success: true, sessionId: body.sessionId });
    }

    // GET /event/leaderboard?session=xxx
    if (req.url.startsWith('/event/leaderboard') && req.method === 'GET') {
      const sessionId = new URL(req.url, `http://${req.headers.host}`).searchParams.get('session');
      if (!sessionId) return send(res, 400, { error: 'session param required' });

      const rows = db
        .prepare(
          `
        SELECT user_id AS userId, COUNT(*) AS clickCount
        FROM click_events ce
        LEFT JOIN disqualified_users du
          ON ce.session_id = du.session_id AND ce.user_id = du.user_id
        WHERE du.user_id IS NULL AND ce.session_id = ?
        GROUP BY ce.user_id
        ORDER BY clickCount DESC
      `,
        )
        .all(sessionId);

      return send(res, 200, { leaderboard: rows });
    }

    // 기타
    send(res, 404, { error: 'Not Found' });
  });

  httpServer.listen(HTTP_PORT, () =>
    console.log(`Worker ${workerId} HTTP listening on ${HTTP_PORT}`),
  );

  // ──────────────── 유틸 ────────────────
  function send(r, status, obj) {
    r.writeHead(status);
    r.end(JSON.stringify(obj));
  }

  function readJson(stream) {
    return new Promise((resolve, reject) => {
      let buf = '';
      stream.on('data', (c) => (buf += c));
      stream.on('end', () => {
        try {
          resolve(JSON.parse(buf || '{}'));
        } catch (e) {
          reject(e);
        }
      });
      stream.on('error', reject);
    });
  }
})();
