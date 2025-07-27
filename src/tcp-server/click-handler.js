export function handleClick(gameState, data, socket) {
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    return JSON.stringify({ success: false, error: 'INVALID_FORMAT' });
  }

  if (parsed.type !== 'CLICK' || typeof parsed.userId !== 'string') {
    return JSON.stringify({ success: false, error: 'INVALID_REQUEST' });
  }

  // 현재 시간으로 클릭 처리
  const timestamp = Date.now();
  const result = gameState.registerClick(parsed.userId, timestamp);

  if (!result.success) {
    return JSON.stringify({
      success: false,
      error: result.reason,
      timestamp,
    });
  }

  return JSON.stringify({
    success: true,
    count: result.count,
    timestamp: result.timestamp,
  });
}
