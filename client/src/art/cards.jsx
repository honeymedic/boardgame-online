// 카드 앞면/뒷면과 동전 그림. 전부 SVG 도형이라 색과 소품은 여기서 바로 고칠 수 있다.
// 그림 문자열 안의 "C" = 역할 색, "DK" = 역할의 어두운 색, "S" = 피부색.

export const SKIN = "#f3d7b6";

export const CHAR = {
  duke: {
    name: "공작",
    color: "#8b5cf6",
    dark: "#4c2a99",
    sub: ["세금 +3","해외 원조 차단"],
    art: `
      <path d="M30 128 Q90 95 150 128 L150 178 L30 178 Z" fill="C"/>
      <path d="M40 130 L90 115 L140 130" stroke="DK" stroke-width="3" fill="none"/>
      <path d="M60 70 Q52 90 54 122 Q60 126 68 122 Q66 100 66 80 Z" fill="#e9e9ee"/>
      <path d="M120 70 Q128 90 126 122 Q120 126 112 122 Q114 100 114 80 Z" fill="#e9e9ee"/>
      <circle cx="90" cy="84" r="28" fill="S"/>
      <path d="M62 78 Q60 96 66 112 L72 110 Q68 94 70 80 Z" fill="#f3f3f6"/>
      <path d="M118 78 Q120 96 114 112 L108 110 Q112 94 110 80 Z" fill="#f3f3f6"/>
      <ellipse cx="90" cy="67" rx="46" ry="11" fill="DK" stroke="#a78bfa" stroke-width="1.5"/>
      <path d="M48 65 Q56 41 90 39 Q124 41 132 65 Z" fill="DK" stroke="#a78bfa" stroke-width="1.5"/>
      <path d="M60 69 Q90 75 120 69" stroke="#6d4fd1" stroke-width="3" fill="none"/>
      <circle cx="90" cy="51" r="4" fill="#f2c94c"/><circle cx="90" cy="51" r="1.6" fill="#8b1e2d"/>
      <circle cx="80" cy="86" r="2.5" fill="#222"/><circle cx="100" cy="86" r="2.5" fill="#222"/>
      <path d="M78 99 Q84 94 90 98 Q96 94 102 99 Q96 104 90 100 Q84 104 78 99 Z" fill="#f3f3f6"/>
      <circle cx="90" cy="150" r="8" fill="#f2c94c"/><circle cx="90" cy="150" r="4" fill="DK"/>
      <path d="M62 128 L90 142 L118 128" stroke="#f2c94c" stroke-width="3" fill="none"/>`,
  },
  assassin: {
    name: "암살자",
    color: "#64748b",
    dark: "#1f2733",
    sub: ["암살 (3코인)",""],
    art: `
      <path d="M38 130 Q90 100 142 130 L142 178 L38 178 Z" fill="C"/>
      <path d="M56 100 Q90 30 124 100 L120 112 L60 112 Z" fill="DK"/>
      <path d="M66 100 Q90 70 114 100 L112 108 L68 108 Z" fill="#0b0e14"/>
      <path d="M76 92 L86 90 L84 95 Z" fill="#e8f0ff"/><path d="M104 92 L94 90 L96 95 Z" fill="#e8f0ff"/>
      <rect x="122" y="118" width="6" height="40" rx="2" fill="#cbd5e1" transform="rotate(-20 125 138)"/>
      <rect x="116" y="150" width="18" height="6" rx="2" fill="#475569" transform="rotate(-20 125 153)"/>
      <path d="M60 128 Q90 120 120 128" stroke="DK" stroke-width="3" fill="none"/>`,
  },
  captain: {
    name: "사령관",
    color: "#3b82f6",
    dark: "#1e3a8a",
    sub: ["강탈 2코인","강탈 차단"],
    art: `
      <path d="M30 128 Q90 98 150 128 L150 178 L30 178 Z" fill="C"/>
      <path d="M30 128 L60 118 L60 178 L30 178 Z" fill="DK"/><path d="M150 128 L120 118 L120 178 L150 178 Z" fill="DK"/>
      <circle cx="90" cy="86" r="27" fill="S"/>
      <path d="M50 70 Q90 40 130 70 L126 76 Q90 62 54 76 Z" fill="DK"/>
      <rect x="62" y="68" width="56" height="10" rx="3" fill="#0f172a"/>
      <circle cx="90" cy="73" r="4" fill="#f2c94c"/>
      <circle cx="80" cy="86" r="2.5" fill="#222"/>
      <path d="M86 73 L96 82" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/><path d="M107 84 L117 86" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/><ellipse cx="101" cy="86" rx="7.5" ry="6.5" fill="#0f172a"/><path d="M96 83 Q100 80 105 83" stroke="#334155" stroke-width="1.2" fill="none"/>
      <path d="M78 100 Q90 108 102 100 L104 112 L76 112 Z" fill="#8b5a2b"/>
      <circle cx="90" cy="146" r="6" fill="#f2c94c"/><circle cx="90" cy="160" r="6" fill="#f2c94c"/>
      <path d="M126 150 l0 18 M118 158 Q126 170 134 158" stroke="#f2c94c" stroke-width="3" fill="none"/>`,
  },
  ambassador: {
    name: "대사",
    color: "#22c55e",
    dark: "#14532d",
    sub: ["카드 교환","강탈 차단"],
    art: `
      <path d="M34 130 Q90 102 146 130 L146 178 L34 178 Z" fill="C"/>
      <circle cx="90" cy="86" r="27" fill="S"/>
      <ellipse cx="90" cy="64" rx="40" ry="8" fill="DK"/>
      <path d="M64 64 Q70 40 90 38 Q110 40 116 64 Z" fill="DK"/>
      <circle cx="78" cy="88" r="7" fill="none" stroke="#222" stroke-width="2"/><circle cx="102" cy="88" r="7" fill="none" stroke="#222" stroke-width="2"/>
      <path d="M85 88 L95 88" stroke="#222" stroke-width="2"/>
      <circle cx="78" cy="88" r="2" fill="#222"/><circle cx="102" cy="88" r="2" fill="#222"/>
      <rect x="108" y="128" width="34" height="24" rx="3" fill="#fdf2d0" transform="rotate(-8 125 140)"/>
      <circle cx="125" cy="140" r="5" fill="#dc2626" transform="rotate(-8 125 140)"/>
      <path d="M60 134 Q90 126 120 134" stroke="DK" stroke-width="3" fill="none"/>`,
  },
  contessa: {
    name: "귀부인",
    color: "#ef4444",
    dark: "#7f1d1d",
    sub: ["암살 차단",""],
    art: `
      <path d="M34 130 Q90 108 146 130 L150 178 L30 178 Z" fill="C"/>
      <path d="M62 128 Q90 150 118 128" fill="S"/>
      <circle cx="90" cy="86" r="27" fill="S"/>
      <path d="M62 86 Q60 50 90 46 Q120 50 118 86 Q104 72 90 74 Q76 72 62 86 Z" fill="#3b1f1a"/>
      <circle cx="90" cy="46" r="12" fill="#3b1f1a"/>
      <path d="M70 118 Q90 126 110 118" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="1 4" stroke-linecap="round"/>
      <circle cx="80" cy="88" r="2.5" fill="#222"/><circle cx="100" cy="88" r="2.5" fill="#222"/>
      <path d="M118 150 L150 128 L152 150 L140 162 Z" fill="DK"/>
      <path d="M118 150 L150 128 M118 150 L152 150 M118 150 L140 162" stroke="#f2c94c" stroke-width="1.5"/>
      <circle cx="118" cy="150" r="3" fill="#f2c94c"/>`,
  },
};

const FONT = "Pretendard, 'Malgun Gothic', sans-serif";

function fillArt(r) {
  return r.art.replace(/"C"/g, `"${r.color}"`).replace(/"DK"/g, `"${r.dark}"`).replace(/"S"/g, `"${SKIN}"`);
}

const CARD_W = 180;
const CARD_H = 252;

function wrapSvg(inner, w, h) {
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

/** 카드 앞면 SVG 문자열. 2D 화면과 3D 텍스처가 같이 쓴다. */
export function cardFrontSvg(character) {
  const r = CHAR[character];
  if (!r) return cardBackSvg();
  const inner = `
    <rect width="180" height="252" rx="14" fill="#1d1f28"/>
    <rect x="4" y="4" width="172" height="244" rx="11" fill="none" stroke="${r.color}" stroke-width="3"/>
    <rect x="10" y="10" width="160" height="232" rx="8" fill="none" stroke="${r.color}" stroke-opacity=".35" stroke-width="1"/>
    <text x="90" y="28" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" font-family="${FONT}" letter-spacing="2">${r.name}</text>
    ${fillArt(r)}
    <path d="M10 182 L170 182" stroke="${r.color}" stroke-opacity=".5"/>
    <text x="90" y="210" text-anchor="middle" font-size="14" font-weight="700" fill="${r.color}" font-family="${FONT}">${r.sub[0]}</text>
    <text x="90" y="230" text-anchor="middle" font-size="12" fill="#b6b9c8" font-family="${FONT}">${r.sub[1]}</text>`;
  return wrapSvg(inner, CARD_W, CARD_H);
}

/** 카드 뒷면 SVG 문자열: 짙은 와인색 바탕에 마름모 격자와 가운데 문장. */
export function cardBackSvg() {
  const cells = [];
  for (let y = 20; y < 240; y += 20) for (let x = 20; x < 170; x += 20) cells.push(`<path d="M${x} ${y - 6} l6 6 l-6 6 l-6 -6 z" fill="#7a1a2a"/>`);
  const inner = `
    <rect width="180" height="252" rx="14" fill="#5e1220"/>
    <rect x="4" y="4" width="172" height="244" rx="11" fill="none" stroke="#c99a3a" stroke-width="2.5"/>
    <rect x="10" y="10" width="160" height="232" rx="8" fill="none" stroke="#c99a3a" stroke-opacity=".4"/>
    ${cells.join("")}
    <circle cx="90" cy="126" r="30" fill="#5e1220" stroke="#c99a3a" stroke-width="2.5"/>
    <circle cx="90" cy="126" r="24" fill="none" stroke="#c99a3a" stroke-opacity=".5"/>
    <text x="90" y="135" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="700" fill="#e2b53d">C</text>`;
  return wrapSvg(inner, CARD_W, CARD_H);
}

/** 2D 화면용 카드. character 가 없으면 뒷면을 그린다. */
export function CardFace({ character, className, style }) {
  const svg = character && CHAR[character] ? cardFrontSvg(character) : cardBackSvg();
  return <span className={className} style={{ display: "block", lineHeight: 0, ...style }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function CardBack(props) {
  return <CardFace {...props} character={null} />;
}

/** 2D 화면용 금화. side = "front"(왕의 옆모습) | "back"(COUP 각인). */
export function Coin({ side = "front", size = 20, className, style, title }) {
  return (
    <span
      className={className}
      title={title}
      style={{ display: "inline-block", width: size, height: size, verticalAlign: "-0.18em", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: coinSvg(side) }}
    />
  );
}

/** 금화 SVG 문자열. 2D 화면과 3D 텍스처가 같이 쓴다. */
export function coinSvg(side) {
  const G1="#f6d365",G2="#e2b53d",G3="#b8871c",G4="#8a5f0e",G5="#5c3d06";
  const ticks=Array.from({length:60},(_,i)=>{const a=i*Math.PI*2/60;const x1=60+53*Math.cos(a),y1=60+53*Math.sin(a),x2=60+56.5*Math.cos(a),y2=60+56.5*Math.sin(a);return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`}).join("");
  const ring=`<circle cx="60" cy="60" r="57" fill="url(#cg)"/>
    <circle cx="60" cy="60" r="57" fill="none" stroke="${G4}" stroke-width="2"/>
    <circle cx="60" cy="60" r="51" fill="none" stroke="${G4}" stroke-width="1.5" stroke-opacity=".8"/>
    <g stroke="${G4}" stroke-width="1.2" stroke-opacity=".55">${ticks}</g>`;
  // 앞면: 왼쪽을 바라보는 근엄한 왕의 옆모습 (실제 주화처럼 단색 부조 느낌)
  const front=`${ring}
    <g fill="${G4}">
      <!-- 목과 어깨(흉상) -->
      <path d="M52 86 L52 100 Q60 104 76 102 L82 108 L36 108 L40 100 Q46 94 52 86 Z"/>
      <!-- 머리/얼굴 옆모습 -->
      <path d="M58 44 Q44 46 42 60 Q41 70 46 76 Q48 82 54 84 L60 86 Q66 86 70 80 L72 74 Q78 72 76 62 Q75 50 68 46 Q64 44 58 44 Z"/>
      <!-- 코 -->
      <path d="M46 62 Q38 66 42 72 L48 70 Z"/>
      <!-- 턱수염 -->
      <path d="M48 76 Q46 92 58 92 Q66 92 68 82 Q58 86 50 78 Z"/>
      <!-- 뒷머리 -->
      <path d="M62 46 Q80 48 80 66 Q80 78 70 84 Q74 70 70 58 Q68 50 62 46 Z"/>
      <!-- 왕관 -->
      <path d="M44 46 L46 28 L54 40 L62 24 L70 40 L78 28 L80 46 Z"/>
    </g>
    <!-- 왕관 띠와 보석 (하이라이트) -->
    <rect x="44" y="43" width="36" height="5" rx="1" fill="${G1}"/>
    <circle cx="62" cy="30" r="2" fill="${G1}"/>
    <!-- 눈썹과 눈: 찌푸린 근엄한 표정 -->
    <path d="M47 58 L56 56" stroke="${G1}" stroke-width="2" stroke-linecap="round"/>
    <path d="M49 61 L54 61" stroke="${G1}" stroke-width="2" stroke-linecap="round"/>
    <!-- 광대와 턱선 하이라이트 -->
    <path d="M50 70 Q54 76 60 78" stroke="${G1}" stroke-width="1" fill="none" stroke-opacity=".6"/>
    <!-- 제작 연도 -->
    <text x="60" y="105" text-anchor="middle" font-family="Georgia, serif" font-size="9" font-weight="700" letter-spacing="2" fill="${G4}">2012</text>`;
  // 뒷면: COUP 글자가 동전을 꽉 채우도록
  const back=`${ring}
    <g transform="translate(60 60) scale(1 1.5) translate(-60 -60)">
    <text x="60" y="72" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700" letter-spacing="0.5" fill="${G5}" transform="translate(1.5 1.5)">COUP</text>
    <text x="60" y="72" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700" letter-spacing="0.5" fill="${G4}">COUP</text>
    <text x="60" y="70.8" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700" letter-spacing="0.5" fill="${G1}" fill-opacity=".45">COUP</text>
    </g>
    <path d="M28 31 L92 31" stroke="${G4}" stroke-width="1.5"/>
    <path d="M28 89 L92 89" stroke="${G4}" stroke-width="1.5"/>
    <path d="M56 27 L60 23 L64 27 L60 31 Z" fill="${G4}"/>
    <path d="M56 93 L60 89 L64 93 L60 97 Z" fill="${G4}"/>
    <circle cx="20" cy="60" r="2" fill="${G4}"/><circle cx="100" cy="60" r="2" fill="${G4}"/>`;
  return `<svg width="100%" height="100%" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">
    <defs><radialGradient id="cg" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${G1}"/><stop offset=".6" stop-color="${G2}"/><stop offset="1" stop-color="${G3}"/></radialGradient></defs>
    ${side==="front"?front:back}</svg>`;
}

