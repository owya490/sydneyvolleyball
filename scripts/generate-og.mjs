/**
 * Generates crisp 1200x630 Open Graph PNG (dist/og-image.png) and 180x180 Apple Touch Icon
 * Uses headless Google Chrome to render an exact bespoke vector/HTML artboard.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../src/assets/logo.png');
const CHROME_CANDIDATES = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

function findChrome() {
  return CHROME_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

export function generateSocialImages(distDir) {
  const chrome = findChrome();
  if (!chrome) {
    console.warn('Chrome not found — skipping PNG OG image generation.');
    return;
  }

  const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-og-'));

  const ogHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: #0A0C10;
    color: #F3F5F8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 64px 72px;
    position: relative;
    overflow: hidden;
  }
  .ambient {
    position: absolute;
    right: -120px;
    top: -120px;
    width: 680px;
    height: 680px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(230,169,60,0.14) 0%, rgba(10,12,16,0) 68%);
    pointer-events: none;
  }
  .map-art {
    position: absolute;
    right: 64px;
    top: 72px;
    width: 440px;
    height: 486px;
    border-radius: 20px;
    background: #11151C;
    border: 1px solid rgba(255,255,255,0.1);
    overflow: hidden;
  }
  .top-brand {
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 2;
  }
  .mark {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: #151A23;
    border: 1px solid rgba(255,255,255,0.14);
    display: grid;
    place-items: center;
  }
  .wordmark {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .wordmark span { color: #E6A93C; font-weight: 600; }
  .powered {
    font-size: 13px;
    letter-spacing: 0.12em;
    color: #8A94A6;
    margin-top: 2px;
    text-transform: uppercase;
  }
  .powered strong { color: #CBD2DF; }
  .hero {
    max-width: 610px;
    z-index: 2;
  }
  h1 {
    font-size: 56px;
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.08;
    margin-bottom: 20px;
  }
  .sub {
    font-size: 22px;
    color: #9AA4B2;
    line-height: 1.45;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 24px;
    z-index: 2;
    font-size: 18px;
    color: #E6A93C;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .footer span {
    color: #687385;
    font-weight: 500;
  }
</style>
</head>
<body>
  <div class="ambient"></div>
  <div class="map-art">
    <svg width="440" height="486" viewBox="0 0 440 486" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Subtle Sydney harbour & road contours -->
      <path d="M-20 260 C 90 245, 160 220, 260 210 C 330 202, 390 180, 460 155" stroke="rgba(255,255,255,0.08)" stroke-width="18" stroke-linecap="round"/>
      <path d="M-10 340 C 120 330, 240 305, 360 280 C 400 272, 430 265, 460 250" stroke="rgba(255,255,255,0.05)" stroke-width="8"/>
      <path d="M180 -20 C 185 140, 210 290, 225 500" stroke="rgba(255,255,255,0.04)" stroke-width="4"/>
      <path d="M40 120 C 160 140, 280 125, 420 95" stroke="rgba(255,255,255,0.04)" stroke-width="3"/>
      <!-- Search radius circle -->
      <circle cx="215" cy="215" r="118" fill="rgba(52,211,153,0.11)" stroke="rgba(52,211,153,0.55)" stroke-width="2"/>
      <circle cx="215" cy="215" r="7" fill="#34D399" stroke="#0A0C10" stroke-width="2.5"/>
      <!-- Indoor pins (Court Gold) -->
      <g transform="translate(155,155)"><circle cx="0" cy="0" r="10" fill="#E6A93C"/><circle cx="0" cy="0" r="4" fill="#0A0C10"/></g>
      <g transform="translate(228,165)"><circle cx="0" cy="0" r="10" fill="#E6A93C"/><circle cx="0" cy="0" r="4" fill="#0A0C10"/></g>
      <g transform="translate(185,235)"><circle cx="0" cy="0" r="10" fill="#E6A93C"/><circle cx="0" cy="0" r="4" fill="#0A0C10"/></g>
      <g transform="translate(262,240)"><circle cx="0" cy="0" r="10" fill="#E6A93C"/><circle cx="0" cy="0" r="4" fill="#0A0C10"/></g>
      <g transform="translate(120,275)"><circle cx="0" cy="0" r="9" fill="#E6A93C"/><circle cx="0" cy="0" r="3.5" fill="#0A0C10"/></g>
      <g transform="translate(245,110)"><circle cx="0" cy="0" r="9" fill="#E6A93C"/><circle cx="0" cy="0" r="3.5" fill="#0A0C10"/></g>
      <g transform="translate(170,350)"><circle cx="0" cy="0" r="9" fill="#E6A93C"/><circle cx="0" cy="0" r="3.5" fill="#0A0C10"/></g>
      <!-- Beach pins (Pacific Sky) -->
      <g transform="translate(345,155)"><circle cx="0" cy="0" r="10" fill="#38BDF8"/><circle cx="0" cy="0" r="4" fill="#0A0C10"/></g>
      <g transform="translate(362,265)"><circle cx="0" cy="0" r="10" fill="#38BDF8"/><circle cx="0" cy="0" r="4" fill="#0A0C10"/></g>
      <g transform="translate(352,315)"><circle cx="0" cy="0" r="10" fill="#38BDF8"/><circle cx="0" cy="0" r="4" fill="#0A0C10"/></g>
      <g transform="translate(298,370)"><circle cx="0" cy="0" r="9" fill="#38BDF8"/><circle cx="0" cy="0" r="3.5" fill="#0A0C10"/></g>
    </svg>
  </div>

  <div class="top-brand">
    <div class="mark">
      <img src="${logoDataUri}" width="36" height="36" alt="" style="display:block;object-fit:contain;">
    </div>
    <div>
      <div class="wordmark">Sydney<span>Volleyball</span></div>
      <div class="powered">powered by <strong>SPORTSHUB</strong></div>
    </div>
  </div>

  <div class="hero">
    <h1>Find Every Volleyball Club in Sydney</h1>
    <p class="sub">Interactive dark-mode map &amp; directory of indoor, beach, social, junior, and SVL clubs across Greater Sydney.</p>
  </div>

  <div class="footer">
    sydneyvolleyball.com <span>· Indoor · Beach · Social · Juniors · SVL</span>
  </div>
</body>
</html>`;

  const iconHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  body { width: 180px; height: 180px; background: #0B0E13; display: grid; place-items: center; }
</style></head>
<body>
  <img src="${logoDataUri}" width="132" height="132" alt="" style="display:block;object-fit:contain;">
</body>
</html>`;

  const ogPath = path.join(tmpDir, 'og.html');
  const iconPath = path.join(tmpDir, 'icon.html');
  fs.writeFileSync(ogPath, ogHtml);
  fs.writeFileSync(iconPath, iconHtml);

  try {
    execFileSync(chrome, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1200,630',
      `--screenshot=${path.join(distDir, 'og-image.png')}`,
      `file://${ogPath}`
    ], { stdio: 'pipe' });

    execFileSync(chrome, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=180,180',
      `--screenshot=${path.join(distDir, 'apple-touch-icon.png')}`,
      `file://${iconPath}`
    ], { stdio: 'pipe' });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
