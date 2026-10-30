import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CAMERA, NETWORK } from "./config.js";
import { pointer } from "./input.js";

/**
 * 1인칭 고개 돌리기. 카메라는 eye 위치에 고정, yaw(좌우)/pitch(상하)만 바뀐다.
 *
 *  PC(마우스): 캔버스를 클릭하면 마우스가 잠기고, 움직이는 만큼 고개가 돌아간다 (마인크래프트식). Esc로 풀기.
 *  터치:       한 손가락 드래그.
 *  공통:       방향키.
 *
 * 각도가 바뀌면 onLook({yaw, pitch})를 일정 간격으로 호출한다 (서버 전송용).
 */
export default function FirstPersonLook({ eye, baseYaw, onLook }) {
  const { camera, gl } = useThree();
  const state = useRef({ yaw: baseYaw, pitch: -0.15, dragging: false, moved: 0, lastX: 0, lastY: 0, keys: new Set() });
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

    // 마우스: 클릭하면 잠금 요청. 잠긴 동안은 movementX/Y로 회전
    const requestLock = (e) => {
      if (e.pointerType === "touch") return;
      if (document.pointerLockElement !== el) {
        // 일부 환경(내장 브라우저 등)은 잠금을 거부한다. 그래도 클릭 동작은 되므로 조용히 넘긴다
        try {
          const p = el.requestPointerLock?.();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } catch {
          /* ignore */
        }
      }
    };
    const mouseMove = (e) => {
      if (document.pointerLockElement !== el) return;
      s.yaw -= e.movementX * CAMERA.mouseSensitivity;
      s.pitch -= e.movementY * CAMERA.mouseSensitivity;
    };

    // 터치: 드래그
    const down = (e) => {
      if (e.pointerType !== "touch") return;
      s.dragging = true;
      s.moved = 0;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
    };
    const move = (e) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.moved += Math.abs(dx) + Math.abs(dy);
      if (s.moved < CAMERA.dragDeadzone) return; // 탭을 드래그로 오인하지 않기
      s.yaw -= dx * CAMERA.dragSensitivity;
      s.pitch -= dy * CAMERA.dragSensitivity;
    };
    const up = () => (s.dragging = false);
    const keyDown = (e) => s.keys.add(e.key);
    const keyUp = (e) => s.keys.delete(e.key);

    el.addEventListener("pointerdown", requestLock);
    el.addEventListener("pointerdown", down);
    document.addEventListener("mousemove", mouseMove);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      el.removeEventListener("pointerdown", requestLock);
      el.removeEventListener("pointerdown", down);
      document.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
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
    const changed = !Number.isFinite(l.yaw) || Math.abs(l.yaw - s.yaw) > 0.002 || Math.abs(l.pitch - s.pitch) > 0.002;
    const keepalive = now - l.t >= NETWORK.lookKeepalive;
    if ((changed && now - l.t >= NETWORK.lookSendInterval) || keepalive) {
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
