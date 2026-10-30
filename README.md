# 보드게임 온라인

친구들과 방 코드로 함께 즐기는 온라인 보드게임. 첫 번째 게임은 쿠(Coup).

## 실행 방법

처음 한 번만 (이미 완료됨):

```bash
npm run install:all
```

개발 서버 실행 (서버 + 클라이언트 동시):

```bash
npm run dev
```

또는 `dev.cmd`를 더블클릭. 브라우저에서 http://localhost:5173 접속.

## 폴더 구조

```
server/            Node.js + Socket.IO 서버 (규칙 판정, 방 관리는 전부 여기)
  src/index.js     소켓 이벤트 처리, HTTP 서버
  src/rooms.js     방 만들기 / 코드 입장 / 나가기 / 시작
  src/games/coup/  쿠 규칙 엔진 (순수 로직, 네트워크 무관). viewFor()가 플레이어별로 정보를 거름
  test/            규칙 엔진 자동 테스트 (`npm test` in server/)
client/            React + Vite 클라이언트 (화면만 담당)
  src/socket.js    서버 연결, playerId 관리
  src/App.jsx      화면 전환 (홈 → 로비 → 게임)
  src/screens/     Home, Lobby, Game 화면
```

## 소켓 이벤트

| 방향 | 이벤트 | 내용 |
|---|---|---|
| 클라 → 서버 | `room:create` `{nickname}` | 방 생성, 4자리 코드 발급 |
| 클라 → 서버 | `room:join` `{code, nickname}` | 코드로 입장 (재접속도 동일) |
| 클라 → 서버 | `room:leave` | 방 나가기 |
| 클라 → 서버 | `room:start` | 방장만 가능, 2명 이상 |
| 클라 → 서버 | `room:reset` | 방장이 게임을 끝내고 로비로 |
| 클라 → 서버 | `game:action` `{type, ...}` | `action` / `pass` / `challenge` / `block` / `lose` / `exchange` |
| 서버 → 클라 | `room:update` | 방 상태 전체 (방 안 모두에게) |
| 서버 → 클라 | `game:update` | 게임 상태. 받는 사람이 봐도 되는 정보만 (개인별로 다름) |

## 배포 (Render)

서버 하나가 빌드된 클라이언트까지 같이 내보낸다. Render 설정값:

| 항목 | 값 |
|---|---|
| Build Command | `npm run build` |
| Start Command | `npm start` |
| 환경 변수 | `NODE_ENV=production` |

로컬에서 배포 상태 그대로 확인하려면:

```bash
npm run build
```

```bash
$env:NODE_ENV="production"; npm start
```

그 다음 http://localhost:3001 접속.

## 로드맵

1. ~~방 시스템~~ ✅
2. ~~쿠 규칙 (서버 상태 머신) + 게임 화면~~ ✅
3. 무료 호스팅 배포 (Render) → 링크 공유로 플레이
4. Electron으로 설치형 포장
5. 다른 게임 추가
