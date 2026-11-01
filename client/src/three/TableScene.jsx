import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { TABLE, PROPS, ROOM, STRING_LIGHTS, COINS } from "./config.js";
import { computeSeats, eyePosition, tableSpotFor } from "./seats.js";
import Avatar from "./Avatar.jsx";
import FirstPersonLook from "./FirstPersonLook.jsx";
import StringLights from "./StringLights.jsx";
import { Card3D, Deck3D } from "./Props3D.jsx";
import HandCard from "./HandCard.jsx";
import { MyHands } from "./Hands.jsx";
import { CoinPile, CoinFlights, TABLE_TOP } from "./Coins.jsx";
import { Emblem, Beam, Shield, SelfAnchor, symbolFor } from "./Effects.jsx";
import { effectsFromGame } from "./effectsFromGame.js";
import { SEAT_HEIGHT } from "./Avatar.jsx";
import { AVATAR, EFFECTS } from "./config.js";
import { installPointer } from "./input.js";
import { socket, playerId } from "../socket.js";

/**
 * 3D 테이블 장면.
 *  players: room.players (id, nickname, avatar, connected)
 *  game:    게임 중이면 서버가 준 내 시점의 게임 뷰 (없으면 로비 미리보기)
 *  onCoinPrompt({max}|null): 동전 개수 선택 안내를 띄우거나 지우라는 요청 (DOM은 Table.jsx가 그림)
 * 내 자리는 players에서 내 index. 카메라는 그 자리에 앉아 있고, 내 아바타는 그리지 않는다.
 */
export default function TableScene({ players, game = null, bubbles = {}, highlightId = null, onCoinPrompt }) {
  // 게임 중에는 게임의 플레이어 순서(섞인 순서)를 따르고, 아바타/접속 정보는 방 정보에서 가져온다
  const seatPlayers = useMemo(() => {
    if (!game) return players.map((p) => ({ ...p, coins: 2, cards: null }));
    return game.players.map((gp) => {
      const rp = players.find((p) => p.id === gp.id) || {};
      return { ...rp, ...gp, avatar: rp.avatar };
    });
  }, [players, game]);

  const seats = useMemo(() => computeSeats(seatPlayers.length), [seatPlayers.length]);
  const myIndex = Math.max(0, seatPlayers.findIndex((p) => p.id === playerId));
  const mySeat = seats[myIndex];
  const me = seatPlayers[myIndex];

  // ── 다른 사람들의 시선 / 손 (렌더를 다시 일으키지 않게 ref에 담고 useFrame에서 읽는다) ──
  const looks = useRef(new Map());
  const getLookRef = (id) => {
    let ref = looks.current.get(id);
    if (!ref) {
      ref = { current: null };
      looks.current.set(id, ref);
    }
    return ref;
  };
  const hands = useRef(new Map());
  const getHandRef = (id) => {
    let ref = hands.current.get(id);
    if (!ref) {
      ref = { current: { pos: null, hold: null, coin: 0, swing: null } };
      hands.current.set(id, ref);
    }
    return ref;
  };

  useEffect(() => {
    const onLook = ({ playerId: id, yaw, pitch }) => {
      getLookRef(id).current = { yaw, pitch };
    };
    const onHand = ({ playerId: id, x, y, z, hold, coin }) => {
      const ref = getHandRef(id);
      if (!ref.current.pos) ref.current.pos = new THREE.Vector3();
      ref.current.pos.set(x, y, z);
      ref.current.hold = hold;
      ref.current.coin = Number(coin) || 0;
    };
    const onGesture = ({ playerId: id, type, target }) => {
      if (type !== "swing" || !target) return;
      getHandRef(id).current.swing = { start: performance.now(), target: new THREE.Vector3(...target) };
    };
    socket.on("look", onLook);
    socket.on("hand", onHand);
    socket.on("gesture", onGesture);
    return () => {
      socket.off("look", onLook);
      socket.off("hand", onHand);
      socket.off("gesture", onGesture);
    };
  }, []);

  // ── 내가 든 것 ──
  const [myHeld, setMyHeld] = useState([]); // 왼손 카드 (든 순서, 최대 2장)
  const [coinHeld, setCoinHeld] = useState(0); // 오른손 동전 개수
  const [coinPrompt, setCoinPrompt] = useState(null); // { max } 개수 선택 중
  const pickCard = (idx) => setMyHeld((h) => (h.includes(idx) || h.length >= 2 ? h : [...h, idx]));
  const putDownAll = () => {
    setMyHeld([]);
    setCoinHeld(0);
  };
  const myCoins = (me?.coins ?? 2) - coinHeld;

  // 동전 더미를 클릭 → 개수 선택 안내. 숫자 키로 고른다
  const openCoinPrompt = () => {
    if (myCoins <= 0) return;
    setCoinPrompt({ max: myCoins });
  };
  useEffect(() => {
    onCoinPrompt?.(coinPrompt);
  }, [coinPrompt]);
  useEffect(() => {
    if (!coinPrompt) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setCoinPrompt(null);
        return;
      }
      if (!/^[0-9]$/.test(e.key)) return;
      e.preventDefault();
      const n = e.key === "0" ? coinPrompt.max : Math.min(coinPrompt.max, Number(e.key));
      if (n > 0) setCoinHeld((c) => c + n);
      setCoinPrompt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coinPrompt]);

  // 게임 상태가 바뀌면(턴 진행) 들고 있던 걸 내려놓는다
  useEffect(() => {
    if (game) {
      setMyHeld([]);
      setCoinHeld(0);
    }
  }, [game?.phase, game?.turnPlayerId]);

  // ── 동전 이동 애니메이션: 게임 뷰가 바뀔 때 전후 동전 수를 비교한다 ──
  const [flights, setFlights] = useState([]);
  const prevCoins = useRef(null);
  const flightId = useRef(0);
  const bankWorld = useMemo(() => [COINS.bankPosition[0], TABLE_TOP, COINS.bankPosition[2]], []);

  useEffect(() => {
    if (!game) {
      prevCoins.current = null;
      return;
    }
    const now = new Map(game.players.map((p) => [p.id, p.coins]));
    const prev = prevCoins.current;
    prevCoins.current = now;
    if (!prev) return;

    const gained = [];
    const lost = [];
    for (const [id, c] of now) {
      const d = c - (prev.get(id) ?? c);
      if (d > 0) gained.push({ id, n: d });
      else if (d < 0) lost.push({ id, n: -d });
    }
    const newFlights = [];
    const start = performance.now();
    const pileOf = (id) => coinPileWorld(seats[seatPlayers.findIndex((p) => p.id === id)]);
    const push = (from, to, n) => {
      for (let k = 0; k < n; k++) newFlights.push({ id: flightId.current++, from, to, start: start + k * COINS.flightStagger * 1000 });
    };
    // 잃은 사람 → 얻은 사람 (갈취). 짝이 안 맞는 만큼은 은행과 주고받음
    for (const g of gained) {
      const src = lost.find((l) => l.n > 0);
      if (src) {
        const n = Math.min(src.n, g.n);
        push(pileOf(src.id), pileOf(g.id), n);
        src.n -= n;
        g.n -= n;
      }
      if (g.n > 0) push(bankWorld, pileOf(g.id), g.n);
    }
    for (const l of lost) if (l.n > 0) push(pileOf(l.id), bankWorld, l.n);
    if (newFlights.length) setFlights((f) => [...f, ...newFlights]);
  }, [game]);
  const removeFlight = (id) => setFlights((f) => f.filter((x) => x.id !== id));

  // ── 능력 사용 연출: 게임 뷰 전후의 로그를 비교해서 이벤트를 뽑고, 자리 위치에 연출을 띄운다 ──
  const [effects, setEffects] = useState([]);
  const prevGame = useRef(null);
  const effectId = useRef(0);
  useEffect(() => {
    const prev = prevGame.current;
    prevGame.current = game;
    if (!game || !prev) return;
    const events = effectsFromGame(prev, game, seatPlayers);
    if (events.length === 0) return;
    const now = performance.now();
    const seatOf = (id) => seatPlayers.findIndex((p) => p.id === id);
    const list = [];
    const add = (e) => list.push({ id: effectId.current++, start: now, ...e });
    for (const ev of events) {
      const si = seatOf(ev.playerId);
      if (si < 0) continue;
      const isMe = ev.playerId === playerId;
      if (ev.type === "claim") {
        const { symbol, color } = symbolFor(ev.action, ev.character);
        add({ kind: "emblem", position: headTopWorld(seats[si]), symbol, color, self: isMe });
        if (ev.targetId != null) {
          const ti = seatOf(ev.targetId);
          if (ti >= 0) add({ kind: "beam", from: chestWorld(seats[si]), to: chestWorld(seats[ti]), color, start: now + 350 });
        }
      } else if (ev.type === "block") {
        const { color } = symbolFor(null, ev.character);
        add({ kind: "shield", position: shieldWorld(seats[si]), yaw: seats[si].yaw, color });
        const { symbol } = symbolFor(null, ev.character);
        add({ kind: "emblem", position: headTopWorld(seats[si]), symbol, color, self: isMe, duration: EFFECTS.shieldDuration });
      } else if (ev.type === "challenge") {
        add({ kind: "emblem", position: headTopWorld(seats[si]), symbol: "exclaim", color: EFFECTS.colors.challenge, duration: EFFECTS.exclaimDuration, scale: 0.8, self: isMe });
      } else if (ev.type === "verdict") {
        const { symbol, color } = symbolFor(null, ev.character);
        add({
          kind: "emblem",
          position: headTopWorld(seats[si]),
          symbol: ev.success ? "check" : symbol,
          color,
          verdict: ev.success ? "confirm" : "broken",
          duration: EFFECTS.verdictDuration,
          self: isMe,
          start: now + 200,
        });
      }
    }
    setEffects((f) => [...f, ...list]);
  }, [game]);
  const removeEffect = (id) => setEffects((f) => f.filter((x) => x.id !== id));

  const sendLook = (look) => socket.emit("look", look);
  const sendHand = (h) => socket.emit("hand", h);
  const sendGesture = (g) => socket.emit("gesture", g);

  const totalCoins = seatPlayers.reduce((s, p) => s + (p.coins ?? 0), 0);
  const bankCount = Math.max(0, COINS.bankTotal - totalCoins);
  const turnId = game && game.phase !== "game_over" ? game.turnPlayerId : null;

  return (
    <Canvas shadows camera={{ fov: 60, near: 0.05, far: 50 }} style={{ background: ROOM.floorColor }}>
      <PointerInstaller />
      <FirstPersonLook eye={eyePosition(mySeat)} baseYaw={mySeat.yaw} onLook={sendLook} />
      <MyHands holdCount={myHeld.length} coinHeld={coinHeld} onPutDown={putDownAll} onSendHand={sendHand} onSendGesture={sendGesture} avatar={me?.avatar} />

      <ambientLight intensity={ROOM.ambient} />
      <pointLight
        position={[0, TABLE.height + 1.6, 0]}
        intensity={ROOM.lampIntensity}
        color={ROOM.lampColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <StringLights />

      <Room />
      <Table />
      <Deck3D cards={game ? Math.max(1, game.deckCount) : 11} />
      {/* 은행 동전 더미 (덱 옆) */}
      <CoinPile position={bankWorld} count={bankCount} />
      <CoinFlights flights={flights} onDone={removeFlight} />

      {/* 능력 연출: 상대 머리 위(세계 좌표) */}
      {effects
        .filter((e) => !e.self)
        .map((e) =>
          e.kind === "emblem" ? (
            <Emblem key={e.id} position={e.position} symbol={e.symbol} color={e.color} start={e.start} duration={e.duration} scale={e.scale} verdict={e.verdict} onDone={() => removeEffect(e.id)} />
          ) : e.kind === "beam" ? (
            <Beam key={e.id} from={e.from} to={e.to} color={e.color} start={e.start} onDone={() => removeEffect(e.id)} />
          ) : e.kind === "shield" ? (
            <Shield key={e.id} position={e.position} yaw={e.yaw} color={e.color} start={e.start} onDone={() => removeEffect(e.id)} />
          ) : null
        )}
      {/* 내가 쓴 능력: 시야 위쪽에 작게 */}
      <SelfAnchor>
        {effects
          .filter((e) => e.self && e.kind === "emblem")
          .map((e) => (
            <Emblem key={e.id} position={[0, 0, 0]} symbol={e.symbol} color={e.color} start={e.start} duration={e.duration} scale={(e.scale ?? 1) * EFFECTS.selfScale} verdict={e.verdict} depthTest={false} onDone={() => removeEffect(e.id)} />
          ))}
      </SelfAnchor>

      {seatPlayers.map((p, i) => (
        <group key={p.id}>
          {i !== myIndex && (
            <Avatar
              seat={seats[i]}
              avatar={p.avatar}
              lookRef={getLookRef(p.id)}
              handRef={getHandRef(p.id)}
              nickname={p.nickname}
              connected={p.connected !== false}
              highlight={highlightId === p.id || turnId === p.id}
              bubble={bubbles[p.id]}
            />
          )}
          <SeatProps
            seat={seats[i]}
            coins={i === myIndex ? myCoins : (p.coins ?? 2)}
            cards={p.cards ?? null}
            mine={i === myIndex}
            sampleHand={game ? null : sampleHand(p.id)}
            held={myHeld}
            onPick={pickCard}
            onPickCoin={openCoinPrompt}
          />
        </group>
      ))}

      {STRING_LIGHTS.enabled && STRING_LIGHTS.bloom && (
        <EffectComposer disableNormalPass>
          <Bloom
            intensity={STRING_LIGHTS.bloomIntensity}
            luminanceThreshold={STRING_LIGHTS.bloomThreshold}
            luminanceSmoothing={0.02}
            radius={STRING_LIGHTS.bloomRadius}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </Canvas>
  );
}

/** 자리의 동전 더미 위치 (카드 오른쪽) — 자리 그룹 로컬 좌표. SeatProps와 coinPileWorld가 같은 값을 쓴다. */
const PILE_LOCAL = [PROPS.cardWidth + 0.12, 0, 0.02];

/** 능력 문장을 띄울 자리: 아바타 등 뒤(테이블 반대쪽), 어깨 위쪽. 아바타는 yaw 방향(-Z 기준)으로 테이블을 본다 */
function headTopWorld(seat) {
  const [x, , z] = seat.position;
  const bx = Math.sin(seat.yaw); // 등 뒤 방향 = 정면의 반대
  const bz = Math.cos(seat.yaw);
  return [x + bx * EFFECTS.emblemBack, SEAT_HEIGHT + EFFECTS.emblemHeight, z + bz * EFFECTS.emblemBack];
}
/** 아바타 가슴 높이 세계 좌표 (빛줄기 시작/끝) */
function chestWorld(seat) {
  const [x, , z] = seat.position;
  return [x, SEAT_HEIGHT + 0.5, z];
}
/** 아바타 앞쪽(방패 자리) 세계 좌표. 아바타는 yaw 방향(-Z 기준)으로 테이블 중앙을 본다 */
function shieldWorld(seat) {
  const [x, , z] = seat.position;
  const fx = -Math.sin(seat.yaw);
  const fz = -Math.cos(seat.yaw);
  return [x + fx * 0.45, SEAT_HEIGHT + 0.55, z + fz * 0.45];
}

/** 자리의 동전 더미 세계 좌표 */
function coinPileWorld(seat) {
  const spot = tableSpotFor(seat, PROPS.cardDistanceFromEdge);
  const yaw = seat.yaw;
  const [lx, , lz] = PILE_LOCAL;
  // 자리 그룹의 Y축 회전(yaw)을 로컬 오프셋에 적용
  const x = spot[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw);
  const z = spot[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw);
  return [x, TABLE_TOP, z];
}

function Room() {
  const s = ROOM.size;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[s, s]} />
        <meshStandardMaterial color={ROOM.floorColor} />
      </mesh>
      {/* 천장과 벽: 조명 영향 없는 재질. 색 값이 그대로 보인다 */}
      <mesh position={[0, ROOM.ceilingHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[s, s]} />
        <meshBasicMaterial color={ROOM.ceilingColor} />
      </mesh>
      {[
        [0, s / 4, -s / 2, 0],
        [0, s / 4, s / 2, Math.PI],
        [-s / 2, s / 4, 0, Math.PI / 2],
        [s / 2, s / 4, 0, -Math.PI / 2],
      ].map(([x, y, z, ry], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, ry, 0]}>
          <planeGeometry args={[s, s / 2]} />
          <meshBasicMaterial color={ROOM.wallColor} />
        </mesh>
      ))}
    </group>
  );
}

function Table() {
  const topY = TABLE.height - TABLE.thickness / 2;
  return (
    <group>
      {/* 상판은 그림자를 받기만 한다 (자기 그림자를 만들면 줄무늬 아티팩트가 생김) */}
      <mesh position={[0, topY, 0]} scale={[TABLE.radiusX, 1, TABLE.radiusZ]} receiveShadow>
        <cylinderGeometry args={[1, 1, TABLE.thickness, 64]} />
        <meshStandardMaterial color={TABLE.color} roughness={0.95} />
      </mesh>
      <mesh position={[0, topY - 0.025, 0]} scale={[TABLE.radiusX + 0.06, 1, TABLE.radiusZ + 0.06]}>
        <cylinderGeometry args={[1, 1, TABLE.thickness + 0.02, 64]} />
        <meshStandardMaterial color={TABLE.rimColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, TABLE.height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.3, TABLE.height - TABLE.thickness, 24]} />
        <meshStandardMaterial color={TABLE.rimColor} />
      </mesh>
    </group>
  );
}

// 게임이 연결되기 전(로비 미리보기)에 내 자리에 보여줄 임시 손패. 플레이어 ID로 정해져서 새로고침해도 같다.
const SAMPLE_CHARACTERS = ["duke", "assassin", "captain", "ambassador", "contessa"];
function sampleHand(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = h % 5;
  const b = (a + 1 + ((h >> 3) % 4)) % 5;
  return [SAMPLE_CHARACTERS[a], SAMPLE_CHARACTERS[b]];
}

/** 캔버스에 입력 리스너(조준/잠금 상태)를 붙인다. Canvas 안에서만 gl을 얻을 수 있어서 별도 컴포넌트. */
function PointerInstaller() {
  const { gl } = useThree();
  useEffect(() => installPointer(gl.domElement), [gl]);
  return null;
}

/**
 * 자리 앞의 카드 2장과 동전 더미.
 *  cards: 게임 뷰의 카드 [{character|null, revealed}] (게임 중). null이면 sampleHand로 임시 카드.
 *  mine:  내 자리면 카드/동전을 조준해 집을 수 있다. 공개된(revealed) 카드는 못 집는다.
 */
function SeatProps({ seat, coins, cards, mine = false, sampleHand = null, held = [], onPick, onPickCoin }) {
  const spot = tableSpotFor(seat, PROPS.cardDistanceFromEdge);
  const yaw = seat.yaw;
  return (
    <group position={spot} rotation={[0, yaw, 0]}>
      {[-1, 1].map((s, idx) => {
        const pos = [s * (PROPS.cardWidth / 2 + PROPS.cardGap / 2), PROPS.cardThickness / 2, 0];
        const card = cards ? cards[idx] : { character: sampleHand?.[idx] ?? null, revealed: false };
        if (!card) return null;
        if (card.revealed) {
          // 공개된(잃은) 카드: 앞면이 위로, 살짝 비스듬히 밀려남
          return <Card3D key={s} position={[pos[0], pos[1], pos[2] + 0.06]} rotation={[0, s * 0.25, 0]} character={card.character} faceUp />;
        }
        return mine ? (
          <HandCard key={s} restPosition={pos} character={card.character} index={idx} held={held} onPick={onPick} />
        ) : (
          <Card3D key={s} position={pos} />
        );
      })}
      <CoinPile position={PILE_LOCAL} count={coins} interactive={mine} onPick={onPickCoin} />
    </group>
  );
}
