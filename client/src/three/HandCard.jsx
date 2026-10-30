import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PROPS, PICKUP, HAND } from "./config.js";
import { useCardTexture } from "./textures.js";
import { crosshair, interactables } from "./input.js";

/**
 * 내 손패 카드 한 장. 테이블에 뒷면으로 놓여 있다가, 조준점을 맞추고 클릭하면 왼손 위치로 들어 올려 앞면을 보여준다.
 * 두 장까지 들 수 있고(부채꼴로 벌어짐), 들고 있는 동안 아무 데나 클릭하면 전부 내려놓는다 (MyHands가 처리).
 *
 * restPosition: 부모(자리 그룹) 기준 놓인 위치
 * character:    앞면에 그릴 캐릭터
 * index:        손패 번호 (0, 1)
 * held:         현재 든 카드 번호 배열 (든 순서대로). 이 카드가 들어 있으면 picked
 * onPick(index): 이 카드를 집으라는 요청
 */
export default function HandCard({ restPosition, character, index, held = [], onPick }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();
  const slot = held.indexOf(index); // 몇 번째로 들었는지 (-1이면 안 들었음)
  const picked = slot >= 0;
  const full = held.length >= 2;

  const front = useCardTexture(character);
  const back = useCardTexture(null);

  const tmp = useRef({
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    parentQuat: new THREE.Quaternion(),
    flip: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
    fan: new THREE.Quaternion(),
    rest: new THREE.Vector3(...restPosition),
    restQuat: new THREE.Quaternion(),
  }).current;

  // 조준점으로 집을 수 있는 물체로 등록 (들고 있지 않을 때만)
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (picked || full) {
      interactables.delete(mesh);
      return;
    }
    mesh.userData.onInteract = () => onPick?.(index);
    interactables.add(mesh);
    return () => {
      interactables.delete(mesh);
    };
  }, [picked, full, index, onPick]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.parent) return;
    const k = 1 - Math.exp(-PICKUP.speed * dt);

    const isHover = crosshair.object === mesh && !picked && !full;
    if (isHover !== hovered) setHovered(isHover);

    if (picked) {
      // 두 장이면 좌우로 벌려 부채꼴. 한 장이면 가운데
      const n = held.length;
      const side = n === 1 ? 0 : slot === 0 ? -1 : 1;
      tmp.pos.set(
        HAND.cardHoldOffset[0] + side * HAND.cardFanSpread,
        HAND.cardHoldOffset[1] - Math.abs(side) * 0.01,
        HAND.cardHoldOffset[2] + slot * 0.004 // 살짝 겹치게
      );
      tmp.pos.applyQuaternion(camera.quaternion).add(camera.position);
      mesh.parent.worldToLocal(tmp.pos);

      // 카드 윗면(+Y)이 카메라를 향하도록: 카메라 회전 × X축 90도, 거기에 부채꼴 기울기
      tmp.fan.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -side * HAND.cardFanAngle);
      tmp.quat.copy(camera.quaternion).multiply(tmp.fan).multiply(tmp.flip);
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

  // 들었을 때는 양면 모두 앞그림: 내 화면의 이 카드는 나만 보고, 상대는 자기 화면에서 뒷면을 따로 그린다.
  // 그래서 어떤 각도로 뒤집히든 뒷면이 보이는 일이 없다.
  const top = picked ? front : back;
  const bottom = picked ? front : front;
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
