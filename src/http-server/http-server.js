import http from 'node:http';
import { parseJsonBody, sendJson } from '../common/common-utils.js';
import { handleSignUp } from './user-controller.js';
import { verifyToken } from './auth-controller.js';
import { config } from '../common/config.js';
import { handleHttpError } from '../utils/error-handler.js';
import { handleSignIn } from './user-controller.js';
import { startEvent, endEvent, getLeaderboard, getWinners } from './event-controller.js';

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

function createHttpServer() {
  return http.createServer(async (req, res) => {
    try {
      // CORS 프리플라이트 처리
      if (req.method === 'OPTIONS') {
        res.writeHead(204, defaultHeaders);
        return res.end();
      }

      const { method, url } = req;

      // 로그인: POST /signin
      if (method === 'POST' && url === '/signin') {
        const body = await parseJsonBody(req);
        const result = await handleSignIn(body);
        return sendJson(res, 200, result, defaultHeaders);
      }

      // 회원가입: POST /signup
      if (method === 'POST' && url === '/signup') {
        const body = await parseJsonBody(req);
        const result = await handleSignUp(body);
        return sendJson(res, 201, result, defaultHeaders);
      }

      // 프로필 조회: GET /profile
      if (method === 'GET' && url === '/profile') {
        const token = req.headers.authorization?.split(' ')[1];
        const user = verifyToken(token);
        return sendJson(res, 200, { user }, defaultHeaders);
      }

      // 그 외 경로: Not Found
      return sendJson(res, 404, { error: 'Not Found' }, defaultHeaders);
    } catch (err) {
      // 에러 핸들링
      if (err.status && err.message) {
        // API 에러인 경우
        return sendJson(res, err.status, { error: err.message }, defaultHeaders);
      }
      // 그 외 예기치 못한 에러
      return handleHttpError(res, err);
    }
  });
}

// 이벤트 시작
if (method === 'POST' && url === '/event/start') {
  const result = await startEvent(gameState);
  return sendJson(res, 200, result, defaultHeaders);
}

// 이벤트 종료
if (method === 'POST' && url === '/event/end') {
  const result = await endEvent(gameState);
  return sendJson(res, 200, result, defaultHeaders);
}

// 리더보드 조회
if (method === 'GET' && url === '/event/leaderboard') {
  const result = await getLeaderboard(gameState);
  return sendJson(res, 200, result, defaultHeaders);
}

// 우승자 목록 조회
if (method === 'GET' && url === '/winners') {
  const result = await getWinners();
  return sendJson(res, 200, result, defaultHeaders);
}

export function startHttpServer() {
  const server = createHttpServer();
  server.listen(config.httpPort, () => {
    console.log(`HTTP 서버 대기 중: 포트 ${config.httpPort}`);
  });
  return server;
}

// 직접 실행 시 자동 기동
// if (import.meta.url === `file://${process.argv[1]}`) {
//   startHttpServer();
// }

if (
  process.argv[1].endsWith('/http-server/http-server.js') ||
  process.argv[1].endsWith('\\http-server\\http-server.js')
) {
  startHttpServer();
}
