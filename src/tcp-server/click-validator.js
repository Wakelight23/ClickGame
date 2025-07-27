export class ClickValidator {
  constructor() {
    this.userClickHistory = new Map(); // userId -> [timestamp, timestamp, ...]
    this.disqualifiedUsers = new Set();
    this.userLastClickTime = new Map(); // userId -> lastClickTimestamp
  }

  validateClick(userId, timestamp) {
    // 1. 실격된 사용자 체크
    if (this.disqualifiedUsers.has(userId)) {
      return { valid: false, reason: 'DISQUALIFIED' };
    }

    // 2. 10초간 비활성화 체크
    const lastClickTime = this.userLastClickTime.get(userId);
    if (lastClickTime && timestamp - lastClickTime > 10000) {
      this.disqualifiedUsers.add(userId);
      return { valid: false, reason: 'INACTIVE_TIMEOUT' };
    }

    // 3. 클릭 히스토리 가져오기
    let clickHistory = this.userClickHistory.get(userId) || [];

    // 4. 슬라이딩 윈도우 검증 (1초 구간 내 4회 초과 체크)
    const oneSecondAgo = timestamp - 1000;
    const recentClicks = clickHistory.filter((t) => t > oneSecondAgo);

    if (recentClicks.length >= 4) {
      this.disqualifiedUsers.add(userId);
      return { valid: false, reason: 'RATE_EXCEEDED' };
    }

    // 5. 클릭 기록 추가
    clickHistory.push(timestamp);

    // 6. 오래된 클릭 기록 정리 (5초 이전 기록 삭제)
    clickHistory = clickHistory.filter((t) => t > timestamp - 5000);
    this.userClickHistory.set(userId, clickHistory);
    this.userLastClickTime.set(userId, timestamp);

    return { valid: true };
  }

  isUserDisqualified(userId) {
    return this.disqualifiedUsers.has(userId);
  }

  getClickCount(userId) {
    const history = this.userClickHistory.get(userId) || [];
    return history.length;
  }

  getLeaderboard() {
    const results = [];
    for (const [userId, clicks] of this.userClickHistory.entries()) {
      if (!this.disqualifiedUsers.has(userId)) {
        results.push({ userId, clickCount: clicks.length });
      }
    }
    return results.sort((a, b) => b.clickCount - a.clickCount);
  }
}
