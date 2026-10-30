import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CAMERA, NETWORK } from "./config.js";

/**
 * 1인칭 고개 돌리기.
 * 카메라를 eye 위치에 고정하고, 마우스 드래그 / 방향키로 yaw(좌우), pitch(상하)만 바꾼다.
 * 각도가 바뀌면 onLook({yaw, pitch})를 일정 간격으로 호출한다 (서버 전송용).
 */
export default function FirstPersonLook({ eye, baseYaw, onLook }) {
  const { camera, gl } = useThree();
  const state = useRef({ yaw: baseYaw, pitch: -0.15, dragging: false, lastX: 0, lastY: 0, keys: new Set() });
  const lastSent = useRef({ t: 0, yaw: NaN, pitch: NaN });

  useEffect(() => {
    camera.position.set(...eye);
    camera.rotation.order = "YXZ";
    camera.fov = CAMERA.fov;
    camera.updateProjectionMatrix();
    state.current.yaw = baseYaw;
  }, [camera, eye, baseYaw]);

  useEffect(() => {
    const el = gl.domElement;
    const s = state.current;
    const down = (e) => {
      s.dragging = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!s.dragging) return;
      s.yaw -= (e.clientX - s.lastX) * CAMERA.dragSensitivity;
      s.pitch -= (e.clientY - s.lastY) * CAMERA.dragSensitivity;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
    };
    const up = () => (s.dragging = false);
    const keyDown = (e) => s.keys.add(e.key);
    const keyUp = (e) => s.keys.delete(e.key);

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    el.style.cursor = "grab";
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const s = state.current;
    if (s.keys.has("ArrowLeft")) s.yaw += CAMERA.keySpeed * dt;
    if (s.keys.has("ArrowRight")) s.yaw -= CAMERA.keySpeed * dt;
    if (s.keys.has("ArrowUp")) s.pitch += CAMERA.keySpeed * dt * 0.6;
    if (s.keys.has("ArrowDown")) s.pitch -= CAMERA.keySpeed * dt * 0.6;

    // 정면(baseYaw) 기준으로 좌우 한계, 상하 한계
    const rel = clamp(normalizeAngle(s.yaw - baseYaw), -CAMERA.yawLimit, CAMERA.yawLimit);
    s.yaw = baseYaw + rel;
    s.pitch = clamp(s.pitch, CAMERA.pitchMin, CAMERA.pitchMax);

    camera.rotation.set(s.pitch, s.yaw, 0);

    const now = performance.now();
    const l = lastSent.current;
    if (now - l.t >= NETWORK.lookSendInterval && (Math.abs(l.yaw - s.yaw) > 0.002 || Math.abs(l.pitch - s.pitch) > 0.002)) {
      l.t = now;
      l.yaw = s.yaw;
      l.pitch = s.pitch;
      onLook?.({ yaw: s.yaw, pitch: s.pitch });
    }
  });

  return null;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
