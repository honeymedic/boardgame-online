import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HAND, TABLE } from "./config.js";
import { pointer, crosshair, interactables, aimNdc } from "./input.js";
import { Card3D, Coin3D } from "./Props3D.jsx";
const _coinOff = new THREE.Vector3(0, 0.03, 0); // 손 위 동전 위치

const UP = new THREE.Vector3(0, 1, 0);

/**
 * 휘두르기 궤적. p(0~1)에 따라 out에 손 위치를 써 준다.
 *  0~0.3   : 어깨 쪽으로 당기며 들어 올림 (예비 동작)
 *  0.3~0.6 : 목표를 지나칠 만큼 세게 내지름
 *  0.6~1   : 원래 자리로 복귀
 */
export function swingPose(p, from, to, shoulder, out) {
  const windup = _w.copy(shoulder).addScaledVector(_d.subVectors(from, shoulder), 0.45);
  windup.y += HAND.swingWindupLift;
  if (p < 0.3) {
    const t = easeOut(p / 0.3);
    return out.lerpVectors(from, windup, t);
  }
  if (p < 0.6) {
    const t = easeOut((p - 0.3) / 0.3);
    return out.lerpVectors(windup, to, t);
  }
  const t = easeInOut((p - 0.6) / 0.4);
  return out.lerpVectors(to, from, t);
}
const _w = new THREE.Vector3();
const _d = new THREE.Vector3();
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** 두 점(Vector3, 매 프레임 바뀜) 사이를 잇는 원기둥 뼈대. */
function Bone({ a, b, radius, color }) {
  const ref = useRef();
  const tmp = useMemo(() => ({ mid: new THREE.Vector3(), dir: new THREE.Vector3(), q: new THREE.Quaternion() }), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    tmp.dir.subVectors(b, a);
    const len = tmp.dir.length() || 0.0001;
    tmp.mid.addVectors(a, b).multiplyScalar(0.5);
    m.position.copy(tmp.mid);
    m.quaternion.copy(tmp.q.setFromUnitVectors(UP, tmp.dir.normalize()));
    m.scale.set(1, len, 1);
  });
  return (
    <mesh ref={ref} castShadow>
      <cylinderGeometry args={[radius, radius * 0.85, 1, 10]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/**
 * 어깨 → 팔꿈치 → 손, 두 마디 팔. shoulder/target 모두 "이 컴포넌트가 놓인 좌표계" 기준의 Vector3이며 매 프레임 바뀌어도 된다.
 *  bendHint: 팔꿈치가 꺾이는 방향 힌트 (보통 아래+바깥)
 *  holdingCard: 손에 카드(뒷면이 바깥을 향함)를 쥔 모습
 */
export function Arm({ shoulder, target, bendHint, color, handColor, holdingCard = false, cardCount = 1, coinCount = 0, instant = false, showShoulder = true }) {
  const elbow = useMemo(() => new THREE.Vector3(), []);
  const hand = useMemo(() => new THREE.Vector3().copy(target), []);
  const hint = useMemo(() => new THREE.Vector3(...bendHint), [bendHint]);
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), perp: new THREE.Vector3() }), []);
  const handRef = useRef();
  const shoulderRef = useRef();
  const cardRef = useRef();
  const coinRef = useRef();

  useFrame((_, dt) => {
    const k = instant ? 1 : 1 - Math.exp(-HAND.smoothing * dt);
    // 손은 목표를 부드럽게 따라간다. 팔 길이보다 멀면 최대 길이에서 멈춘다.
    tmp.dir.subVectors(target, shoulder);
    const maxLen = HAND.upperLength + HAND.foreLength - 0.01;
    if (tmp.dir.length() > maxLen) tmp.dir.setLength(maxLen);
    hand.lerp(tmp.dir.add(shoulder), k);

    // 두 마디 IK: 어깨-손 거리 d, 위팔 L1, 아래팔 L2 로 팔꿈치를 구한다
    tmp.dir.subVectors(hand, shoulder);
    const d = Math.max(0.05, tmp.dir.length());
    tmp.dir.normalize();
    const L1 = HAND.upperLength;
    const L2 = HAND.foreLength;
    const a = clamp((L1 * L1 - L2 * L2 + d * d) / (2 * d), -L1, L1);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    tmp.perp.copy(hint).addScaledVector(tmp.dir, -hint.dot(tmp.dir));
    if (tmp.perp.lengthSq() < 1e-6) tmp.perp.set(0, -1, 0);
    tmp.perp.normalize();
    elbow.copy(shoulder).addScaledVector(tmp.dir, a).addScaledVector(tmp.perp, h);

    if (handRef.current) handRef.current.position.copy(hand);
    if (shoulderRef.current) shoulderRef.current.position.copy(shoulder);
    if (coinRef.current) coinRef.current.position.copy(hand).add(_coinOff);
    if (cardRef.current) {
      // 카드는 손 바로 앞에 세워서, 뒷면이 손이 뻗은 방향(바깥)을 보게
      cardRef.current.position.copy(hand).addScaledVector(tmp.dir, HAND.handBelowCard * 0.9);
      cardRef.current.quaternion.setFromUnitVectors(UP, tmp.dir);
    }
  });

  return (
    <group>
      <Bone a={shoulder} b={elbow} radius={HAND.armRadius} color={color} />
      <Bone a={elbow} b={hand} radius={HAND.armRadius * 0.9} color={color} />
      <mesh ref={shoulderRef} castShadow visible={showShoulder}>
        <sphereGeometry args={[HAND.armRadius * 1.15, 12, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={handRef} castShadow>
        <sphereGeometry args={[HAND.handRadius, 14, 10]} />
        <meshStandardMaterial color={handColor} />
      </mesh>
      {coinCount > 0 && (
        <group ref={coinRef}>
          {Array.from({ length: Math.min(coinCount, 12) }).map((_, i) => (
            <Coin3D key={i} position={[0, i * 0.0065, 0]} rotation={[0, i * 0.5, 0]} />
          ))}
        </group>
      )}
      {holdingCard && (
        <group ref={cardRef}>
          {Array.from({ length: Math.max(1, cardCount) }).map((_, i) => {
            const side = cardCount === 1 ? 0 : i === 0 ? -1 : 1;
            return (
              <group key={i} position={[side * HAND.cardFanSpread, 0, i * 0.004]} rotation={[0, 0, -side * HAND.cardFanAngle]}>
                <Card3D position={[0, 0, 0]} />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

/**
 * 내 손 (1인칭).
 *  - 조준점(마우스 잠금: 화면 중앙 / 터치: 탭 지점)에서 광선을 쏴서 집을 수 있는 물체나 테이블 위 지점을 찾는다 → 오른손 목표
 *  - 좌클릭: 조준점 아래 물체가 있으면 그 물체의 onInteract, 없으면 휘두르기
 *  - 왼손: 카드를 들었으면(holdIndex) 카드 위치로
 *  - 손 위치와 동작을 서버로 보낸다
 */
export function MyHands({ holdCount = 0, coinHeld = 0, onPutDown, onSendHand, onSendGesture, avatar }) {
  const holdIndex = holdCount > 0 ? holdCount : null; // 서버에는 든 장수를 보낸다 (없으면 null)
  const { camera, gl } = useThree();
  const rightShoulder = useMemo(() => new THREE.Vector3(), []);
  const leftShoulder = useMemo(() => new THREE.Vector3(), []);
  const rightTarget = useMemo(() => new THREE.Vector3(0, TABLE.height, -0.6), []);
  const leftTarget = useMemo(() => new THREE.Vector3(), []);
  const aim = useMemo(() => new THREE.Vector3(0, TABLE.height, -0.6), []);
  const swing = useRef(null); // { start, from, to }
  const lastSent = useRef({ t: 0, x: NaN, y: NaN, z: NaN, hold: undefined });
  const tmp = useMemo(
    () => ({
      ray: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TABLE.height + TABLE.thickness / 2 + HAND.hoverHeight)),
      hit: new THREE.Vector3(),
      v: new THREE.Vector3(),
    }),
    []
  );

  // 좌클릭(또는 터치 탭): 물체 집기 또는 휘두르기
  useEffect(() => {
    const el = gl.domElement;
    const onClick = (e) => {
      if (e.button !== 0) return;
      // 1) 조준점에 집을 수 있는 물체가 있으면 집기 (두 번째 카드도 이렇게 집는다)
      if (crosshair.object?.userData?.onInteract) {
        crosshair.object.userData.onInteract();
        return;
      }
      // 2) 카드나 동전을 들고 있으면 어디를 클릭하든 전부 내려놓는다 (든 카드는 조준점 밖에 있어서 다시 맞추기 어렵다)
      if (holdIndex != null || coinHeld > 0) {
        onPutDown?.();
        return;
      }
      const from = rightTarget.clone();
      const to = aim.clone();
      tmp.v.subVectors(to, rightShoulder).normalize();
      to.addScaledVector(tmp.v, HAND.swingOvershoot);
      to.y -= HAND.swingDrop;
      swing.current = { start: performance.now(), from, to };
      onSendGesture?.({ type: "swing", target: [to.x, to.y, to.z] });
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [gl, holdIndex, coinHeld, onPutDown]);

  useFrame(() => {
    // 어깨: 카메라 기준 고정 오프셋 → 세계 좌표
    rightShoulder.set(...HAND.myRightShoulder).applyQuaternion(camera.quaternion).add(camera.position);
    leftShoulder.set(...HAND.myLeftShoulder).applyQuaternion(camera.quaternion).add(camera.position);

    // 조준점 광선
    tmp.ray.setFromCamera(aimNdc(tmp.ndc), camera);

    // 1) 집을 수 있는 물체
    crosshair.object = null;
    if (interactables.size > 0) {
      const hits = tmp.ray.intersectObjects([...interactables], false);
      if (hits.length > 0) {
        crosshair.object = hits[0].object;
        aim.copy(hits[0].point);
      }
    }
    // 2) 없으면 테이블 높이 평면
    if (!crosshair.object) {
      if (tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit)) aim.copy(tmp.hit);
      else tmp.ray.ray.at(HAND.reach * 0.9, aim); // 하늘이면 시선 방향으로 팔 길이만큼
    }
    // 팔이 닿는 범위 안으로
    tmp.v.subVectors(aim, rightShoulder);
    if (tmp.v.length() > HAND.reach) aim.copy(rightShoulder).addScaledVector(tmp.v.normalize(), HAND.reach);

    // 휘두르기 궤적 또는 조준점
    const sw = swing.current;
    if (sw) {
      const p = (performance.now() - sw.start) / (HAND.swingDuration * 1000);
      if (p >= 1) swing.current = null;
      else swingPose(p, sw.from, sw.to, rightShoulder, rightTarget);
    }
    if (!swing.current) rightTarget.copy(aim);

    // 왼손: 카드를 들었으면 카드 아래쪽을 잡는다 (카드를 가리지 않게 손은 카드보다 아래)
    if (holdIndex != null) {
      leftTarget.set(HAND.cardHoldOffset[0], HAND.cardHoldOffset[1] - HAND.handBelowCard, HAND.cardHoldOffset[2] + 0.08);
      leftTarget.applyQuaternion(camera.quaternion).add(camera.position);
    }

    // 전송
    const now = performance.now();
    const l = lastSent.current;
    const moved = !Number.isFinite(l.x) || Math.abs(l.x - rightTarget.x) + Math.abs(l.y - rightTarget.y) + Math.abs(l.z - rightTarget.z) > 0.004;
    if (((moved || l.hold !== holdIndex || l.coin !== coinHeld) && now - l.t >= HAND.sendInterval) || now - l.t >= HAND.keepalive) {
      l.t = now;
      l.x = rightTarget.x;
      l.y = rightTarget.y;
      l.z = rightTarget.z;
      l.hold = holdIndex;
      l.coin = coinHeld;
      onSendHand?.({ x: rightTarget.x, y: rightTarget.y, z: rightTarget.z, hold: holdIndex ?? null, coin: coinHeld });
    }
  });

  const skin = avatar?.head ?? "#f2d3b3";
  const sleeve = avatar?.body ?? "#5b8def";
  return (
    <group>
      <Arm shoulder={rightShoulder} target={rightTarget} bendHint={[0.4, -1, 0]} color={sleeve} handColor={skin} showShoulder={false} coinCount={coinHeld} />
      {holdIndex != null && <Arm shoulder={leftShoulder} target={leftTarget} bendHint={[-0.4, -1, 0]} color={sleeve} handColor={skin} showShoulder={false} />}
    </group>
  );
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
