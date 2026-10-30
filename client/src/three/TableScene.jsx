import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { TABLE, PROPS, ROOM } from "./config.js";
import { computeSeats, eyePosition, tableSpotFor } from "./seats.js";
import Avatar from "./Avatar.jsx";
import FirstPersonLook from "./FirstPersonLook.jsx";
import StringLights from "./StringLights.jsx";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { STRING_LIGHTS } from "./config.js";
import { socket, playerId } from "../socket.js";

/**
 * 3D 테이블 장면.
 * players: room.players (id, nickname, avatar, connected)
 * 내 자리는 players에서 내 index. 카메라는 그 자리에 앉아 있고, 내 아바타는 그리지 않는다.
 */
export default function TableScene({ players, highlightId = null }) {
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

  const sendLook = (look) => socket.emit("look", look);

  return (
    <Canvas shadows camera={{ fov: 60, near: 0.05, far: 50 }} style={{ background: ROOM.floorColor }}>
      <FirstPersonLook eye={eyePosition(mySeat)} baseYaw={mySeat.yaw} onLook={sendLook} />

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
              nickname={p.nickname}
              connected={p.connected}
              highlight={highlightId === p.id}
            />
          )}
          <SeatProps seat={seats[i]} coins={2} />
        </group>
      ))}

      {/* 빛 번짐 후처리: 전구처럼 밝은 부분만 네온처럼 번진다 */}
      {STRING_LIGHTS.enabled && STRING_LIGHTS.bloom && (
        <EffectComposer disableNormalPass>
          <Bloom
            intensity={STRING_LIGHTS.bloomIntensity}
            luminanceThreshold={STRING_LIGHTS.bloomThreshold}
            luminanceSmoothing={0.2}
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
      {/* 천장: 조명 영향을 안 받는 재질로 어둡게 고정 */}
      <mesh position={[0, ROOM.ceilingHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[s, s]} />
        <meshBasicMaterial color={ROOM.ceilingColor} />
      </mesh>
      {/* 벽 4개 */}
      {[
        [0, s / 4, -s / 2, 0],
        [0, s / 4, s / 2, Math.PI],
        [-s / 2, s / 4, 0, Math.PI / 2],
        [s / 2, s / 4, 0, -Math.PI / 2],
      ].map(([x, y, z, ry], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, ry, 0]}>
          <planeGeometry args={[s, s / 2]} />
          <meshStandardMaterial color={ROOM.wallColor} />
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
  const y = TABLE.height + TABLE.thickness / 2;
  const h = PROPS.cardThickness * 11;
  return (
    <mesh position={[0, y + h / 2, 0]} rotation={[0, 0.2, 0]} castShadow>
      <boxGeometry args={[PROPS.cardWidth, h, PROPS.cardHeight]} />
      <meshStandardMaterial color={PROPS.deckColor} />
    </mesh>
  );
}

/** 자리 앞에 놓인 뒷면 카드 2장과 동전. */
function SeatProps({ seat, coins }) {
  const spot = tableSpotFor(seat, PROPS.cardDistanceFromEdge);
  const yaw = seat.yaw;
  return (
    <group position={spot} rotation={[0, yaw, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (PROPS.cardWidth / 2 + PROPS.cardGap / 2), PROPS.cardThickness / 2, 0]} castShadow>
          <boxGeometry args={[PROPS.cardWidth, PROPS.cardThickness, PROPS.cardHeight]} />
          <meshStandardMaterial color={PROPS.cardBackColor} />
        </mesh>
      ))}
      {Array.from({ length: coins }).map((_, i) => (
        <mesh key={i} position={[PROPS.cardWidth + 0.08, PROPS.coinThickness * (i + 0.5), 0.02]} castShadow>
          <cylinderGeometry args={[PROPS.coinRadius, PROPS.coinRadius, PROPS.coinThickness, 24]} />
          <meshStandardMaterial color={PROPS.coinColor} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
