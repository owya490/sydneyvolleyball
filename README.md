# SydneyVolleyball — powered by SPORTSHUB

Interactive dark-mode volleyball discovery platform for Greater Sydney (`https://sydneyvolleyball.com`).

## Features

- **Free Interactive Dark-Mode Map**: Powered by [Leaflet](https://leafletjs.com/) + free Esri Dark Gray Canvas, OpenStreetMap Street, and Esri World Imagery Satellite layers — **\$0 forever**, zero API keys, zero Google Maps billing, with a Dark / Street / Satellite switcher and deep links to Google Maps directions on every club.
- **Suburb, Postcode & Radius Search**: Instant zero-cost client-side distance search across 100+ Greater Sydney suburbs & postcodes (e.g., `Carlingford 2118`, `Bondi Beach 2026`, `Parramatta 2150`, `Manly 2095`), browser geolocation ("Near me"), and free OpenStreetMap Nominatim fallback for any NSW street address.
- **Opportunities to Play Filtering**: Filter by Indoor, Beach, Social, Competitive (SVL), Juniors, Academy, University, and Mixed — synced live with the map pins, distance radius circle, and shareable URL parameters.
- **Pre-Rendered Programmatic SEO Architecture**:
  - Zero-framework static HTML + Vanilla CSS + Vanilla JS for instant First Contentful Paint and 100/100 Core Web Vitals.
  - **41 indexable static pages** generated from a single source of truth (`src/data/clubs.json`):
    - `/` — Main interactive Sydney map & full pre-rendered 28-club directory
    - `/clubs/<slug>/` — 28 dedicated club profile pages with venue map & 3 nearest clubs
    - `/regions/<slug>/` — 8 regional hub pages (North Shore & Ryde, Inner West & Olympic Park, Eastern Suburbs, Northern Beaches, Hills District, Western Sydney, CBD & City South, South & South West)
    - `/types/<slug>/` — 4 format hub pages (Indoor, Beach, Social, Junior Volleyball in Sydney)
  - Full JSON-LD `@graph` (`WebSite` + `SearchAction`, `Organization`, `ItemList`, `SportsClub` + `PostalAddress` + `GeoCoordinates`, `FAQPage`, `BreadcrumbList`).
  - Australian local SEO (`lang="en-AU"`, `hreflang="en-AU"`, `geo.region="AU-NSW"`), `sitemap.xml`, `robots.txt`, `llms.txt`, `site.webmanifest`, and generated 1200×630 Open Graph preview card (`og-image.png`).

## Local Development

```bash
# Build all static pages into dist/
npm run build

# Verify SEO tags, JSON-LD, Sydney coordinates, and internal links
npm run verify

# Build and serve locally at http://localhost:3000
npm run dev
```

## Updating Club Data

All clubs live in `src/data/clubs.json`. Add or update an entry, then run:

```bash
npm run build && npm run verify
```

Every page — homepage directory, map pins, club profile page, regional hub, format hub, `sitemap.xml`, and `llms.txt` — updates automatically.

## Deploying to `sydneyvolleyball.com`

Ready for one-click static deployment on **Cloudflare Pages**, **Vercel** (`vercel.json` included), **Netlify** (`netlify.toml` included), or **GitHub Pages**:
- **Build command**: `npm run build`
- **Output directory**: `dist`
- Point `sydneyvolleyball.com` DNS (apex + `www` 301 redirect to apex) and submit `https://sydneyvolleyball.com/sitemap.xml` in Google Search Console.
