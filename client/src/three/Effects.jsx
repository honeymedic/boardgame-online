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

/** 문장 뒤에 깔리는 둥근 빛무리 (가운데 밝고 가장자리로 투명). 항상 카메라를 본다. */
const glowTexture = (() => {
  let tex = null;
  return () => {
    if (tex) return tex;
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(0.7, "rgba(255,255,255,0.1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex = new THREE.CanvasTexture(canvas);
    return tex;
  };
})();

function Glow({ glowRef, color }) {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [color]
  );
  return <sprite ref={glowRef} material={mat} />;
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
function Particles({ color, start, duration, count = EFFECTS.particleCount, direction = 1, spread = 0.18, loop = false }) {
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
      let lt = Math.max(0, t - s.delay);
      if (loop) lt = lt % 1.8; // 유지 모드: 1.8초마다 다시 아래에서 올라온다
      const x = Math.cos(s.a) * s.r + Math.sin(lt * 3 + s.w) * 0.03;
      const z = Math.sin(s.a) * s.r + Math.cos(lt * 2.5 + s.w) * 0.03;
      const y = direction > 0 ? lt * s.v * EFFECTS.particleRise : -lt * lt * 1.6;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    mat.opacity = loop ? 1 : clamp01(1 - t / duration);
  });
  return <points geometry={geom} material={mat} />;
}

/**
 * 머리 위 문장: 상징 + 빛 고리 + 입자. 떠오르며 커지고(0.3초), 유지, 마지막 0.5초에 흐려진다.
 * verdict: "confirm" | "broken" | null — 확정(금빛 번쩍) / 깨짐(회색, 흔들리며 조각 낙하)
 */
export function Emblem({ position, symbol, color, start, duration = EFFECTS.emblemDuration, scale = 1, onDone, verdict = null, depthTest = true, hold = false }) {
  const group = useRef();
  const sprite = useRef();
  const glow = useRef();
  const ring = useRef();
  const done = useRef(false);
  const size = EFFECTS.emblemSize * scale;
  // 깨짐: 전부 회색. 확정: 상징은 제 색 그대로, 빛무리와 고리만 금빛으로 터진다
  const tint = verdict === "broken" ? EFFECTS.colors.broken : color;
  const accent = verdict === "confirm" ? EFFECTS.colors.confirm : tint;

  useFrame(() => {
    const t = (performance.now() - start) / 1000;
    if (t < 0) return;
    const p = hold ? 0 : t / duration;
    if (!hold && p >= 1) {
      if (!done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    const inT = clamp01(t / 0.3);
    const outT = hold ? 0 : clamp01((t - (duration - 0.5)) / 0.5);
    const alpha = (1 - outT) * (verdict === "broken" ? 1 - p * 0.5 : 1);
    if (sprite.current) {
      // 확정이면 1.3배로 커지며 처음 0.8초 동안 번쩍인다
      const confirmBoost = verdict === "confirm" ? 1.3 * (1 + 0.08 * Math.sin(t * 10) * Math.max(0, 1 - t / 0.8)) : 1;
      const s = size * easeOutBack(inT) * confirmBoost;
      sprite.current.scale.set(s, s, 1);
      sprite.current.material.opacity = alpha;
      if (verdict === "broken") {
        sprite.current.position.x = Math.sin(t * 40) * 0.015 * (1 - p);
        sprite.current.position.y = -p * p * 0.25; // 서서히 떨어짐
      } else {
        sprite.current.position.y = 0.04 * Math.sin(t * 2.2); // 살짝 둥실
      }
    }
    if (glow.current) {
      const g = size * EFFECTS.glowScale * (0.6 + 0.4 * easeOutBack(inT)) * (1 + 0.05 * Math.sin(t * 3));
      glow.current.scale.set(g, g, 1);
      glow.current.material.opacity = 0.85 * alpha * (verdict === "broken" ? 0.4 : verdict === "confirm" ? 1.0 : 1);
    }
    if (ring.current) {
      const r = verdict ? 0.35 : EFFECTS.ringMaxRadius;
      // 유지 모드면 고리가 1.6초마다 다시 퍼진다 (맥동)
      const rt = verdict ? clamp01(t / 0.6) : hold ? (t % 1.6) / 1.6 : clamp01(t / 1.1);
      const rs = 0.1 + r * rt;
      ring.current.scale.set(rs, rs, 1);
      ring.current.material.opacity = 0.9 * (1 - rt);
    }
  });

  return (
    <group ref={group} position={position}>
      <group position={[0, 0, -0.02]}>
        <Glow glowRef={glow} color={accent} />
      </group>
      <SymbolSprite symbol={symbol} color={tint} spriteRef={sprite} size={size} depthTest={depthTest} />
      <group position={[0, -size * 0.55, 0]}>
        <Ring ringRef={ring} color={accent} />
      </group>
      <group position={[0, -size * 0.4, 0]}>
        <Particles color={tint} start={start} duration={duration} direction={verdict === "broken" ? -1 : 1} count={verdict === "broken" ? 24 : EFFECTS.particleCount} spread={size * 0.45} loop={hold} />
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
export function Shield({ position, yaw, color, start, duration = EFFECTS.shieldDuration, onDone, hold = false }) {
  const ref = useRef();
  const done = useRef(false);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = (performance.now() - start) / 1000;
    const p = hold ? 0 : t / duration;
    if (!hold && p >= 1) {
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
