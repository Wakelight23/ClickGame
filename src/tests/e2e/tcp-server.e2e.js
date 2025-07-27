import net from 'node:net';
import { handleClick } from '../../tcp-server/click-handler.js';
import { GameState } from '../../tcp-server/game-state.js';
import { config } from '../../common/config.js';

const gameState = new GameState();

let server;

// TCP 서버를 생성하고 포트를 바인딩해서 반환
export function startTcpServer() {
  server = net.createServer((socket) => {
    socket.setNoDelay(true);
    socket.setEncoding('utf8');
    socket.setTimeout(config.tcpTimeoutMs);

    socket.on('data', (data) => {
      try {
        const response = handleClick(gameState, data, socket);
        if (response) socket.write(response);
      } catch {
        socket.write('ERROR');
      }
    });

    socket.on('timeout', () => socket.end());
    socket.on('error', () => socket.destroy());
    socket.on('close', () => {
      // 연결 종료 시 게임 상태 정리 및 로그 출력
    });
  });

  server.listen(config.tcpPort, () => {
    console.log(`TCP 서버 대기 중: 포트 ${config.tcpPort}`);
  });

  return server;
}
