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
  'assets/favicon.svg',
  'assets/logo.png'
]) {
  check(fs.existsSync(path.join(DIST, reqFile)), `Missing required file: dist/${reqFile}`);
}

for (const club of clubs) {
  check(
    club.lat >= -34.2 && club.lat <= -33.55 && club.lng >= 150.55 && club.lng <= 151.4,
    `Club "${club.name}" has out-of-bounds Sydney coords (${club.lat}, ${club.lng})`
  );
}

const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// SEO checks on index.html
const h1Matches = indexHtml.match(/<h1[\s>]/g) || [];
check(h1Matches.length === 1, `index.html must have exactly 1 <h1>, found ${h1Matches.length}`);

const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
check(Boolean(titleMatch && titleMatch[1].length <= 65), `Title missing or too long (>65 chars)`);

const descMatch = indexHtml.match(/<meta name="description" content="([^"]+)">/);
check(Boolean(descMatch && descMatch[1].length <= 165), `Meta description missing or too long (>165 chars)`);

check(
  indexHtml.includes('<link rel="canonical" href="https://sydneyvolleyball.com/">'),
  'Missing canonical https://sydneyvolleyball.com/'
);
check(indexHtml.includes('hreflang="en-AU"'), 'Missing Australian hreflang');
check(indexHtml.includes('og:image'), 'Missing Open Graph image');

// Verify all 28 clubs are pre-rendered directly in the raw HTML (crawlable without JS)
for (const club of clubs) {
  check(indexHtml.includes(club.name), `Club "${club.name}" not pre-rendered in index.html`);
}

// Verify JSON-LD structured data parses and includes WebSite, Organization, CollectionPage, ItemList, FAQPage
const ldMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
check(Boolean(ldMatch), 'Missing JSON-LD structured data');
if (ldMatch) {
  const ld = JSON.parse(ldMatch[1]);
  const graphTypes = (ld['@graph'] || []).map((n) => n['@type']);
  for (const requiredType of ['WebSite', 'Organization', 'CollectionPage', 'ItemList', 'FAQPage']) {
    check(graphTypes.includes(requiredType), `JSON-LD @graph missing ${requiredType}`);
  }
}

// Check internal links exist
const hrefMatches = [...indexHtml.matchAll(/href="(\/[^"#?]*)"/g)];
for (const m of hrefMatches) {
  const clean = m[1].replace(/^\//, '');
  const candidates = [path.join(DIST, clean), path.join(DIST, clean, 'index.html')];
  check(candidates.some((p) => fs.existsSync(p)), `Broken internal link: ${m[1]}`);
}

if (failures > 0) {
  console.error(`\nVerification FAILED with ${failures} issue(s).`);
  process.exit(1);
}

console.log(
  `Verification PASSED: single-page build verified with all ${clubs.length} pre-rendered clubs, valid 5-entity JSON-LD @graph, optimal title/meta lengths, zero broken links, and verified Sydney coordinates.`
);
