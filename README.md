# SydneyVolleyball — powered by SPORTSHUB

Minimalist dark-mode volleyball discovery platform for Greater Sydney (`https://sydneyvolleyball.com`).

## Features

- **Dark-Mode Interactive Map (\$0 Forever)**: Powered by [Leaflet](https://leafletjs.com/) + free Esri Dark Gray Canvas tiles (zero API keys, zero Google Maps billing), with distinct Court Gold (Indoor) and Pacific Sky (Beach) markers and direct Google Maps links.
- **Simple Slide-Over Filter Drawer**: Clean `Filter` button opens a right-side drawer on desktop and a smooth bottom sheet on mobile to filter by Court Surface (`All / Indoor / Beach`), Opportunities to Play (`Social`, `Competitive (SVL)`, `Juniors`, `Academy`, `University`, `Mixed`), Sydney Region, or Club/Suburb name.
- **Single-Page SEO Architecture**:
  - Zero-framework static HTML + Vanilla CSS + Vanilla JS for instant load and 100/100 Core Web Vitals.
  - All 28 Sydney volleyball clubs, addresses, descriptions, sessions, and FAQs are **pre-rendered directly in raw HTML** using semantic `<article>`, `<details>`, `<address>`, and Microdata (`SportsClub`, `PostalAddress`) so Google indexes everything without needing JS execution.
  - Complete JSON-LD `@graph` (`WebSite`, `Organization`, `CollectionPage`, `ItemList` of 28 `SportsClub` entities with `GeoCoordinates`, and `FAQPage`).
  - Australian regional SEO (`lang="en-AU"`, `hreflang="en-AU"`, `geo.region="AU-NSW"`), `sitemap.xml`, `robots.txt`, `llms.txt`, `site.webmanifest`, and 1200×630 Open Graph preview image (`og-image.png`).

## Local Development

```bash
# Build static site into dist/
npm run build

# Verify SEO tags, JSON-LD, Sydney coordinates, and pre-rendered clubs
npm run verify

# Build and serve locally on port 3000
npm run dev
```

## Updating Club Data

Edit `src/data/clubs.json` and run `npm run build && npm run verify`.

## Deploying to `sydneyvolleyball.com`

Connect this repository to **Vercel** (`vercel.json` included), **Cloudflare Pages**, or **Netlify** (`netlify.toml` included):
- **Build command:** `npm run build`
- **Output directory:** `dist`
