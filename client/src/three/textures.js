import * as THREE from "three";
import { useEffect, useState } from "react";
import { cardFrontSvg, cardBackSvg, coinSvg } from "../art/cards.jsx";

// SVG 문자열을 three.js 텍스처로 바꾼다. 같은 key 는 한 번만 만들고 재사용한다.
const cache = new Map();

function svgToTexture(key, svg, w, h) {
  if (cache.has(key)) return cache.get(key);
  const promise = new Promise((resolve, reject) => {
    // 2D 화면용 100% 크기와 그림자 효과는 텍스처에선 빼고, 픽셀 크기를 명시한다.
    const clean = svg
      .replace(/width="100%" height="100%"/, `width="${w}" height="${h}"`)
      .replace(/ style="filter:[^"]*"/, "");
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(clean);
  });
  cache.set(key, promise);
  return promise;
}

function useTexture(key, make) {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    let alive = true;
    make().then((t) => alive && setTex(t)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  return tex;
}

/** 카드 앞면(character) 또는 뒷면(null) 텍스처. 로딩 전엔 null. */
export function useCardTexture(character) {
  const key = character ? `card:${character}` : "card:back";
  return useTexture(key, () => svgToTexture(key, character ? cardFrontSvg(character) : cardBackSvg(), 360, 504));
}

/** 금화 앞면/뒷면 텍스처. */
export function useCoinTexture(side = "front") {
  const key = `coin:${side}`;
  return useTexture(key, () => svgToTexture(key, coinSvg(side), 256, 256));
}
