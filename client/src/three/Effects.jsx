import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EFFECTS } from "./config.js";
import { useSymbolTexture, CHARACTER_SYMBOL } from "./symbols.js";
import { CHAR } from "../art/cards.jsx";

// ─────────────────────────────────────────────────────────────
// 능력 사용 연출. 모든 컴포넌트는 start(ms) 기준으로 스스로 진행하고, 끝나면 onDone()을 부른다.
// 위치는 세계 좌표. 내 시야용(self)은 SelfAnchor가 매 프레임 카메라 앞으로 옮겨 준다.
// ─────────────────────────────────────────────────────────────

/** 행동/캐릭터 → 상징 이름과 색 */
export function symbolFor(action, character) {
  if (character) return { symbol: CHARACTER_SYMBOL[character], color: CHAR[character]?.color ?? "#ffffff" };
  if (action === "coup") return { symbol: "cross", color: EFFECTS.colors.coup };
  return { symbol: "coin", color: EFFECTS.colors.coin };
}

const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** 항상 카메라를 보는 상징 스프라이트. opacity/scale은 부모가 ref로 조절한다. */
function SymbolSprite({ symbol, color, spriteRef, size = 1, depthTest = true }) {
  const tex = useSymbolTexture(symbol, color);
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ transparent: true, depthTest, depthWrite: false, toneMapped: false }),
    [depthTest]
  );
  useEffect(() => {
    mat.map = tex;
    mat.needsUpdate = true;
  }, [tex, mat]);
  return <sprite ref={spriteRef} material={mat} scale={[size, size, 1]} />;
}

/** 바닥과 평행한 빛 고리. 퍼지면서 흐려진다. */
function Ring({ ringRef, color }) {
  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** 위로 흩날리는 입자. direction: 1 위로, -1 아래로(깨짐) */
function Particles({ color, start, duration, count = EFFECTS.particleCount, direction = 1, spread = 0.18 }) {
  const ref = useRef();
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        a: Math.random() * Math.PI * 2,
        r: Math.random() * spread,
        v: 0.6 + Math.random() * 0.8,
        w: Math.random() * Math.PI * 2,
        delay: Math.random() * 0.4,
      })),
    [count, spread]
  );
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: EFFECTS.particleSize,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        sizeAttenuation: true,
      }),
    [color]
  );
  useFrame(() => {
    const t = (performance.now() - start) / 1000;
    const pos = geom.attributes.position;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const lt = Math.max(0, t - s.delay);
      const x = Math.cos(s.a) * s.r + Math.sin(lt * 3 + s.w) * 0.03;
      const z = Math.sin(s.a) * s.r + Math.cos(lt * 2.5 + s.w) * 0.03;
      const y = direction > 0 ? lt * s.v * EFFECTS.particleRise : -lt * lt * 1.6;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    mat.opacity = clamp01(1 - t / duration);
  });
  return <points geometry={geom} material={mat} />;
}

/**
 * 머리 위 문장: 상징 + 빛 고리 + 입자. 떠오르며 커지고(0.3초), 유지, 마지막 0.5초에 흐려진다.
 * verdict: "confirm" | "broken" | null — 확정(금빛 번쩍) / 깨짐(회색, 흔들리며 조각 낙하)
 */
export function Emblem({ position, symbol, color, start, duration = EFFECTS.emblemDuration, scale = 1, onDone, verdict = null, depthTest = true }) {
  const group = useRef();
  const sprite = useRef();
  const ring = useRef();
  const done = useRef(false);
  const size = EFFECTS.emblemSize * scale;
  const tint = verdict === "broken" ? EFFECTS.colors.broken : verdict === "confirm" ? EFFECTS.colors.confirm : color;

  useFrame(() => {
    const t = (performance.now() - start) / 1000;
    if (t < 0) return;
    const p = t / duration;
    if (p >= 1) {
      if (!done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    const inT = clamp01(t / 0.3);
    const outT = clamp01((t - (duration - 0.5)) / 0.5);
    const alpha = (1 - outT) * (verdict === "broken" ? 1 - p * 0.5 : 1);
    if (sprite.current) {
      const s = size * easeOutBack(inT);
      sprite.current.scale.set(s, s, 1);
      sprite.current.material.opacity = alpha;
      if (verdict === "broken") {
        sprite.current.position.x = Math.sin(t * 40) * 0.015 * (1 - p);
        sprite.current.position.y = -p * p * 0.25; // 서서히 떨어짐
      } else {
        sprite.current.position.y = 0.04 * Math.sin(t * 2.2); // 살짝 둥실
      }
    }
    if (ring.current) {
      const r = verdict ? 0.35 : EFFECTS.ringMaxRadius;
      const rt = verdict ? clamp01(t / 0.6) : clamp01(t / 1.1);
      const rs = 0.1 + r * rt;
      ring.current.scale.set(rs, rs, 1);
      ring.current.material.opacity = 0.9 * (1 - rt);
    }
  });

  return (
    <group ref={group} position={position}>
      <SymbolSprite symbol={symbol} color={tint} spriteRef={sprite} size={size} depthTest={depthTest} />
      <group position={[0, -size * 0.55, 0]}>
        <Ring ringRef={ring} color={tint} />
      </group>
      <group position={[0, -size * 0.4, 0]}>
        <Particles color={tint} start={start} duration={duration} direction={verdict === "broken" ? -1 : 1} count={verdict === "broken" ? 18 : EFFECTS.particleCount} />
      </group>
    </group>
  );
}

/** 두 점 사이 빛줄기. 짧게 뻗었다가 사라진다. */
export function Beam({ from, to, color, start, duration = EFFECTS.beamDuration, onDone }) {
  const ref = useRef();
  const done = useRef(false);
  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const b = useMemo(() => new THREE.Vector3(...to), [to]);
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), mid: new THREE.Vector3(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0) }), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = (performance.now() - start) / 1000;
    if (t < 0) {
      m.visible = false;
      return;
    }
    const p = t / duration;
    if (p >= 1) {
      m.visible = false;
      if (!done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    m.visible = true;
    // 앞 30%는 뻗어 나가고, 나머지는 유지하며 흐려진다
    const grow = clamp01(p / 0.3);
    tmp.dir.subVectors(b, a);
    const len = tmp.dir.length() * grow;
    tmp.mid.copy(a).addScaledVector(tmp.dir.normalize(), len / 2);
    m.position.copy(tmp.mid);
    m.quaternion.copy(tmp.q.setFromUnitVectors(tmp.up, tmp.dir));
    m.scale.set(1, Math.max(0.001, len), 1);
    m.material.opacity = 0.95 * (1 - clamp01((p - 0.3) / 0.7));
  });
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[EFFECTS.beamRadius, EFFECTS.beamRadius * 0.4, 1, 10, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** 막기 방패: 아바타 앞에 펼쳐지는 반투명 원판. */
export function Shield({ position, yaw, color, start, duration = EFFECTS.shieldDuration, onDone }) {
  const ref = useRef();
  const done = useRef(false);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = (performance.now() - start) / 1000;
    const p = t / duration;
    if (p >= 1) {
      m.visible = false;
      if (!done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    m.visible = true;
    const s = EFFECTS.shieldRadius * easeOutBack(clamp01(t / 0.3));
    m.scale.set(s, s, 1);
    m.material.opacity = 0.55 * (1 - clamp01((p - 0.7) / 0.3));
    m.rotation.z = t * 0.6;
  });
  return (
    <mesh ref={ref} position={position} rotation={[0, yaw, 0]}>
      <circleGeometry args={[1, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** 내 시야 안에 띄우는 연출의 기준점. 매 프레임 카메라 앞 고정 위치로 옮긴다. */
export function SelfAnchor({ children }) {
  const ref = useRef();
  const { camera } = useThree();
  const off = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!ref.current) return;
    off.set(...EFFECTS.selfOffset).applyQuaternion(camera.quaternion).add(camera.position);
    ref.current.position.copy(off);
    ref.current.quaternion.copy(camera.quaternion);
  });
  return <group ref={ref}>{children}</group>;
}
