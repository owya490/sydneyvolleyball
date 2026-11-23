/* ==========================================================================
   Sydney Volleyball — Minimalist Dark Map & Slide-Over Filter Drawer
   ========================================================================== */

(() => {
  'use strict';

  // --- List a Club Modal ---
  const submitModal = document.getElementById('submit-club-modal');
  if (submitModal) {
    const openBtns = document.querySelectorAll('[data-open-submit-modal]');
    const closeBtns = submitModal.querySelectorAll('[data-close-modal]');
    const form = document.getElementById('submit-club-form');
    const status = document.getElementById('submit-club-status');

    const openModal = () => {
      submitModal.hidden = false;
      document.body.style.overflow = 'hidden';
      const firstInput = submitModal.querySelector('input');
      if (firstInput) firstInput.focus();
    };

    const closeModal = () => {
      submitModal.hidden = true;
      document.body.style.overflow = '';
    };

    openBtns.forEach((btn) => btn.addEventListener('click', openModal));
    closeBtns.forEach((btn) => btn.addEventListener('click', closeModal));
    submitModal.addEventListener('click', (e) => {
      if (e.target === submitModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !submitModal.hidden) closeModal();
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

  const dataEl = document.getElementById('sv-data');
  if (!dataEl) return;

  const payload = JSON.parse(dataEl.textContent);
  const CLUBS = payload.clubs || [];
  const REGIONS = payload.regions || [];
  const SYDNEY_CENTER = payload.sydneyCenter || { lat: -33.855, lng: 151.02, zoom: 10.5 };
  const regionNameBySlug = new Map(REGIONS.map((r) => [r.slug, r.name]));

  // --- Filter State ---
  const state = {
    surface: 'all', // 'all' | 'Indoor' | 'Beach'
    opportunities: new Set(),
    region: '',
    keyword: ''
  };

  // --- DOM Elements ---
  const mapEl = document.getElementById('sydney-map');
  const mapSection = document.getElementById('map-section');
  const resetMapBtn = document.getElementById('reset-map-view');

  const drawer = document.getElementById('filter-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const openFilterBtn = document.getElementById('open-filter-drawer');
  const closeFilterBtn = document.getElementById('close-filter-drawer');
  const applyFilterBtn = document.getElementById('apply-filters-btn');
  const resetFilterBtn = document.getElementById('reset-filters-btn');
  const emptyResetBtn = document.getElementById('empty-reset-btn');
  const filterBadge = document.getElementById('filter-badge');

  const surfaceBtns = Array.from(document.querySelectorAll('[data-surface-filter]'));
  const oppInputs = Array.from(document.querySelectorAll('[data-opp-filter]'));
  const regionSelect = document.getElementById('drawer-region-select');
  const keywordInput = document.getElementById('drawer-keyword-input');

  const resultsCountEl = document.getElementById('results-count');
  const activeChipsEl = document.getElementById('active-chips');
  const emptyStateEl = document.getElementById('empty-state');

  const rowBySlug = new Map();
  const clubBySlug = new Map();
  CLUBS.forEach((club) => {
    clubBySlug.set(club.slug, club);
    const el = document.querySelector(`[data-club-slug="${club.slug}"]`);
    if (el) rowBySlug.set(club.slug, el);
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Dark-Only Leaflet Map (100% Free Esri Dark Gray Canvas) ---
  let map = null;
  const markerBySlug = new Map();

  function createPinSvg(surface) {
    const fill = surface === 'Beach' ? '#38BDF8' : '#E6A93C';
    return `<div class="sv-pin" data-surface="${surface}">
      <svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13 1C6.373 1 1 6.373 1 13c0 8.5 10.6 18.8 11.35 19.5a.95.95 0 0 0 1.3 0C14.4 31.8 25 21.5 25 13 25 6.373 19.627 1 13 1Z" fill="${fill}" stroke="#0A0C10" stroke-width="1.5"/>
        <circle cx="13" cy="12.5" r="4.5" fill="#0A0C10"/>
      </svg>
    </div>`;
  }

  function buildPopupHtml(club) {
    const typeClass = club.surface === 'Beach' ? 'map-popup-type--beach' : 'map-popup-type--indoor';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${club.name}, ${club.address}`
    )}`;
    return `
      <div class="map-popup">
        <span class="map-popup-type ${typeClass}">${escapeHtml(club.surface)} Volleyball</span>
        <h3>${escapeHtml(club.name)}</h3>
        <p class="map-popup-addr">${escapeHtml(club.venue)}<br>${escapeHtml(club.address)}</p>
        <div class="map-popup-actions">
          <button type="button" class="map-popup-btn map-popup-btn--primary" data-popup-focus="${escapeHtml(club.slug)}">Details</button>
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

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
        maxZoom: 16
      }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        pane: 'overlayPane'
      }
    ).addTo(map);

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

      marker.bindPopup(() => buildPopupHtml(club));
      marker.on('popupopen', () => {
        highlightRow(club.slug, true);
        setTimeout(() => {
          const btn = document.querySelector(`[data-popup-focus="${club.slug}"]`);
          if (btn) btn.addEventListener('click', () => focusClubInList(club.slug));
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
    const details = row.querySelector('details');
    if (details) details.open = true;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('is-active-pin');
    setTimeout(() => row.classList.remove('is-active-pin'), 2200);
  }

  function locateClubOnMap(slug) {
    const club = clubBySlug.get(slug);
    const marker = markerBySlug.get(slug);
    if (!club || !map || !marker) return;
    mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    map.flyTo([club.lat, club.lng], 14, { duration: 0.65 });
    setTimeout(() => marker.openPopup(), 450);
  }

  // --- Drawer Open / Close ---
  function openDrawer() {
    if (!drawer || !drawerBackdrop) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawerBackdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (openFilterBtn) openFilterBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    if (!drawer || !drawerBackdrop) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawerBackdrop.classList.remove('is-open');
    document.body.style.overflow = '';
    if (openFilterBtn) openFilterBtn.setAttribute('aria-expanded', 'false');
  }

  if (openFilterBtn) openFilterBtn.addEventListener('click', openDrawer);
  if (closeFilterBtn) closeFilterBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  // --- Filtering Logic ---
  function getMatchingClubs() {
    const kw = state.keyword.trim().toLowerCase();
    return CLUBS.filter((club) => {
      if (state.surface !== 'all' && club.surface !== state.surface) return false;
      if (state.region && club.region !== state.region) return false;
      if (state.opportunities.size > 0) {
        for (const opp of state.opportunities) {
          if (!club.opportunities.includes(opp)) return false;
        }
      }
      if (kw) {
        const hay = `${club.name} ${club.venue} ${club.suburb} ${club.postcode} ${club.address} ${club.shortDescription}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }

  function getActiveFilterCount() {
    let count = 0;
    if (state.surface !== 'all') count++;
    if (state.region) count++;
    if (state.keyword.trim()) count++;
    count += state.opportunities.size;
    return count;
  }

  function renderActiveChips() {
    if (!activeChipsEl) return;
    const chips = [];

    if (state.surface !== 'all') {
      chips.push({ label: state.surface, type: 'surface', value: state.surface });
    }
    state.opportunities.forEach((opp) => {
      chips.push({ label: opp, type: 'opp', value: opp });
    });
    if (state.region) {
      chips.push({
        label: regionNameBySlug.get(state.region) || state.region,
        type: 'region',
        value: state.region
      });
    }
    if (state.keyword.trim()) {
      chips.push({ label: `"${state.keyword.trim()}"`, type: 'keyword', value: '' });
    }

    activeChipsEl.innerHTML = chips
      .map(
        (c) =>
          `<button type="button" class="active-chip" data-remove-type="${c.type}" data-remove-val="${escapeHtml(c.value)}" aria-label="Remove ${escapeHtml(c.label)} filter">${escapeHtml(c.label)} ×</button>`
      )
      .join('');

    activeChipsEl.querySelectorAll('.active-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { removeType, removeVal } = btn.dataset;
        if (removeType === 'surface') {
          state.surface = 'all';
          syncDrawerControls();
        } else if (removeType === 'opp') {
          state.opportunities.delete(removeVal);
          syncDrawerControls();
        } else if (removeType === 'region') {
          state.region = '';
          syncDrawerControls();
        } else if (removeType === 'keyword') {
          state.keyword = '';
          syncDrawerControls();
        }
        applyFilters({ fitMap: true });
      });
    });
  }

  function syncDrawerControls() {
    surfaceBtns.forEach((btn) => {
      const active = btn.dataset.surfaceFilter === state.surface;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    oppInputs.forEach((cb) => {
      cb.checked = state.opportunities.has(cb.value);
    });
    if (regionSelect) regionSelect.value = state.region;
    if (keywordInput) keywordInput.value = state.keyword;
  }

  function applyFilters({ fitMap = false } = {}) {
    const matched = getMatchingClubs();
    const matchedSlugs = new Set(matched.map((c) => c.slug));

    CLUBS.forEach((club) => {
      const visible = matchedSlugs.has(club.slug);
      const row = rowBySlug.get(club.slug);
      if (row) row.hidden = !visible;

      const marker = markerBySlug.get(club.slug);
      if (marker && map) {
        if (visible && !map.hasLayer(marker)) marker.addTo(map);
        if (!visible && map.hasLayer(marker)) map.removeLayer(marker);
      }
    });

    if (resultsCountEl) {
      resultsCountEl.textContent = `${matched.length} ${matched.length === 1 ? 'CLUB' : 'CLUBS'}`;
    }

    if (applyFilterBtn) {
      applyFilterBtn.textContent = `Show ${matched.length} ${matched.length === 1 ? 'Club' : 'Clubs'}`;
    }

    const activeCount = getActiveFilterCount();
    if (filterBadge) {
      filterBadge.textContent = String(activeCount);
      filterBadge.hidden = activeCount === 0;
    }

    if (emptyStateEl) {
      emptyStateEl.hidden = matched.length > 0;
    }

    renderActiveChips();

    if (fitMap && map && typeof window.L !== 'undefined') {
      if (activeCount === 0) {
        map.flyTo([SYDNEY_CENTER.lat, SYDNEY_CENTER.lng], SYDNEY_CENTER.zoom, { duration: 0.55 });
      } else if (matched.length > 0) {
        const bounds = window.L.latLngBounds(matched.map((c) => [c.lat, c.lng]));
        map.fitBounds(bounds.pad(0.18), { animate: true, maxZoom: 13 });
      }
    }
  }

  function resetAllFilters() {
    state.surface = 'all';
    state.opportunities.clear();
    state.region = '';
    state.keyword = '';
    syncDrawerControls();
    applyFilters({ fitMap: true });
  }

  // --- Bind Filter Drawer Controls ---
  surfaceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.surface = btn.dataset.surfaceFilter;
      syncDrawerControls();
      applyFilters({ fitMap: false });
    });
  });

  oppInputs.forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.opportunities.add(cb.value);
      else state.opportunities.delete(cb.value);
      applyFilters({ fitMap: false });
    });
  });

  if (regionSelect) {
    regionSelect.addEventListener('change', () => {
      state.region = regionSelect.value;
      applyFilters({ fitMap: false });
    });
  }

  if (keywordInput) {
    keywordInput.addEventListener('input', () => {
      state.keyword = keywordInput.value;
      applyFilters({ fitMap: false });
    });
  }

  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
      applyFilters({ fitMap: true });
      closeDrawer();
    });
  }

  if (resetFilterBtn) resetFilterBtn.addEventListener('click', resetAllFilters);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);

  if (resetMapBtn) {
    resetMapBtn.addEventListener('click', () => {
      if (map) {
        map.closePopup();
        map.flyTo([SYDNEY_CENTER.lat, SYDNEY_CENTER.lng], SYDNEY_CENTER.zoom, { duration: 0.55 });
      }
    });
  }

  // Prevent clicking "Google Maps" inside <summary> from toggling accordion
  document.querySelectorAll('[data-stop-toggle]').forEach((link) => {
    link.addEventListener('click', (e) => e.stopPropagation());
  });

  // Club row hover pin highlight & "Show on Map" button
  CLUBS.forEach((club) => {
    const row = rowBySlug.get(club.slug);
    if (!row) return;
    const locateBtn = row.querySelector('[data-locate-club]');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => locateClubOnMap(club.slug));
    }
    row.addEventListener('mouseenter', () => setPinHighlight(club.slug, true));
    row.addEventListener('mouseleave', () => setPinHighlight(club.slug, false));
  });

  // Initialize
  initMap();
  applyFilters({ fitMap: false });
})();
