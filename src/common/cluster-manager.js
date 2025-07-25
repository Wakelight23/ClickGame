import cluster from 'node:cluster';
import os from 'node:os';
import { logInfo, logError } from './logger.js';
import { config } from './config.js';

export function setupCluster(startWorkerCallback) {
  if (!config.useCluster || !cluster.isPrimary) {
    // 클러스터 모드 비활성 또는 워커 프로세스인 경우 바로 워커 시작
    return startWorkerCallback();
  }

  const cpuCount = os.cpus().length;
  logInfo('cluster-manager', `마스터 프로세스 시작 (PID: ${process.pid}). 워커 ${cpuCount}개 생성.`);
  
  // 워커 생성
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logWarn('cluster-manager', `워커 ${worker.process.pid} 종료 (code=${code}, signal=${signal}). 재생성합니다.`);
    cluster.fork();
  });
}
