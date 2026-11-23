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
const suburbs = JSON.parse(fs.readFileSync(path.join(SRC, 'data/suburbs.json'), 'utf8'));

const { site, regions, types, opportunities, faqs } = meta;
const regionMap = new Map(regions.map((r) => [r.slug, r]));
const today = new Date().toISOString().slice(0, 10);

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function writeOut(relPath, content) {
  const fullPath = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function clubSchemaEntity(club) {
  return {
    '@type': 'SportsClub',
    '@id': `${site.url}/clubs/${club.slug}/#club`,
    name: club.name,
    description: club.shortDescription,
    sport: 'Volleyball',
    url: `${site.url}/clubs/${club.slug}/`,
    sameAs: club.website,
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

// Copy static assets
for (const file of ['styles.css', 'app.js', 'club-map.js', 'favicon.svg']) {
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

const sitemapEntries = [];
function registerUrl(urlPath, priority = '0.7', changefreq = 'weekly') {
  sitemapEntries.push({
    loc: `${site.url}${urlPath}`,
    lastmod: today,
    changefreq,
    priority
  });
}

// ============================================================================
// 1. HOMEPAGE (/)
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
      inLanguage: 'en-AU',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${site.url}/?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@type': 'Organization',
      '@id': `${site.url}/#organization`,
      name: 'Sydney Volleyball',
      legalName: 'SydneyVolleyball powered by SPORTSHUB',
      url: `${site.url}/`,
      logo: `${site.url}/assets/favicon.svg`,
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

const indoorCount = clubs.filter((c) => c.opportunities.includes('Indoor')).length;
const beachCount = clubs.filter((c) => c.opportunities.includes('Beach')).length;
const socialCount = clubs.filter((c) => c.opportunities.includes('Social')).length;
const juniorsCount = clubs.filter((c) => c.opportunities.includes('Juniors')).length;
const svlCount = clubs.filter((c) => c.opportunities.includes('Competitive (SVL)')).length;

const homeBody = `
  <!-- Compact Discovery Strip -->
  <section class="discovery-strip">
    <div class="container discovery-strip-inner">
      <div class="discovery-heading">
        <h1>Sydney Volleyball Clubs &amp; Courts</h1>
        <p>Explore ${clubs.length} indoor, beach, social, junior, and SVL volleyball clubs across Greater Sydney.</p>
      </div>
      <div class="quick-filters" role="group" aria-label="Quick format filter">
        <button type="button" class="quick-pill is-active" data-quick-filter="all">All (${clubs.length})</button>
        <button type="button" class="quick-pill" data-quick-filter="Indoor">Indoor (${indoorCount})</button>
        <button type="button" class="quick-pill" data-quick-filter="Beach">Beach (${beachCount})</button>
        <button type="button" class="quick-pill" data-quick-filter="Social">Social (${socialCount})</button>
        <button type="button" class="quick-pill" data-quick-filter="Juniors">Juniors (${juniorsCount})</button>
        <button type="button" class="quick-pill" data-quick-filter="Competitive (SVL)">SVL (${svlCount})</button>
      </div>
    </div>
  </section>

  <!-- Full-Width Interactive Dark Map (OpenStreetMap / Leaflet) -->
  <section class="map-section" id="map-section" aria-label="Interactive map of volleyball clubs in Sydney">
    <div id="sydney-map"></div>

    <div class="map-controls-tl" role="group" aria-label="Map style">
      <button type="button" class="map-mode-btn is-active" data-map-mode="dark" aria-pressed="true">Dark</button>
      <button type="button" class="map-mode-btn" data-map-mode="street" aria-pressed="false">Street</button>
      <button type="button" class="map-mode-btn" data-map-mode="satellite" aria-pressed="false">Satellite</button>
    </div>

    <div class="map-controls-tr">
      <button type="button" class="map-icon-btn" id="reset-map-view" title="Reset Sydney view">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        <span>Sydney View</span>
      </button>
      <button type="button" class="map-icon-btn" id="toggle-map-fullscreen" aria-pressed="false" title="Toggle fullscreen map">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="15 3 21 3 21 9"/>
          <polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/>
          <line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
        <span>Expand</span>
      </button>
    </div>

    <div class="map-legend" aria-label="Map marker legend">
      <span class="legend-item"><span class="legend-dot legend-dot--indoor"></span>Indoor</span>
      <span class="legend-item"><span class="legend-dot legend-dot--beach"></span>Beach</span>
      <span class="legend-item"><span class="legend-dot legend-dot--radius"></span>Search Radius</span>
    </div>
  </section>

  <!-- Main Two-Column Discovery Directory (Mirrors Reference Layout) -->
  <section class="directory-section" id="directory" aria-label="Sydney volleyball club directory">
    <div class="container directory-grid">
      <!-- Left Sidebar: REFINE SEARCH -->
      <aside class="refine-sidebar" aria-label="Refine search filters">
        <h2 class="sidebar-eyebrow">Refine Search</h2>
        <form id="refine-form" novalidate>
          <!-- Location -->
          <div class="filter-group">
            <div class="filter-label">
              <label for="location-input">Location</label>
              <button type="button" class="geo-btn" id="use-my-location">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
                Near me
              </button>
            </div>
            <div class="input-wrap">
              <input
                type="text"
                id="location-input"
                class="text-input"
                placeholder="Suburb or postcode (e.g. Carlingford 2118)"
                autocomplete="off"
                aria-autocomplete="list"
                aria-controls="suburb-dropdown"
              >
              <button type="button" class="input-clear-btn" id="location-clear" aria-label="Clear location" hidden>×</button>
              <div class="suburb-dropdown" id="suburb-dropdown" role="listbox" aria-label="Sydney suburb suggestions" hidden></div>
            </div>
          </div>

          <!-- Distance (km) -->
          <div class="filter-group">
            <span class="filter-label">Distance (km)</span>
            <div class="distance-grid" role="group" aria-label="Search distance in kilometres">
              <button type="button" class="distance-chip" data-distance="5" aria-pressed="false">5</button>
              <button type="button" class="distance-chip" data-distance="10" aria-pressed="false">10</button>
              <button type="button" class="distance-chip" data-distance="25" aria-pressed="false">25</button>
              <button type="button" class="distance-chip" data-distance="50" aria-pressed="false">50</button>
              <button type="button" class="distance-chip" data-distance="100" aria-pressed="false">100</button>
              <button type="button" class="distance-chip is-active" data-distance="all" aria-pressed="true">All</button>
            </div>
          </div>

          <!-- Opportunities to Play -->
          <div class="filter-accordion">
            <button
              type="button"
              class="filter-accordion-trigger"
              aria-expanded="true"
              aria-controls="opp-filter-body"
            >
              <span>Opportunities to Play</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="filter-accordion-body" id="opp-filter-body">
              <div class="checkbox-list">
                ${opportunities
                  .map(
                    (opp) => `
                  <label class="checkbox-item">
                    <input type="checkbox" value="${escapeHtml(opp)}" data-opportunity>
                    <span>${escapeHtml(opp)}</span>
                  </label>`
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <!-- Region & Keyword -->
          <div class="filter-accordion">
            <button
              type="button"
              class="filter-accordion-trigger"
              aria-expanded="false"
              aria-controls="more-filter-body"
            >
              <span>Region &amp; Club Name</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="filter-accordion-body" id="more-filter-body" hidden>
              <div class="filter-group" style="margin-bottom: 12px;">
                <label class="filter-label" for="region-select">Sydney Region</label>
                <select id="region-select" class="select-input">
                  <option value="">All Greater Sydney</option>
                  ${regions
                    .map(
                      (r) =>
                        `<option value="${escapeHtml(r.slug)}">${escapeHtml(r.name)}</option>`
                    )
                    .join('')}
                </select>
              </div>
              <div class="filter-group" style="margin-bottom: 0;">
                <label class="filter-label" for="keyword-input">Club or Venue Name</label>
                <input
                  type="search"
                  id="keyword-input"
                  class="text-input"
                  style="padding-right: 13px;"
                  placeholder="e.g. Macquarie, Obsidian, Manly"
                >
              </div>
            </div>
          </div>

          <button type="submit" class="btn-search">Search</button>
          <button type="button" class="btn-reset" id="reset-filters">Reset all filters</button>
        </form>
      </aside>

      <!-- Right Column: Results List -->
      <div class="results-column">
        <div class="results-header">
          <div class="results-count-wrap" aria-live="polite">
            <span class="results-count" id="results-count">${clubs.length} RESULTS</span>
            <span class="results-context" id="results-context">across Greater Sydney</span>
          </div>
          <label class="sort-control">
            <span>Sort</span>
            <select id="sort-select" class="sort-select" aria-label="Sort volleyball clubs">
              <option value="default">Relevance / Distance</option>
              <option value="name">Club Name (A–Z)</option>
              <option value="region">Sydney Region</option>
            </select>
          </label>
        </div>

        <div class="club-list" id="club-list">
          ${clubs.map((club) => renderClubRow(club, regionMap, { showLocateBtn: true })).join('')}
        </div>

        <div class="empty-state" id="empty-state" hidden>
          <h3>No volleyball clubs match these filters</h3>
          <p>Try expanding your distance radius or clearing one of your selected opportunities to play.</p>
          <button type="button" class="btn-register" id="empty-reset-btn">Show All ${clubs.length} Sydney Clubs</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Browse by Sydney Region (Internal SEO Hub) -->
  <section class="seo-band seo-band--surface" id="regions" aria-labelledby="regions-heading">
    <div class="container">
      <div class="section-header">
        <div>
          <h2 id="regions-heading">Volleyball Clubs by Sydney Region</h2>
          <p>Jump straight to indoor courts, beach sand venues, and local associations across every part of Greater Sydney.</p>
        </div>
      </div>
      <div class="region-grid">
        ${regions
          .map((r) => {
            const count = clubs.filter((c) => c.region === r.slug).length;
            return `
            <a href="/regions/${escapeHtml(r.slug)}/" class="region-card">
              <div class="region-card-top">
                <h3>${escapeHtml(r.name)}</h3>
                <span class="region-count">${count} ${count === 1 ? 'club' : 'clubs'}</span>
              </div>
              <p class="region-suburbs">${escapeHtml(r.suburbs)}</p>
            </a>`;
          })
          .join('')}
      </div>
    </div>
  </section>

  <!-- Ways to Play (Format Hub) -->
  <section class="seo-band" aria-labelledby="formats-heading">
    <div class="container">
      <div class="section-header">
        <div>
          <h2 id="formats-heading">Find Your Way to Play in Sydney</h2>
          <p>Whether you are chasing sunset beach games, beginner-friendly social nights, youth academies, or SVL divisions.</p>
        </div>
      </div>
      <div class="type-grid">
        ${types
          .map((t) => {
            const count = clubs.filter((c) => c.opportunities.includes(t.filterOpportunity)).length;
            return `
            <a href="/types/${escapeHtml(t.slug)}/" class="type-card">
              <h3>${escapeHtml(t.shortName)}</h3>
              <p>${escapeHtml(t.intro.slice(0, 128))}…</p>
              <span class="type-card-link">Explore ${count} Sydney clubs →</span>
            </a>`;
          })
          .join('')}
      </div>
    </div>
  </section>

  <!-- Sydney Volleyball FAQ (Backed by FAQPage JSON-LD) -->
  <section class="seo-band seo-band--surface" id="faq" aria-labelledby="faq-heading">
    <div class="container">
      <div class="section-header">
        <div>
          <h2 id="faq-heading">Sydney Volleyball — Frequently Asked Questions</h2>
          <p>Everything players, beginners, and families need to know about joining a volleyball club in Sydney, NSW.</p>
        </div>
      </div>
      <div class="faq-list">
        ${faqs
          .map(
            (item, idx) => `
          <details class="faq-item" ${idx < 2 ? 'open' : ''}>
            <summary>${escapeHtml(item.question)}</summary>
            <p>${escapeHtml(item.answer)}</p>
          </details>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <script id="sv-data" type="application/json">${JSON.stringify({
    clubs,
    suburbs,
    sydneyCenter: site.sydneyCenter
  })}</script>
`;

writeOut(
  'index.html',
  renderPage({
    site,
    regions,
    types,
    title: site.defaultTitle,
    description: site.defaultDescription,
    canonicalPath: '/',
    activeNav: 'home',
    includeLeaflet: true,
    scripts: ['/assets/app.js'],
    jsonLd: homeJsonLd,
    bodyHtml: homeBody
  })
);
registerUrl('/', '1.0', 'daily');

// ============================================================================
// 2. INDIVIDUAL CLUB PROFILE PAGES (/clubs/<slug>/)
// ============================================================================
for (const club of clubs) {
  const region = regionMap.get(club.region);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${club.name}, ${club.address}`
  )}`;

  // Find 3 nearest clubs for rich local internal linking
  const nearby = clubs
    .filter((other) => other.slug !== club.slug)
    .map((other) => ({
      ...other,
      distKm: haversineKm(club.lat, club.lng, other.lat, other.lng)
    }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 3);

  const clubJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      clubSchemaEntity(club),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Sydney Volleyball', item: `${site.url}/` },
          ...(region
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: region.name,
                  item: `${site.url}/regions/${region.slug}/`
                }
              ]
            : []),
          {
            '@type': 'ListItem',
            position: region ? 3 : 2,
            name: club.name,
            item: `${site.url}/clubs/${club.slug}/`
          }
        ]
      }
    ]
  };

  const clubBody = `
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Sydney Volleyball</a>
        <span aria-hidden="true">/</span>
        ${
          region
            ? `<a href="/regions/${escapeHtml(region.slug)}/">${escapeHtml(region.name)}</a><span aria-hidden="true">/</span>`
            : ''
        }
        <span aria-current="page">${escapeHtml(club.name)}</span>
      </nav>

      <header class="subpage-hero">
        <div class="club-title-line" style="margin-bottom: 10px;">
          <span class="surface-dot ${club.surface === 'Beach' ? 'surface-dot--beach' : 'surface-dot--indoor'}">${escapeHtml(club.surface)} Volleyball</span>
          <span class="club-tag">${escapeHtml(club.affiliated)}</span>
        </div>
        <h1>${escapeHtml(club.name)}</h1>
        <p class="subpage-hero-lead">${escapeHtml(club.shortDescription)}</p>
      </header>

      <section class="club-profile-grid" aria-label="Club details and venue map">
        <div class="info-panel">
          <h2>Club &amp; Venue Information</h2>
          <dl class="info-list">
            <div class="info-row">
              <dt>Home Venue</dt>
              <dd>${escapeHtml(club.venue)}</dd>
            </div>
            <div class="info-row">
              <dt>Address</dt>
              <dd>${escapeHtml(club.address)}</dd>
            </div>
            <div class="info-row">
              <dt>Region</dt>
              <dd>${
                region
                  ? `<a href="/regions/${escapeHtml(region.slug)}/" class="profile-link">${escapeHtml(region.name)}</a>`
                  : 'Greater Sydney'
              }</dd>
            </div>
            <div class="info-row">
              <dt>Opportunities</dt>
              <dd>
                <div class="club-tags" style="margin-top: 0;">
                  ${club.opportunities.map((o) => `<span class="club-tag">${escapeHtml(o)}</span>`).join('')}
                </div>
              </dd>
            </div>
            <div class="info-row">
              <dt>Skill Levels</dt>
              <dd>${escapeHtml(club.levels.join(' · '))}</dd>
            </div>
            <div class="info-row">
              <dt>Sessions</dt>
              <dd>${escapeHtml(club.schedule)}</dd>
            </div>
          </dl>

          <div class="profile-cta-row">
            <a href="${escapeHtml(club.registerUrl)}" target="_blank" rel="noopener noreferrer" class="btn-register">
              ${club.hasDirectRegister ? 'Register / Join Club ↗' : 'Visit Club Directory ↗'}
            </a>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-inline">
              Directions in Google Maps ↗
            </a>
            <a href="/?q=${encodeURIComponent(`${club.suburb} ${club.postcode}`)}&km=10" class="btn-inline">
              Find Clubs Near ${escapeHtml(club.suburb)}
            </a>
          </div>
        </div>

        <div class="mini-map-card">
          <div id="subpage-map" class="mini-map-canvas" aria-label="Map location of ${escapeHtml(club.name)}"></div>
          <div class="mini-map-caption">
            <span>${escapeHtml(club.suburb)} NSW ${escapeHtml(club.postcode)}</span>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="maps-link">Open Google Maps ↗</a>
          </div>
        </div>
      </section>
    </div>

    <section class="seo-band seo-band--surface" aria-labelledby="nearby-heading">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 id="nearby-heading">Nearby Volleyball Clubs to ${escapeHtml(club.suburb)}</h2>
            <p>Compare other indoor and beach volleyball clubs closest to ${escapeHtml(club.venue)}.</p>
          </div>
          <a href="/" class="profile-link">View Full Sydney Map →</a>
        </div>
        <div class="nearby-grid">
          ${nearby
            .map(
              (n) => `
            <a href="/clubs/${escapeHtml(n.slug)}/" class="region-card">
              <div class="region-card-top">
                <h3>${escapeHtml(n.name)}</h3>
                <span class="region-count">${n.distKm < 10 ? n.distKm.toFixed(1) : Math.round(n.distKm)} km</span>
              </div>
              <p class="region-suburbs">${escapeHtml(n.venue)} · ${escapeHtml(n.suburb)} NSW ${escapeHtml(n.postcode)}</p>
            </a>`
            )
            .join('')}
        </div>
      </div>
    </section>

    <script id="subpage-map-data" type="application/json">${JSON.stringify({
      center: { lat: club.lat, lng: club.lng, zoom: 14 },
      pins: [
        {
          name: club.name,
          address: club.address,
          surface: club.surface,
          lat: club.lat,
          lng: club.lng
        }
      ]
    })}</script>
  `;

  writeOut(
    `clubs/${club.slug}/index.html`,
    renderPage({
      site,
      regions,
      types,
      title: `${club.name} — ${club.suburb} Volleyball Club | Sydney Volleyball`,
      description: `${club.name} plays ${club.surface.toLowerCase()} volleyball at ${club.venue}, ${club.address}. Offering ${club.opportunities.join(', ')} in ${club.suburb}, Sydney.`,
      canonicalPath: `/clubs/${club.slug}/`,
      includeLeaflet: true,
      scripts: ['/assets/app.js', '/assets/club-map.js'],
      jsonLd: clubJsonLd,
      bodyHtml: clubBody
    })
  );
  registerUrl(`/clubs/${club.slug}/`, '0.8', 'weekly');
}

// ============================================================================
// 3. REGION HUB PAGES (/regions/<slug>/)
// ============================================================================
for (const region of regions) {
  const regionClubs = clubs.filter((c) => c.region === region.slug);

  const regionJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${region.name} Volleyball Clubs`,
        description: region.metaDescription,
        url: `${site.url}/regions/${region.slug}/`
      },
      {
        '@type': 'ItemList',
        name: `Volleyball Clubs in ${region.name}, Sydney`,
        numberOfItems: regionClubs.length,
        itemListElement: regionClubs.map((c, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: clubSchemaEntity(c)
        }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Sydney Volleyball', item: `${site.url}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: region.name,
            item: `${site.url}/regions/${region.slug}/`
          }
        ]
      }
    ]
  };

  const regionBody = `
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Sydney Volleyball</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">${escapeHtml(region.name)}</span>
      </nav>

      <header class="subpage-hero">
        <h1>${escapeHtml(region.name)} Volleyball Clubs</h1>
        <p class="subpage-hero-lead">${escapeHtml(region.intro)}</p>
        <p style="margin: 12px 0 0; font-size: 13px; color: var(--text-muted);">Key suburbs: ${escapeHtml(region.suburbs)}</p>
      </header>
    </div>

    <section class="map-section" style="height: 360px;" aria-label="Map of volleyball clubs in ${escapeHtml(region.name)}">
      <div id="subpage-map" style="width: 100%; height: 100%;"></div>
    </section>

    <section class="directory-section">
      <div class="container">
        <div class="results-header">
          <div class="results-count-wrap">
            <span class="results-count">${regionClubs.length} ${regionClubs.length === 1 ? 'CLUB' : 'CLUBS'}</span>
            <span class="results-context">in ${escapeHtml(region.name)}</span>
          </div>
          <a href="/?region=${escapeHtml(region.slug)}" class="profile-link">Filter on Main Sydney Map →</a>
        </div>

        <div class="club-list">
          ${regionClubs.map((c) => renderClubRow(c, regionMap, { showLocateBtn: false })).join('')}
        </div>
      </div>
    </section>

    <section class="seo-band seo-band--surface">
      <div class="container">
        <div class="section-header">
          <div>
            <h2>Explore Other Sydney Regions</h2>
            <p>Browse volleyball clubs across neighboring parts of Greater Sydney.</p>
          </div>
        </div>
        <div class="region-grid">
          ${regions
            .filter((r) => r.slug !== region.slug)
            .map((r) => {
              const cnt = clubs.filter((c) => c.region === r.slug).length;
              return `
              <a href="/regions/${escapeHtml(r.slug)}/" class="region-card">
                <div class="region-card-top">
                  <h3>${escapeHtml(r.name)}</h3>
                  <span class="region-count">${cnt} ${cnt === 1 ? 'club' : 'clubs'}</span>
                </div>
                <p class="region-suburbs">${escapeHtml(r.suburbs)}</p>
              </a>`;
            })
            .join('')}
        </div>
      </div>
    </section>

    <script id="subpage-map-data" type="application/json">${JSON.stringify({
      center: region.center,
      pins: regionClubs.map((c) => ({
        name: c.name,
        address: c.address,
        surface: c.surface,
        lat: c.lat,
        lng: c.lng,
        url: `/clubs/${c.slug}/`
      }))
    })}</script>

    <script>
      document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.accordion-toggle').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('aria-controls');
            const panel = id && document.getElementById(id);
            const open = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!open));
            if (panel) panel.hidden = open;
          });
        });
      });
    </script>
  `;

  writeOut(
    `regions/${region.slug}/index.html`,
    renderPage({
      site,
      regions,
      types,
      title: region.metaTitle,
      description: region.metaDescription,
      canonicalPath: `/regions/${region.slug}/`,
      includeLeaflet: true,
      scripts: ['/assets/app.js', '/assets/club-map.js'],
      jsonLd: regionJsonLd,
      bodyHtml: regionBody
    })
  );
  registerUrl(`/regions/${region.slug}/`, '0.85', 'weekly');
}

// ============================================================================
// 4. PLAY FORMAT / TYPE PAGES (/types/<slug>/)
// ============================================================================
for (const typeItem of types) {
  const matchedClubs = clubs.filter((c) => c.opportunities.includes(typeItem.filterOpportunity));

  const typeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: typeItem.name,
        description: typeItem.metaDescription,
        url: `${site.url}/types/${typeItem.slug}/`
      },
      {
        '@type': 'ItemList',
        name: typeItem.name,
        numberOfItems: matchedClubs.length,
        itemListElement: matchedClubs.map((c, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: clubSchemaEntity(c)
        }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Sydney Volleyball', item: `${site.url}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: typeItem.shortName,
            item: `${site.url}/types/${typeItem.slug}/`
          }
        ]
      }
    ]
  };

  const typeBody = `
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Sydney Volleyball</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">${escapeHtml(typeItem.shortName)}</span>
      </nav>

      <header class="subpage-hero">
        <h1>${escapeHtml(typeItem.name)}</h1>
        <p class="subpage-hero-lead">${escapeHtml(typeItem.intro)}</p>
      </header>
    </div>

    <section class="map-section" style="height: 360px;" aria-label="Map of ${escapeHtml(typeItem.name)}">
      <div id="subpage-map" style="width: 100%; height: 100%;"></div>
    </section>

    <section class="directory-section">
      <div class="container">
        <div class="results-header">
          <div class="results-count-wrap">
            <span class="results-count">${matchedClubs.length} CLUBS</span>
            <span class="results-context">offering ${escapeHtml(typeItem.shortName)} across Greater Sydney</span>
          </div>
          <a href="/?play=${encodeURIComponent(typeItem.filterOpportunity)}" class="profile-link">Search by Suburb on Main Map →</a>
        </div>

        <div class="club-list">
          ${matchedClubs.map((c) => renderClubRow(c, regionMap, { showLocateBtn: false })).join('')}
        </div>
      </div>
    </section>

    <script id="subpage-map-data" type="application/json">${JSON.stringify({
      center: site.sydneyCenter,
      pins: matchedClubs.map((c) => ({
        name: c.name,
        address: c.address,
        surface: c.surface,
        lat: c.lat,
        lng: c.lng,
        url: `/clubs/${c.slug}/`
      }))
    })}</script>

    <script>
      document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.accordion-toggle').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('aria-controls');
            const panel = id && document.getElementById(id);
            const open = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!open));
            if (panel) panel.hidden = open;
          });
        });
      });
    </script>
  `;

  writeOut(
    `types/${typeItem.slug}/index.html`,
    renderPage({
      site,
      regions,
      types,
      title: typeItem.metaTitle,
      description: typeItem.metaDescription,
      canonicalPath: `/types/${typeItem.slug}/`,
      activeNav: typeItem.slug,
      includeLeaflet: true,
      scripts: ['/assets/app.js', '/assets/club-map.js'],
      jsonLd: typeJsonLd,
      bodyHtml: typeBody
    })
  );
  registerUrl(`/types/${typeItem.slug}/`, '0.9', 'weekly');
}

// ============================================================================
// 5. 404 PAGE, SITEMAP.XML, ROBOTS.TXT, LLMS.TXT, SITE.WEBMANIFEST
// ============================================================================
const notFoundBody = `
  <section class="container" style="padding: 96px 24px; text-align: center; max-width: 600px;">
    <p class="sidebar-eyebrow" style="margin-bottom: 10px;">404 — Page Not Found</p>
    <h1 style="font-family: var(--font-display); font-size: 32px; margin: 0 0 12px;">That court is out of bounds.</h1>
    <p style="color: var(--text-secondary); margin: 0 0 28px;">Explore our interactive Sydney volleyball map to find indoor, beach, social, and junior clubs near you.</p>
    <a href="/" class="btn-register">Back to Sydney Volleyball Map</a>
  </section>
`;

writeOut(
  '404.html',
  renderPage({
    site,
    regions,
    types,
    title: 'Page Not Found | Sydney Volleyball',
    description: 'Find indoor, beach, social, and junior volleyball clubs across Greater Sydney on sydneyvolleyball.com.',
    canonicalPath: '/404.html',
    includeLeaflet: false,
    scripts: ['/assets/app.js'],
    bodyHtml: notFoundBody,
    extraHead: '<meta name="robots" content="noindex, follow">'
  })
);

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
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
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  null,
  2
);
writeOut('site.webmanifest', manifestJson);

// AI / GEO Discovery file (llms.txt)
const llmsTxt = `# Sydney Volleyball (sydneyvolleyball.com)

> Sydney's dedicated volleyball discovery platform powered by SPORTSHUB. Interactive map and directory of indoor, beach, social, junior, university, and competitive SVL volleyball clubs across Greater Sydney, NSW, Australia.

## Core Pages
- Homepage & Interactive Map: ${site.url}/
${types.map((t) => `- ${t.name}: ${site.url}/types/${t.slug}/`).join('\n')}

## Sydney Regions
${regions.map((r) => `- ${r.name} (${r.suburbs}): ${site.url}/regions/${r.slug}/`).join('\n')}

## Listed Sydney Volleyball Clubs (${clubs.length})
${clubs
  .map(
    (c) =>
      `- ${c.name} (${c.surface}) — ${c.venue}, ${c.address} | Opportunities: ${c.opportunities.join(', ')} | ${site.url}/clubs/${c.slug}/`
  )
  .join('\n')}
`;
writeOut('llms.txt', llmsTxt);

console.log(
  `Built Sydney Volleyball static site into dist/: ${sitemapEntries.length} indexable SEO pages (+ 404, sitemap.xml, robots.txt, llms.txt, manifest, OG image).`
);
