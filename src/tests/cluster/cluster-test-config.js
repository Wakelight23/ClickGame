export const clusterTestConfig = {
  workerCount: 1, // 테스트용으로 2개 워커 사용
  tcpPort: 4001, // 테스트용 포트
  httpPort: 3002, // 테스트용 포트
  dbFile: ':memory:', // 메모리 DB 사용
  eventDuration: 10000, // 10초 이벤트 (테스트용 단축)
};
