import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PROPS, PICKUP, HAND } from "./config.js";
import { useCardTexture } from "./textures.js";
import { crosshair, interactables } from "./input.js";

/**
 * 내 손패 카드 한 장. 테이블에 뒷면으로 놓여 있다가, 조준점을 맞추고 클릭하면 왼손 위치로 들어 올려 앞면을 보여주고,
 * 다시 클릭하면 제자리에 뒷면으로 내려놓는다. 들고 있는 동안 고개를 돌리면 카드가 시야를 따라온다.
 *
 * restPosition: 부모(자리 그룹) 기준 놓인 위치
 * character:    앞면에 그릴 캐릭터
 * index:        손패 번호 (0, 1). 들었을 때 onPickChange(index), 놓으면 onPickChange(null)
 * held:         외부(부모)가 아는 현재 든 카드 번호. 한 번에 한 장만 들 수 있게 한다.
 */
export default function HandCard({ restPosition, character, index, held, onPickChange }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();
  const picked = held === index;
  const otherHeld = held != null && held !== index;

  const front = useCardTexture(character);
  const back = useCardTexture(null);

  const tmp = useRef({
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    parentQuat: new THREE.Quaternion(),
    flip: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
    rest: new THREE.Vector3(...restPosition),
    restQuat: new THREE.Quaternion(),
  }).current;

  // 조준점으로 집을 수 있는 물체로 등록
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.userData.onInteract = () => {
      if (otherHeld) return; // 다른 카드를 들고 있으면 먼저 내려놓아야 함
      onPickChange?.(picked ? null : index);
    };
    interactables.add(mesh);
    return () => {
      interactables.delete(mesh);
    };
  }, [picked, otherHeld, index, onPickChange]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.parent) return;
    const k = 1 - Math.exp(-PICKUP.speed * dt);

    // 조준점이 이 카드 위에 있는지
    const isHover = crosshair.object === mesh && !picked && !otherHeld;
    if (isHover !== hovered) setHovered(isHover);

    if (picked) {
      // 목표: 왼손 위치 (카메라 기준). 세계 좌표로 구한 뒤 부모 좌표로
      tmp.pos.set(...HAND.cardHoldOffset).applyQuaternion(camera.quaternion).add(camera.position);
      mesh.parent.worldToLocal(tmp.pos);
      // 카드 윗면(+Y)이 카메라를 향하도록: 카메라 회전 × X축 90도
      tmp.quat.copy(camera.quaternion).multiply(tmp.flip);
      mesh.parent.getWorldQuaternion(tmp.parentQuat).invert();
      tmp.quat.premultiply(tmp.parentQuat);
      mesh.position.lerp(tmp.pos, k);
      mesh.quaternion.slerp(tmp.quat, k);
    } else {
      tmp.pos.copy(tmp.rest);
      if (isHover) tmp.pos.y += PICKUP.hoverLift;
      mesh.position.lerp(tmp.pos, k);
      mesh.quaternion.slerp(tmp.restQuat, k);
    }
  });

  const top = picked ? front : back;
  const bottom = picked ? back : front;
  const edge = hovered ? PICKUP.hoverEdgeColor : PROPS.cardEdgeColor;

  return (
    <mesh ref={meshRef} position={restPosition} castShadow receiveShadow>
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
