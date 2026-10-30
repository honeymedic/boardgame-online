import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { AVATAR, SEAT, HAND } from "./config.js";
import { Arm, swingPose } from "./Hands.jsx";

/**
 * 단순 기하 도형 아바타. 몸통(캡슐) + 머리(구) + 눈 2개.
 * props:
 *  seat      { position, yaw }  자리 위치와 몸통이 바라보는 방향
 *  avatar    { body, head }     색상 설정 (서버에서 검증된 값)
 *  lookRef   { current: { yaw, pitch } }  이 사람의 실제 시선(절대 각도). 없으면 정면.
 *  nickname, connected, highlight
 */
export default function Avatar({ seat, avatar, lookRef, handRef, nickname, connected = true, highlight = false, bubble = null }) {
  const headRef = useRef();
  const groupRef = useRef();

  // 팔 목표 (아바타 로컬 좌표). handRef.current = { pos: Vector3(세계) | null, hold, swing: {start, target: Vector3(세계)} | null }
  const rightShoulder = useMemo(() => new THREE.Vector3(HAND.shoulderOffset[0], SEAT_HEIGHT + HAND.shoulderOffset[1], HAND.shoulderOffset[2]), []);
  const leftShoulder = useMemo(() => new THREE.Vector3(-HAND.shoulderOffset[0], SEAT_HEIGHT + HAND.shoulderOffset[1], HAND.shoulderOffset[2]), []);
  const rightTarget = useMemo(() => new THREE.Vector3(0.28, SEAT_HEIGHT + 0.3, -0.35), []); // 기본: 테이블 위 휴식
  const leftTarget = useMemo(() => new THREE.Vector3(-0.28, SEAT_HEIGHT + 0.3, -0.35), []);
  const [holding, setHolding] = useState(false);
  const tmpV = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const g = groupRef.current;
    const h = handRef?.current;
    if (!g) return;
    // 오른손
    if (h?.swing && performance.now() - h.swing.start < HAND.swingDuration * 1000 && h.swing.target) {
      const p = (performance.now() - h.swing.start) / (HAND.swingDuration * 1000);
      tmpV.copy(h.swing.target);
      g.worldToLocal(tmpV);
      // 휘두르기 시작 시점의 손 위치를 기억해 두고, 거기서 당겼다가 내지르고 돌아온다
      if (!h.swing.fromLocal) h.swing.fromLocal = rightTarget.clone();
      swingPose(p, h.swing.fromLocal, tmpV, rightShoulder, rightTarget);
    } else if (h?.pos) {
      tmpV.copy(h.pos);
      g.worldToLocal(tmpV);
      rightTarget.copy(tmpV);
    } else {
      rightTarget.set(0.28, SEAT_HEIGHT + 0.3, -0.35);
    }
    // 왼손: 카드를 들었으면 얼굴 앞으로 올림
    const isHolding = h?.hold != null;
    if (isHolding !== holding) setHolding(isHolding);
    if (isHolding) leftTarget.set(-0.22, SEAT_HEIGHT + AVATAR.bodyHeight + 0.05, -0.3);
    else leftTarget.set(-0.28, SEAT_HEIGHT + 0.3, -0.35);
  });

  // 말풍선: 새 발언/이모지가 오면 잠시 보였다가 사라진다
  const [showBubble, setShowBubble] = useState(false);
  useEffect(() => {
    if (!bubble) return;
    setShowBubble(true);
    const isEmoji = bubble.text.length <= 2;
    const t = setTimeout(() => setShowBubble(false), isEmoji ? AVATAR.emoteDuration : AVATAR.bubbleDuration);
    return () => clearTimeout(t);
  }, [bubble?.ts]);

  useFrame((_, dt) => {
    if (!headRef.current) return;
    const target = lookRef?.current;
    // 머리 회전은 몸통 기준 상대값. 몸통은 seat.yaw 만큼 돌아 있으므로 빼준다.
    const wantYaw = target ? normalizeAngle(target.yaw - seat.yaw) : 0;
    const wantPitch = target ? target.pitch : 0;
    const k = 1 - Math.exp(-AVATAR.headTurnSmoothing * dt); // 부드럽게 따라가기
    headRef.current.rotation.y += normalizeAngle(wantYaw - headRef.current.rotation.y) * k;
    headRef.current.rotation.x += (wantPitch - headRef.current.rotation.x) * k;
  });

  const bodyY = SEAT_HEIGHT + AVATAR.bodyHeight / 2;
  const headY = SEAT_HEIGHT + AVATAR.bodyHeight + AVATAR.headRadius * 0.9;
  const opacity = connected ? 1 : 0.35;

  return (
    <group ref={groupRef} position={seat.position} rotation={[0, seat.yaw, 0]}>
      {/* 팔 */}
      <Arm shoulder={rightShoulder} target={rightTarget} bendHint={[0.5, -1, 0]} color={avatar.body} handColor={avatar.head} />
      <Arm shoulder={leftShoulder} target={leftTarget} bendHint={[-0.5, -1, 0]} color={avatar.body} handColor={avatar.head} holdingCard={holding} />
      {/* 의자 */}
      <mesh position={[0, SEAT_HEIGHT / 2, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.45, SEAT_HEIGHT, 0.45]} />
        <meshStandardMaterial color={SEAT.chairColor} />
      </mesh>
      <mesh position={[0, SEAT_HEIGHT + 0.3, 0.26]} castShadow>
        <boxGeometry args={[0.45, 0.6, 0.05]} />
        <meshStandardMaterial color={SEAT.chairColor} />
      </mesh>

      {/* 몸통 */}
      <mesh position={[0, bodyY, 0]} castShadow>
        <capsuleGeometry args={[AVATAR.bodyRadius, AVATAR.bodyHeight - AVATAR.bodyRadius * 2, 6, 16]} />
        <meshStandardMaterial color={avatar.body} transparent opacity={opacity} />
      </mesh>

      {/* 머리: 이 그룹이 시선 방향으로 회전한다 */}
      <group ref={headRef} position={[0, headY, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[AVATAR.headRadius, 24, 16]} />
          <meshStandardMaterial color={avatar.head} transparent opacity={opacity} />
        </mesh>
        {/* 눈: 얼굴 앞면(-Z). 흰자 위에 눈동자를 올려서 얼굴색이 어두워도 보이게 한다 */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * AVATAR.headRadius * 0.38, AVATAR.headRadius * 0.15, -AVATAR.headRadius * 0.86]}>
            <mesh>
              <sphereGeometry args={[AVATAR.eyeRadius * 1.9, 14, 10]} />
              <meshStandardMaterial color={AVATAR.eyeWhiteColor} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, -AVATAR.eyeRadius * 1.3]}>
              <sphereGeometry args={[AVATAR.eyeRadius, 12, 8]} />
              <meshStandardMaterial color={AVATAR.eyeColor} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 말풍선 (채팅 / 이모지) */}
      {showBubble && bubble && (
        <Html position={[0, headY + AVATAR.headRadius + AVATAR.nameOffset + 0.18, 0]} distanceFactor={AVATAR.labelScale} occlude={false}>
          {/* 아래쪽 가운데를 기준점으로 잡아서 글이 길어지면 위로만 자란다 (이름표와 안 겹침) */}
          <div className="speech-anchor">
            <div className={`speech ${bubble.text.length <= 2 ? "emote" : ""}`}>{bubble.text}</div>
          </div>
        </Html>
      )}

      {/* 이름표 */}
      <Html position={[0, headY + AVATAR.headRadius + AVATAR.nameOffset, 0]} center distanceFactor={AVATAR.labelScale} occlude={false}>
        <div className={`nameplate ${highlight ? "highlight" : ""} ${connected ? "" : "offline"}`}>{nickname}</div>
      </Html>
    </group>
  );
}

const SEAT_HEIGHT = 0.45;

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
