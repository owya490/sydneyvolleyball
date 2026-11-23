/* ==========================================================================
   Sydney Volleyball — Subpage Mini-Map (Club Profiles, Regions & Types)
   ========================================================================== */

(() => {
  'use strict';

  const mapEl = document.getElementById('subpage-map');
  const dataEl = document.getElementById('subpage-map-data');
  if (!mapEl || !dataEl || typeof window.L === 'undefined') return;

  const L = window.L;
  const payload = JSON.parse(dataEl.textContent);
  const pins = payload.pins || [];
  const center = payload.center || { lat: -33.845, lng: 151.095, zoom: 12 };

  const map = L.map(mapEl, {
    center: [center.lat, center.lng],
    zoom: center.zoom || 13,
    scrollWheelZoom: false
  });

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

  const coords = [];
  pins.forEach((pin) => {
    const fill = pin.surface === 'Beach' ? '#38BDF8' : '#E6A93C';
    const icon = L.divIcon({
      className: 'sv-pin-wrap',
      html: `<div class="sv-pin">
        <svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 1C6.373 1 1 6.373 1 13c0 8.5 10.6 18.8 11.35 19.5a.95.95 0 0 0 1.3 0C14.4 31.8 25 21.5 25 13 25 6.373 19.627 1 13 1Z" fill="${fill}" stroke="#0A0C10" stroke-width="1.5"/>
          <circle cx="13" cy="12.5" r="4.5" fill="#0A0C10"/>
        </svg>
      </div>`,
      iconSize: [26, 34],
      iconAnchor: [13, 34],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([pin.lat, pin.lng], { icon, title: pin.name }).addTo(map);
    marker.bindPopup(
      `<div class="map-popup">
        <span class="map-popup-type ${pin.surface === 'Beach' ? 'map-popup-type--beach' : 'map-popup-type--indoor'}">${pin.surface} Volleyball</span>
        <h3>${pin.name}</h3>
        <p class="map-popup-addr">${pin.address}</p>
        ${pin.url ? `<div class="map-popup-actions"><a href="${pin.url}" class="map-popup-btn map-popup-btn--primary">View Club</a></div>` : ''}
      </div>`
    );
    coords.push([pin.lat, pin.lng]);
  });

  if (coords.length > 1) {
    map.fitBounds(L.latLngBounds(coords).pad(0.18), { maxZoom: 13 });
  }
})();
