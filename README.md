# ClickGame

시간을 설정하여 1분 간 마스코트를 가장 많이 클릭한 사용자를 선출하는 프로그램

## 주요 기능

- 회원가입, 로그인, 랭킹 집계를 위한 HTTP 서버
- 프로그램 구동을 위한 TCP 서버
- 회원가입, 로그인, 랭킹 집계
- 클릭 게임
- 우승자 선출
- 실격자 감지

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

   2-1. Unit Test

   ```
   set NODE_ENV=test (최초 1회)
   node --experimental-sqlite --test src/tests/unit/integration.test.js
   ```

   2-2. e2e Test

   ```
   node --experimental-sqlite --test tests/e2e/
   ```

---

## API 명세

<details>
<summary></summary>

| Method | Path                          | Body                      | 2xx 응답               | 오류     |
| ------ | ----------------------------- | ------------------------- | ---------------------- | -------- |
| POST   | /signup                       | userId, password, address | 201 {userId, address}  | 400, 409 |
| POST   | /signin                       | userId, password          | 200 {token}            | 401      |
| GET    | /profile                      | – (Bearer token)          | 200 {user}             | 401      |
| POST   | /event/start                  | sessionId                 | 200 {success}          | 400      |
| GET    | /event/leaderboard?session=ID | –                         | 200 {leaderboard[]}    | 404      |
| GET    | /winners                      | –                         | 200 {success, winners} | 404      |

</details>
