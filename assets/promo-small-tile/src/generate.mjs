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

// 3-column grid for the platform dots — every row uses the SAME column x
// positions (even when a row has fewer items) so the block reads as one
// aligned grid instead of two independently-centered rows.
const colX = [MARGIN, MARGIN + 128, MARGIN + 256];
const dotRow = (cy, items) => items.map(([label, color], i) => {
  const x = colX[i];
  const r = 5;
  return `<circle cx="${x + r}" cy="${cy}" r="${r}" fill="${color}"/>` +
         `<text x="${x + r * 2 + 8}" y="${cy + 5}" font-family="Arial, sans-serif" font-size="14" font-weight="500" fill="rgba(255,255,255,0.85)">${label}</text>`;
}).join('\n    ');

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
    <filter id="cardShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    <filter id="btnShadow" x="-40%" y="-60%" width="180%" height="220%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0b1220" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBlue)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAmber)"/>

  <!-- Icon on a light card — the mark itself is near-black and disappears
       straight onto the navy background without one. -->
  <rect x="${MARGIN}" y="24" width="72" height="72" rx="18" fill="#eef2ff" filter="url(#cardShadow)"/>
  <image x="${MARGIN + 8}" y="32" width="56" height="56" href="data:image/png;base64,${iconB64}"/>

  <!-- Wordmark, vertically centered against the icon card (24..96, mid 60) -->
  <text x="${MARGIN + 72 + 20}" y="66" font-family="Arial, sans-serif" font-size="33" font-weight="700" fill="#ffffff">Note<tspan fill="#fbbf24">Flow</tspan></text>
  <text x="${MARGIN + 72 + 20}" y="90" font-family="Arial, sans-serif" font-size="14.5" font-weight="400" fill="rgba(226,232,240,0.72)">One sidebar. Five sources.</text>

  <!-- Divider -->
  <rect x="${MARGIN}" y="114" width="${W - MARGIN * 2}" height="1" fill="rgba(255,255,255,0.1)"/>

  <!-- Platform dots — one aligned 3-column grid across two rows -->
  <g>
    ${dotRow(146, [['Bilibili', '#00a1d6'], ['YouTube', '#ef4444'], ['Podcasts', '#f59e0b']])}
    ${dotRow(178, [['Web', '#64748b'], ['AI Chats', '#8b5cf6']])}
  </g>

  <!-- CTA — an actual button, not a caption line, so it reads as the
       action rather than a footnote. -->
  <rect x="${MARGIN}" y="214" width="248" height="42" rx="21" fill="#1a73e8" filter="url(#btnShadow)"/>
  <text x="${MARGIN + 124}" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">&#8594; Gemini Notebook</text>
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
