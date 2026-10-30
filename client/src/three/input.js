// 3D 화면 공용 입력 상태. 렌더 루프(useFrame)에서 매 프레임 읽기 때문에 React 상태가 아니라 평범한 객체로 둔다.
//
// 조작 방식 (마인크래프트식):
//  PC:   캔버스를 클릭하면 마우스가 잠기고(pointer lock), 마우스를 움직이면 고개가 돌아간다.
//        화면 중앙 조준점이 가리키는 곳에 오른손이 간다. 좌클릭 = 조준점 아래 물체 집기 / 없으면 휘두르기. Esc = 마우스 풀기.
//  터치: 한 손가락 드래그로 고개, 탭한 지점이 조준점.

export const pointer = {
  x: 0, // 터치용: 마지막 탭/터치 지점 (정규화 -1~1)
  y: 0,
  type: "mouse",
  locked: false, // pointer lock 상태
  touchAimAt: 0, // 마지막 탭 시각 (터치에서 탭한 지점으로 손을 보낼 때)
};

/** 조준점이 가리키는 것. MyHands가 매 프레임 갱신한다. */
export const crosshair = {
  object: null, // 조준점 아래 상호작용 가능한 물체 (없으면 null)
  hasPoint: false,
};

/** 조준점으로 집을 수 있는 물체 목록. 물체는 userData.onInteract(점) 를 가진다. */
export const interactables = new Set();

/** 조준점 정규화 좌표: 마우스(잠김)는 항상 중앙, 터치는 마지막 탭 지점 */
export function aimNdc(out) {
  if (pointer.type === "touch") out.set(pointer.x, pointer.y);
  else out.set(0, 0);
  return out;
}

/** 캔버스에 입력 리스너를 붙인다. 반환값은 정리 함수. */
export function installPointer(el) {
  const update = (e) => {
    const r = el.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    pointer.type = e.pointerType || "mouse";
  };
  const down = (e) => {
    update(e);
    if (e.pointerType === "touch") pointer.touchAimAt = performance.now();
  };
  const lockChange = () => (pointer.locked = document.pointerLockElement === el);

  el.addEventListener("pointerdown", down);
  document.addEventListener("pointerlockchange", lockChange);
  return () => {
    el.removeEventListener("pointerdown", down);
    document.removeEventListener("pointerlockchange", lockChange);
    if (document.pointerLockElement === el) document.exitPointerLock();
  };
}

if (import.meta.env.DEV) window.__input = { pointer, crosshair, interactables }; // 개발 중 콘솔 디버깅용
