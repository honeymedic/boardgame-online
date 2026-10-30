import { useEffect, useRef, useState } from "react";
import TableScene from "../three/TableScene.jsx";
import ChatPanel from "../components/ChatPanel.jsx";

/** 3D 테이블 화면 (시제품). 게임 연결은 아직 없고 자리/아바타/시선/손/말풍선을 보여준다. */
export default function Table({ room, chat, bubbles, onBack }) {
  const [locked, setLocked] = useState(false);
  const [touch, setTouch] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const viewRef = useRef(null);

  useEffect(() => {
    const onLock = () => setLocked(!!document.pointerLockElement);
    const onTouch = () => setTouch(true);
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("touchstart", onTouch, { once: true });
    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("touchstart", onTouch);
      if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
    };
  }, []);

  // 단축키: T = 채팅 (마우스 풀고 입력칸으로), F = 전체화면
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // 이미 입력 중이면 무시
      if (e.key === "t" || e.key === "T" || e.key === "ㅅ") {
        e.preventDefault();
        if (document.pointerLockElement) document.exitPointerLock();
        window.dispatchEvent(new CustomEvent("chat:focus"));
      } else if (e.key === "f" || e.key === "F" || e.key === "ㄹ") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else viewRef.current?.requestFullscreen?.().catch?.(() => {});
  };

  return (
    <div className="table-view" ref={viewRef}>
      <TableScene players={room.players} bubbles={bubbles} />

      {/* 조준점 */}
      {!touch && <div className={`crosshair ${locked ? "" : "idle"}`} />}

      <div className="table-overlay top">
        <span className="muted">
          방 {room.code} · {room.players.length}명
          {touch ? " · 드래그로 고개 돌리기, 탭으로 집기" : locked ? " · 클릭: 집기/휘두르기 · T: 채팅 · F: 전체화면 · Esc: 마우스 풀기" : " · 화면을 클릭하면 시작 · T: 채팅 · F: 전체화면"}
        </span>
        <div className="row">
          <span className="muted build-tag" title="빌드 시각">{typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : ""}</span>
          <button className="small" onClick={toggleFullscreen}>
            {fullscreen ? "전체화면 해제" : "전체화면"}
          </button>
          <button className="small" onClick={onBack}>
            로비로
          </button>
        </div>
      </div>
      <div className="table-overlay bottom-right">
        <ChatPanel messages={chat} compact />
      </div>
    </div>
  );
}
