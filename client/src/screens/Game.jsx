import { useEffect, useRef, useState } from "react";
import { playerId, request } from "../socket.js";

const CHAR = {
  duke: { name: "공작", color: "#8b5cf6" },
  assassin: { name: "암살자", color: "#64748b" },
  captain: { name: "사령관", color: "#3b82f6" },
  ambassador: { name: "대사", color: "#22c55e" },
  contessa: { name: "귀부인", color: "#ef4444" },
};

export default function Game({ room, game, onLeave }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!game) {
    return (
      <main className="card">
        <p className="muted">게임 정보를 불러오는 중...</p>
      </main>
    );
  }

  const me = game.players.find((p) => p.id === playerId);
  const isHost = room.hostId === playerId;
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

  const backToLobby = async () => {
    try {
      await request("room:reset");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <main className="game">
      <header className="game-header">
        <div>
          <strong>쿠 (Coup)</strong>
          <span className="muted"> · 방 {room.code} · 덱 {game.deckCount}장</span>
        </div>
        <div className="row">
          {isHost && (
            <button className={`small ${game.phase === "game_over" ? "primary" : ""}`} onClick={backToLobby}>
              {game.phase === "game_over" ? "로비로" : "게임 종료"}
            </button>
          )}
          <button className="link" onClick={onLeave}>
            나가기
          </button>
        </div>
      </header>

      <StatusBar game={game} nameOf={nameOf} />

      <section className="players-grid">
        {game.players.map((p) => (
          <PlayerCard
            key={p.id}
            p={p}
            isMe={p.id === playerId}
            isTurn={game.turnPlayerId === p.id && game.phase !== "game_over"}
            waiting={game.pending?.waitingOn.includes(p.id)}
            winner={game.winnerId === p.id}
            onPickCard={
              game.options?.kind === "lose" && p.id === playerId
                ? (idx) => send({ type: "lose", cardIndex: idx })
                : null
            }
          />
        ))}
      </section>

      <ActionPanel game={game} me={me} nameOf={nameOf} send={send} busy={busy} />

      {error && <p className="error">{error}</p>}

      <Log entries={game.log} />
    </main>
  );
}

// ───────────────────────── 상태 표시줄 ─────────────────────────

function StatusBar({ game, nameOf }) {
  const p = game.pending;
  let text;
  switch (game.phase) {
    case "action":
      text =
        game.turnPlayerId === playerId ? "당신의 차례입니다. 행동을 선택하세요." : `${nameOf(game.turnPlayerId)}의 차례`;
      break;
    case "reaction": {
      const a = p.action;
      const claim = a.claim ? ` (${CHAR[a.claim].name} 주장)` : "";
      const tgt = a.targetId ? ` → ${nameOf(a.targetId)}` : "";
      text = `${nameOf(a.actorId)}: ${a.name}${claim}${tgt} · 대기: ${p.waitingOn.map(nameOf).join(", ")}`;
      break;
    }
    case "block_reaction":
      text = `${nameOf(p.block.blockerId)}이(가) ${CHAR[p.block.character].name}(으)로 막기 선언 · 대기: ${p.waitingOn
        .map(nameOf)
        .join(", ")}`;
      break;
    case "lose_influence":
      text = `${nameOf(p.lossPlayerId)}이(가) 잃을 카드를 고르는 중...`;
      break;
    case "exchange":
      text = `${nameOf(p.action.actorId)}이(가) 카드를 교환하는 중...`;
      break;
    case "game_over":
      text = game.winnerId ? `🏆 ${nameOf(game.winnerId)} 승리!` : "게임 종료";
      break;
    default:
      text = "";
  }
  return <div className={`status ${game.phase === "game_over" ? "status-over" : ""}`}>{text}</div>;
}

// ───────────────────────── 플레이어 카드 ─────────────────────────

function PlayerCard({ p, isMe, isTurn, waiting, winner, onPickCard }) {
  return (
    <div className={`player ${isTurn ? "turn" : ""} ${!p.alive ? "dead" : ""} ${isMe ? "me" : ""}`}>
      <div className="player-head">
        <span className="player-name">
          {p.nickname}
          {isMe && <span className="tag me">나</span>}
          {isTurn && <span className="tag turn-tag">차례</span>}
          {waiting && !isTurn && <span className="tag">응답 대기</span>}
          {!p.alive && <span className="tag">탈락</span>}
          {winner && <span className="tag win">승리</span>}
        </span>
        <span className="coins">🪙 {p.coins}</span>
      </div>
      <div className="hand">
        {p.cards.map((c, i) => (
          <Card key={i} card={c} onClick={onPickCard && !c.revealed ? () => onPickCard(i) : null} />
        ))}
      </div>
    </div>
  );
}

function Card({ card, onClick, selected, small }) {
  const info = card.character ? CHAR[card.character] : null;
  const cls = ["cardface", card.revealed ? "revealed" : "", !info ? "back" : "", onClick ? "clickable" : "", selected ? "selected" : "", small ? "small" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} style={info ? { "--c": info.color } : undefined} onClick={onClick || undefined} disabled={!onClick}>
      {info ? info.name : "?"}
    </button>
  );
}

// ───────────────────────── 행동 패널 ─────────────────────────

function ActionPanel({ game, me, nameOf, send, busy }) {
  const opt = game.options;
  const [picked, setPicked] = useState(null); // 대상이 필요한 행동을 고른 상태
  const [keep, setKeep] = useState([]);

  // 단계가 바뀌면 선택 상태 초기화
  useEffect(() => {
    setPicked(null);
    setKeep([]);
  }, [game.phase, game.turnPlayerId]);

  if (!me?.alive) {
    return <div className="panel muted">탈락했습니다. 관전 중...</div>;
  }
  if (!opt) {
    if (game.phase === "game_over") return null;
    return <div className="panel muted">다른 플레이어를 기다리는 중...</div>;
  }

  if (opt.kind === "action") {
    if (picked) {
      const def = opt.actions.find((a) => a.type === picked);
      return (
        <div className="panel">
          <p className="panel-title">{def.name} 대상 선택</p>
          <div className="btn-grid">
            {opt.targets.map((id) => (
              <button key={id} disabled={busy} onClick={() => send({ type: "action", action: picked, targetId: id })}>
                {nameOf(id)}
              </button>
            ))}
          </div>
          <button className="link" onClick={() => setPicked(null)}>
            취소
          </button>
        </div>
      );
    }
    const renderBtn = (a) => (
      <button
        key={a.type}
        className={`action-btn ${a.claim ? "claim" : ""}`}
        style={a.claim ? { "--c": CHAR[a.claim].color } : undefined}
        disabled={!a.enabled || busy}
        title={a.desc}
        onClick={() => (a.needsTarget ? setPicked(a.type) : send({ type: "action", action: a.type }))}
      >
        <span className="action-name">{a.name}</span>
        <span className="action-sub">
          {a.claim ? `${CHAR[a.claim].name}(으)로` : "직업 필요 없음"}
          {a.cost ? ` · 동전 ${a.cost}개` : ""}
        </span>
      </button>
    );
    const general = opt.actions.filter((a) => !a.claim);
    const claimed = opt.actions.filter((a) => a.claim);
    return (
      <div className="panel">
        {opt.mustCoup && <p className="notice">동전이 10개 이상이라 반드시 쿠를 해야 합니다.</p>}
        <p className="group-label">누구나</p>
        <div className="btn-grid">{general.map(renderBtn)}</div>
        <p className="group-label">직업 주장 <span className="muted">(실제로 그 카드가 없어도 선언할 수 있습니다)</span></p>
        <div className="btn-grid">{claimed.map(renderBtn)}</div>
      </div>
    );
  }

  if (opt.kind === "reaction" || opt.kind === "block_reaction") {
    const a = game.pending.action;
    const title =
      opt.kind === "reaction"
        ? `${nameOf(a.actorId)}의 ${a.name}${a.claim ? ` (${CHAR[a.claim].name} 주장)` : ""}${a.targetId === playerId ? " — 당신이 대상입니다!" : ""}`
        : `${nameOf(game.pending.block.blockerId)}의 ${CHAR[game.pending.block.character].name} 막기 주장`;
    return (
      <div className="panel">
        <p className="panel-title">{title}</p>
        <div className="btn-row">
          {(opt.kind === "block_reaction" || opt.canChallenge) && (
            <button className="danger" disabled={busy} onClick={() => send({ type: "challenge" })}>
              도전 (거짓말이다!)
            </button>
          )}
          {opt.blockWith?.map((c) => (
            <button key={c} className="claim" style={{ "--c": CHAR[c].color }} disabled={busy} onClick={() => send({ type: "block", character: c })}>
              {CHAR[c].name}(으)로 막기
            </button>
          ))}
          <button disabled={busy} onClick={() => send({ type: "pass" })}>
            패스
          </button>
        </div>
      </div>
    );
  }

  if (opt.kind === "lose") {
    return <div className="panel notice">잃을 카드를 위에서 클릭하세요.</div>;
  }

  if (opt.kind === "exchange") {
    const mine = me.cards.filter((c) => !c.revealed).map((c) => c.character);
    const pool = [...mine, ...(game.exchangeDrawn || [])];
    const toggle = (i) =>
      setKeep((k) => (k.includes(i) ? k.filter((x) => x !== i) : k.length < opt.keepCount ? [...k, i] : k));
    return (
      <div className="panel">
        <p className="panel-title">남길 카드 {opt.keepCount}장을 고르세요 (나머지는 덱으로)</p>
        <div className="hand">
          {pool.map((c, i) => (
            <Card key={i} card={{ character: c, revealed: false }} selected={keep.includes(i)} onClick={() => toggle(i)} />
          ))}
        </div>
        <button className="primary" disabled={keep.length !== opt.keepCount || busy} onClick={() => send({ type: "exchange", keep })}>
          확정
        </button>
      </div>
    );
  }

  return null;
}

// ───────────────────────── 로그 ─────────────────────────

function Log({ entries }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [entries.length]);
  return (
    <div className="log" ref={ref}>
      {entries.map((e, i) => (
        <div key={i} className={e.startsWith("──") ? "log-turn" : ""}>
          {e}
        </div>
      ))}
    </div>
  );
}
