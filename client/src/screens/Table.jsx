import { useEffect, useRef, useState } from "react";
import TableScene from "../three/TableScene.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import { StatusBar, ActionPanel } from "./Game.jsx";
import { playerId, request, socket } from "../socket.js";
import { startFaceTracking } from "../three/face.js";
import { FACE } from "../three/config.js";

/**
 * 3D 테이블 화면. 로비에서는 미리보기, 게임 중에는 실제 게임 화면.
 * 게임 중이면 아래쪽에 2D 상태줄 + 행동 패널을 얹는다.
 */
export default function Table({ room, game = null, chat, bubbles, onBack }) {
  const [locked, setLocked] = useState(false);
  const [touch, setTouch] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [coinPrompt, setCoinPrompt] = useState(null); // { max } 동전 개수 선택 중
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
      if (tag === "INPUT" || tag === "TEXTAREA") return;
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

  // ── 얼굴 연동 (선택 기능) ──
  const [faceOn, setFaceOn] = useState(false);
  const [faceStatus, setFaceStatus] = useState(""); // loading | tracking | noface | error
  const [faceValues, setFaceValues] = useState(null); // 미리보기 옆 막대용
  const videoRef = useRef(null);
  const stopFace = useRef(null);
  const lastFaceSend = useRef(0);

  const toggleFace = async () => {
    if (faceOn) {
      stopFace.current?.();
      stopFace.current = null;
      setFaceOn(false);
      setFaceStatus("");
      socket.emit("face", { off: true });
      return;
    }
    setFaceOn(true);
    setFaceStatus("loading");
    try {
      // 버튼을 누른 뒤 video 요소가 화면에 붙을 때까지 한 박자 기다린다
      await new Promise((r) => setTimeout(r, 0));
      stopFace.current = await startFaceTracking(videoRef.current, (f) => {
        if (!f) {
          setFaceStatus("noface");
          return;
        }
        setFaceStatus("tracking");
        setFaceValues(f);
        const now = performance.now();
        if (now - lastFaceSend.current >= FACE.sendInterval) {
          lastFaceSend.current = now;
          socket.emit("face", f);
        }
      });
    } catch (e) {
      console.error(e);
      setFaceStatus("error");
    }
  };
  useEffect(() => () => stopFace.current?.(), []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else viewRef.current?.requestFullscreen?.().catch?.(() => {});
  };

  const hint = touch
    ? " · 드래그로 고개 돌리기, 탭으로 집기"
    : locked
      ? " · 클릭: 집기/휘두르기 · T: 채팅 · F: 전체화면 · Esc: 마우스 풀기"
      : " · 화면을 클릭하면 시작 · T: 채팅 · F: 전체화면";

  return (
    <div className="table-view" ref={viewRef}>
      <TableScene players={room.players} game={game} bubbles={bubbles} onCoinPrompt={setCoinPrompt} />

      {!touch && <div className={`crosshair ${locked ? "" : "idle"}`} />}

      {coinPrompt && (
        <div className="table-overlay center">
          <div className="coin-prompt">
            <strong>동전 몇 개를 집을까요?</strong>
            <span className="muted">숫자 키 1~{Math.min(9, coinPrompt.max)} · 0: 전부({coinPrompt.max}) · Esc: 취소</span>
          </div>
        </div>
      )}

      <div className="table-overlay top">
        <span className="muted">
          방 {room.code} · {room.players.length}명{hint}
        </span>
        <div className="row">
          <span className="muted build-tag" title="빌드 시각">
            {typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : ""}
          </span>
          <button className={`small ${faceOn ? "primary" : ""}`} onClick={toggleFace} title="웹캠으로 내 표정(눈·눈썹·입)을 아바타에 반영. 영상은 밖으로 나가지 않음">
            📷 {faceOn ? "얼굴 연동 끄기" : "얼굴 연동"}
          </button>
          <button className="small" onClick={toggleFullscreen}>
            {fullscreen ? "전체화면 해제" : "전체화면"}
          </button>
          <button className="small" onClick={onBack}>
            {game ? "2D 화면" : "로비로"}
          </button>
        </div>
      </div>

      {game && <GameOverlay game={game} locked={locked} />}

      {/* 얼굴 연동 미리보기: 나만 보인다 */}
      {faceOn && (
        <div className="face-preview">
          <video ref={videoRef} muted playsInline />
          <div className="face-status">
            {faceStatus === "loading" && "불러오는 중..."}
            {faceStatus === "tracking" && "인식 중"}
            {faceStatus === "noface" && "얼굴을 찾는 중"}
            {faceStatus === "error" && "카메라를 쓸 수 없어요"}
          </div>
          {faceValues && faceStatus === "tracking" && (
            <div className="face-bars">
              {[
                ["왼눈 감음", faceValues.bl],
                ["오른눈 감음", faceValues.br],
                ["입", faceValues.j],
                ["미소", faceValues.s],
                ["눈썹", faceValues.b],
              ].map(([label, v]) => (
                <div key={label} className="face-bar">
                  <span>{label}</span>
                  <i style={{ width: `${Math.round(v * 100)}%` }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="table-overlay bottom-right">
        <ChatPanel messages={chat} compact />
      </div>
    </div>
  );
}

/** 게임 중 3D 위에 얹는 상태줄 + 행동 패널. 버튼을 누르려면 Esc로 마우스를 풀어야 한다. */
function GameOverlay({ game, locked }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 내 입력이 필요해지면 마우스를 풀어 바로 버튼을 누를 수 있게 한다
  useEffect(() => {
    if (game.options && document.pointerLockElement) document.exitPointerLock();
  }, [game.options?.kind, game.phase]);
  const me = game.players.find((p) => p.id === playerId);
  const nameOf = (id) => game.players.find((p) => p.id === id)?.nickname ?? "?";

  const send = async (msg) => {
    setError("");
    setBusy(true);
    try {
      await request("game:action", msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // 카드 잃기는 3D에서 카드를 직접 클릭하는 대신 패널 버튼으로 (간단하게)
  const loseButtons =
    game.options?.kind === "lose" ? (
      <div className="panel">
        <p className="panel-title">잃을 카드를 고르세요</p>
        <div className="btn-row">
          {game.options.cardIndices.map((i) => (
            <button key={i} className="danger" disabled={busy} onClick={() => send({ type: "lose", cardIndex: i })}>
              {i === 0 ? "왼쪽 카드" : "오른쪽 카드"}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  // 내 입력이 필요할 때(내 차례, 도전/막기 응답, 카드 잃기, 교환)만 패널을 올리고, 평소엔 한 줄 상태만 작게
  const needsInput = !!game.options || game.phase === "game_over";

  return (
    <div className="table-overlay bottom-center">
      <div className={`game-overlay ${needsInput ? "active" : "quiet"}`}>
        <StatusBar game={game} nameOf={nameOf} />
        {needsInput && (loseButtons ?? <ActionPanel game={game} me={me} nameOf={nameOf} send={send} busy={busy} />)}
        {needsInput && !locked && <p className="muted overlay-hint">버튼을 누르려면 Esc로 마우스를 풀고, 다시 화면을 클릭하면 돌아옵니다</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
