import { PROPS, TABLE } from "./config.js";
import { useCardTexture, useCoinTexture } from "./textures.js";

// 테이블 위 소품들. 그림은 art/cards.jsx 의 SVG 를 텍스처로 구워 입힌다.
// 재질에 key 를 두는 이유: map 이 null 에서 텍스처로 바뀌면 three 가 셰이더를 다시 컴파일해야 하는데,
// 그냥 속성만 바꾸면 흰색으로 나온다. key 가 바뀌면 재질을 새로 만들어 이 문제를 피한다.
// boxGeometry 의 면 순서: 0 +x, 1 -x, 2 +y(윗면), 3 -y(아랫면), 4 +z, 5 -z

/** 카드 한 장. faceUp 이면 앞면이 위로, 아니면 뒷면이 위로. */
export function Card3D({ position, rotation, character = null, faceUp = false }) {
  const front = useCardTexture(character);
  const back = useCardTexture(null);
  const top = faceUp ? front : back;
  const bottom = faceUp ? back : front;
  const edge = PROPS.cardEdgeColor;
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[PROPS.cardWidth, PROPS.cardThickness, PROPS.cardHeight]} />
      <meshStandardMaterial attach="material-0" color={edge} />
      <meshStandardMaterial attach="material-1" color={edge} />
      <meshStandardMaterial key={top ? "tex" : "flat"} attach="material-2" map={top} color={top ? "#ffffff" : PROPS.cardBackColor} roughness={0.6} />
      <meshStandardMaterial key={bottom ? "tex" : "flat"} attach="material-3" map={bottom} color={bottom ? "#ffffff" : PROPS.cardBackColor} roughness={0.6} />
      <meshStandardMaterial attach="material-4" color={edge} />
      <meshStandardMaterial attach="material-5" color={edge} />
    </mesh>
  );
}

/** 가운데 덱. 윗면만 뒷면 그림, 옆면은 카드 더미 색. */
export function Deck3D({ cards = 11 }) {
  const back = useCardTexture(null);
  const y = TABLE.height + TABLE.thickness / 2;
  const h = PROPS.cardThickness * cards;
  const side = PROPS.deckColor;
  return (
    <mesh position={[0, y + h / 2, 0]} rotation={[0, 0.2, 0]} castShadow>
      <boxGeometry args={[PROPS.cardWidth, h, PROPS.cardHeight]} />
      <meshStandardMaterial attach="material-0" color={side} />
      <meshStandardMaterial attach="material-1" color={side} />
      <meshStandardMaterial key={back ? "tex" : "flat"} attach="material-2" map={back} color={back ? "#ffffff" : side} roughness={0.6} />
      <meshStandardMaterial attach="material-3" color={side} />
      <meshStandardMaterial attach="material-4" color={side} />
      <meshStandardMaterial attach="material-5" color={side} />
    </mesh>
  );
}

/** 금화 한 닢. 윗면은 왕의 옆모습, 아랫면은 COUP 각인. cylinderGeometry 면 순서: 0 옆면, 1 윗면, 2 아랫면 */
export function Coin3D({ position, rotation }) {
  const front = useCoinTexture("front");
  const back = useCoinTexture("back");
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[PROPS.coinRadius, PROPS.coinRadius, PROPS.coinThickness, 32]} />
      <meshStandardMaterial attach="material-0" color={PROPS.coinColor} metalness={0.8} roughness={0.35} />
      <meshStandardMaterial key={front ? "tex" : "flat"} attach="material-1" map={front} color={front ? "#ffffff" : PROPS.coinColor} metalness={0.6} roughness={0.4} />
      <meshStandardMaterial key={back ? "tex" : "flat"} attach="material-2" map={back} color={back ? "#ffffff" : PROPS.coinColor} metalness={0.6} roughness={0.4} />
    </mesh>
  );
}
