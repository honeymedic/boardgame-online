import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { TABLE, PROPS, ROOM } from "./config.js";
import { computeSeats, eyePosition, tableSpotFor } from "./seats.js";
import Avatar from "./Avatar.jsx";
import FirstPersonLook from "./FirstPersonLook.jsx";
import StringLights from "./StringLights.jsx";
import { Card3D, Deck3D, Coin3D } from "./Props3D.jsx";
import HandCard from "./HandCard.jsx";
import { MyHands } from "./Hands.jsx";
import { installPointer } from "./input.js";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { STRING_LIGHTS } from "./config.js";
import { socket, playerId } from "../socket.js";

/**
 * 3D 테이블 장면.
 * players: room.players (id, nickname, avatar, connected)
 * 내 자리는 players에서 내 index. 카메라는 그 자리에 앉아 있고, 내 아바타는 그리지 않는다.
 */
export default function TableScene({ players, bubbles = {}, highlightId = null }) {
  const seats = useMemo(() => computeSeats(players.length), [players.length]);
  const myIndex = Math.max(0, players.findIndex((p) => p.id === playerId));
  const mySeat = seats[myIndex];

  // 다른 사람들의 시선. 렌더링을 다시 일으키지 않도록 ref에 담아 두고 useFrame에서 읽는다.
  const looks = useRef(new Map());
  useEffect(() => {
    const onLook = ({ playerId: id, yaw, pitch }) => {
      let ref = looks.current.get(id);
      if (!ref) {
        ref = { current: { yaw, pitch } };
        looks.current.set(id, ref);
      } else {
        ref.current = { yaw, pitch };
      }
    };
    socket.on("look", onLook);
    return () => socket.off("look", onLook);
  }, []);

  const getLookRef = (id) => {
    let ref = looks.current.get(id);
    if (!ref) {
      ref = { current: null };
      looks.current.set(id, ref);
    }
    return ref;
  };

  // 다른 사람들의 손. { pos: Vector3|null, hold, swing }
  const hands = useRef(new Map());
  const getHandRef = (id) => {
    let ref = hands.current.get(id);
    if (!ref) {
      ref = { current: { pos: null, hold: null, swing: null } };
      hands.current.set(id, ref);
    }
    return ref;
  };
  useEffect(() => {
    const onHand = ({ playerId: id, x, y, z, hold }) => {
      const ref = getHandRef(id);
      if (!ref.current.pos) ref.current.pos = new THREE.Vector3();
      ref.current.pos.set(x, y, z);
      ref.current.hold = hold;
    };
    const onGesture = ({ playerId: id, type, target }) => {
      if (type !== "swing" || !target) return;
      getHandRef(id).current.swing = { start: performance.now(), target: new THREE.Vector3(...target) };
    };
    socket.on("hand", onHand);
    socket.on("gesture", onGesture);
    return () => {
      socket.off("hand", onHand);
      socket.off("gesture", onGesture);
    };
  }, []);

  // 내가 왼손에 든 카드 번호 (없으면 null)
  const [myHold, setMyHold] = useState(null);
  const me = players[myIndex];

  const sendLook = (look) => socket.emit("look", look);
  const sendHand = (h) => socket.emit("hand", h);
  const sendGesture = (g) => socket.emit("gesture", g);

  return (
    <Canvas shadows camera={{ fov: 60, near: 0.05, far: 50 }} style={{ background: ROOM.floorColor }}>
      <PointerInstaller />
      <FirstPersonLook eye={eyePosition(mySeat)} baseYaw={mySeat.yaw} onLook={sendLook} />
      <MyHands holdIndex={myHold} onPutDown={() => setMyHold(null)} onSendHand={sendHand} onSendGesture={sendGesture} avatar={me?.avatar} />

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
      <Deck />

      {players.map((p, i) => (
        <group key={p.id}>
          {i !== myIndex && (
            <Avatar
              seat={seats[i]}
              avatar={p.avatar}
              lookRef={getLookRef(p.id)}
              handRef={getHandRef(p.id)}
              nickname={p.nickname}
              connected={p.connected}
              highlight={highlightId === p.id}
              bubble={bubbles[p.id]}
            />
          )}
          <SeatProps
            seat={seats[i]}
            coins={2}
            mine={i === myIndex}
            hand={i === myIndex ? sampleHand(p.id) : null}
            held={myHold}
            onPickChange={setMyHold}
          />
        </group>
      ))}

      {/* 빛 번짐 후처리: 전구처럼 밝은 부분만 네온처럼 번진다 */}
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

function Room() {
  const s = ROOM.size;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[s, s]} />
        <meshStandardMaterial color={ROOM.floorColor} />
      </mesh>
      {/* 천장: 벽과 같이 조명 영향 없는 재질. 색 값이 그대로 보인다 */}
      <mesh position={[0, ROOM.ceilingHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[s, s]} />
        <meshBasicMaterial color={ROOM.ceilingColor} />
      </mesh>
      {/* 벽 4개: 조명 영향 없는 재질. 색 값이 그대로 보인다 */}
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
      {/* 상판 (펠트) */}
      {/* 상판은 그림자를 받기만 한다 (자기 그림자를 만들면 줄무늬 아티팩트가 생김) */}
      <mesh position={[0, topY, 0]} scale={[TABLE.radiusX, 1, TABLE.radiusZ]} receiveShadow>
        <cylinderGeometry args={[1, 1, TABLE.thickness, 64]} />
        <meshStandardMaterial color={TABLE.color} roughness={0.95} />
      </mesh>
      {/* 테두리 */}
      <mesh position={[0, topY - 0.025, 0]} scale={[TABLE.radiusX + 0.06, 1, TABLE.radiusZ + 0.06]}>
        <cylinderGeometry args={[1, 1, TABLE.thickness + 0.02, 64]} />
        <meshStandardMaterial color={TABLE.rimColor} roughness={0.6} />
      </mesh>
      {/* 기둥 다리 */}
      <mesh position={[0, TABLE.height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.3, TABLE.height - TABLE.thickness, 24]} />
        <meshStandardMaterial color={TABLE.rimColor} />
      </mesh>
    </group>
  );
}

function Deck() {
  return <Deck3D cards={11} />;
}

// 게임이 연결되기 전까지 내 자리에 보여줄 임시 손패. 플레이어 ID로 정해져서 새로고침해도 같다.
const SAMPLE_CHARACTERS = ["duke", "assassin", "captain", "ambassador", "contessa"];
function sampleHand(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = h % 5;
  const b = (a + 1 + ((h >> 3) % 4)) % 5;
  return [SAMPLE_CHARACTERS[a], SAMPLE_CHARACTERS[b]];
}

/** 자리 앞에 놓인 카드 2장과 동전. 내 자리(mine)면 카드를 클릭해 집어 들 수 있다. */
/** 캔버스에 입력 리스너(조준/잠금 상태)를 붙인다. Canvas 안에서만 gl을 얻을 수 있어서 별도 컴포넌트. */
function PointerInstaller() {
  const { gl } = useThree();
  useEffect(() => installPointer(gl.domElement), [gl]);
  return null;
}

function SeatProps({ seat, coins, mine = false, hand = null, held = null, onPickChange }) {
  const spot = tableSpotFor(seat, PROPS.cardDistanceFromEdge);
  const yaw = seat.yaw;
  return (
    <group position={spot} rotation={[0, yaw, 0]}>
      {[-1, 1].map((s, idx) => {
        const pos = [s * (PROPS.cardWidth / 2 + PROPS.cardGap / 2), PROPS.cardThickness / 2, 0];
        return mine ? (
          <HandCard key={s} restPosition={pos} character={hand?.[idx] ?? null} index={idx} held={held} onPickChange={onPickChange} />
        ) : (
          <Card3D key={s} position={pos} />
        );
      })}
      {Array.from({ length: coins }).map((_, i) => (
        <Coin3D key={i} position={[PROPS.cardWidth + 0.08, PROPS.coinThickness * (i + 0.5), 0.02]} rotation={[0, i * 0.7, 0]} />
      ))}
    </group>
  );
}
