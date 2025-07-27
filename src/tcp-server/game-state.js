import { ClickValidator } from './click-validator.js';
import { EventManager } from '../common/event-manager.js';

export class GameState {
  constructor() {
    this.clickValidator = new ClickValidator();
    this.eventManager = new EventManager();
    this.registeredUsers = new Set(); // 회원가입된 사용자만 참여 가능
    this.clickCounts = new Map();
  }

  registerUser(userId) {
    this.registeredUsers.add(userId);
  }

  isUserRegistered(userId) {
    return this.registeredUsers.has(userId);
  }

  registerClick(userId, timestamp = Date.now()) {
    // 회원가입 여부 확인
    if (!this.isUserRegistered(userId)) {
      return { success: false, reason: 'NOT_REGISTERED' };
    }

    // 이벤트 활성화 시간 확인
    if (!this.eventManager.isEventActive(timestamp)) {
      return { success: false, reason: 'EVENT_NOT_ACTIVE' };
    }

    // 클릭 검증
    const validation = this.clickValidator.validateClick(userId, timestamp);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // 클릭 수 반환
    return {
      success: true,
      count: this.clickValidator.getClickCount(userId),
      timestamp,
    };
  }

  startEvent() {
    this.eventManager.startEvent();
  }

  endEvent() {
    this.eventManager.endEvent();
    return this.getWinner();
  }

  getWinner() {
    const leaderboard = this.clickValidator.getLeaderboard();
    return leaderboard.length > 0 ? leaderboard[0] : null;
  }

  getLeaderboard() {
    return this.clickValidator.getLeaderboard();
  }

  getClickCount(userId) {
    return this.clickValidator.getClickCount(userId);
  }
}
