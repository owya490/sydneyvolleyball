import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, renderClubRow, renderPage } from '../src/templates/layout.mjs';
import { generateSocialImages } from './generate-og.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const meta = JSON.parse(fs.readFileSync(path.join(SRC, 'data/meta.json'), 'utf8'));
const clubs = JSON.parse(fs.readFileSync(path.join(SRC, 'data/clubs.json'), 'utf8'));

const { site, regions, opportunities, faqs } = meta;
const regionMap = new Map(regions.map((r) => [r.slug, r]));
const today = new Date().toISOString().slice(0, 10);

function writeOut(relPath, content) {
  const fullPath = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function clubSchemaEntity(club) {
  return {
    '@type': 'SportsClub',
    '@id': `${site.url}/#${club.slug}`,
    name: club.name,
    description: club.shortDescription,
    sport: 'Volleyball',
    url: club.website,
    address: {
      '@type': 'PostalAddress',
      streetAddress: club.address,
      addressLocality: club.suburb,
      addressRegion: 'NSW',
      postalCode: club.postcode,
      addressCountry: 'AU'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: club.lat,
      longitude: club.lng
    },
    location: {
      '@type': 'Place',
      name: club.venue,
      address: {
        '@type': 'PostalAddress',
        streetAddress: club.address,
        addressLocality: club.suburb,
        addressRegion: 'NSW',
        postalCode: club.postcode,
        addressCountry: 'AU'
      }
    }
  };
}

// --- Clean & Recreate dist/ ---
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

for (const file of ['styles.css', 'app.js', 'favicon.svg', 'logo.png']) {
  fs.copyFileSync(path.join(SRC, 'assets', file), path.join(DIST, 'assets', file));
}

// Copy pre-generated social cards into dist/ (or regenerate with Chrome if missing)
const ogSrc = path.join(SRC, 'assets', 'og-image.png');
const iconSrc = path.join(SRC, 'assets', 'apple-touch-icon.png');
if (fs.existsSync(ogSrc) && fs.existsSync(iconSrc)) {
  fs.copyFileSync(ogSrc, path.join(DIST, 'og-image.png'));
  fs.copyFileSync(iconSrc, path.join(DIST, 'apple-touch-icon.png'));
} else {
  generateSocialImages(DIST);
}

// ============================================================================
// SINGLE-PAGE SYDNEY VOLLEYBALL DISCOVERY PLATFORM (/)
// ============================================================================
const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      url: `${site.url}/`,
      name: site.name,
      alternateName: ['SydneyVolleyball', 'Sydney Volleyball Clubs'],
      description: site.defaultDescription,
      inLanguage: 'en-AU'
    },
    {
      '@type': 'Organization',
      '@id': `${site.url}/#organization`,
      name: 'Sydney Volleyball',
      legalName: 'SydneyVolleyball powered by SPORTSHUB',
      url: `${site.url}/`,
      logo: `${site.url}/assets/logo.png`,
      email: site.email,
      areaServed: {
        '@type': 'City',
        name: 'Sydney',
        containedInPlace: {
          '@type': 'State',
          name: 'New South Wales',
          containedInPlace: { '@type': 'Country', name: 'Australia' }
        }
      },
      brand: {
        '@type': 'Brand',
        name: 'SPORTSHUB'
      }
    },
    {
      '@type': 'CollectionPage',
      '@id': `${site.url}/#webpage`,
      url: `${site.url}/`,
      name: site.defaultTitle,
      description: site.defaultDescription,
      isPartOf: { '@id': `${site.url}/#website` },
      about: { '@type': 'Thing', name: 'Volleyball in Sydney' },
      dateModified: today,
      inLanguage: 'en-AU',
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: `${site.url}/og-image.png`,
        width: 1200,
        height: 630
      }
    },
    {
      '@type': 'ItemList',
      '@id': `${site.url}/#clubs`,
      name: 'Volleyball Clubs in Sydney',
      numberOfItems: clubs.length,
      itemListElement: clubs.map((club, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: clubSchemaEntity(club)
      }))
    },
    {
      '@type': 'FAQPage',
      '@id': `${site.url}/#faq`,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer
        }
      }))
    }
  ]
};

const homeBody = `
  <!-- Quiet Hero Title Strip -->
  <section class="hero-strip">
    <div class="container">
      <h1>Sydney Volleyball Clubs &amp; Courts</h1>
      <p>Discover ${clubs.length} indoor, beach, social, junior, and SVL volleyball clubs across Greater Sydney.</p>
    </div>
  </section>

  <!-- Full-Width Dark Sydney Map -->
  <section class="map-section" id="map-section" aria-label="Interactive dark map of volleyball clubs in Sydney">
    <div id="sydney-map"></div>

    <button type="button" class="map-reset-btn" id="reset-map-view" title="Reset Sydney view" aria-label="Reset Sydney map view">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    </button>

    <div class="map-legend" aria-label="Map pin legend">
      <span class="legend-item"><span class="legend-dot legend-dot--indoor"></span>Indoor</span>
      <span class="legend-item"><span class="legend-dot legend-dot--beach"></span>Beach</span>
    </div>
  </section>

  <!-- Centered Single-Column Club Directory -->
  <section class="directory-section" id="directory" aria-label="Sydney volleyball club directory">
    <div class="container container--narrow">
      <div class="directory-toolbar">
        <div class="toolbar-left" aria-live="polite">
          <span class="results-count" id="results-count">${clubs.length} CLUBS</span>
          <div class="active-chips" id="active-chips"></div>
        </div>

        <button
          type="button"
          class="filter-trigger-btn"
          id="open-filter-drawer"
          aria-haspopup="dialog"
          aria-expanded="false"
          aria-controls="filter-drawer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="7" y1="12" x2="17" y2="12"/>
            <line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
          <span>Filter</span>
          <span class="filter-badge" id="filter-badge" hidden>0</span>
        </button>
      </div>

      <div class="club-list" id="club-list">
        ${clubs.map((club) => renderClubRow(club, regionMap)).join('')}
      </div>

      <div class="empty-state" id="empty-state" hidden>
        <h3>No clubs match those filters</h3>
        <p>Try clearing one or more filters to view all Sydney volleyball clubs.</p>
        <button type="button" class="btn-primary" style="width: auto;" id="empty-reset-btn">Reset Filters</button>
      </div>
    </div>
  </section>

  <!-- Sydney Volleyball Guide & FAQ (SEO) -->
  <section class="faq-section" id="faq" aria-labelledby="faq-heading">
    <div class="container container--narrow">
      <h2 class="faq-heading" id="faq-heading">Playing Volleyball in Sydney</h2>
      <p class="faq-sub">Common questions about indoor courts, beach clubs, social comps, juniors, and SVL in Sydney, NSW.</p>
      <div class="faq-list">
        ${faqs
          .map(
            (item) => `
          <details class="faq-item">
            <summary>${escapeHtml(item.question)}</summary>
            <p>${escapeHtml(item.answer)}</p>
          </details>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <!-- Slide-Over Filter Drawer (Right Side Desktop / Bottom Sheet Mobile) -->
  <div class="drawer-backdrop" id="drawer-backdrop"></div>
  <aside
    class="filter-drawer"
    id="filter-drawer"
    role="dialog"
    aria-modal="true"
    aria-labelledby="filter-drawer-title"
    aria-hidden="true"
  >
    <div class="drawer-handle" aria-hidden="true"></div>
    <div class="drawer-header">
      <h2 id="filter-drawer-title">Filter Clubs</h2>
      <button type="button" class="icon-close" id="close-filter-drawer" aria-label="Close filters">×</button>
    </div>

    <div class="drawer-body">
      <div>
        <span class="drawer-group-label">Court Surface</span>
        <div class="segmented-control" role="group" aria-label="Filter by court surface">
          <button type="button" class="segmented-btn is-active" data-surface-filter="all" aria-pressed="true">All</button>
          <button type="button" class="segmented-btn" data-surface-filter="Indoor" aria-pressed="false">Indoor</button>
          <button type="button" class="segmented-btn" data-surface-filter="Beach" aria-pressed="false">Beach</button>
        </div>
      </div>

      <div>
        <span class="drawer-group-label">Opportunities to Play</span>
        <div class="pill-check-grid">
          ${opportunities
            .map(
              (opp) => `
            <label class="pill-check">
              <input type="checkbox" value="${escapeHtml(opp)}" data-opp-filter>
              <span>${escapeHtml(opp)}</span>
            </label>`
            )
            .join('')}
        </div>
      </div>

      <div>
        <label class="drawer-group-label" for="drawer-region-select">Sydney Region</label>
        <select id="drawer-region-select" class="select-input">
          <option value="">All Greater Sydney</option>
          ${regions
            .map((r) => `<option value="${escapeHtml(r.slug)}">${escapeHtml(r.name)}</option>`)
            .join('')}
        </select>
      </div>

      <div>
        <label class="drawer-group-label" for="drawer-keyword-input">Club or Suburb</label>
        <input
          type="search"
          id="drawer-keyword-input"
          class="text-input"
          placeholder="e.g. Bondi, Macquarie, Ryde, Manly"
        >
      </div>
    </div>

    <div class="drawer-footer">
      <button type="button" class="btn-secondary" id="reset-filters-btn">Reset</button>
      <button type="button" class="btn-primary" id="apply-filters-btn">Show ${clubs.length} Clubs</button>
    </div>
  </aside>

  <script id="sv-data" type="application/json">${JSON.stringify({
    clubs,
    regions,
    sydneyCenter: site.sydneyCenter
  })}</script>
`;

writeOut(
  'index.html',
  renderPage({
    site,
    title: site.defaultTitle,
    description: site.defaultDescription,
    canonicalPath: '/',
    includeLeaflet: true,
    scripts: ['/assets/app.js'],
    jsonLd: homeJsonLd,
    bodyHtml: homeBody
  })
);

// ============================================================================
// 404 PAGE, SITEMAP.XML, ROBOTS.TXT, LLMS.TXT, SITE.WEBMANIFEST
// ============================================================================
const notFoundBody = `
  <section class="container container--narrow" style="padding: 96px 24px; text-align: center;">
    <h1 style="font-family: var(--font-display); font-size: 30px; margin: 0 0 10px;">Page Not Found</h1>
    <p style="color: var(--text-secondary); margin: 0 0 24px;">Head back to the interactive Sydney volleyball club map.</p>
    <a href="/" class="btn-primary" style="display: inline-flex; width: auto; align-items: center;">Back to Sydney Volleyball</a>
  </section>
`;

writeOut(
  '404.html',
  renderPage({
    site,
    title: 'Page Not Found | Sydney Volleyball',
    description: site.defaultDescription,
    canonicalPath: '/404.html',
    includeLeaflet: false,
    scripts: ['/assets/app.js'],
    bodyHtml: notFoundBody,
    extraHead: '<meta name="robots" content="noindex, follow">'
  })
);

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.url}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
writeOut('sitemap.xml', sitemapXml);

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;
writeOut('robots.txt', robotsTxt);

const manifestJson = JSON.stringify(
  {
    name: 'Sydney Volleyball — powered by SPORTSHUB',
    short_name: 'SydneyVolleyball',
    description: site.defaultDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0C10',
    theme_color: '#0A0C10',
    icons: [
      { src: '/assets/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/assets/logo.png', sizes: '384x384', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  null,
  2
);
writeOut('site.webmanifest', manifestJson);

const llmsTxt = `# Sydney Volleyball (sydneyvolleyball.com)

> Sydney's dedicated volleyball discovery platform powered by SPORTSHUB. Interactive dark-mode map and directory of indoor, beach, social, junior, university, and competitive SVL volleyball clubs across Greater Sydney, NSW, Australia.

- Website: ${site.url}/

## Listed Sydney Volleyball Clubs (${clubs.length})
${clubs
  .map(
    (c) =>
      `- ${c.name} (${c.surface}) — ${c.venue}, ${c.address} | ${c.opportunities.join(', ')} | ${c.website}`
  )
  .join('\n')}
`;
writeOut('llms.txt', llmsTxt);

console.log(
  `Built streamlined single-page Sydney Volleyball site into dist/ (${clubs.length} pre-rendered clubs + SEO JSON-LD, sitemap.xml, robots.txt, llms.txt, OG image).`
);
