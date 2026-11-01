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
  dragSensitivity: 0.0045, // 터치 드래그 감도 (모바일)
  dragDeadzone: 6, // 이만큼(px) 움직이기 전까지는 탭으로 보고 시점을 돌리지 않음 (모바일)
  mouseSensitivity: 0.0022, // 마우스 잠금 상태에서의 회전 감도 (PC)
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

// 내 카드 집어 들기
export const PICKUP = {
  distance: 0.42, // 눈에서 카드까지 거리 (m). 작을수록 크게 보임
  drop: 0.1, // 시선보다 아래로 내리는 정도
  speed: 9, // 들어 올리고 내려놓는 속도. 클수록 빠름
  hoverLift: 0.015, // 마우스를 올렸을 때 살짝 뜨는 높이
  hoverEdgeColor: "#ffd166", // 조준점이 카드 위에 있을 때 테두리 색
  liftBrightness: 0.55, // 들어 올린 카드 밝기 보정 (0이면 보정 없음)
};

// 손과 팔
export const HAND = {
  sendInterval: 80, // 손 위치 전송 간격 (ms)
  keepalive: 2000,
  reach: 0.78, // 팔을 뻗을 수 있는 최대 거리 (어깨 기준)
  upperLength: 0.32, // 위팔 길이
  foreLength: 0.3, // 아래팔 길이
  armRadius: 0.045,
  handRadius: 0.045,
  shoulderOffset: [0.26, 0.42, 0], // 몸통 중심 기준 어깨 위치 (x는 좌우 대칭으로 씀), y는 의자 위 기준
  // 1인칭에서 내 어깨가 카메라 기준 어디에 있는지 (오른쪽, 아래, 뒤)
  myRightShoulder: [0.22, -0.34, 0.0],
  myLeftShoulder: [-0.22, -0.34, 0.0],
  // 왼손으로 카드를 들었을 때 카드 위치 (카메라 기준: 왼쪽, 아래, 앞)
  cardHoldOffset: [-0.14, -0.1, -0.52], // 왼손 카드 위치 (카메라 기준: 왼쪽, 아래, 앞). 셋째 값이 작을수록(음수 크게) 멀어짐
  cardFanSpread: 0.07, // 두 장 들었을 때 카드 사이 간격
  cardFanAngle: 0.14, // 두 장 들었을 때 카드가 벌어지는 각도 (라디안)
  handBelowCard: 0.21, // 손이 카드 아래쪽을 잡도록 내리는 거리 (카드를 가리지 않게)
  hoverHeight: 0.05, // 손이 테이블 위를 떠다니는 높이
  smoothing: 24, // 손이 목표를 따라가는 속도 (클수록 즉각적)
  swingDuration: 0.5, // 휘두르기 동작 시간 (초)
  swingOvershoot: 0.75, // 휘두를 때 목표보다 더 뻗는 거리
  swingDrop: 0.22, // 내지를 때 아래로 내리치는 정도
  swingWindupLift: 0.24, // 예비 동작에서 손을 들어 올리는 높이
};

// 동전: 은행 더미, 자리 더미, 이동 애니메이션
export const COINS = {
  bankPosition: [0.42, 0, 0.12], // 은행 더미 위치 (테이블 중앙 기준 x, z). 덱 옆
  bankTotal: 50, // 쿠 기본 은행 동전 수
  stackMax: 8, // 한 기둥에 쌓는 최대 개수 (넘치면 옆 기둥)
  stackGap: 0.085, // 기둥 사이 간격
  flightDuration: 0.7, // 동전이 날아가는 시간 (초)
  flightArc: 0.28, // 포물선 높이
  flightStagger: 0.09, // 여러 개 날아갈 때 간격 (초)
  handCoinOffset: [0, 0.03, 0], // 손에 쥔 동전의 손 기준 위치
};

// 능력 사용 연출 (머리 위 문장, 입자, 빛줄기, 방패, 도전)
export const EFFECTS = {
  emblemHeight: 0.95, // 문장 중심 높이 (의자 기준). 등 뒤 어깨 위쪽
  emblemSize: 1.05, // 문장 크기 (한 변). 등 뒤에 크게
  emblemDuration: 5.0, // 문장이 떠 있는 시간 (초)
  ringMaxRadius: 1.1, // 퍼지는 빛 고리 최대 반지름
  particleCount: 70, // 입자 수
  particleSize: 0.06, // 입자 크기
  particleRise: 0.9, // 입자가 올라가는 속도 (m/s)
  beamDuration: 0.5, // 대상에게 뻗는 빛줄기 시간
  beamRadius: 0.025,
  shieldDuration: 3.0, // 방패 유지 시간
  shieldRadius: 0.32,
  exclaimDuration: 0.9, // 도전 느낌표 시간
  verdictDuration: 2.5, // 확정/깨짐 연출 시간
  emblemBack: 0.55, // 아바타 등 뒤로 띄우는 거리 (테이블 반대쪽)
  glowScale: 2.1, // 문장 뒤 빛무리 크기 (문장 크기 대비)
  selfOffset: [0, 0.52, -1.0], // 내가 쓸 때 시야 안에 띄우는 위치 (카메라 기준). 정면 상대와 겹치지 않게 위쪽
  selfScale: 0.3, // 내 시야 연출의 크기 비율
  colors: {
    coin: "#e2b53d", // 수입/해외 원조
    coup: "#ff3b3b", // 쿠
    challenge: "#ff3b3b", // 도전 느낌표
    confirm: "#ffd166", // 주장이 진짜였을 때 (금빛)
    broken: "#8a8a99", // 주장이 거짓이었을 때
  },
};

// 얼굴 표정 연동 (선택 기능: 눈 깜빡임·눈 크기·눈썹·입)
export const FACE = {
  cameraWidth: 320, // 카메라 해상도 (낮을수록 가벼움)
  cameraHeight: 240,
  detectFps: 15, // 초당 인식 횟수 (낮을수록 가벼움)
  sendInterval: 80, // 표정 전송 간격 (ms)
  follow: 0.45, // 표정이 따라가는 속도 (0~1)
  blinkFollow: 0.85, // 깜빡임이 따라가는 속도 (빠르게)
  staleAfter: 1500, // 이 시간(ms) 동안 표정이 안 오면 자동 깜빡임으로 돌아감
  idleBlinkMin: 2.5, // 자동 깜빡임 간격 (초)
  idleBlinkMax: 5.5,
  mouthColor: "#3a1a1f",
  browColor: "#2a2422",
  exaggerate: 1.3, // 표정 과장 정도 (1이면 그대로)
};
