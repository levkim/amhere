import sharp from "sharp";

const BG = "#0B1120";
const TEAL = "#2DD4A7";
const TEAL_DK = "#1B9E7A";
const BLUE = "#3B82F6";
const SNOW = "#F8FAFC";

// 아이콘 마크: 산맥 + 정상 위 발광 위치 핀
function mark(size, withBg) {
  const s = size;
  const bg = withBg
    ? `<rect width="${s}" height="${s}" rx="${s * 0.22}" fill="${BG}"/>`
    : "";
  // 좌표는 1000 기준으로 그리고 스케일
  const g = s / 1000;
  return `
<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  ${bg}
  <g transform="scale(${g})">
    <!-- 뒤 산 (블루) -->
    <path d="M120 760 L360 380 L560 760 Z" fill="${BLUE}" opacity="0.55"/>
    <!-- 앞 산 (틸) -->
    <path d="M330 780 L610 340 L900 780 Z" fill="${TEAL}"/>
    <path d="M610 340 L720 508 L555 508 Z" fill="${SNOW}"/>
    <path d="M330 780 L610 340 L560 780 Z" fill="${TEAL_DK}" opacity="0.45"/>
    <!-- 위치 핀 (정상 위) -->
    <g transform="translate(610 250)">
      <circle r="150" fill="${TEAL}" opacity="0.18"/>
      <path d="M0 -118 C -66 -118 -118 -66 -118 0 C -118 74 0 150 0 150 C 0 150 118 74 118 0 C 118 -66 66 -118 0 -118 Z" fill="${SNOW}"/>
      <circle cy="-2" r="46" fill="${BG}"/>
    </g>
  </g>
</svg>`;
}

async function png(svg, size, out, bg) {
  let img = sharp(Buffer.from(svg));
  if (bg) img = img.flatten({ background: bg });
  await img.resize(size, size).png().toFile(out);
  console.log("wrote", out);
}

const A = "assets/images";
await png(mark(1024, true), 1024, `${A}/icon.png`);
await png(mark(1024, true), 1024, `${A}/favicon.png`);
// Android 적응형 전경 (투명, 세이프존 안에 마크)
await png(
  `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><g transform="translate(176 176) scale(0.656)">${mark(
    1024,
    false,
  ).replace(/<svg[^>]*>/, "").replace("</svg>", "")}</g></svg>`,
  1024,
  `${A}/android-icon-foreground.png`,
);
// 스플래시 마크 (투명 배경, config가 배경색 담당)
await png(mark(1024, false), 1024, `${A}/splash-icon.png`);
console.log("done");
