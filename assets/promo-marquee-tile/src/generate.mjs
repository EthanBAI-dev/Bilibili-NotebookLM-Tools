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
const CENTER_X = W / 2;

const iconB64 = readFileSync(resolve(repoRoot, 'public/icons/icon-128.png')).toString('base64');

// Previous cut pinned a thin chip column to the far left and a small node to
// the right, leaving the entire top-right quadrant and most of the right
// margin empty — an asymmetric layout on a 2.5:1 canvas read as unbalanced.
// This version is bilaterally symmetric around the vertical centerline:
// centered header on top, five source chips spread edge-to-edge below it,
// each feeding a converging line straight down into one centered node.
const H_ICON = 68;
const H_ICON_Y = 22;
const H_ICON_CY = H_ICON_Y + H_ICON / 2;
const HERO_GAP = 18;
const WORDMARK = 'NoteFlow';
const WORDMARK_SIZE = 42;
const SUBTITLE = 'One sidebar. Five sources.';
const SUBTITLE_SIZE = 15;
const heroTextWidth = Math.max(WORDMARK.length * WORDMARK_SIZE * 0.6, SUBTITLE.length * SUBTITLE_SIZE * 0.52);
const heroWidth = H_ICON + HERO_GAP + heroTextWidth;
const heroX = CENTER_X - heroWidth / 2;
const H_TEXT_X = heroX + H_ICON + HERO_GAP;

const SOURCES = [
  ['Bilibili', '#00a1d6'],
  ['YouTube', '#ef4444'],
  ['Podcasts', '#f59e0b'],
  ['Web', '#94a3b8'],
  ['AI Chats', '#a78bfa'],
];
const CHIP_H = 54;
const CHIP_FONT = 21;
const CHIP_PAD_LEFT = 20, CHIP_PAD_RIGHT = 26, DOT_R = 7, DOT_GAP = 14;
const CHIP_ROW_CY = 177;
const CHIP_TOP = CHIP_ROW_CY - CHIP_H / 2;
const CHIP_BOTTOM = CHIP_ROW_CY + CHIP_H / 2;
const charW = CHIP_FONT * 0.58;
const chipWidths = SOURCES.map(([label]) => CHIP_PAD_LEFT + DOT_R * 2 + DOT_GAP + label.length * charW + CHIP_PAD_RIGHT);
const rowContentWidth = W - MARGIN * 2;
const chipGap = (rowContentWidth - chipWidths.reduce((a, b) => a + b, 0)) / (SOURCES.length - 1);

let chipCursor = MARGIN;
const chipCenterXs = [];
const chips = SOURCES.map(([label, color], i) => {
  const x = chipCursor;
  const w = chipWidths[i];
  chipCenterXs.push(x + w / 2);
  chipCursor += w + chipGap;
  const dotCx = x + CHIP_PAD_LEFT + DOT_R;
  return `
  <rect x="${x}" y="${CHIP_TOP}" width="${w}" height="${CHIP_H}" rx="${CHIP_H / 2}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)"/>
  <circle cx="${dotCx}" cy="${CHIP_ROW_CY}" r="${DOT_R}" fill="${color}"/>
  <text x="${dotCx + DOT_R + DOT_GAP}" y="${CHIP_ROW_CY + 7}" font-family="Arial, sans-serif" font-size="${CHIP_FONT}" font-weight="600" fill="rgba(255,255,255,0.92)">${label}</text>`;
}).join('\n');

// One centered destination below the row — every line bends from its own
// chip's x position straight down to the same point, so the fan converges
// symmetrically instead of skewing toward one side.
const NODE_CX = CENTER_X;
const NODE_CY = 408;
const NODE_R = 84;
const NODE_TOP = NODE_CY - NODE_R;

const flowLines = SOURCES.map(([, color], i) => {
  const cx = chipCenterXs[i];
  const midY = (CHIP_BOTTOM + NODE_TOP) / 2;
  return `
  <path d="M ${cx} ${CHIP_BOTTOM} C ${cx} ${midY}, ${NODE_CX} ${midY}, ${NODE_CX} ${NODE_TOP}" fill="none" stroke="${color}" stroke-width="2.5" stroke-opacity="0.55" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${CHIP_BOTTOM}" r="4" fill="${color}"/>`;
}).join('\n');

// Generic sparkle glyph (lucide-react's "Sparkles" icon path, MIT-licensed
// and already a project dependency) instead of Google's actual Gemini
// logo mark — evokes "AI" without reproducing a trademarked icon.
const SPARKLE_SCALE = 4.6;
const sparkleTx = NODE_CX - 12 * SPARKLE_SCALE;
const sparkleTy = NODE_CY - 12 * SPARKLE_SCALE;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#151f36"/>
    </linearGradient>
    <radialGradient id="glowBlue" cx="50%" cy="0%" r="45%">
      <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#1a73e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber" cx="12%" cy="100%" r="45%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber2" cx="88%" cy="100%" r="45%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.14"/>
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
  <rect width="${W}" height="${H}" fill="url(#glowAmber2)"/>

  <!-- Centered header -->
  <circle cx="${heroX + H_ICON / 2}" cy="${H_ICON_CY}" r="60" fill="url(#iconGlow)"/>
  <image x="${heroX}" y="${H_ICON_Y}" width="${H_ICON}" height="${H_ICON}" href="data:image/png;base64,${iconB64}"/>
  <text x="${H_TEXT_X}" y="${H_ICON_CY - 1}" font-family="Arial, sans-serif" font-size="${WORDMARK_SIZE}" font-weight="700" fill="#ffffff">Note<tspan fill="#fbbf24">Flow</tspan></text>
  <text x="${H_TEXT_X}" y="${H_ICON_CY + 24}" font-family="Arial, sans-serif" font-size="${SUBTITLE_SIZE}" font-weight="400" fill="rgba(226,232,240,0.72)">${SUBTITLE}</text>

  <!-- Flow: source chips -> converging lines -> Gemini Notebook node -->
  ${flowLines}
  ${chips}

  <circle cx="${NODE_CX}" cy="${NODE_CY}" r="${NODE_R + 46}" fill="url(#nodeGlow)"/>
  <circle cx="${NODE_CX}" cy="${NODE_CY}" r="${NODE_R}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/>
  <g transform="translate(${sparkleTx}, ${sparkleTy}) scale(${SPARKLE_SCALE})" fill="url(#sparkleGrad)">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  </g>
  <text x="${NODE_CX}" y="${NODE_CY + NODE_R + 36}" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff">Gemini Notebook</text>
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
