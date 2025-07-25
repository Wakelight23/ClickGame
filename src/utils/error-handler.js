/**
 * API 에러용 커스텀 클래스
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP 상태 코드
   * @param {string} message - 에러 메시지
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Express 없이 HTTP 서버에서 에러를 일괄 처리하고 응답을 보내는 헬퍼
 * @param {http.ServerResponse} res
 * @param {Error} err
 */
export function handleHttpError(res, err) {
  const status = err instanceof ApiError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}
