import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PROPS, PICKUP } from "./config.js";
import { useCardTexture } from "./textures.js";

/**
 * 내 손패 카드 한 장. 테이블에 뒷면으로 놓여 있다가, 클릭하면 눈앞으로 들어 올려 앞면을 보여주고,
 * 다시 클릭하면 제자리에 뒷면으로 내려놓는다. 들고 있는 동안 고개를 돌리면 카드가 시야를 따라온다.
 *
 * restPosition: 부모(자리 그룹) 기준 놓인 위치. 부모가 자리 방향으로 회전해 있어도 된다.
 * character:    앞면에 그릴 캐릭터. 상대방 카드는 이 컴포넌트를 쓰지 않는다 (Card3D 사용).
 */
export default function HandCard({ restPosition, character, onPickChange }) {
  const meshRef = useRef();
  const [picked, setPicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const front = useCardTexture(character);
  const back = useCardTexture(null);

  // 재사용 임시 객체 (매 프레임 new 하지 않기 위해)
  const tmp = useRef({
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    fwd: new THREE.Vector3(),
    parentQuat: new THREE.Quaternion(),
    flip: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
    rest: new THREE.Vector3(...restPosition),
    restQuat: new THREE.Quaternion(),
  }).current;

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.parent) return;
    const k = 1 - Math.exp(-PICKUP.speed * dt); // 프레임 속도와 무관한 부드러운 보간

    if (picked) {
      // 목표: 카메라 앞 조금 아래. 세계 좌표로 구한 뒤 부모(자리 그룹) 좌표로 바꾼다.
      camera.getWorldDirection(tmp.fwd);
      tmp.pos.copy(camera.position).addScaledVector(tmp.fwd, PICKUP.distance);
      tmp.pos.y -= PICKUP.drop;
      mesh.parent.worldToLocal(tmp.pos);

      // 카드 윗면(+Y)이 카메라를 향하도록: 카메라 회전 × X축 90도
      tmp.quat.copy(camera.quaternion).multiply(tmp.flip);
      mesh.parent.getWorldQuaternion(tmp.parentQuat).invert();
      tmp.quat.premultiply(tmp.parentQuat);

      mesh.position.lerp(tmp.pos, k);
      mesh.quaternion.slerp(tmp.quat, k);
    } else {
      // 제자리로. 올려둔 상태(hover)면 살짝 떠 있게
      tmp.pos.copy(tmp.rest);
      if (hovered) tmp.pos.y += PICKUP.hoverLift;
      mesh.position.lerp(tmp.pos, k);
      mesh.quaternion.slerp(tmp.restQuat, k);
    }
  });

  const toggle = (e) => {
    e.stopPropagation();
    const next = !picked;
    setPicked(next);
    onPickChange?.(next);
  };

  // 들었을 때는 윗면이 앞그림, 놓여 있을 때는 윗면이 뒷그림
  const top = picked ? front : back;
  const bottom = picked ? back : front;
  const edge = PROPS.cardEdgeColor;

  return (
    <mesh
      ref={meshRef}
      position={restPosition}
      castShadow
      receiveShadow
      onClick={toggle}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <boxGeometry args={[PROPS.cardWidth, PROPS.cardThickness, PROPS.cardHeight]} />
      <meshStandardMaterial attach="material-0" color={edge} />
      <meshStandardMaterial attach="material-1" color={edge} />
      {/* 들었을 때는 그림 자체를 살짝 발광시켜 역광에서도 잘 보이게 */}
      <meshStandardMaterial key={`t-${picked}-${!!top}`} attach="material-2" map={top} color={top ? "#ffffff" : PROPS.cardBackColor} roughness={0.6} emissive="#ffffff" emissiveMap={top} emissiveIntensity={picked ? PICKUP.liftBrightness : 0} />
      <meshStandardMaterial key={`b-${picked}-${!!bottom}`} attach="material-3" map={bottom} color={bottom ? "#ffffff" : PROPS.cardBackColor} roughness={0.6} />
      <meshStandardMaterial attach="material-4" color={edge} />
      <meshStandardMaterial attach="material-5" color={edge} />
    </mesh>
  );
}
