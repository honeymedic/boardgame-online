import { io } from "socket.io-client";

// 브라우저마다 고정 ID를 하나 만들어 저장한다. 새로고침해도 같은 플레이어로 인식된다.
function getPlayerId() {
  let id = localStorage.getItem("playerId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("playerId", id);
  }
  return id;
}

export const playerId = getPlayerId();

// 주소를 비워두면 현재 페이지와 같은 서버로 접속한다 (개발 중엔 Vite 프록시가 넘겨줌).
export const socket = io({ auth: { playerId } });

/** 콜백 방식의 소켓 요청을 Promise로 감싼다. 실패하면 서버가 보낸 에러 메시지로 throw. */
export function request(event, data = {}) {
  return new Promise((resolve, reject) => {
    socket.emit(event, data, (res) => {
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error || "알 수 없는 오류"));
    });
  });
}
