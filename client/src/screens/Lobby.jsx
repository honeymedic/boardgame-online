import { useState } from "react";
import { playerId, request } from "../socket.js";
import ChatPanel from "../components/ChatPanel.jsx";

export default function Lobby({ room, chat, onLeave, onPreview }) {
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === playerId;
  const canStart = room.players.length >= room.minPlayers;

  const start = async () => {
    setError("");
    try {
      await request("room:start");
    } catch (e) {
      setError(e.message);
    }
  };

  const kick = async (p) => {
    if (!window.confirm(`${p.nickname} 님을 내보낼까요?`)) return;
    setError("");
    try {
      await request("room:kick", { targetId: p.id });
    } catch (e) {
      setError(e.message);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 권한이 없으면 무시 */
    }
  };

  return (
    <main className="card">
      <p className="muted">방 코드</p>
      <button className="code-display" onClick={copyCode} title="클릭해서 복사">
        {room.code}
        <span className="copy-hint">{copied ? "복사됨!" : "클릭해서 복사"}</span>
      </button>

      <h2>
        참가자 {room.players.length} / {room.maxPlayers}
      </h2>
      <ul className="players">
        {room.players.map((p) => (
          <li key={p.id} className={p.connected ? "" : "offline"}>
            <span className="dot" />
            <span className="mini-avatar" style={{ "--body": p.avatar?.body, "--head": p.avatar?.head }} />
            {p.nickname}
            {p.id === room.hostId && <span className="tag">방장</span>}
            {p.id === playerId && <span className="tag me">나</span>}
            {!p.connected && <span className="tag">연결 끊김</span>}
            {isHost && p.id !== playerId && (
              <button className="kick" onClick={() => kick(p)} title="내보내기">
                내보내기
              </button>
            )}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button className="primary" onClick={start} disabled={!canStart}>
          {canStart ? "게임 시작" : `${room.minPlayers}명 이상 필요`}
        </button>
      ) : (
        <p className="muted">방장이 시작하기를 기다리는 중...</p>
      )}

      {error && <p className="error">{error}</p>}

      <button onClick={onPreview}>🪑 테이블에 앉아보기 (3D 미리보기)</button>

      <ChatPanel messages={chat} />

      <button className="link" onClick={onLeave}>
        방 나가기
      </button>
    </main>
  );
}
