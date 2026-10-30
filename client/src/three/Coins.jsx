import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COINS, PROPS, TABLE } from "./config.js";
import { Coin3D } from "./Props3D.jsx";
import { interactables, crosshair } from "./input.js";

export const TABLE_TOP = TABLE.height + TABLE.thickness / 2;

/** count개를 기둥 여러 개로 나눠 쌓는다. 각 동전의 (x, y, z) 로컬 좌표 목록. */
export function stackLayout(count, max = COINS.stackMax, gap = COINS.stackGap) {
  const out = [];
  const columns = Math.max(1, Math.ceil(count / max));
  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / max);
    const level = i % max;
    // 기둥은 가운데부터 좌우로 번갈아 배치
    const side = col === 0 ? 0 : col % 2 === 1 ? Math.ceil(col / 2) : -Math.ceil(col / 2);
    out.push([side * gap, PROPS.coinThickness * (level + 0.5), 0]);
  }
  return out;
}

/** 더미 하나 (은행 또는 자리). interactive면 맨 위 동전을 조준해 집을 수 있다. */
export function CoinPile({ position, rotation = [0, 0, 0], count, interactive = false, onPick, hovered: hoveredProp }) {
  const layout = useMemo(() => stackLayout(count), [count]);
  const topRef = useRef();
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const mesh = topRef.current;
    if (!interactive || !mesh || count <= 0) return;
    mesh.userData.onInteract = () => onPick?.();
    interactables.add(mesh);
    return () => {
      interactables.delete(mesh);
    };
  }, [interactive, count, onPick]);

  useFrame(() => {
    if (!interactive) return;
    const h = crosshair.object === topRef.current;
    if (h !== hovered) setHovered(h);
  });

  return (
    <group position={position} rotation={rotation}>
      {layout.map((p, i) => (
        <Coin3D key={i} position={p} rotation={[0, i * 0.7, 0]} />
      ))}
      {/* 조준용 보이지 않는 상자: 더미 전체를 감싼다 */}
      {interactive && count > 0 && (
        <mesh ref={topRef} position={[0, (PROPS.coinThickness * Math.min(count, COINS.stackMax)) / 2, 0]} visible={hovered}>
          <cylinderGeometry args={[PROPS.coinRadius * 1.4, PROPS.coinRadius * 1.4, PROPS.coinThickness * Math.min(count, COINS.stackMax) + 0.01, 20]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.25} />
        </mesh>
      )}
    </group>
  );
}

/**
 * 날아가는 동전들. flights: [{ id, from: [x,y,z], to: [x,y,z], start }] (세계 좌표)
 * 끝난 것은 onDone(id)로 알린다.
 */
export function CoinFlights({ flights, onDone }) {
  return (
    <group>
      {flights.map((f) => (
        <Flight key={f.id} flight={f} onDone={onDone} />
      ))}
    </group>
  );
}

function Flight({ flight, onDone }) {
  const ref = useRef();
  const from = useMemo(() => new THREE.Vector3(...flight.from), [flight]);
  const to = useMemo(() => new THREE.Vector3(...flight.to), [flight]);
  const done = useRef(false);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = (performance.now() - flight.start) / (COINS.flightDuration * 1000);
    if (t < 0) {
      m.visible = false;
      return;
    }
    m.visible = true;
    if (t >= 1) {
      if (!done.current) {
        done.current = true;
        onDone?.(flight.id);
      }
      return;
    }
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    m.position.lerpVectors(from, to, e);
    m.position.y += Math.sin(t * Math.PI) * COINS.flightArc;
    m.rotation.x = t * Math.PI * 4; // 빙글빙글
    m.rotation.y = t * Math.PI * 2;
  });
  return (
    <group ref={ref}>
      <Coin3D position={[0, 0, 0]} />
    </group>
  );
}
