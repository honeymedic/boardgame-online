import * as THREE from "three";
import { useEffect, useState } from "react";

// 능력 연출에 쓰는 상징들. 전부 코드(SVG)로 그린다. 색은 "C"로 써두고 쓸 때 치환한다.
// 캔버스 256x256, 가운데 정렬. 흰 배경 없음(투명).
const SYMBOLS = {
  // 공작: 왕관
  crown: `
    <path d="M48 176 L40 88 L92 128 L128 64 L164 128 L216 88 L208 176 Z" fill="C" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <rect x="48" y="176" width="160" height="26" rx="6" fill="C" stroke="#fff" stroke-width="6"/>
    <circle cx="40" cy="86" r="10" fill="#fff"/><circle cx="128" cy="62" r="10" fill="#fff"/><circle cx="216" cy="86" r="10" fill="#fff"/>
    <circle cx="90" cy="190" r="7" fill="#fff"/><circle cx="128" cy="190" r="7" fill="#fff"/><circle cx="166" cy="190" r="7" fill="#fff"/>`,
  // 암살자: 단검
  dagger: `
    <path d="M128 24 L150 70 L150 150 L128 232 L106 150 L106 70 Z" fill="#e8e8f0" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 24 L128 232" stroke="C" stroke-width="4" opacity="0.6"/>
    <rect x="70" y="138" width="116" height="18" rx="9" fill="C" stroke="#fff" stroke-width="5"/>
    <rect x="114" y="156" width="28" height="48" rx="6" fill="C" stroke="#fff" stroke-width="5"/>
    <circle cx="128" cy="214" r="13" fill="C" stroke="#fff" stroke-width="5"/>`,
  // 사령관: 닻
  anchor: `
    <circle cx="128" cy="44" r="18" fill="none" stroke="C" stroke-width="12"/>
    <path d="M128 62 L128 208" stroke="C" stroke-width="16" stroke-linecap="round"/>
    <path d="M80 100 L176 100" stroke="C" stroke-width="14" stroke-linecap="round"/>
    <path d="M52 150 Q60 214 128 214 Q196 214 204 150" fill="none" stroke="C" stroke-width="16" stroke-linecap="round"/>
    <path d="M40 142 L64 156 L56 128 Z" fill="C"/><path d="M216 142 L192 156 L200 128 Z" fill="C"/>
    <circle cx="128" cy="44" r="18" fill="none" stroke="#fff" stroke-width="4"/>`,
  // 대사: 두루마리
  scroll: `
    <rect x="56" y="64" width="144" height="128" rx="8" fill="#f6ecd2" stroke="C" stroke-width="8"/>
    <rect x="40" y="48" width="176" height="32" rx="16" fill="C" stroke="#fff" stroke-width="4"/>
    <rect x="40" y="176" width="176" height="32" rx="16" fill="C" stroke="#fff" stroke-width="4"/>
    <path d="M84 104 L172 104 M84 128 L172 128 M84 152 L148 152" stroke="C" stroke-width="8" stroke-linecap="round" opacity="0.8"/>`,
  // 귀부인: 부채
  fan: `
    <path d="M128 208 L36 120 A110 110 0 0 1 220 120 Z" fill="C" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <path d="M128 208 L60 112 M128 208 L92 86 M128 208 L128 76 M128 208 L164 86 M128 208 L196 112" stroke="#fff" stroke-width="4" opacity="0.8"/>
    <path d="M62 134 A90 90 0 0 1 194 134" fill="none" stroke="#fff" stroke-width="6" opacity="0.9"/>
    <circle cx="128" cy="208" r="12" fill="#fff"/>`,
  // 수입/해외 원조: 동전
  coin: `
    <circle cx="128" cy="128" r="92" fill="C" stroke="#fff" stroke-width="8"/>
    <circle cx="128" cy="128" r="66" fill="none" stroke="#fff" stroke-width="6" opacity="0.8"/>
    <text x="128" y="156" font-family="Georgia, serif" font-size="84" font-weight="bold" text-anchor="middle" fill="#fff">C</text>`,
  // 쿠: 붉은 X
  cross: `
    <path d="M60 60 L196 196 M196 60 L60 196" stroke="C" stroke-width="30" stroke-linecap="round"/>
    <path d="M60 60 L196 196 M196 60 L60 196" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.9"/>`,
  // 도전: 느낌표
  exclaim: `
    <path d="M128 28 L150 40 L138 160 L118 160 L106 40 Z" fill="C" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="128" cy="206" r="24" fill="C" stroke="#fff" stroke-width="6"/>`,
  // 확정: 체크
  check: `
    <path d="M52 136 L108 190 L208 72" fill="none" stroke="C" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M52 136 L108 190 L208 72" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`,
};

/** 캐릭터 → 상징 이름 */
export const CHARACTER_SYMBOL = {
  duke: "crown",
  assassin: "dagger",
  captain: "anchor",
  ambassador: "scroll",
  contessa: "fan",
};

const cache = new Map();

function makeTexture(name, color) {
  const key = `${name}:${color}`;
  if (cache.has(key)) return cache.get(key);
  const body = (SYMBOLS[name] || SYMBOLS.exclaim).replaceAll('"C"', `"${color}"`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${body}</svg>`;
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  cache.set(key, promise);
  return promise;
}

/** 상징 텍스처. 로딩 전엔 null. */
export function useSymbolTexture(name, color = "#ffffff") {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    let alive = true;
    makeTexture(name, color).then((t) => alive && setTex(t)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [name, color]);
  return tex;
}
