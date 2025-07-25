/**
 * 클릭 요청 처리 함수
 * @param {GameState} gameState - 현재 게임 상태 객체
 * @param {string} data - 클라이언트로부터 받은 원시 문자열
 * @param {net.Socket} socket - 해당 클라이언트 소켓
 * @returns {string|null} - 클라이언트로 보낼 응답 문자열, 없으면 null
 */
export function handleClick(gameState, data, socket) {
  // 1) 데이터 기본 파싱 (예: JSON 문자열)
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    return JSON.stringify({ error: 'INVALID_FORMAT' });
  }
  if (parsed.type !== 'CLICK' || typeof parsed.userId !== 'string') {
    return JSON.stringify({ error: 'INVALID_REQUEST' });
  }

  // 2) 게임 상태 갱신
  const result = gameState.registerClick(parsed.userId);
  
  // 3) 필요 시 클라이언트에 응답
  return JSON.stringify({ success: true, count: result });
}
