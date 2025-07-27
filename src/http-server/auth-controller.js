import crypto from 'node:crypto';

// 메모리 토큰 저장(프로덕션엔 Redis 등으로 교체)
const tokenStore = new Map();

// 토큰 생성
export function issueToken(userId) {
  const token = crypto.randomBytes(16).toString('hex');
  tokenStore.set(token, { userId, issuedAt: Date.now() });
  return token;
}

// 토큰 검증
export function verifyToken(token) {
  const session = tokenStore.get(token);
  if (!session) throw new Error('Invalid token');
  return { userId: session.userId };
}
