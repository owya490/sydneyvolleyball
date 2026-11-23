/**
 * Shared HTML layout, brand SVG lockup, SEO head tags, and club card renderer
 * Domain: https://sydneyvolleyball.com | Powered by SPORTSHUB
 */

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderBrandLockup(site, { asLink = true } = {}) {
  const inner = `
    <span class="brand-mark" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="24" stroke="#E6A93C" stroke-width="4.2"/>
        <path d="M12.5 19.5C22.5 22 31.2 29 37.5 41C40 45.8 41.2 51 40.8 55.2" stroke="#E6A93C" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M51.5 19.5C41.5 21.2 32.5 26 25.8 34.8C21.5 40.4 18.8 46.8 18 52.2" stroke="#E6A93C" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M20.5 11.5C28.8 15.5 36.8 17.2 45.5 16.5C49 16.2 52 15.5 54.2 14.5" stroke="#E6A93C" stroke-width="3.6" stroke-linecap="round"/>
      </svg>
    </span>
    <span class="brand-text">
      <span class="brand-wordmark">Sydney<span>Volleyball</span></span>
      <span class="brand-powered">powered by <strong>${escapeHtml(site.poweredBy)}</strong></span>
    </span>
  `;

  if (!asLink) return `<div class="brand-lockup">${inner}</div>`;
  return `<a href="/" class="brand-lockup" aria-label="SydneyVolleyball powered by SPORTSHUB — Home">${inner}</a>`;
}

export function renderClubRow(club, regionMap, { showLocateBtn = true } = {}) {
  const region = regionMap.get(club.region);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${club.name}, ${club.address}`
  )}`;
  const surfaceClass = club.surface === 'Beach' ? 'surface-dot--beach' : 'surface-dot--indoor';
  const detailsId = `club-details-${club.slug}`;

  const tagsHtml = club.opportunities
    .filter((o) => o !== club.surface)
    .slice(0, 4)
    .map((opp) => `<span class="club-tag">${escapeHtml(opp)}</span>`)
    .join('');

  return `
    <article class="club-row" data-club-slug="${escapeHtml(club.slug)}" itemscope itemtype="https://schema.org/SportsClub">
      <meta itemprop="sport" content="Volleyball">
      <div class="club-row-main">
        <div class="club-row-info">
          <div class="club-title-line">
            <h2 class="club-name" itemprop="name">
              <a href="/clubs/${escapeHtml(club.slug)}/">${escapeHtml(club.name)}</a>
            </h2>
            <span class="surface-dot ${surfaceClass}">${escapeHtml(club.surface)}</span>
          </div>

          <div class="club-meta">
            <span class="club-distance" data-dist-badge hidden>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span data-dist-value></span>
            </span>
            <span class="meta-sep" data-dist-sep hidden aria-hidden="true">·</span>
            <address class="club-address" itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
              <span itemprop="streetAddress">${escapeHtml(club.address)}</span>
              <meta itemprop="addressLocality" content="${escapeHtml(club.suburb)}">
              <meta itemprop="addressRegion" content="NSW">
              <meta itemprop="postalCode" content="${escapeHtml(club.postcode)}">
              <meta itemprop="addressCountry" content="AU">
            </address>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="maps-link" aria-label="Open ${escapeHtml(club.name)} in Google Maps">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Google Maps
            </a>
          </div>

          <div class="club-tags">${tagsHtml}</div>
        </div>

        <div class="club-row-actions">
          ${
            club.hasDirectRegister
              ? `<a href="${escapeHtml(club.registerUrl)}" target="_blank" rel="noopener noreferrer" class="btn-register" aria-label="Register with ${escapeHtml(club.name)}">Register</a>`
              : `<a href="/clubs/${escapeHtml(club.slug)}/" class="btn-register btn-register--subtle">Details</a>`
          }
          <button
            type="button"
            class="accordion-toggle"
            aria-expanded="false"
            aria-controls="${detailsId}"
            aria-label="Toggle details for ${escapeHtml(club.name)}"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="club-details" id="${detailsId}" hidden>
        <div class="club-details-inner">
          <p class="club-details-desc" itemprop="description">${escapeHtml(club.shortDescription)}</p>
          <div class="club-details-grid">
            <div>
              <span class="detail-item-label">Venue</span>
              <span class="detail-item-value">${escapeHtml(club.venue)}</span>
            </div>
            <div>
              <span class="detail-item-label">Typical Sessions</span>
              <span class="detail-item-value">${escapeHtml(club.schedule)}</span>
            </div>
            <div>
              <span class="detail-item-label">Levels &amp; Region</span>
              <span class="detail-item-value">${escapeHtml(club.levels.join(' · '))}${region ? ` (${escapeHtml(region.shortName)})` : ''}</span>
            </div>
          </div>
          <div class="club-details-footer">
            <div class="detail-action-group">
              ${
                showLocateBtn
                  ? `<button type="button" class="btn-inline" data-locate-club="${escapeHtml(club.slug)}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Show on Map
                    </button>`
                  : ''
              }
              <a href="${escapeHtml(club.website)}" target="_blank" rel="noopener noreferrer" class="btn-inline" itemprop="url">
                Visit Club Website ↗
              </a>
            </div>
            <a href="/clubs/${escapeHtml(club.slug)}/" class="profile-link">
              Full Club Profile →
            </a>
          </div>
        </div>
      </div>
    </article>
  `;
}

export function renderPage({
  site,
  regions,
  types,
  title,
  description,
  canonicalPath = '/',
  activeNav = '',
  includeLeaflet = true,
  scripts = [],
  jsonLd = null,
  bodyHtml = '',
  extraHead = ''
}) {
  const canonicalUrl = `${site.url}${canonicalPath}`;
  const ogImageUrl = `${site.url}/og-image.png`;
  const jsonLdScript = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="theme-color" content="#0A0C10">

  <!-- Canonical & Australian Regional SEO -->
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="en-AU" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}">
  <meta name="geo.region" content="AU-NSW">
  <meta name="geo.placename" content="Sydney">
  <meta name="geo.position" content="-33.8688;151.2093">
  <meta name="ICBM" content="-33.8688, 151.2093">

  <!-- Open Graph & Social Sharing -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(site.name)}">
  <meta property="og:locale" content="${escapeHtml(site.locale)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="SydneyVolleyball powered by SPORTSHUB — Interactive map of volleyball clubs across Greater Sydney">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">

  <!-- Icons & Manifest -->
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">

  ${
    includeLeaflet
      ? `<link rel="preconnect" href="https://unpkg.com" crossorigin>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">`
      : ''
  }

  <link rel="stylesheet" href="/assets/styles.css">
  ${extraHead}
  ${jsonLdScript}
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <header class="site-header">
    <div class="container header-inner">
      ${renderBrandLockup(site)}
      <nav class="header-nav" aria-label="Primary navigation">
        <a href="/#directory" class="nav-link nav-link--desktop" ${activeNav === 'home' ? 'aria-current="page"' : ''}>Club Map</a>
        <a href="/types/indoor-volleyball/" class="nav-link nav-link--desktop" ${activeNav === 'indoor-volleyball' ? 'aria-current="page"' : ''}>Indoor</a>
        <a href="/types/beach-volleyball/" class="nav-link nav-link--desktop" ${activeNav === 'beach-volleyball' ? 'aria-current="page"' : ''}>Beach</a>
        <a href="/types/social-volleyball/" class="nav-link nav-link--desktop" ${activeNav === 'social-volleyball' ? 'aria-current="page"' : ''}>Social</a>
        <a href="/#regions" class="nav-link nav-link--desktop">Regions</a>
        <button type="button" class="nav-cta" data-open-submit-modal>List a Club</button>
      </nav>
    </div>
  </header>

  <main id="main-content">
    ${bodyHtml}
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-about">
          ${renderBrandLockup(site)}
          <p>Sydney's dedicated volleyball discovery platform. Explore indoor courts, beach sand courts, social leagues, junior academies, and SVL clubs across Greater Sydney.</p>
        </div>

        <div class="footer-col">
          <h3>Ways to Play</h3>
          <ul class="footer-links">
            ${types
              .map(
                (t) =>
                  `<li><a href="/types/${escapeHtml(t.slug)}/">${escapeHtml(t.shortName)}</a></li>`
              )
              .join('')}
          </ul>
        </div>

        <div class="footer-col">
          <h3>Sydney Regions</h3>
          <ul class="footer-links">
            ${regions
              .slice(0, 5)
              .map(
                (r) =>
                  `<li><a href="/regions/${escapeHtml(r.slug)}/">${escapeHtml(r.shortName)}</a></li>`
              )
              .join('')}
          </ul>
        </div>

        <div class="footer-col">
          <h3>More Areas &amp; Info</h3>
          <ul class="footer-links">
            ${regions
              .slice(5)
              .map(
                (r) =>
                  `<li><a href="/regions/${escapeHtml(r.slug)}/">${escapeHtml(r.shortName)}</a></li>`
              )
              .join('')}
            <li><a href="/#faq">Sydney Volleyball FAQ</a></li>
            <li><a href="/sitemap.xml">Sitemap</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} SydneyVolleyball · powered by SPORTSHUB · sydneyvolleyball.com</span>
        <span>Map data © OpenStreetMap contributors · Free &amp; open club discovery for Sydney, NSW</span>
      </div>
    </div>
  </footer>

  <!-- Submit / Update a Club Modal -->
  <div class="modal-backdrop" id="submit-club-modal" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title" hidden>
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 id="submit-modal-title">List or Update a Sydney Club</h2>
        <button type="button" class="modal-close" data-close-modal aria-label="Close modal">×</button>
      </div>
      <p class="modal-lead">Run an indoor, beach, social, or junior volleyball club in Greater Sydney? Submit your venue details for a free listing on sydneyvolleyball.com.</p>
      <form id="submit-club-form">
        <div class="form-field">
          <label for="submit-club-name">Club Name *</label>
          <input type="text" id="submit-club-name" name="clubName" class="text-input" placeholder="e.g. Inner West Volleyball Club" required>
        </div>
        <div class="form-field">
          <label for="submit-club-suburb">Venue &amp; Suburb *</label>
          <input type="text" id="submit-club-suburb" name="clubSuburb" class="text-input" placeholder="e.g. Sydney Olympic Park NSW 2127" required>
        </div>
        <div class="form-field">
          <label for="submit-club-website">Website or Registration Link</label>
          <input type="url" id="submit-club-website" name="clubWebsite" class="text-input" placeholder="https://">
        </div>
        <div class="form-field">
          <label for="submit-club-notes">Programs &amp; Playing Nights</label>
          <textarea id="submit-club-notes" name="clubNotes" class="form-textarea" placeholder="Indoor / Beach, Social, Juniors, SVL, playing days..."></textarea>
        </div>
        <button type="submit" class="btn-search">Submit Club Listing</button>
        <p class="modal-status" id="submit-club-status" role="status" hidden></p>
        <p style="margin: 10px 0 0; font-size: 12.5px;">
          <a id="submit-mailto-fallback" class="profile-link" href="mailto:hello@sydneyvolleyball.com" hidden>Send via email client →</a>
        </p>
      </form>
    </div>
  </div>

  ${
    includeLeaflet
      ? `<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="" defer></script>`
      : ''
  }
  ${scripts.map((src) => `<script src="${escapeHtml(src)}" defer></script>`).join('\n  ')}
</body>
</html>`;
}
