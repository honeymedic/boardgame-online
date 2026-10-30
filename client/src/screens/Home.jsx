import { useState } from "react";
import { request, getAvatar, saveAvatar, getNickname, saveNickname } from "../socket.js";

export default function Home({ onEnter }) {
  const [nickname, setNickname] = useState(getNickname);
  const [avatar, setAvatar] = useState(getAvatar);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const persist = () => {
    saveNickname(nickname.trim());
    saveAvatar(avatar);
  };

  const create = async () => {
    setError("");
    setBusy(true);
    try {
      persist();
      const res = await request("room:create", { nickname, avatar });
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
      persist();
      const res = await request("room:join", { code: code.trim(), nickname, avatar });
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

      <div className="avatar-row">
        <AvatarPreview avatar={avatar} />
        <label>
          옷 색
          <input type="color" value={avatar.body} onChange={(e) => setAvatar({ ...avatar, body: e.target.value })} />
        </label>
        <label>
          머리 색
          <input type="color" value={avatar.head} onChange={(e) => setAvatar({ ...avatar, head: e.target.value })} />
        </label>
      </div>

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

/** 2D 미리보기: 머리(원) + 몸통(둥근 사각형). 3D 아바타와 같은 색을 쓴다. */
function AvatarPreview({ avatar }) {
  return (
    <div className="avatar-preview">
      <div className="avatar-preview-head" style={{ background: avatar.head }} />
      <div className="avatar-preview-body" style={{ background: avatar.body }} />
    </div>
  );
}
