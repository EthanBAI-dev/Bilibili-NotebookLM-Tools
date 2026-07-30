// Renders the Chrome Web Store marquee promo tile (1400x560, no alpha) from
// an inline SVG. `sharp` isn't a project dependency — install it transiently
// to regenerate:
//   npm install --no-save sharp && node assets/promo-marquee-tile/src/generate.mjs && npm uninstall sharp
// Run from the repo root (paths below are relative to it).
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

const W = 1400, H = 560;
const MARGIN = 90;

const iconB64 = readFileSync(resolve(repoRoot, 'public/icons/icon-128.png')).toString('base64');

// v1 stacked a left hero block against a right column of chips, each
// vertically centered in its own half — that left ~150-180px of dead dark
// space above and below both blocks. v2 uses two full-width rows instead
// (hero+CTA on one line, source chips on another), so content spans nearly
// the whole 1400x560 canvas edge to edge instead of floating in the middle.
const ICON_SIZE = 190;
const ROW1_CY = 190; // hero row vertical center
const ICON_Y = ROW1_CY - ICON_SIZE / 2;
const TEXT_X = MARGIN + ICON_SIZE + 34;
const WORDMARK_SIZE = 76;
const SUBTITLE_SIZE = 25;

const BTN_W = 320, BTN_H = 76;
const BTN_X = W - MARGIN - BTN_W;
const BTN_Y = ROW1_CY - BTN_H / 2;

const DIVIDER_Y = 322;
const KICKER_Y = 366;

// Full-width, justified row (first chip's left edge lines up with the icon,
// last chip's right edge lines up with the button) so both rows share the
// same margins instead of the hero being left-block/chips being a separate
// right-block with a hard vertical seam between them.
const SOURCES = [
  ['Bilibili', '#00a1d6'],
  ['YouTube', '#ef4444'],
  ['Podcasts', '#f59e0b'],
  ['Web', '#94a3b8'],
  ['AI Chats', '#a78bfa'],
];
const CHIP_H = 68;
const CHIP_FONT = 25;
const CHIP_PAD_LEFT = 22, CHIP_PAD_RIGHT = 30, DOT_R = 8, DOT_GAP = 16;
const CHIP_ROW_CY = 452;
const CHIP_Y = CHIP_ROW_CY - CHIP_H / 2;
const charW = CHIP_FONT * 0.58;
const chipWidths = SOURCES.map(([label]) => CHIP_PAD_LEFT + DOT_R * 2 + DOT_GAP + label.length * charW + CHIP_PAD_RIGHT);
const rowContentWidth = W - MARGIN * 2;
const chipGap = (rowContentWidth - chipWidths.reduce((a, b) => a + b, 0)) / (SOURCES.length - 1);

let chipCursor = MARGIN;
const chips = SOURCES.map(([label, color], i) => {
  const x = chipCursor;
  const w = chipWidths[i];
  chipCursor += w + chipGap;
  const dotCx = x + CHIP_PAD_LEFT + DOT_R;
  const dotCy = CHIP_ROW_CY;
  return `
  <rect x="${x}" y="${CHIP_Y}" width="${w}" height="${CHIP_H}" rx="${CHIP_H / 2}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)"/>
  <circle cx="${dotCx}" cy="${dotCy}" r="${DOT_R}" fill="${color}"/>
  <text x="${dotCx + DOT_R + DOT_GAP}" y="${dotCy + 8}" font-family="Arial, sans-serif" font-size="${CHIP_FONT}" font-weight="600" fill="rgba(255,255,255,0.92)">${label}</text>`;
}).join('\n');

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#151f36"/>
    </linearGradient>
    <radialGradient id="glowBlue" cx="10%" cy="6%" r="50%">
      <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#1a73e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBlue2" cx="98%" cy="4%" r="45%">
      <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#1a73e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber" cx="90%" cy="100%" r="55%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="iconGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8ab4f8" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#8ab4f8" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#8ab4f8" stop-opacity="0"/>
    </radialGradient>
    <filter id="btnShadow" x="-40%" y="-60%" width="180%" height="220%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0b1220" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBlue)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBlue2)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAmber)"/>

  <!-- Hero row: icon + wordmark on the left, CTA on the right, sharing the
       row's vertical center so the row reads as one line, edge to edge. -->
  <circle cx="${MARGIN + ICON_SIZE / 2}" cy="${ROW1_CY}" r="130" fill="url(#iconGlow)"/>
  <image x="${MARGIN}" y="${ICON_Y}" width="${ICON_SIZE}" height="${ICON_SIZE}" href="data:image/png;base64,${iconB64}"/>

  <text x="${TEXT_X}" y="${ROW1_CY - 4}" font-family="Arial, sans-serif" font-size="${WORDMARK_SIZE}" font-weight="700" fill="#ffffff">Note<tspan fill="#fbbf24">Flow</tspan></text>
  <text x="${TEXT_X}" y="${ROW1_CY + 40}" font-family="Arial, sans-serif" font-size="${SUBTITLE_SIZE}" font-weight="400" fill="rgba(226,232,240,0.72)">One sidebar. Five sources.</text>

  <rect x="${BTN_X}" y="${BTN_Y}" width="${BTN_W}" height="${BTN_H}" rx="${BTN_H / 2}" fill="#1a73e8" filter="url(#btnShadow)"/>
  <g transform="translate(${BTN_X + 40}, ${BTN_Y + 21}) scale(1.4)" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </g>
  <text x="${BTN_X + 92}" y="${BTN_Y + 48}" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#ffffff">Gemini Notebook</text>

  <!-- Divider + kicker, spanning the same margins as both rows above/below -->
  <rect x="${MARGIN}" y="${DIVIDER_Y}" width="${W - MARGIN * 2}" height="1" fill="rgba(255,255,255,0.1)"/>
  <text x="${MARGIN}" y="${KICKER_Y}" font-family="Arial, sans-serif" font-size="17" font-weight="600" letter-spacing="2" fill="rgba(226,232,240,0.42)">IMPORT FROM</text>

  <!-- Source chip row -->
  ${chips}
</svg>
`;

const outPng = resolve(__dirname, '../marquee-1400x560.png');

sharp(Buffer.from(svg))
  .resize(W, H)
  .flatten({ background: '#0b1220' }) // guarantee no alpha channel
  .png({ compressionLevel: 9 })
  .toFile(outPng)
  .then(() => console.log('wrote', outPng))
  .catch((e) => { console.error(e); process.exit(1); });
