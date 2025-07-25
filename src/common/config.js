export const config = {
  // TCP 서버
  tcpPort: Number(process.env.TCP_PORT) || 4000,
  tcpTimeoutMs: Number(process.env.TCP_TIMEOUT_MS) || 30000,

  // HTTP 서버
  httpPort: Number(process.env.HTTP_PORT) || 3001,

  // 클러스터
  useCluster: process.env.USE_CLUSTER === 'true',
  
  // SQLite 파일 경로
  databaseFile: process.env.DB_FILE || './game.db',
};
