// 웹캠 얼굴 표정 인식 (선택 기능). 켠 사람만 라이브러리와 모델을 내려받는다.
// 영상은 브라우저 밖으로 나가지 않고, 표정 숫자 몇 개만 서버로 보낸다.
// 고개 방향은 쓰지 않는다 (시점은 마우스, 아바타 고개는 시선 동기화가 맡음).

import { FACE } from "./config.js";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** 표정 값 (모두 0~1). 키 이름을 짧게 해서 네트워크로 그대로 보낸다. */
export const EMPTY_FACE = { bl: 0, br: 0, wl: 0, wr: 0, j: 0, s: 0, b: 0 };

/**
 * 얼굴 인식을 시작한다.
 *  video:    <video> 요소 (미리보기 겸 입력)
 *  onFace:   표정 값이 갱신될 때마다 호출 ({bl, br, wl, wr, j, s, b} | null(얼굴 못 찾음))
 * 반환: stop() 함수를 담은 Promise. 카메라 권한 거부 등은 throw.
 */
export async function startFaceTracking(video, onFace) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: FACE.cameraWidth, height: FACE.cameraHeight, facingMode: "user" },
    audio: false,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  // 라이브러리는 이 기능을 켤 때만 불러온다 (번들 분리)
  const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
  });

  const smooth = { ...EMPTY_FACE };
  let running = true;
  let lastRun = 0;
  let raf = 0;

  const loop = () => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    if (now - lastRun < 1000 / FACE.detectFps || video.readyState < 2) return;
    lastRun = now;
    let res;
    try {
      res = landmarker.detectForVideo(video, now);
    } catch {
      return;
    }
    const shapes = res?.faceBlendshapes?.[0]?.categories;
    if (!shapes) {
      onFace(null);
      return;
    }
    const get = (name) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
    // MediaPipe의 Left/Right는 "본인 기준" 좌우. 아바타도 본인 기준이라 그대로 쓴다.
    const raw = {
      bl: get("eyeBlinkLeft"),
      br: get("eyeBlinkRight"),
      wl: get("eyeWideLeft"),
      wr: get("eyeWideRight"),
      j: get("jawOpen"),
      s: (get("mouthSmileLeft") + get("mouthSmileRight")) / 2,
      b: Math.max(get("browInnerUp"), (get("browOuterUpLeft") + get("browOuterUpRight")) / 2),
    };
    // 깜빡임은 빠르게, 나머지는 부드럽게 따라간다
    for (const k of Object.keys(raw)) {
      const a = k === "bl" || k === "br" ? FACE.blinkFollow : FACE.follow;
      smooth[k] += (raw[k] - smooth[k]) * a;
    }
    onFace({ ...smooth });
  };
  loop();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    landmarker.close?.();
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
