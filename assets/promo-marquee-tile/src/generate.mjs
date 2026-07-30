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

const iconB64 = readFileSync(resolve(repoRoot, 'public/icons/icon-128.png')).toString('base64');

// Hero block (icon + wordmark + tagline + CTA), left-aligned — the extra
// width of a 2.5:1 banner (vs. the small tile's ~1.57:1) is used for a
// second column of source chips rather than stretching the hero itself.
const LEFT = 100;
const ICON_SIZE = 150;
const ICON_Y = 118;
const ICON_CENTER_Y = ICON_Y + ICON_SIZE / 2;
const TEXT_X = LEFT + ICON_SIZE + 32;
const WORDMARK_SIZE = 62;
const SUBTITLE_SIZE = 22;

const BTN_W = 300, BTN_H = 64;
const BTN_X = LEFT;
const BTN_Y = 322;

// Right column: one chip per source, stacked and vertically centered — the
// small tile's single text line would look sparse stretched across 560px of
// height, so each source gets its own pill instead.
const SOURCES = [
  ['Bilibili', '#00a1d6'],
  ['YouTube', '#ef4444'],
  ['Podcasts', '#f59e0b'],
  ['Web', '#94a3b8'],
  ['AI Chats', '#a78bfa'],
];
const CHIP_W = 280, CHIP_H = 56, CHIP_GAP = 24;
const CHIP_X = 950;
const chipsTotalHeight = SOURCES.length * CHIP_H + (SOURCES.length - 1) * CHIP_GAP;
const CHIPS_TOP = (H - chipsTotalHeight) / 2;

const chips = SOURCES.map(([label, color], i) => {
  const y = CHIPS_TOP + i * (CHIP_H + CHIP_GAP);
  const dotCx = CHIP_X + 26;
  const dotCy = y + CHIP_H / 2;
  return `
  <rect x="${CHIP_X}" y="${y}" width="${CHIP_W}" height="${CHIP_H}" rx="${CHIP_H / 2}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)"/>
  <circle cx="${dotCx}" cy="${dotCy}" r="7" fill="${color}"/>
  <text x="${dotCx + 22}" y="${dotCy + 7}" font-family="Arial, sans-serif" font-size="21" font-weight="600" fill="rgba(255,255,255,0.9)">${label}</text>`;
}).join('\n');

const DIVIDER_X = 830;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#151f36"/>
    </linearGradient>
    <radialGradient id="glowBlue" cx="14%" cy="10%" r="55%">
      <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#1a73e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber" cx="96%" cy="94%" r="55%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="iconGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8ab4f8" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#8ab4f8" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#8ab4f8" stop-opacity="0"/>
    </radialGradient>
    <filter id="btnShadow" x="-40%" y="-60%" width="180%" height="220%">
      <feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="#0b1220" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBlue)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAmber)"/>

  <!-- Icon with a soft glow instead of a hard card -->
  <circle cx="${LEFT + ICON_SIZE / 2}" cy="${ICON_CENTER_Y}" r="110" fill="url(#iconGlow)"/>
  <image x="${LEFT}" y="${ICON_Y}" width="${ICON_SIZE}" height="${ICON_SIZE}" href="data:image/png;base64,${iconB64}"/>

  <!-- Wordmark, vertically centered against the icon -->
  <text x="${TEXT_X}" y="${ICON_CENTER_Y + 8}" font-family="Arial, sans-serif" font-size="${WORDMARK_SIZE}" font-weight="700" fill="#ffffff">Note<tspan fill="#fbbf24">Flow</tspan></text>
  <text x="${TEXT_X}" y="${ICON_CENTER_Y + 52}" font-family="Arial, sans-serif" font-size="${SUBTITLE_SIZE}" font-weight="400" fill="rgba(226,232,240,0.72)">One sidebar. Five sources.</text>

  <!-- CTA button with the app's own Upload glyph -->
  <rect x="${BTN_X}" y="${BTN_Y}" width="${BTN_W}" height="${BTN_H}" rx="32" fill="#1a73e8" filter="url(#btnShadow)"/>
  <g transform="translate(${BTN_X + 34}, ${BTN_Y + 17}) scale(1.16)" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </g>
  <text x="${BTN_X + 76}" y="${BTN_Y + 40}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">Gemini Notebook</text>

  <!-- Divider between hero and source chips -->
  <rect x="${DIVIDER_X}" y="90" width="1" height="${H - 180}" fill="rgba(255,255,255,0.1)"/>

  <!-- Source chips -->
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
