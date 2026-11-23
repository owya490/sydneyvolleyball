import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const clubs = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/clubs.json'), 'utf8'));

let failures = 0;
function check(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failures++;
  }
}

// 1. Verify required top-level files
for (const reqFile of [
  'index.html',
  '404.html',
  'sitemap.xml',
  'robots.txt',
  'llms.txt',
  'site.webmanifest',
  'og-image.png',
  'apple-touch-icon.png',
  'assets/styles.css',
  'assets/app.js',
  'assets/club-map.js',
  'assets/favicon.svg'
]) {
  check(fs.existsSync(path.join(DIST, reqFile)), `Missing required output file: dist/${reqFile}`);
}

// 2. Verify all club coordinates fall inside Greater Sydney bounding box
for (const club of clubs) {
  check(
    club.lat >= -34.2 && club.lat <= -33.55 && club.lng >= 150.55 && club.lng <= 151.4,
    `Club "${club.name}" has out-of-bounds Sydney coords (${club.lat}, ${club.lng})`
  );
}

// 3. Collect all generated HTML pages
function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = walkHtml(DIST);
const titles = new Set();
const descriptions = new Set();

for (const file of htmlFiles) {
  const rel = path.relative(DIST, file);
  const html = fs.readFileSync(file, 'utf8');
  const is404 = rel === '404.html';

  // Single H1 check
  const h1Matches = html.match(/<h1[\s>]/g) || [];
  check(h1Matches.length === 1, `${rel} must have exactly 1 <h1>, found ${h1Matches.length}`);

  // Title & Meta description
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
  check(Boolean(titleMatch), `${rel} missing <title>`);
  check(Boolean(descMatch), `${rel} missing meta description`);

  if (!is404 && titleMatch) {
    check(!titles.has(titleMatch[1]), `Duplicate <title> on ${rel}: ${titleMatch[1]}`);
    titles.add(titleMatch[1]);
  }
  if (!is404 && descMatch) {
    check(!descriptions.has(descMatch[1]), `Duplicate meta description on ${rel}`);
    descriptions.add(descMatch[1]);
  }

  // Canonical URL check
  const canonMatch = html.match(/<link rel="canonical" href="(https:\/\/sydneyvolleyball\.com[^"]+)">/);
  check(Boolean(canonMatch), `${rel} missing canonical https://sydneyvolleyball.com URL`);

  // JSON-LD validity check
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!is404) {
    check(ldMatches.length >= 1, `${rel} missing JSON-LD structured data`);
  }
  for (const m of ldMatches) {
    try {
      JSON.parse(m[1]);
    } catch (err) {
      check(false, `${rel} has invalid JSON-LD: ${err.message}`);
    }
  }

  // Internal link existence check
  const hrefMatches = [...html.matchAll(/href="(\/[^"#?]*)"/g)];
  for (const m of hrefMatches) {
    const target = m[1];
    const clean = target.replace(/^\//, '');
    const candidates = [
      path.join(DIST, clean),
      path.join(DIST, clean, 'index.html')
    ];
    check(
      candidates.some((p) => fs.existsSync(p)),
      `${rel} has broken internal link: ${target}`
    );
  }
}

// 4. Verify sitemap matches all non-404 HTML pages
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const sitemapCount = (sitemap.match(/<url>/g) || []).length;
check(
  sitemapCount === htmlFiles.length - 1,
  `sitemap.xml has ${sitemapCount} URLs, expected ${htmlFiles.length - 1}`
);

if (failures > 0) {
  console.error(`\nVerification FAILED with ${failures} issue(s).`);
  process.exit(1);
}

console.log(
  `Verification PASSED: ${htmlFiles.length} HTML pages, ${sitemapCount} unique sitemap URLs, all JSON-LD valid, zero broken links, all Sydney coordinates verified.`
);
