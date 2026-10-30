import { TABLE, SEAT, CAMERA } from "./config.js";

/**
 * N명을 타원 테이블 둘레에 고르게 배치한다.
 * 반환: 자리마다 { position: [x, 0, z], yaw } — yaw는 테이블 중앙을 바라보는 각도.
 * yaw 규칙: Three.js 카메라와 동일. yaw=0이면 -Z 방향을 봄.
 */
export function computeSeats(count) {
  const seats = [];
  for (let i = 0; i < count; i++) {
    // 첫 자리가 화면 아래(+Z)에서 시작하도록 90도 오프셋
    const angle = (i / count) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * (TABLE.radiusX + SEAT.distance);
    const z = Math.sin(angle) * (TABLE.radiusZ + SEAT.distance);
    seats.push({ position: [x, 0, z], yaw: yawToward([x, 0, z], [0, 0, 0]) });
  }
  return seats;
}

/** from에서 to를 바라보는 yaw (Three.js 카메라 기준). */
export function yawToward(from, to) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  return Math.atan2(-dx, -dz);
}

/** 그 자리에 앉은 사람 눈 위치. */
export function eyePosition(seat) {
  return [seat.position[0], CAMERA.eyeHeight, seat.position[2]];
}

/** 자리 앞 테이블 위 지점 (카드/동전 놓는 자리). t=0 가장자리, t=1 중앙. */
export function tableSpotFor(seat, inset) {
  const [x, , z] = seat.position;
  const len = Math.hypot(x / TABLE.radiusX, z / TABLE.radiusZ) || 1;
  // 테이블 가장자리 좌표
  const ex = x / len;
  const ez = z / len;
  // 가장자리에서 중앙 쪽으로 inset 만큼
  const d = Math.hypot(ex, ez) || 1;
  return [ex - (ex / d) * inset, TABLE.height + TABLE.thickness / 2, ez - (ez / d) * inset];
}
