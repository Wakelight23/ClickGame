import { WinnerModel } from '../models/winner.js';
import { UserModel } from '../models/user.js';

export async function startEvent(gameState) {
  gameState.startEvent();
  return { success: true, message: 'Event started' };
}

export async function endEvent(gameState) {
  const winner = gameState.endEvent();

  if (winner) {
    // 우승자 정보 조회
    const userInfo = UserModel.findById(winner.userId);
    if (userInfo) {
      // DB에 우승자 정보 저장
      WinnerModel.saveWinner(
        new Date().toISOString(),
        winner.userId,
        userInfo.address,
        winner.clickCount,
      );

      return {
        success: true,
        winner: {
          userId: winner.userId,
          address: userInfo.address,
          clickCount: winner.clickCount,
        },
      };
    }
  }

  return { success: true, message: 'Event ended', winner: null };
}

export async function getLeaderboard(gameState) {
  return {
    success: true,
    leaderboard: gameState.getLeaderboard(),
  };
}

export async function getWinners() {
  return {
    success: true,
    winners: WinnerModel.getWinners(),
  };
}
