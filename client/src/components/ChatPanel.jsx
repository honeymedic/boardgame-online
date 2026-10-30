import { useEffect, useRef, useState } from "react";
import { playerId, request, socket } from "../socket.js";

// 서버 rooms.js의 EMOTES와 같은 목록이어야 한다.
export const EMOTES = ["😂", "😮", "🤔", "😏", "😱", "👍", "👎", "❤️"];

/**
 * 채팅 패널 + 이모지 바. 로비/게임/3D 테이블 어디서든 같은 컴포넌트를 쓴다.
 * messages: App이 들고 있는 채팅 목록 (서버에서 온 것)
 * compact:  3D 화면처럼 작게 접을 수 있는 모드
 */
export default function ChatPanel({ messages, compact = false }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(!compact);
  const [unread, setUnread] = useState(0);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const lastCount = useRef(messages.length);

  // 단축키 T (3D 화면 등에서 window 이벤트로 요청): 패널 열고 입력칸에 포커스
  useEffect(() => {
    const onFocusReq = () => {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("chat:focus", onFocusReq);
    return () => window.removeEventListener("chat:focus", onFocusReq);
  }, []);

  // 새 메시지가 오면 아래로 스크롤. 접혀 있으면 안 읽은 개수 표시.
  useEffect(() => {
    if (messages.length > lastCount.current && !open) setUnread((n) => n + (messages.length - lastCount.current));
    lastCount.current = messages.length;
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await request("chat:send", { text: t });
    } catch {
      /* 빈 메시지 등은 조용히 무시 */
    }
  };

  const emote = (emoji) => socket.emit("emote", { emoji });

  return (
    <div className={`chat ${compact ? "compact" : ""} ${open ? "open" : "closed"}`}>
      <div className="chat-head" onClick={() => compact && setOpen((o) => !o)}>
        <span>💬 채팅{!open && unread > 0 ? ` (${unread})` : ""}</span>
        {compact && <span className="muted">{open ? "접기" : "펼치기"}</span>}
      </div>

      {open && (
        <>
          <div className="chat-list" ref={listRef}>
            {messages.length === 0 && <div className="muted chat-empty">아직 대화가 없습니다.</div>}
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.playerId === playerId ? "mine" : ""}`}>
                <span className="chat-name">{m.nickname}</span>
                <span className="chat-text">{m.text}</span>
              </div>
            ))}
          </div>

          <div className="emote-bar">
            {EMOTES.map((e) => (
              <button key={e} type="button" className="emote-btn" onClick={() => emote(e)} title="모두에게 보이는 반응">
                {e}
              </button>
            ))}
          </div>

          <form className="chat-form" onSubmit={send}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="메시지 입력 후 Enter"
              maxLength={200}
              onKeyDown={(e) => {
                e.stopPropagation(); // 3D 화면의 방향키/단축키와 충돌 방지
                if (e.key === "Escape") e.currentTarget.blur();
              }}
            />
            <button type="submit" disabled={!text.trim()}>
              보내기
            </button>
          </form>
        </>
      )}
    </div>
  );
}
