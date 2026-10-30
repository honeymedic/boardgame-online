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
    () => bulbs.map((b) => new THREE.Color(S.warmOnly ? S.warmColor : S.colors[b.colorIndex % S.colors.length])),
    [bulbs]
  );

  // 전구 주변 빛무리(헤일로): 가운데가 밝고 가장자리로 갈수록 투명한 원형 텍스처를 항상 카메라를 향하는 스프라이트로 붙인다.
  const haloMaterial = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(0.6, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.SpriteMaterial({
      map: texture,
      color: new THREE.Color(S.warmOnly ? S.warmColor : "#ffffff"),
      transparent: true,
      opacity: S.haloOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
  }, []);

  const haloRefs = useRef([]);

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

      // 트리 전구식 깜빡임: 전구마다 속도/위상이 달라 제각각 반짝인다.
      // sin 값을 거듭제곱해서 "잠깐 확 켜졌다가 천천히 잦아드는" 모양으로 만든다.
      let tw = 1;
      if (S.twinkleSpeed > 0) {
        const wave = 0.5 + 0.5 * Math.sin(t * S.twinkleSpeed * b.speed + b.phase);
        const spark = Math.pow(wave, S.twinkleSharpness);
        tw = 1 - S.twinkleAmount + S.twinkleAmount * spark;
      }
      const level = S.glow * tw * b.brightness;
      colorObj.copy(baseColors[i]).multiplyScalar(level);
      mesh.setColorAt(i, colorObj);

      // 빛무리도 같이 커졌다 작아진다
      const halo = haloRefs.current[i];
      if (halo) {
        const s = S.haloSize * b.brightness * (0.55 + 0.45 * tw);
        halo.scale.set(s, s, 1);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {strands.map((pts, i) => (
        <Line key={i} points={pts} color={S.wireColor} lineWidth={1} />
      ))}
      {/* 전구: 조명 영향을 안 받는 자체발광 재질. 색은 instanceColor로 개별 지정. toneMapped를 꺼야 색이 그대로 나온다 */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, bulbs.length]}>
        <sphereGeometry args={[S.bulbRadius, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* 빛무리 */}
      {bulbs.map((b, i) => (
        <sprite
          key={i}
          ref={(el) => (haloRefs.current[i] = el)}
          material={haloMaterial}
          position={[b.x, b.y, b.z]}
          scale={[S.haloSize * b.brightness, S.haloSize * b.brightness, 1]}
        />
      ))}
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
        speed: 0.6 + Math.random() * 0.9, // 전구마다 깜빡이는 속도가 다르게
        brightness: 1 - S.warmVariation * Math.random(), // 전구마다 밝기 편차
      });
    }
  }
  return { strands, bulbs };
}
