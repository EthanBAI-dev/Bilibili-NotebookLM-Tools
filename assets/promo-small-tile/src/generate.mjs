// Renders the Chrome Web Store small promo tile (440x280, no alpha) from an
// inline SVG. `sharp` isn't a project dependency — install it transiently to
// regenerate:
//   npm install --no-save sharp && node assets/promo-small-tile/src/generate.mjs && npm uninstall sharp
// Run from the repo root (paths below are relative to it).
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

const W = 440, H = 280;

const iconB64 = readFileSync(resolve(repoRoot, 'public/icons/icon-128.png')).toString('base64');

// Hero (icon + wordmark) is centered as a single unit rather than pinned to
// the left margin — mixing a left-pinned hero with a centered button/row read
// as an inconsistent layout. Text width is estimated (no real text-metrics
// API in this render path) since SVG has no intrinsic-width query; centering
// only needs to be close, and the PNG is visually checked before shipping.
const ICON_SIZE = 82;
const ICON_Y = 18;
const ICON_CENTER_Y = ICON_Y + ICON_SIZE / 2;
const HERO_GAP = 22;
const WORDMARK = 'NoteFlow';
const WORDMARK_SIZE = 38;
const SUBTITLE = 'One sidebar. Five sources.';
const SUBTITLE_SIZE = 15;
const wordmarkWidth = WORDMARK.length * WORDMARK_SIZE * 0.6;
const subtitleWidth = SUBTITLE.length * SUBTITLE_SIZE * 0.52;
const heroTextWidth = Math.max(wordmarkWidth, subtitleWidth);
const heroWidth = ICON_SIZE + HERO_GAP + heroTextWidth;
const heroX = (W - heroWidth) / 2;
const textX = heroX + ICON_SIZE + HERO_GAP;

// Single centered line instead of a two-row dot grid — fewer shapes, and one
// row centers cleanly without an orphaned gap on the last row.
const SOURCES = [
  ['Bilibili', '#00a1d6'],
  ['YouTube', '#ef4444'],
  ['Podcasts', '#f59e0b'],
  ['Web', '#94a3b8'],
  ['AI Chats', '#a78bfa'],
];
const sourceRow = (cy) => {
  const fontSize = 14;
  const charW = fontSize * 0.62;
  const sepW = 18;
  const widths = SOURCES.map(([label]) => label.length * charW);
  const total = widths.reduce((a, b) => a + b, 0) + sepW * (SOURCES.length - 1);
  let x = (W - total) / 2;
  return SOURCES.map(([label, color], i) => {
    const startX = x;
    x += widths[i];
    let seg = `<text x="${startX}" y="${cy}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="${color}">${label}</text>`;
    if (i < SOURCES.length - 1) {
      seg += `<text x="${x + sepW / 2}" y="${cy}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle" fill="rgba(255,255,255,0.32)">&#183;</text>`;
      x += sepW;
    }
    return seg;
  }).join('\n    ');
};

const BTN_W = 226, BTN_H = 46;
const BTN_X = (W - BTN_W) / 2;
const BTN_Y = 200;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#151f36"/>
    </linearGradient>
    <radialGradient id="glowBlue" cx="18%" cy="8%" r="55%">
      <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#1a73e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber" cx="100%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <!-- Soft halo behind the icon, not a hard-edged card — the icon's own
         square edge still reads, but the transition into the dark
         background is gradual instead of a stark white outline. -->
    <radialGradient id="iconGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8ab4f8" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#8ab4f8" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#8ab4f8" stop-opacity="0"/>
    </radialGradient>
    <filter id="btnShadow" x="-40%" y="-60%" width="180%" height="220%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0b1220" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBlue)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAmber)"/>

  <!-- Icon with a soft glow instead of a hard card, hero centered as a unit -->
  <circle cx="${heroX + ICON_SIZE / 2}" cy="${ICON_CENTER_Y}" r="64" fill="url(#iconGlow)"/>
  <image x="${heroX}" y="${ICON_Y}" width="${ICON_SIZE}" height="${ICON_SIZE}" href="data:image/png;base64,${iconB64}"/>

  <!-- Wordmark, vertically centered against the icon -->
  <text x="${textX}" y="${ICON_CENTER_Y + 6}" font-family="Arial, sans-serif" font-size="${WORDMARK_SIZE}" font-weight="700" fill="#ffffff">Note<tspan fill="#fbbf24">Flow</tspan></text>
  <text x="${textX}" y="${ICON_CENTER_Y + 35}" font-family="Arial, sans-serif" font-size="${SUBTITLE_SIZE}" font-weight="400" fill="rgba(226,232,240,0.72)">${SUBTITLE}</text>

  <!-- Divider -->
  <rect x="60" y="114" width="${W - 120}" height="1" fill="rgba(255,255,255,0.1)"/>

  <!-- Single centered source line -->
  ${sourceRow(144)}

  <!-- CTA button, centered, with the app's own Upload glyph instead of a
       plain arrow character. -->
  <rect x="${BTN_X}" y="${BTN_Y}" width="${BTN_W}" height="${BTN_H}" rx="23" fill="#1a73e8" filter="url(#btnShadow)"/>
  <g transform="translate(${BTN_X + 26}, ${BTN_Y + 13}) scale(0.833)" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </g>
  <text x="${BTN_X + 58}" y="${BTN_Y + 29}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">Gemini Notebook</text>
</svg>
`;

const outPng = resolve(__dirname, '../small-tile-440x280.png');

sharp(Buffer.from(svg))
  .resize(W, H)
  .flatten({ background: '#0b1220' }) // guarantee no alpha channel
  .png({ compressionLevel: 9 })
  .toFile(outPng)
  .then(() => console.log('wrote', outPng))
  .catch((e) => { console.error(e); process.exit(1); });
