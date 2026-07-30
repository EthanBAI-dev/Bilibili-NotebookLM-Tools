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

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#151f36"/>
    </linearGradient>
    <radialGradient id="glowBlue" cx="18%" cy="8%" r="55%">
      <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#1a73e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber" cx="100%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBlue)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAmber)"/>

  <!-- App icon -->
  <image x="36" y="52" width="80" height="80" href="data:image/png;base64,${iconB64}"/>

  <!-- Wordmark -->
  <text x="134" y="98" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#ffffff">Note<tspan fill="#fbbf24">Flow</tspan></text>
  <text x="134" y="126" font-family="Arial, sans-serif" font-size="15.5" font-weight="400" fill="rgba(226,232,240,0.72)">One sidebar. Five sources.</text>

  <!-- Divider -->
  <rect x="36" y="168" width="368" height="1" fill="rgba(255,255,255,0.1)"/>

  <!-- Platform dots row -->
  <g font-family="Arial, sans-serif" font-size="13.5" font-weight="500" fill="rgba(255,255,255,0.82)">
    <circle cx="46" cy="200" r="5" fill="#00a1d6"/>
    <text x="58" y="205">Bilibili</text>

    <circle cx="140" cy="200" r="5" fill="#ef4444"/>
    <text x="152" y="205">YouTube</text>

    <circle cx="240" cy="200" r="5" fill="#f59e0b"/>
    <text x="252" y="205">Podcasts</text>

    <circle cx="46" cy="230" r="5" fill="#64748b"/>
    <text x="58" y="235">Web</text>

    <circle cx="120" cy="230" r="5" fill="#8b5cf6"/>
    <text x="132" y="235">AI Chats</text>
  </g>

  <!-- CTA line -->
  <text x="36" y="262" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#8ab4f8">&#8594; Gemini Notebook, one click</text>
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
