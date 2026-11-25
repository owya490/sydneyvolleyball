/**
 * Minimalist single-page HTML layout, brand lockup, SEO head tags, and clean club rows
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
      <img src="/assets/logo.png" alt="" width="24" height="24" class="brand-mark-img">
    </span>
    <span class="brand-text">
      <span class="brand-wordmark">Sydney<span>Volleyball</span></span>
      <span class="brand-powered">powered by <strong>${escapeHtml(site.poweredBy)}</strong></span>
    </span>
  `;

  if (!asLink) return `<div class="brand-lockup">${inner}</div>`;
  return `<a href="/" class="brand-lockup" aria-label="SydneyVolleyball powered by SPORTSHUB — Home">${inner}</a>`;
}

export function renderClubRow(club, regionMap) {
  const region = regionMap.get(club.region);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${club.name}, ${club.address}`
  )}`;
  const surfaceClass = club.surface === 'Beach' ? 'surface-dot--beach' : 'surface-dot--indoor';

  const tagsHtml = club.opportunities
    .filter((o) => o !== club.surface)
    .map((opp) => `<span class="club-tag">${escapeHtml(opp)}</span>`)
    .join('');

  return `
    <article class="club-row" data-club-slug="${escapeHtml(club.slug)}" itemscope itemtype="https://schema.org/SportsClub">
      <meta itemprop="sport" content="Volleyball">
      <details class="club-accordion">
        <summary class="club-row-main">
          <div class="club-row-info">
            <div class="club-title-line">
              <h2 class="club-name" itemprop="name">${escapeHtml(club.name)}</h2>
              <span class="surface-dot ${surfaceClass}">${escapeHtml(club.surface)}</span>
            </div>

            <div class="club-meta">
              <address class="club-address" itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
                <span itemprop="streetAddress">${escapeHtml(club.address)}</span>
                <meta itemprop="addressLocality" content="${escapeHtml(club.suburb)}">
                <meta itemprop="addressRegion" content="NSW">
                <meta itemprop="postalCode" content="${escapeHtml(club.postcode)}">
                <meta itemprop="addressCountry" content="AU">
              </address>
              <span class="meta-sep" aria-hidden="true">·</span>
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="maps-link" data-stop-toggle aria-label="Open ${escapeHtml(club.name)} in Google Maps">
                Google Maps ↗
              </a>
            </div>
          </div>

          <span class="accordion-chevron" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </summary>

        <div class="club-details">
          <div class="club-details-inner">
            <p class="club-details-desc" itemprop="description">${escapeHtml(club.shortDescription)}</p>

            <div class="club-tags">${tagsHtml}</div>

            <dl class="club-details-grid">
              <div>
                <dt class="detail-item-label">Venue</dt>
                <dd class="detail-item-value">${escapeHtml(club.venue)}</dd>
              </div>
              <div>
                <dt class="detail-item-label">Sessions</dt>
                <dd class="detail-item-value">${escapeHtml(club.schedule)}</dd>
              </div>
              <div>
                <dt class="detail-item-label">Area &amp; Levels</dt>
                <dd class="detail-item-value">${region ? escapeHtml(region.name) : 'Greater Sydney'} · ${escapeHtml(club.levels.join(', '))}</dd>
              </div>
            </dl>

            <div class="club-details-footer">
              <button type="button" class="btn-inline" data-locate-club="${escapeHtml(club.slug)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Show on Map
              </button>
              <a href="${escapeHtml(club.website)}" target="_blank" rel="noopener noreferrer" class="btn-inline" itemprop="url">
                Visit Club Website ↗
              </a>
            </div>
          </div>
        </div>
      </details>
    </article>
  `;
}

export function renderPage({
  site,
  title,
  description,
  canonicalPath = '/',
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

  <!-- Canonical & Australian Local SEO -->
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="en-AU" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}">
  <meta name="geo.region" content="AU-NSW">
  <meta name="geo.placename" content="Sydney">
  <meta name="geo.position" content="-33.8688;151.2093">
  <meta name="ICBM" content="-33.8688, 151.2093">

  <!-- Open Graph & Social Cards -->
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
  <link rel="icon" type="image/png" sizes="384x384" href="/assets/logo.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">

  ${
    includeLeaflet
      ? `<link rel="preconnect" href="https://unpkg.com" crossorigin>
  <link rel="preconnect" href="https://server.arcgisonline.com" crossorigin>
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
      <button type="button" class="nav-cta" data-open-submit-modal>List a Club</button>
    </div>
  </header>

  <main id="main-content">
    ${bodyHtml}
  </main>

  <footer class="site-footer">
    <div class="container footer-minimal">
      <div class="footer-brand">
        ${renderBrandLockup(site)}
      </div>
      <div class="footer-meta">
        <span>© ${new Date().getFullYear()} sydneyvolleyball.com · Sydney, NSW</span>
        <span aria-hidden="true">·</span>
        <button type="button" class="footer-text-btn" data-open-submit-modal>List a Club</button>
      </div>
    </div>
  </footer>

  <!-- Submit / Update a Club Modal -->
  <div class="modal-backdrop" id="submit-club-modal" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title" hidden>
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 id="submit-modal-title">List a Sydney Club</h2>
        <button type="button" class="icon-close" data-close-modal aria-label="Close modal">×</button>
      </div>
      <p class="modal-lead">Run an indoor, beach, social, or junior volleyball club in Sydney? Submit your details for a free listing on sydneyvolleyball.com.</p>
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
          <label for="submit-club-website">Website or Social Link</label>
          <input type="url" id="submit-club-website" name="clubWebsite" class="text-input" placeholder="https://">
        </div>
        <div class="form-field">
          <label for="submit-club-notes">Programs &amp; Playing Nights</label>
          <textarea id="submit-club-notes" name="clubNotes" class="form-textarea" placeholder="Indoor / Beach, Social, Juniors, SVL, playing days..."></textarea>
        </div>
        <button type="submit" class="btn-primary">Submit Club</button>
        <p class="modal-status" id="submit-club-status" role="status" hidden></p>
        <p class="modal-mailto-wrap">
          <a id="submit-mailto-fallback" class="inline-link" href="mailto:hello@sydneyvolleyball.com" hidden>Send via email client →</a>
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
