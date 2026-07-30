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
const MARGIN = 32;

const iconB64 = readFileSync(resolve(repoRoot, 'public/icons/icon-128.png')).toString('base64');

// Row 1 (3 items) is a real grid — every column shares an x position.
const colX = [MARGIN, MARGIN + 128, MARGIN + 256];
const gridRow = (cy, items) => items.map(([label, color], i) => {
  const x = colX[i];
  const r = 5;
  return `<circle cx="${x + r}" cy="${cy}" r="${r}" fill="${color}"/>` +
         `<text x="${x + r * 2 + 8}" y="${cy + 5}" font-family="Arial, sans-serif" font-size="14" font-weight="500" fill="rgba(255,255,255,0.85)">${label}</text>`;
}).join('\n    ');

// Row 2 (2 items) is its own centered, evenly-spaced pair — forcing it onto
// row 1's grid left an orphaned gap where the third column would be.
const centeredPair = (cy, items, gap) => {
  const widths = items.map(([label]) => 20 + label.length * 8); // dot+gap+rough text width
  const total = widths[0] + gap + widths[1];
  let x = (W - total) / 2;
  return items.map(([label, color], i) => {
    const r = 5;
    const startX = x;
    x += widths[i] + gap;
    return `<circle cx="${startX + r}" cy="${cy}" r="${r}" fill="${color}"/>` +
           `<text x="${startX + r * 2 + 8}" y="${cy + 5}" font-family="Arial, sans-serif" font-size="14" font-weight="500" fill="rgba(255,255,255,0.85)">${label}</text>`;
  }).join('\n    ');
};

const BTN_W = 248, BTN_H = 42;
const BTN_X = (W - BTN_W) / 2;
const BTN_Y = 214;

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

  <!-- Icon with a soft glow instead of a hard card -->
  <circle cx="${MARGIN + 36}" cy="60" r="58" fill="url(#iconGlow)"/>
  <image x="${MARGIN + 4}" y="28" width="64" height="64" href="data:image/png;base64,${iconB64}"/>

  <!-- Wordmark, vertically centered against the icon (28..92, mid 60) -->
  <text x="${MARGIN + 64 + 22}" y="66" font-family="Arial, sans-serif" font-size="33" font-weight="700" fill="#ffffff">Note<tspan fill="#fbbf24">Flow</tspan></text>
  <text x="${MARGIN + 64 + 22}" y="90" font-family="Arial, sans-serif" font-size="14.5" font-weight="400" fill="rgba(226,232,240,0.72)">One sidebar. Five sources.</text>

  <!-- Divider -->
  <rect x="${MARGIN}" y="114" width="${W - MARGIN * 2}" height="1" fill="rgba(255,255,255,0.1)"/>

  <!-- Row 1: aligned 3-column grid. Row 2: centered pair, spaced on its own. -->
  <g>
    ${gridRow(146, [['Bilibili', '#00a1d6'], ['YouTube', '#ef4444'], ['Podcasts', '#f59e0b']])}
    ${centeredPair(178, [['Web', '#64748b'], ['AI Chats', '#8b5cf6']], 36)}
  </g>

  <!-- CTA button, centered, with the app's own Upload glyph instead of a
       plain arrow character. -->
  <rect x="${BTN_X}" y="${BTN_Y}" width="${BTN_W}" height="${BTN_H}" rx="21" fill="#1a73e8" filter="url(#btnShadow)"/>
  <g transform="translate(${BTN_X + 34}, ${BTN_Y + 11}) scale(0.833)" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </g>
  <text x="${BTN_X + 66}" y="${BTN_Y + 27}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">Gemini Notebook</text>
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
