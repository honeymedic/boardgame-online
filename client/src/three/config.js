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
  pitchMax: 0.4, // 위로 올려다보는 한계
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
  eyeWhiteColor: "#d9d9d9", // 흰자 (너무 밝으면 블룸 때문에 눈이 빛나 보임)
  headTurnSmoothing: 8, // 클수록 상대 고개가 빨리 따라옴
  nameOffset: 0.3, // 머리 위 이름표 높이
  labelScale: 3, // 이름표/말풍선 크기 (3D 거리 기준 배율). 6이면 지금의 두 배
  bubbleDuration: 5000, // 채팅 말풍선이 머리 위에 떠 있는 시간 (ms)
  emoteDuration: 3000, // 이모지가 떠 있는 시간 (ms)
};

export const PROPS = {
  cardWidth: 0.13,
  cardHeight: 0.19,
  cardThickness: 0.004,
  cardBackColor: "#8b1e2d", // 텍스처 로딩 전 임시 색
  cardEdgeColor: "#e8e2d4", // 카드 옆면(종이 단면)
  cardGap: 0.03,
  cardDistanceFromEdge: 0.3, // 자기 자리 앞 카드가 테이블 가장자리에서 들어온 거리
  coinRadius: 0.035,
  coinThickness: 0.006,
  coinColor: "#e2b53d",
  deckColor: "#6b1420",
};

export const ROOM = {
  floorColor: "#1a1a20",
  wallColor: "#0e0e12", // 조명 영향 없이 이 색 그대로. 천장과 같은 값으로 두면 이어짐
  size: 10,
  ceilingColor: "#0e0e12", // 천장 색. wallColor와 같게
  ceilingHeight: 3.2,
  lampColor: "#fff1d6", // 테이블을 비추는 보이지 않는 조명의 색
  lampIntensity: 18,
  ambient: 0.35,
};

// 테이블 위 줄 조명 (크리스마스 전구 느낌)
export const STRING_LIGHTS = {
  enabled: true,
  strands: 4, // 줄 개수
  height: 2.3, // 줄 양 끝의 높이
  sag: 0.35, // 가운데가 처지는 정도
  spread: 3.6, // 줄이 걸쳐지는 반경 (테이블보다 조금 넓게)
  bulbsPerStrand: 14,
  bulbRadius: 0.012, // 전구 크기
  wireColor: "#2a2420",
  colors: ["#ff2bd6", "#00f0ff", "#39ff14", "#ffe600", "#ff3131", "#8a2bff"], // 전구 색 (네온: 분홍, 시안, 라임, 노랑, 빨강, 보라)
  warmOnly: true, // true면 전부 따뜻한 금빛 전구 (사진 느낌). false면 colors 배열의 네온 색
  warmColor: "#ffb85c", // 따뜻한 전구 색 (더 하얗게: #ffe3b0, 더 주황: #ffa23a)
  warmVariation: 0.35, // 전구마다 밝기 편차 (0~1). 사진처럼 어떤 건 더 밝고 어떤 건 은은하게
  haloSize: 0.16, // 전구 주변 빛무리 크기 (0이면 거의 안 보임)
  haloOpacity: 0.6, // 빛무리 진하기 (0~1)
  glow: 1.8, // 전구 밝기. 1 이상이면 중심이 하얗게 타면서 주변에 번짐이 생김 (사진의 전구 느낌)
  twinkleSpeed: 2.0, // 깜빡임 속도 (0이면 깜빡임 없음)
  twinkleAmount: 0.75, // 깜빡임 세기 (0~1). 1이면 완전히 꺼졌다 켜짐
  twinkleSharpness: 4, // 깜빡임 모양. 1이면 부드러운 물결, 클수록 "반짝!" 하고 잦아드는 트리 전구 느낌
  // 빛 번짐 (네온 느낌의 핵심). 전구처럼 밝은 것만 번진다.
  bloom: true,
  bloomIntensity: 2.0, // 번짐 세기
  bloomThreshold: 1.0, // 이 밝기 이상인 것만 번짐. 1.0이면 일반 물체(카드, 동전, 테이블)는 절대 안 번지고 전구(glow>1)만 번짐
  bloomRadius: 0.95, // 번짐 반경 (클수록 부드럽고 넓게 퍼짐)
};

export const NETWORK = {
  lookSendInterval: 100, // 시선 전송 간격 (ms)
  lookKeepalive: 2000, // 움직임이 없어도 이 간격마다 한 번씩 전송 (ms)
};
