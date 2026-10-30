import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { STRING_LIGHTS as S } from "./config.js";

/**
 * 테이블 위에 늘어진 줄 조명. 줄(Line) + 전구(InstancedMesh) 구성.
 * 전구는 자체 발광(emissive)이라 조명 계산 없이 밝게 보이고, 색만 살짝 흔들어 깜빡이게 한다.
 */
export default function StringLights() {
  if (!S.enabled) return null;

  const { strands, bulbs } = useMemo(() => buildLayout(), []);
  const meshRef = useRef();
  const colorObj = useMemo(() => new THREE.Color(), []);
  const baseColors = useMemo(
    () => bulbs.map((b) => new THREE.Color(S.warmOnly ? "#ffcf7a" : S.colors[b.colorIndex % S.colors.length])),
    [bulbs]
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bulbs.length; i++) {
      const b = bulbs[i];
      dummy.position.set(b.x, b.y, b.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // 전구마다 위상을 다르게 해서 제각각 깜빡이게
      const tw = S.twinkleSpeed > 0 ? 1 - S.twinkleAmount * (0.5 + 0.5 * Math.sin(t * S.twinkleSpeed + b.phase)) : 1;
      colorObj.copy(baseColors[i]).multiplyScalar(S.glow * tw);
      mesh.setColorAt(i, colorObj);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {strands.map((pts, i) => (
        <Line key={i} points={pts} color={S.wireColor} lineWidth={1} />
      ))}
      <instancedMesh ref={meshRef} args={[undefined, undefined, bulbs.length]}>
        <sphereGeometry args={[S.bulbRadius, 10, 8]} />
        {/* color는 instanceColor가 덮어쓰고, emissive는 흰색으로 두고 instanceColor와 곱해지도록 toneMapped 끔 */}
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** 줄 여러 가닥을 테이블 위에 서로 다른 각도로 걸친다. 각 줄은 처진 곡선(포물선). */
function buildLayout() {
  const strands = [];
  const bulbs = [];
  let colorIndex = 0;
  for (let s = 0; s < S.strands; s++) {
    // 줄마다 각도를 조금씩 다르게, 중심에서 살짝 비켜서
    const angle = (s / S.strands) * Math.PI + 0.35;
    const offset = (s % 2 === 0 ? 1 : -1) * 0.5 * (s / Math.max(1, S.strands - 1));
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    const ox = -dz * offset;
    const oz = dx * offset;
    const a = [ox - dx * S.spread, S.height, oz - dz * S.spread];
    const b = [ox + dx * S.spread, S.height, oz + dz * S.spread];

    const pts = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const sagY = -S.sag * 4 * u * (1 - u); // 가운데서 최대 sag
      pts.push([a[0] + (b[0] - a[0]) * u, a[1] + sagY, a[2] + (b[2] - a[2]) * u]);
    }
    strands.push(pts);

    for (let i = 0; i < S.bulbsPerStrand; i++) {
      const u = (i + 0.5) / S.bulbsPerStrand;
      const sagY = -S.sag * 4 * u * (1 - u);
      bulbs.push({
        x: a[0] + (b[0] - a[0]) * u,
        y: a[1] + sagY - S.bulbRadius * 1.6, // 줄 아래로 살짝 매달림
        z: a[2] + (b[2] - a[2]) * u,
        colorIndex: colorIndex++,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  return { strands, bulbs };
}
