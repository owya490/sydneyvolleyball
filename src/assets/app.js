/* ==========================================================================
   Sydney Volleyball — Interactive Map & Club Discovery Engine
   Uses Leaflet + OpenStreetMap / CartoDB Dark Matter (100% Free, Zero API Key)
   ========================================================================== */

(() => {
  'use strict';

  const DATA_EL = document.getElementById('sv-data');
  const CLUB_MODAL_BTN = document.querySelectorAll('[data-open-submit-modal]');
  const SUBMIT_MODAL = document.getElementById('submit-club-modal');

  // --- Shared Modal Logic (works on every page) ---
  function initSubmitModal() {
    if (!SUBMIT_MODAL) return;
    const closeBtns = SUBMIT_MODAL.querySelectorAll('[data-close-modal]');
    const form = document.getElementById('submit-club-form');
    const status = document.getElementById('submit-club-status');

    function openModal() {
      SUBMIT_MODAL.hidden = false;
      document.body.style.overflow = 'hidden';
      const firstInput = SUBMIT_MODAL.querySelector('input');
      if (firstInput) firstInput.focus();
    }

    function closeModal() {
      SUBMIT_MODAL.hidden = true;
      document.body.style.overflow = '';
    }

    CLUB_MODAL_BTN.forEach((btn) => btn.addEventListener('click', openModal));
    closeBtns.forEach((btn) => btn.addEventListener('click', closeModal));

    SUBMIT_MODAL.addEventListener('click', (e) => {
      if (e.target === SUBMIT_MODAL) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !SUBMIT_MODAL.hidden) closeModal();
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const name = String(fd.get('clubName') || '').trim();
        const suburb = String(fd.get('clubSuburb') || '').trim();
        const website = String(fd.get('clubWebsite') || '').trim();
        const notes = String(fd.get('clubNotes') || '').trim();
        if (!name || !suburb) return;

        if (status) {
          status.hidden = false;
          status.textContent = `Thanks! "${name}" (${suburb}) has been queued for review on sydneyvolleyball.com.`;
        }
        // Also prepare a mailto fallback link if user wants to email directly
        const mailtoLink = document.getElementById('submit-mailto-fallback');
        if (mailtoLink) {
          const subject = encodeURIComponent(`List a Club on sydneyvolleyball.com: ${name}`);
          const body = encodeURIComponent(
            `Club Name: ${name}\nSuburb / Venue: ${suburb}\nWebsite: ${website || 'N/A'}\nDetails: ${notes || 'N/A'}`
          );
          mailtoLink.href = `mailto:hello@sydneyvolleyball.com?subject=${subject}&body=${body}`;
          mailtoLink.hidden = false;
        }
        form.reset();
      });
    }
  }

  initSubmitModal();

  // If not on the main discovery page (no #sv-data), stop here.
  if (!DATA_EL) return;

  const payload = JSON.parse(DATA_EL.textContent);
  const CLUBS = payload.clubs || [];
  const SUBURBS = payload.suburbs || [];
  const SYDNEY_CENTER = payload.sydneyCenter || { lat: -33.845, lng: 151.095, zoom: 11 };

  // --- Application State ---
  const state = {
    locationLabel: '',
    origin: null, // { lat, lng, label }
    distanceKm: null, // number | null (All)
    opportunities: new Set(),
    region: '',
    keyword: '',
    sort: 'default', // 'default' | 'distance' | 'name' | 'region'
    mapTheme: 'dark'
  };

  // --- DOM References ---
  const mapEl = document.getElementById('sydney-map');
  const mapSection = document.getElementById('map-section');
  const locationInput = document.getElementById('location-input');
  const locationClear = document.getElementById('location-clear');
  const suburbDropdown = document.getElementById('suburb-dropdown');
  const geoBtn = document.getElementById('use-my-location');
  const keywordInput = document.getElementById('keyword-input');
  const regionSelect = document.getElementById('region-select');
  const sortSelect = document.getElementById('sort-select');
  const searchForm = document.getElementById('refine-form');
  const resetBtn = document.getElementById('reset-filters');
  const emptyResetBtn = document.getElementById('empty-reset-btn');
  const distanceChips = Array.from(document.querySelectorAll('[data-distance]'));
  const oppCheckboxes = Array.from(document.querySelectorAll('[data-opportunity]'));
  const quickPills = Array.from(document.querySelectorAll('[data-quick-filter]'));
  const resultsCountEl = document.getElementById('results-count');
  const resultsContextEl = document.getElementById('results-context');
  const clubListEl = document.getElementById('club-list');
  const emptyStateEl = document.getElementById('empty-state');
  const modeBtns = Array.from(document.querySelectorAll('[data-map-mode]'));
  const resetMapBtn = document.getElementById('reset-map-view');
  const fullscreenBtn = document.getElementById('toggle-map-fullscreen');

  // Map DOM row elements by slug
  const rowBySlug = new Map();
  const clubBySlug = new Map();
  CLUBS.forEach((club) => {
    clubBySlug.set(club.slug, club);
    const el = document.querySelector(`[data-club-slug="${club.slug}"]`);
    if (el) rowBySlug.set(club.slug, el);
  });

  // --- Haversine Distance (km) ---
  function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatKm(km) {
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Leaflet Interactive Map ---
  let map = null;
  let layerDark = null;
  let layerStreet = null;
  let layerSatellite = null;
  let radiusCircle = null;
  let originMarker = null;
  const markerBySlug = new Map();

  function createPinSvg(surface) {
    const fill = surface === 'Beach' ? '#38BDF8' : '#E6A93C';
    const inner = '#0A0C10';
    return `<div class="sv-pin" data-surface="${surface}">
      <svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13 1C6.373 1 1 6.373 1 13c0 8.5 10.6 18.8 11.35 19.5a.95.95 0 0 0 1.3 0C14.4 31.8 25 21.5 25 13 25 6.373 19.627 1 13 1Z" fill="${fill}" stroke="#0A0C10" stroke-width="1.5"/>
        <circle cx="13" cy="12.5" r="4.5" fill="${inner}"/>
      </svg>
    </div>`;
  }

  function buildPopupHtml(club, distKm) {
    const typeClass = club.surface === 'Beach' ? 'map-popup-type--beach' : 'map-popup-type--indoor';
    const distLine = distKm != null ? ` · <strong>${formatKm(distKm)}</strong>` : '';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${club.name}, ${club.address}`
    )}`;
    return `
      <div class="map-popup">
        <span class="map-popup-type ${typeClass}">${escapeHtml(club.surface)} Volleyball${distLine}</span>
        <h3>${escapeHtml(club.name)}</h3>
        <p class="map-popup-addr">${escapeHtml(club.venue)}<br>${escapeHtml(club.address)}</p>
        <div class="map-popup-actions">
          <button type="button" class="map-popup-btn map-popup-btn--primary" data-popup-focus="${escapeHtml(club.slug)}">View Details</button>
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="map-popup-btn map-popup-btn--secondary">Maps ↗</a>
        </div>
      </div>
    `;
  }

  function initMap() {
    if (!mapEl || typeof window.L === 'undefined') return;
    const L = window.L;

    map = L.map(mapEl, {
      center: [SYDNEY_CENTER.lat, SYDNEY_CENTER.lng],
      zoom: SYDNEY_CENTER.zoom,
      zoomSnap: 0.5,
      zoomControl: false,
      scrollWheelZoom: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 100% Free, zero-API-key dark cartography (Esri Dark Gray Base + Labels)
    layerDark = L.layerGroup([
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
          maxZoom: 16
        }
      ),
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          pane: 'overlayPane'
        }
      )
    ]);

    // Standard OpenStreetMap detailed street tiles (free, zero API key)
    layerStreet = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors',
        maxZoom: 19
      }
    );

    // Aerial Satellite view (free Esri World Imagery + labels)
    layerSatellite = L.layerGroup([
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 18
        }
      ),
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          pane: 'overlayPane'
        }
      )
    ]);

    layerDark.addTo(map);

    // Enable wheel zoom only after user clicks map so page scrolling stays effortless
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    CLUBS.forEach((club) => {
      const icon = L.divIcon({
        className: 'sv-pin-wrap',
        html: createPinSvg(club.surface),
        iconSize: [26, 34],
        iconAnchor: [13, 34],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([club.lat, club.lng], {
        icon,
        title: club.name,
        alt: `${club.name} — ${club.suburb}`
      });

      marker.bindPopup(() => buildPopupHtml(club, club._distKm));
      marker.on('popupopen', () => {
        highlightRow(club.slug, true);
        setTimeout(() => {
          const btn = document.querySelector(`[data-popup-focus="${club.slug}"]`);
          if (btn) {
            btn.addEventListener('click', () => focusClubInList(club.slug));
          }
        }, 0);
      });
      marker.on('popupclose', () => highlightRow(club.slug, false));

      marker.addTo(map);
      markerBySlug.set(club.slug, marker);
    });
  }

  function setPinHighlight(slug, active) {
    const marker = markerBySlug.get(slug);
    if (!marker) return;
    const el = marker.getElement();
    if (!el) return;
    const pin = el.querySelector('.sv-pin');
    if (pin) pin.classList.toggle('is-highlighted', active);
    marker.setZIndexOffset(active ? 600 : 0);
  }

  function highlightRow(slug, active) {
    const row = rowBySlug.get(slug);
    if (row) row.classList.toggle('is-active-pin', active);
  }

  function focusClubInList(slug) {
    const row = rowBySlug.get(slug);
    if (!row || row.hidden) return;
    const toggle = row.querySelector('.accordion-toggle');
    const details = row.querySelector('.club-details');
    if (toggle && details) {
      toggle.setAttribute('aria-expanded', 'true');
      details.hidden = false;
    }
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('is-active-pin');
    setTimeout(() => row.classList.remove('is-active-pin'), 2400);
  }

  function locateClubOnMap(slug) {
    const club = clubBySlug.get(slug);
    const marker = markerBySlug.get(slug);
    if (!club || !map || !marker) return;
    mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    map.flyTo([club.lat, club.lng], 14, { duration: 0.7 });
    setTimeout(() => marker.openPopup(), 450);
  }

  function updateRadiusLayer() {
    if (!map || typeof window.L === 'undefined') return;
    const L = window.L;

    if (radiusCircle) {
      map.removeLayer(radiusCircle);
      radiusCircle = null;
    }
    if (originMarker) {
      map.removeLayer(originMarker);
      originMarker = null;
    }

    if (state.origin) {
      originMarker = L.circleMarker([state.origin.lat, state.origin.lng], {
        radius: 6,
        color: '#0A0C10',
        weight: 2,
        fillColor: '#34D399',
        fillOpacity: 1
      }).addTo(map);

      if (state.distanceKm) {
        radiusCircle = L.circle([state.origin.lat, state.origin.lng], {
          radius: state.distanceKm * 1000,
          color: '#34D399',
          weight: 1.5,
          opacity: 0.65,
          fillColor: '#34D399',
          fillOpacity: 0.12
        }).addTo(map);
        map.fitBounds(radiusCircle.getBounds().pad(0.18), { animate: true, maxZoom: 13 });
      } else {
        map.flyTo([state.origin.lat, state.origin.lng], 12, { duration: 0.6 });
      }
    }
  }

  // --- Core Filtering & Rendering ---
  function applyFilters({ fitMap = false } = {}) {
    const kw = state.keyword.trim().toLowerCase();

    const matched = [];
    CLUBS.forEach((club) => {
      const distKm = state.origin
        ? haversineKm(state.origin.lat, state.origin.lng, club.lat, club.lng)
        : null;
      club._distKm = distKm;

      let visible = true;

      if (visible && state.origin && state.distanceKm != null) {
        if (distKm > state.distanceKm) visible = false;
      }

      if (visible && state.region) {
        if (club.region !== state.region) visible = false;
      }

      if (visible && state.opportunities.size > 0) {
        for (const opp of state.opportunities) {
          if (!club.opportunities.includes(opp)) {
            visible = false;
            break;
          }
        }
      }

      if (visible && kw) {
        const hay = `${club.name} ${club.venue} ${club.suburb} ${club.postcode} ${club.address} ${club.shortDescription}`.toLowerCase();
        if (!hay.includes(kw)) visible = false;
      }

      const row = rowBySlug.get(club.slug);
      if (row) {
        row.hidden = !visible;
        const distEl = row.querySelector('[data-dist-badge]');
        const distTextEl = row.querySelector('[data-dist-value]');
        const sepEl = row.querySelector('[data-dist-sep]');
        if (distEl && distTextEl) {
          if (distKm != null) {
            distTextEl.textContent = formatKm(distKm);
            distEl.hidden = false;
            if (sepEl) sepEl.hidden = false;
          } else {
            distEl.hidden = true;
            if (sepEl) sepEl.hidden = true;
          }
        }
      }

      const marker = markerBySlug.get(club.slug);
      if (marker && map) {
        if (visible && !map.hasLayer(marker)) marker.addTo(map);
        if (!visible && map.hasLayer(marker)) map.removeLayer(marker);
      }

      if (visible) matched.push(club);
    });

    // Sorting
    const effectiveSort =
      state.sort === 'default' ? (state.origin ? 'distance' : 'default') : state.sort;

    if (effectiveSort === 'distance' && state.origin) {
      matched.sort((a, b) => (a._distKm ?? 9999) - (b._distKm ?? 9999));
    } else if (effectiveSort === 'name') {
      matched.sort((a, b) => a.name.localeCompare(b.name));
    } else if (effectiveSort === 'region') {
      matched.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
    }

    // Reorder DOM nodes to match sorted order
    if (clubListEl) {
      const frag = document.createDocumentFragment();
      matched.forEach((club) => {
        const row = rowBySlug.get(club.slug);
        if (row) frag.appendChild(row);
      });
      // Keep hidden rows attached at the end so they stay in DOM
      CLUBS.forEach((club) => {
        const row = rowBySlug.get(club.slug);
        if (row && row.hidden) frag.appendChild(row);
      });
      clubListEl.appendChild(frag);
    }

    // Update results header
    if (resultsCountEl) {
      resultsCountEl.textContent = `${matched.length} ${matched.length === 1 ? 'RESULT' : 'RESULTS'}`;
    }

    if (resultsContextEl) {
      const parts = [];
      if (state.origin) {
        parts.push(
          state.distanceKm
            ? `within ${state.distanceKm} km of ${state.origin.label}`
            : `sorted from ${state.origin.label}`
        );
      } else {
        parts.push('across Greater Sydney');
      }
      if (state.opportunities.size > 0) {
        parts.push(Array.from(state.opportunities).join(' · '));
      }
      resultsContextEl.textContent = parts.join(' — ');
    }

    if (emptyStateEl) {
      emptyStateEl.hidden = matched.length > 0;
    }

    // Sync Quick Filter pills
    syncQuickPills();

    // Update Map radius & bounds if requested
    if (fitMap && map) {
      updateRadiusLayer();
      if (!state.origin && matched.length > 0 && typeof window.L !== 'undefined') {
        const bounds = window.L.latLngBounds(matched.map((c) => [c.lat, c.lng]));
        map.fitBounds(bounds.pad(0.14), { animate: true, maxZoom: 13 });
      }
    }

    syncUrlParams();
  }

  function syncQuickPills() {
    const selected = Array.from(state.opportunities);
    quickPills.forEach((pill) => {
      const val = pill.dataset.quickFilter;
      if (val === 'all') {
        pill.classList.toggle('is-active', selected.length === 0);
      } else {
        pill.classList.toggle('is-active', selected.length === 1 && selected[0] === val);
      }
    });
  }

  function syncUrlParams() {
    if (!window.history || !window.history.replaceState) return;
    const params = new URLSearchParams();
    if (state.origin && state.origin.label) params.set('q', state.origin.label);
    if (state.distanceKm) params.set('km', String(state.distanceKm));
    if (state.opportunities.size > 0) {
      params.set('play', Array.from(state.opportunities).join(','));
    }
    if (state.region) params.set('region', state.region);
    if (state.keyword.trim()) params.set('club', state.keyword.trim());

    const qs = params.toString();
    const target = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', target);
  }

  // --- Suburb Search & Autocomplete ---
  function findMatchingSuburbs(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Popular Sydney hubs when empty/focused
      const popular = ['Carlingford', 'Sydney CBD', 'Parramatta', 'Bondi Beach', 'Manly', 'North Ryde', 'Chatswood', 'Hurstville'];
      return SUBURBS.filter((s) => popular.includes(s.name));
    }
    return SUBURBS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.postcode.startsWith(q) ||
        `${s.name.toLowerCase()} ${s.postcode}`.includes(q)
    ).slice(0, 8);
  }

  function selectSuburb(suburb, { defaultRadius = true } = {}) {
    const label = suburb.postcode ? `${suburb.name} ${suburb.postcode}` : suburb.name;
    state.origin = { lat: suburb.lat, lng: suburb.lng, label };
    state.locationLabel = label;
    if (locationInput) locationInput.value = label;
    if (locationClear) locationClear.hidden = false;
    if (suburbDropdown) suburbDropdown.hidden = true;

    // Default to 10 km when user enters a suburb if no radius is chosen yet (matches reference UX!)
    if (defaultRadius && state.distanceKm == null) {
      setDistance(10, false);
    }
    applyFilters({ fitMap: true });
  }

  async function resolveFreeTextLocation(rawQuery) {
    const q = rawQuery.trim();
    if (!q) {
      clearLocation();
      return;
    }

    // 1. Check local Greater Sydney suburb database first (instant, $0)
    const exactOrFirst = findMatchingSuburbs(q);
    if (exactOrFirst.length > 0) {
      selectSuburb(exactOrFirst[0]);
      return;
    }

    // 2. Fallback to free OpenStreetMap Nominatim geocoding for any other NSW address
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=au&q=${encodeURIComponent(
        `${q}, NSW, Australia`
      )}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        selectSuburb({
          name: q,
          postcode: '',
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
        return;
      }
    } catch {
      // Ignore network errors silently
    }

    // 3. If not a suburb, treat as club keyword search
    state.keyword = q;
    if (keywordInput) keywordInput.value = q;
    applyFilters({ fitMap: true });
  }

  function clearLocation() {
    state.origin = null;
    state.locationLabel = '';
    if (locationInput) locationInput.value = '';
    if (locationClear) locationClear.hidden = true;
    setDistance(null, false);
    applyFilters({ fitMap: true });
    if (map) {
      map.flyTo([SYDNEY_CENTER.lat, SYDNEY_CENTER.lng], SYDNEY_CENTER.zoom, { duration: 0.6 });
    }
  }

  function setDistance(km, triggerFilter = true) {
    state.distanceKm = km;
    distanceChips.forEach((chip) => {
      const val = chip.dataset.distance === 'all' ? null : Number(chip.dataset.distance);
      chip.classList.toggle('is-active', val === km);
      chip.setAttribute('aria-pressed', String(val === km));
    });
    if (triggerFilter) applyFilters({ fitMap: true });
  }

  function renderSuburbDropdown(items) {
    if (!suburbDropdown) return;
    if (!items.length) {
      suburbDropdown.hidden = true;
      return;
    }
    suburbDropdown.innerHTML = items
      .map(
        (s, idx) =>
          `<button type="button" class="suburb-option" role="option" data-suburb-idx="${idx}">
            <span>${escapeHtml(s.name)}</span>
            <span class="suburb-option-code">${escapeHtml(s.postcode)}</span>
          </button>`
      )
      .join('');
    suburbDropdown.hidden = false;

    suburbDropdown.querySelectorAll('.suburb-option').forEach((btn, idx) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectSuburb(items[idx]);
      });
    });
  }

  // --- Bind Events ---
  if (locationInput) {
    let focusedIdx = -1;
    let currentItems = [];

    locationInput.addEventListener('focus', () => {
      currentItems = findMatchingSuburbs(locationInput.value);
      focusedIdx = -1;
      renderSuburbDropdown(currentItems);
    });

    locationInput.addEventListener('input', () => {
      if (locationClear) locationClear.hidden = !locationInput.value;
      currentItems = findMatchingSuburbs(locationInput.value);
      focusedIdx = -1;
      renderSuburbDropdown(currentItems);
      if (!locationInput.value.trim() && state.origin) {
        clearLocation();
      }
    });

    locationInput.addEventListener('keydown', (e) => {
      if (suburbDropdown && !suburbDropdown.hidden && currentItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusedIdx = (focusedIdx + 1) % currentItems.length;
          updateDropdownFocus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          focusedIdx = (focusedIdx - 1 + currentItems.length) % currentItems.length;
          updateDropdownFocus();
        } else if (e.key === 'Enter' && focusedIdx >= 0) {
          e.preventDefault();
          selectSuburb(currentItems[focusedIdx]);
        } else if (e.key === 'Escape') {
          suburbDropdown.hidden = true;
        }
      }
    });

    function updateDropdownFocus() {
      const opts = suburbDropdown.querySelectorAll('.suburb-option');
      opts.forEach((opt, i) => opt.classList.toggle('is-focused', i === focusedIdx));
    }

    locationInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (suburbDropdown) suburbDropdown.hidden = true;
      }, 150);
    });
  }

  if (locationClear) {
    locationClear.addEventListener('click', () => {
      clearLocation();
      if (locationInput) locationInput.focus();
    });
  }

  if (geoBtn) {
    geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      const prevLabel = geoBtn.textContent;
      geoBtn.textContent = 'Locating…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geoBtn.textContent = prevLabel;
          selectSuburb({
            name: 'My Location',
            postcode: '',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {
          geoBtn.textContent = prevLabel;
          alert('Unable to access your location. Try typing a Sydney suburb or postcode instead.');
        },
        { timeout: 8000 }
      );
    });
  }

  distanceChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const km = chip.dataset.distance === 'all' ? null : Number(chip.dataset.distance);
      // If user clicks a km radius before picking a suburb, default to Sydney CBD so radius is immediately meaningful
      if (km != null && !state.origin) {
        const cbd = SUBURBS.find((s) => s.name === 'Sydney CBD');
        if (cbd) {
          state.origin = { lat: cbd.lat, lng: cbd.lng, label: 'Sydney CBD 2000' };
          if (locationInput) locationInput.value = 'Sydney CBD 2000';
          if (locationClear) locationClear.hidden = false;
        }
      }
      setDistance(km, true);
    });
  });

  oppCheckboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.opportunities.add(cb.value);
      else state.opportunities.delete(cb.value);
      applyFilters({ fitMap: false });
    });
  });

  quickPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const val = pill.dataset.quickFilter;
      state.opportunities.clear();
      if (val !== 'all') state.opportunities.add(val);
      oppCheckboxes.forEach((cb) => {
        cb.checked = state.opportunities.has(cb.value);
      });
      applyFilters({ fitMap: false });
    });
  });

  if (regionSelect) {
    regionSelect.addEventListener('change', () => {
      state.region = regionSelect.value;
      applyFilters({ fitMap: true });
    });
  }

  if (keywordInput) {
    keywordInput.addEventListener('input', () => {
      state.keyword = keywordInput.value;
      applyFilters({ fitMap: false });
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      applyFilters({ fitMap: false });
    });
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (locationInput && locationInput.value.trim()) {
        if (!state.origin || state.origin.label !== locationInput.value.trim()) {
          resolveFreeTextLocation(locationInput.value);
          return;
        }
      }
      applyFilters({ fitMap: true });
    });
  }

  function resetAllFilters() {
    state.origin = null;
    state.locationLabel = '';
    state.distanceKm = null;
    state.opportunities.clear();
    state.region = '';
    state.keyword = '';
    state.sort = 'default';

    if (locationInput) locationInput.value = '';
    if (locationClear) locationClear.hidden = true;
    if (keywordInput) keywordInput.value = '';
    if (regionSelect) regionSelect.value = '';
    if (sortSelect) sortSelect.value = 'default';
    oppCheckboxes.forEach((cb) => {
      cb.checked = false;
    });
    setDistance(null, false);
    applyFilters({ fitMap: true });
    if (map) {
      map.flyTo([SYDNEY_CENTER.lat, SYDNEY_CENTER.lng], SYDNEY_CENTER.zoom, { duration: 0.6 });
    }
  }

  if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);

  // Sidebar collapsible filter accordions
  document.querySelectorAll('.filter-accordion-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      const bodyId = trigger.getAttribute('aria-controls');
      const body = bodyId ? document.getElementById(bodyId) : null;
      trigger.setAttribute('aria-expanded', String(!expanded));
      if (body) body.hidden = expanded;
    });
  });

  // Club row interactions (accordion expand, hover pin sync, locate on map)
  CLUBS.forEach((club) => {
    const row = rowBySlug.get(club.slug);
    if (!row) return;

    const toggle = row.querySelector('.accordion-toggle');
    const details = row.querySelector('.club-details');
    const locateBtn = row.querySelector('[data-locate-club]');

    if (toggle && details) {
      toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isOpen));
        details.hidden = isOpen;
      });
    }

    if (locateBtn) {
      locateBtn.addEventListener('click', () => locateClubOnMap(club.slug));
    }

    row.addEventListener('mouseenter', () => setPinHighlight(club.slug, true));
    row.addEventListener('mouseleave', () => setPinHighlight(club.slug, false));
  });

  // Map Theme Toggle (Dark / Street / Satellite)
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mapMode;
      if (!map || state.mapTheme === mode) return;
      state.mapTheme = mode;
      modeBtns.forEach((b) => {
        b.classList.toggle('is-active', b.dataset.mapMode === mode);
        b.setAttribute('aria-pressed', String(b.dataset.mapMode === mode));
      });
      [layerDark, layerStreet, layerSatellite].forEach((layer) => {
        if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      });
      if (mode === 'dark') layerDark.addTo(map);
      else if (mode === 'street') layerStreet.addTo(map);
      else if (mode === 'satellite') layerSatellite.addTo(map);
    });
  });

  if (resetMapBtn) {
    resetMapBtn.addEventListener('click', () => {
      if (map) {
        map.closePopup();
        map.flyTo([SYDNEY_CENTER.lat, SYDNEY_CENTER.lng], SYDNEY_CENTER.zoom, { duration: 0.6 });
      }
    });
  }

  if (fullscreenBtn && mapSection) {
    fullscreenBtn.addEventListener('click', () => {
      const isFs = mapSection.classList.toggle('is-fullscreen');
      fullscreenBtn.setAttribute('aria-pressed', String(isFs));
      fullscreenBtn.querySelector('span').textContent = isFs ? 'Exit Fullscreen' : 'Expand';
      document.body.style.overflow = isFs ? 'hidden' : '';
      if (map) setTimeout(() => map.invalidateSize(), 120);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mapSection.classList.contains('is-fullscreen')) {
        mapSection.classList.remove('is-fullscreen');
        fullscreenBtn.setAttribute('aria-pressed', 'false');
        fullscreenBtn.querySelector('span').textContent = 'Expand';
        document.body.style.overflow = '';
        if (map) setTimeout(() => map.invalidateSize(), 120);
      }
    });
  }

  // --- Hydrate from URL Query Params (Supports Google SearchAction & Shareable Links) ---
  function hydrateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const km = params.get('km');
    const play = params.get('play');
    const region = params.get('region');
    const clubKw = params.get('club');

    if (play) {
      play.split(',').forEach((item) => {
        if (item) state.opportunities.add(item);
      });
      oppCheckboxes.forEach((cb) => {
        cb.checked = state.opportunities.has(cb.value);
      });
    }

    if (region && regionSelect) {
      state.region = region;
      regionSelect.value = region;
    }

    if (clubKw && keywordInput) {
      state.keyword = clubKw;
      keywordInput.value = clubKw;
    }

    if (km && !Number.isNaN(Number(km))) {
      setDistance(Number(km), false);
    }

    if (q) {
      const matches = findMatchingSuburbs(q);
      if (matches.length > 0) {
        selectSuburb(matches[0], { defaultRadius: !km });
        return;
      } else {
        state.keyword = q;
        if (keywordInput) keywordInput.value = q;
      }
    }

    applyFilters({ fitMap: Boolean(region) });
  }

  // Initialize!
  initMap();
  hydrateFromUrl();
})();
