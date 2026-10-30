// ─────────────────────────────────────────────────────────────
// 3D 테이블 설정. 숫자를 바꾸고 저장하면 화면이 바로 바뀝니다.
// 단위는 미터(m) 기준. 1 = 약 1m.
// ─────────────────────────────────────────────────────────────

export const TABLE = {
  radiusX: 1.6, // 테이블 가로 반지름
  radiusZ: 1.1, // 테이블 세로 반지름
  height: 0.75, // 바닥에서 상판까지
  thickness: 0.06, // 상판 두께
  color: "#2f5d3a", // 상판 색 (초록 펠트)
  rimColor: "#5a3b22", // 테두리/다리 색 (나무)
};

export const SEAT = {
  distance: 0.55, // 테이블 가장자리에서 의자까지 거리
  chairColor: "#3a3a44",
};

export const CAMERA = {
  eyeHeight: 1.25, // 앉았을 때 눈높이
  fov: 60,
  pitchMin: -0.7, // 아래로 내려다보는 한계 (라디안)
  pitchMax: 0.35, // 위로 올려다보는 한계
  yawLimit: 1.9, // 정면 기준 좌우로 돌릴 수 있는 한계 (라디안, 약 110도)
  dragSensitivity: 0.0045, // 마우스 드래그 감도
  keySpeed: 1.6, // 방향키 회전 속도 (라디안/초)
};

export const AVATAR = {
  bodyRadius: 0.22,
  bodyHeight: 0.55,
  headRadius: 0.16,
  eyeRadius: 0.022, // 눈동자 크기 (흰자는 이것의 약 2배)
  eyeColor: "#1a1a1a", // 눈동자
  eyeWhiteColor: "#f4f4f4", // 흰자
  headTurnSmoothing: 8, // 클수록 상대 고개가 빨리 따라옴
  nameOffset: 0.3, // 머리 위 이름표 높이
};

export const PROPS = {
  cardWidth: 0.13,
  cardHeight: 0.19,
  cardThickness: 0.004,
  cardBackColor: "#8b1e2d",
  cardGap: 0.03,
  cardDistanceFromEdge: 0.3, // 자기 자리 앞 카드가 테이블 가장자리에서 들어온 거리
  coinRadius: 0.035,
  coinThickness: 0.006,
  coinColor: "#e2b53d",
  deckColor: "#6b1420",
};

export const ROOM = {
  floorColor: "#1a1a20",
  wallColor: "#23232b",
  size: 10,
  lampColor: "#fff1d6",
  lampIntensity: 18,
  ambient: 0.35,
};

// 테이블 위 줄 조명 (크리스마스 전구 느낌)
export const STRING_LIGHTS = {
  enabled: true,
  strands: 4, // 줄 개수
  height: 2.3, // 줄 양 끝의 높이
  sag: 0.35, // 가운데가 처지는 정도
  spread: 2.6, // 줄이 걸쳐지는 반경 (테이블보다 조금 넓게)
  bulbsPerStrand: 14,
  bulbRadius: 0.028,
  wireColor: "#2a2420",
  colors: ["#ffb347", "#ff6b6b", "#ffe66d", "#7bd389", "#6ec6ff", "#ff9ff3"], // 전구 색 (순서대로 반복)
  warmOnly: false, // true면 전부 따뜻한 노란색으로
  glow: 2.2, // 전구 밝기
  twinkleSpeed: 1.2, // 깜빡임 속도 (0이면 깜빡임 없음)
  twinkleAmount: 0.45, // 깜빡임 세기 (0~1)
};

export const NETWORK = {
  lookSendInterval: 100, // 시선 전송 간격 (ms)
  lookKeepalive: 2000, // 움직임이 없어도 이 간격마다 한 번씩 전송 (ms)
};
