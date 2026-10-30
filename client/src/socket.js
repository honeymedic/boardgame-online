import { io } from "socket.io-client";

// 플레이어 정보 저장소.
// 기본은 localStorage: 브라우저마다 고정 ID라 새로고침해도 같은 플레이어로 인식된다.
// 주소에 ?tab 이 붙어 있으면 sessionStorage: 탭마다 다른 플레이어가 되어 혼자서 여러 명 테스트할 수 있다.
//   예) http://localhost:5173/?tab=2
const store = new URLSearchParams(location.search).has("tab") ? sessionStorage : localStorage;

function getPlayerId() {
  let id = store.getItem("playerId");
  if (!id) {
    id = crypto.randomUUID();
    store.setItem("playerId", id);
  }
  return id;
}

export const playerId = getPlayerId();

export const getNickname = () => store.getItem("nickname") || "";
export const saveNickname = (n) => store.setItem("nickname", n);

// 아바타 설정. 지금은 색 두 가지. 나중에 항목을 늘리면 서버 rooms.js의 sanitizeAvatar도 같이 늘린다.
export const DEFAULT_AVATAR = { body: "#5b8def", head: "#f2d3b3" };

export function getAvatar() {
  try {
    return { ...DEFAULT_AVATAR, ...JSON.parse(store.getItem("avatar") || "{}") };
  } catch {
    return { ...DEFAULT_AVATAR };
  }
}

export function saveAvatar(avatar) {
  store.setItem("avatar", JSON.stringify(avatar));
}

// 주소를 비워두면 현재 페이지와 같은 서버로 접속한다 (개발 중엔 Vite 프록시가 넘겨줌).
export const socket = io({ auth: { playerId } });
if (import.meta.env.DEV) window.__socket = socket; // 개발 중 콘솔 디버깅용

/** 콜백 방식의 소켓 요청을 Promise로 감싼다. 실패하면 서버가 보낸 에러 메시지로 throw. */
export function request(event, data = {}) {
  return new Promise((resolve, reject) => {
    socket.emit(event, data, (res) => {
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error || "알 수 없는 오류"));
    });
  });
}
