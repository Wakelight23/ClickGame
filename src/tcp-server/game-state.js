/**
 * 게임 상태 관리 클래스
 * (메모리 기반 구현)
 */
export class GameState {
  constructor() {
    this.clickCounts = new Map();  // userId → 클릭 수
  }

  /**
   * 클릭 등록
   * @param {string} userId
   * @returns {number} - 누적 클릭 수
   */
  registerClick(userId) {
    const prev = this.clickCounts.get(userId) || 0;
    const updated = prev + 1;
    this.clickCounts.set(userId, updated);
    return updated;
  }

  /**
   * 특정 사용자의 클릭 수 조회
   * @param {string} userId
   * @returns {number}
   */
  getClickCount(userId) {
    return this.clickCounts.get(userId) || 0;
  }
}
