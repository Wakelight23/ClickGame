# ClickGame

시간을 설정하여 1분 간 마스코트를 가장 많이 클릭한 사용자를 선출하는 프로그램

## 주요 기능

- 회원 가입, 로그인, 랭킹 집계를 위한 HTTP 서버
- 프로그램 구동을 위한 TCP 서버

## 폴더 구조

<details>
<summary>폴더 구조</summary>

```
📦src
 ┣ 📂common
 ┃ ┣ 📜cluster-manager.js
 ┃ ┣ 📜common-utils.js
 ┃ ┣ 📜config.js
 ┃ ┗ 📜logger.js
 ┣ 📂http-server
 ┃ ┣ 📜auth-controller.js
 ┃ ┣ 📜http-server.js
 ┃ ┗ 📜user-controller.js
 ┣ 📂models
 ┃ ┣ 📜click-event.js
 ┃ ┣ 📜game-session.js
 ┃ ┗ 📜user.js
 ┣ 📂tcp-server
 ┃ ┣ 📜click-handler.js
 ┃ ┣ 📜game-state.js
 ┃ ┗ 📜tcp-server.js
 ┣ 📂tests
 ┃ ┣ 📂e2e
 ┃ ┃ ┣ 📜http-server.e2e.js
 ┃ ┃ ┗ 📜tcp-server.e2e.js
 ┃ ┗ 📂unit
 ┃ ┃ ┣ 📜click-handler.test.js
 ┃ ┃ ┣ 📜game-state.test.js
 ┃ ┃ ┗ 📜user-controller.test.js
 ┗ 📂utils
 ┃ ┣ 📜error-handler.js
 ┃ ┣ 📜rate-limiter.js
 ┃ ┗ 📜vaildation.js

```

</details>

## 실행

1. 요구사항

```
Node.js 20+
SQLite 활성화 : --experimental-sqlite
```

2. 테스트 방법

```
set NODE_ENV=test
node --experimental-sqlite --test src/tests/unit/integration.test.js
```
