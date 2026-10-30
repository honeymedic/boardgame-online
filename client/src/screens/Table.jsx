import { useEffect, useState } from "react";
import TableScene from "../three/TableScene.jsx";
import ChatPanel from "../components/ChatPanel.jsx";

/** 3D 테이블 화면 (시제품). 게임 연결은 아직 없고 자리/아바타/시선/손/말풍선을 보여준다. */
export default function Table({ room, chat, bubbles, onBack }) {
  const [locked, setLocked] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const onLock = () => setLocked(!!document.pointerLockElement);
    const onTouch = () => setTouch(true);
    document.addEventListener("pointerlockchange", onLock);
    window.addEventListener("touchstart", onTouch, { once: true });
    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      window.removeEventListener("touchstart", onTouch);
    };
  }, []);

  return (
    <div className="table-view">
      <TableScene players={room.players} bubbles={bubbles} />

      {/* 조준점 */}
      {!touch && <div className={`crosshair ${locked ? "" : "idle"}`} />}

      <div className="table-overlay top">
        <span className="muted">
          방 {room.code} · {room.players.length}명
          {touch ? " · 드래그로 고개 돌리기, 탭으로 집기" : locked ? " · 마우스로 고개 돌리기 · 클릭: 집기/휘두르기 · Esc: 마우스 풀기" : " · 화면을 클릭하면 시작"}
        </span>
        <button className="small" onClick={onBack}>
          로비로
        </button>
      </div>
      <div className="table-overlay bottom-right">
        <ChatPanel messages={chat} compact />
      </div>
    </div>
  );
}
