// tests/cluster/tcp-cluster.test.js
import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { clusterTestConfig } from './cluster-test-config.js';
import { ClusterDatabase } from './cluster-database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let clusterProc;
let db;

const waitPort = (port, timeout = 5000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    (function ping() {
      const sock = net.connect({ port }, () => {
        sock.end();
        resolve();
      });
      sock.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('listen timeout'));
        setTimeout(ping, 150);
      });
    })();
  });

before(async () => {
  ClusterDatabase.reset();
  db = ClusterDatabase.getInstance();

  clusterProc = spawn(
    process.execPath,
    ['--experimental-sqlite', path.join(__dirname, '../../server.js')],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        USE_CLUSTER: 'true',
        TCP_PORT: clusterTestConfig.tcpPort,
        HTTP_PORT: clusterTestConfig.httpPort,
        WORKER_COUNT: clusterTestConfig.workerCount,
      },
    },
  );

  // TCP · HTTP 포트가 열릴 때까지 대기
  await waitPort(clusterTestConfig.tcpPort, 10_000);
  await waitPort(clusterTestConfig.httpPort, 10_000);
});

after(() => {
  clusterProc?.kill('SIGTERM');
  ClusterDatabase.reset();
});

// 다중 클라이언트 동시 클릭
test('클러스터 TCP 다중 클릭 분산 검증', async () => {
  const sessionId = `sess_${Date.now()}`;
  await startSession(sessionId);

  const clients = await Promise.all(
    Array.from({ length: 4 }, () => connectClient(clusterTestConfig.tcpPort)),
  );

  const clickPromises = clients.map(({ sock }, idx) =>
    sendClicks(sock, `user_${idx + 1}`, sessionId, 3),
  );
  const results = (await Promise.all(clickPromises)).flat();

  // 성공한 클릭이 1개 이상이어야 함
  assert.ok(results.some((r) => r.success));

  // 최소 2 개의 워커가 처리했는지 검증
  const rec = db
    .getDb()
    .prepare(
      `
    SELECT DISTINCT worker_id FROM click_events WHERE session_id = ?
  `,
    )
    .all(sessionId);
  assert.ok(rec.length >= 2);
});

function connectClient(port) {
  return new Promise((resolve, reject) => {
    const sock = net
      .createConnection({ port, host: '127.0.0.1' }, () => {
        resolve({ sock });
      })
      .on('error', reject);
  });
}

async function sendClicks(sock, userId, sessionId, n) {
  const results = [];
  for (let i = 0; i < n; i++) {
    const payload = JSON.stringify({
      type: 'CLICK',
      userId,
      sessionId,
      timestamp: Date.now() + i * 100,
    });
    sock.write(payload);
    const [data] = await once(sock, 'data');
    results.push(JSON.parse(data));
  }
  return results;
}

function startSession(sessionId) {
  return httpRequest('POST', '/event/start', { sessionId });
}

function httpRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http
      .request(
        {
          hostname: '127.0.0.1',
          port: clusterTestConfig.httpPort,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data ? Buffer.byteLength(data) : 0,
          },
        },
        (res) => {
          let buf = '';
          res.on('data', (d) => (buf += d));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : {} }),
          );
        },
      )
      .on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
