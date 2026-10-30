import { useState } from "react";
import { request } from "../socket.js";

export default function Home({ onEnter }) {
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const saveNick = () => localStorage.setItem("nickname", nickname.trim());

  const create = async () => {
    setError("");
    setBusy(true);
    try {
      saveNick();
      const res = await request("room:create", { nickname });
      onEnter(res.room);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const join = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      saveNick();
      const res = await request("room:join", { code: code.trim(), nickname });
      onEnter(res.room);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="card">
      <h1>보드게임 온라인</h1>
      <p className="muted">친구와 방 코드를 공유해서 함께 플레이하세요.</p>

      <label>
        닉네임
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="이름을 입력하세요"
          maxLength={12}
        />
      </label>

      <button className="primary" onClick={create} disabled={busy}>
        방 만들기
      </button>

      <div className="divider">또는</div>

      <form onSubmit={join} className="row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="방 코드 (예: AB3K)"
          maxLength={4}
          className="code-input"
        />
        <button type="submit" disabled={busy || code.length < 4}>
          입장
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
