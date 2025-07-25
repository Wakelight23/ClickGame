// // tcp-server/tcp-server.js
// import net from 'node:net';
// import { handleClick } from './click-handler.js';
// import { GameState } from './game-state.js';
// import { config } from '/common/config.js';

// const gameState = new GameState();

// // TCP 서버 생성
// export const server = net.createServer((socket) => {
//   socket.setNoDelay(true);
//   socket.setEncoding('utf8');
//   socket.setTimeout(config.tcpTimeoutMs);

//   socket.on('data', (data) => {
//     try {
//       const response = handleClick(gameState, data, socket);
//       if (response) socket.write(response);
//     } catch {
//       socket.write('ERROR');
//     }
//   });

//   socket.on('timeout', () => socket.end());
//   socket.on('error', () => socket.destroy());
//   socket.on('close', () => {
//     /* 추가 처리 a*/
//   });
// });

// // 리스닝 시작 함수 (테스트용)
// export function startTcpServer() {
//   return server.listen(config.tcpPort, () => {
//     console.log(`TCP 서버 대기 중: 포트 ${config.tcpPort}`);
//   });
// }

// // 모듈 로드 시 자동 시작하려면 주석 해제
// // startTcpServer();
