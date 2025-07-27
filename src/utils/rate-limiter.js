/**
 * 단순 레이트 리미터 클래스
 * @param {number} windowMs - 시간 창 (밀리초)
 * @param {number} maxRequests - 윈도우 내 최대 요청 수
 */
export class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.records = new Map(); // key → [timestamps]
  }

  /**
   * 주어진 키로 요청을 시도
   * @param {string} key
   * @returns {boolean} 허용 시 true, 제한 시 false
   */
  attempt(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.records.get(key) || [];

    // 윈도우 외 타임스탬프 제거
    const recent = timestamps.filter((ts) => ts > windowStart);
    recent.push(now);
    this.records.set(key, recent);

    return recent.length <= this.maxRequests;
  }
}
