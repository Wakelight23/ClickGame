import http from 'node:http';
import { test } from 'node:test';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { config } from '../../common/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess;

// http 서버 테스트
test('setup HTTP server', async (t) => {
  serverProcess = spawn(
    process.execPath,
    ['--experimental-sqlite', path.join(__dirname, '../../http-server/http-server.js')],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  // listening message 출력까지 대기
  await new Promise((resolve, reject) => {
    serverProcess.stdout.on('data', (chunk) => {
      const msg = chunk.toString();
      if (msg.includes('HTTP 서버 대기 중')) {
        resolve();
      }
    });
    serverProcess.on('error', reject);
    // 만약 서버가 비정상 종료되면 에러 코드와 함께 reject
    serverProcess.on('exit', (code) => {
      reject(new Error(`Server exited with code ${code}`));
    });
  });
});

// Test: 회원가입 및 프로필 조회
// 회원가입: 랜덤 ID
test('HTTP E2E: 회원가입', async () => {
  const uid = `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const signupBody = JSON.stringify({
    userId: uid,
    password: 'password123',
    address: 'Seoul',
  });

  const signupRes = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: config.httpPort,
        path: '/signup',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(signupBody),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      },
    );
    req.on('error', reject);
    req.write(signupBody);
    req.end();
  });

  if (signupRes.status !== 201) {
    throw new Error(`Expected 201, got ${signupRes.status}`);
  }
});

// 로그인: 고정된 e2e_user, 토큰 발급
test('HTTP E2E: 로그인 및 프로필 조회', async () => {
  // 로그인 요청
  const signinBody = JSON.stringify({
    userId: 'e2e_user',
    password: 'password123',
  });

  const signinRes = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: config.httpPort,
        path: '/signin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(signinBody),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      },
    );
    req.on('error', reject);
    req.write(signinBody);
    req.end();
  });

  if (signinRes.status !== 200 || !signinRes.body.token) {
    throw new Error(
      `Signin failed: status=${signinRes.status}, body=${JSON.stringify(signinRes.body)}`,
    );
  }
  const token = signinRes.body.token;
  console.log(`Received token: ${token}`);
  // 프로필 조회
  const profileRes = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: config.httpPort,
        path: '/profile',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      },
    );
    req.on('error', reject);
    req.end();
  });

  if (profileRes.status !== 200 || profileRes.body.user.userId !== 'e2e_user') {
    throw new Error(
      `Profile fetch failed: status=${profileRes.status}, body=${JSON.stringify(profileRes.body)}`,
    );
  }
});

// 모든 테스트 완료 후 HTTP 서버 종료
test('teardown HTTP server', (t) => {
  serverProcess.kill();
});
