import sharp from "sharp";

// "여기이써" 아이콘 — 사용자 제공 이미지를 앱 아이콘 규칙에 맞게 벡터로 재구성
// (텍스트 제거, 세이프존 안으로 요소 배치)

const GREEN_TOP = "#3AAE63";
const GREEN_BOT = "#1C7A44";
const FAR = "#2C8A50";
const NEAR = "#15623A";
const TREE = "#0F4E2C";
const WHITE = "#FFFFFF";
const PIN_INNER = "#1E7A45";

// 1000x1000 기준 장면 (요소를 중앙 ~76% 안에 배치 → 크롭 안전)
// withText=true면 하단에 '여기이써' 워드마크 포함
function scene(withText) {
  const text = withText
    ? `<text x="500" y="912" font-family="Malgun Gothic, sans-serif" font-size="148"
             font-weight="800" fill="${WHITE}" text-anchor="middle">여기이써</text>`
    : "";
  // 마크·산·소나무를 위로 60만큼 올려 하단 글자와 겹치지 않게 한다
  return `
  <g transform="translate(0 -60)">
  <!-- 뒤 능선 -->
  <path d="M180 690 Q 360 600 540 665 Q 700 720 820 655 L 820 760 L 180 760 Z" fill="${FAR}"/>
  <!-- 앞 능선 -->
  <path d="M165 730 Q 380 655 560 720 Q 710 765 835 710 L 835 770 L 165 770 Z" fill="${NEAR}"/>
  <!-- 소나무 (좌하단, 안쪽으로) -->
  <g fill="${TREE}">
    <path d="M255 636 l30 54 -20 0 25 47 -22 0 27 48 -82 0 27 -48 -22 0 25 -47 -20 0 z"/>
    <path d="M328 660 l23 41 -15 0 20 36 -16 0 21 38 -62 0 21 -38 -16 0 20 -36 -15 0 z"/>
  </g>
  <!-- 위치 핀 (히어로) -->
  <path d="M500 632 C 384 500 354 434 354 350 A146 146 0 1 1 646 350 C 646 434 616 500 500 632 Z" fill="${WHITE}"/>
  <circle cx="500" cy="350" r="108" fill="${PIN_INNER}"/>
  <!-- 핀 안 산 -->
  <path d="M414 402 L470 316 L508 366 L548 308 L600 402 Z" fill="${WHITE}"/>
  <circle cx="470" cy="316" r="11" fill="${WHITE}"/>
  <!-- 반짝임 (우상단) -->
  <g stroke="${WHITE}" stroke-width="18" stroke-linecap="round">
    <line x1="676" y1="222" x2="710" y2="188"/>
    <line x1="700" y1="270" x2="746" y2="257"/>
    <line x1="652" y1="188" x2="664" y2="146"/>
  </g>
  </g>
  ${text}`;
}

function iconSvg(withBg, withText = true) {
  const bg = withBg
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="${GREEN_TOP}"/><stop offset="1" stop-color="${GREEN_BOT}"/>
       </linearGradient></defs>
       <rect width="1000" height="1000" rx="220" fill="url(#g)"/>`
    : "";
  return `<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">${bg}${scene(withText)}</svg>`;
}

async function png(svg, size, out, flatten) {
  let img = sharp(Buffer.from(svg));
  if (flatten) img = img.flatten({ background: flatten });
  await img.resize(size, size).png().toFile(out);
  console.log("wrote", out);
}

const A = "assets/images";
await png(iconSvg(true, true), 1024, `${A}/icon.png`);
await png(iconSvg(true, true), 1024, `${A}/favicon.png`);
// Android 적응형 전경: 장면(글자 포함, 투명), 세이프존 안으로 축소
await png(
  `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><g transform="translate(140 140) scale(0.72)"><svg width="1000" height="1000" viewBox="0 0 1000 1000">${scene(true)}</svg></g></svg>`,
  1024,
  `${A}/android-icon-foreground.png`,
);
// 스플래시는 글자 없이 마크만 (로딩 화면은 깔끔하게)
await png(iconSvg(false, false), 1024, `${A}/splash-icon.png`);
console.log("done");
