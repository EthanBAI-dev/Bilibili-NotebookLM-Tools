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

// v2 filled the canvas with two full-width rows (hero+CTA, then a chip row)
// but the CTA button duplicated what the diagram now shows directly: five
// sources flowing into one destination. Drop the button and draw that flow —
// a stack of source nodes on the left, converging lines, and a single
// "Gemini Notebook" node (sparkle glyph, no button) on the right.
const H_ICON = 90;
const H_ICON_Y = 34;
const H_ICON_CY = H_ICON_Y + H_ICON / 2;
const H_TEXT_X = MARGIN + H_ICON + 22;
const WORDMARK_SIZE = 38;
const SUBTITLE_SIZE = 16;

const DIAG_TOP = 168;
const DIAG_BOTTOM = 522;
const DIAG_H = DIAG_BOTTOM - DIAG_TOP;

const SOURCES = [
  ['Bilibili', '#00a1d6'],
  ['YouTube', '#ef4444'],
  ['Podcasts', '#f59e0b'],
  ['Web', '#94a3b8'],
  ['AI Chats', '#a78bfa'],
];
const CHIP_W = 270, CHIP_H = 54, CHIP_GAP = 18;
const CHIP_X = MARGIN;
const chipsTotalHeight = SOURCES.length * CHIP_H + (SOURCES.length - 1) * CHIP_GAP;
const CHIPS_TOP = DIAG_TOP + (DIAG_H - chipsTotalHeight) / 2;
const CHIP_RIGHT = CHIP_X + CHIP_W;

// Destination node sits at the diagram's vertical center, which — by
// construction — is also the chip stack's vertical center, so every line
// fans in/out symmetrically.
const NODE_CX = 1150;
const NODE_CY = (DIAG_TOP + DIAG_BOTTOM) / 2;
const NODE_R = 72;
const NODE_LEFT = NODE_CX - NODE_R;

const chipCenters = SOURCES.map((_, i) => CHIPS_TOP + i * (CHIP_H + CHIP_GAP) + CHIP_H / 2);

const chips = SOURCES.map(([label, color], i) => {
  const y = CHIPS_TOP + i * (CHIP_H + CHIP_GAP);
  const dotCx = CHIP_X + 24;
  const dotCy = chipCenters[i];
  return `
  <rect x="${CHIP_X}" y="${y}" width="${CHIP_W}" height="${CHIP_H}" rx="${CHIP_H / 2}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)"/>
  <circle cx="${dotCx}" cy="${dotCy}" r="7" fill="${color}"/>
  <text x="${dotCx + 22}" y="${dotCy + 7}" font-family="Arial, sans-serif" font-size="21" font-weight="600" fill="rgba(255,255,255,0.92)">${label}</text>`;
}).join('\n');

// Every line converges on the same point on the node's left edge (not each
// source's own y) — that's what reads as "these all feed into one place"
// rather than five parallel, unrelated lines.
const flowLines = SOURCES.map(([, color], i) => {
  const cy = chipCenters[i];
  const midX = (CHIP_RIGHT + NODE_LEFT) / 2;
  return `
  <path d="M ${CHIP_RIGHT} ${cy} C ${midX} ${cy}, ${midX} ${NODE_CY}, ${NODE_LEFT} ${NODE_CY}" fill="none" stroke="${color}" stroke-width="2.5" stroke-opacity="0.55" stroke-linecap="round"/>
  <circle cx="${CHIP_RIGHT}" cy="${cy}" r="4" fill="${color}"/>`;
}).join('\n');

// Generic sparkle glyph (lucide-react's "Sparkles" icon path, MIT-licensed
// and already a project dependency) instead of Google's actual Gemini
// logo mark — evokes "AI" without reproducing a trademarked icon.
const SPARKLE_SCALE = 4.2;
const sparkleTx = NODE_CX - 12 * SPARKLE_SCALE;
const sparkleTy = NODE_CY - 12 * SPARKLE_SCALE;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#151f36"/>
    </linearGradient>
    <radialGradient id="glowBlue" cx="10%" cy="6%" r="50%">
      <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#1a73e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber" cx="94%" cy="96%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="iconGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8ab4f8" stop-opacity="0.5"/>
      <stop offset="70%" stop-color="#8ab4f8" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#8ab4f8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.4"/>
      <stop offset="65%" stop-color="#4285f4" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#4285f4" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4285f4"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBlue)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAmber)"/>

  <!-- Header: icon + wordmark, smaller now that the diagram is the focus -->
  <circle cx="${MARGIN + H_ICON / 2}" cy="${H_ICON_CY}" r="66" fill="url(#iconGlow)"/>
  <image x="${MARGIN}" y="${H_ICON_Y}" width="${H_ICON}" height="${H_ICON}" href="data:image/png;base64,${iconB64}"/>
  <text x="${H_TEXT_X}" y="${H_ICON_CY - 2}" font-family="Arial, sans-serif" font-size="${WORDMARK_SIZE}" font-weight="700" fill="#ffffff">Note<tspan fill="#fbbf24">Flow</tspan></text>
  <text x="${H_TEXT_X}" y="${H_ICON_CY + 22}" font-family="Arial, sans-serif" font-size="${SUBTITLE_SIZE}" font-weight="400" fill="rgba(226,232,240,0.72)">One sidebar. Five sources.</text>

  <!-- Flow: source chips -> converging lines -> Gemini Notebook node -->
  ${flowLines}
  ${chips}

  <circle cx="${NODE_CX}" cy="${NODE_CY}" r="${NODE_R + 40}" fill="url(#nodeGlow)"/>
  <circle cx="${NODE_CX}" cy="${NODE_CY}" r="${NODE_R}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/>
  <g transform="translate(${sparkleTx}, ${sparkleTy}) scale(${SPARKLE_SCALE})" fill="url(#sparkleGrad)">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  </g>
  <text x="${NODE_CX}" y="${NODE_CY + NODE_R + 38}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">Gemini Notebook</text>
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
