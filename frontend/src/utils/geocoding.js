// Reverse-geocoding via OpenStreetMap Nominatim (no API key needed).
// Used to auto-fill address + city after picking a location on the map.
//
// Belgrade quirk: Nominatim puts the municipality into `city`
// ("Gradska opština Vračar") and the real city into `county`
// ("Grad Beograd"). So when the detailed result only yields a
// municipality, the county (and coarser zoom levels) are consulted
// and the "Grad …" prefix is stripped → "Beograd".

async function fetchPlace(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Geocoding failed (HTTP ${res.status})`);
  return res.json();
}

function pickCity(addr) {
  return addr.city || addr.town || addr.village || addr.hamlet || '';
}

function looksLikeMunicipality(value) {
  return /municipalit|opštin|opstin|okrug|county|district|gradska opština/i.test(value || '');
}

// "Grad Beograd" → "Beograd", "Beograd (Vračar)" → "Beograd"
function normalizeCityName(value) {
  let v = (value || '').trim();
  v = v.replace(/^\s*grad\s+/i, '');
  v = v.replace(/\s*\(.*?\)\s*/g, '').trim();
  return v;
}

export async function reverseGeocode(lat, lng) {
  const base =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1` +
    `&accept-language=sr-Latn&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  const detail = await fetchPlace(`${base}&zoom=18`);
  const addr = detail.address || {};

  let city = pickCity(addr);
  if (city && !looksLikeMunicipality(city)) {
    city = normalizeCityName(city);
  } else {
    // Detail level only has a municipality (or nothing) — walk outward:
    // county first (covers "Grad Beograd"-style cities), then coarser zooms.
    const candidates = [
      addr.county,
      addr.suburb,
      addr.municipality,
    ];
    for (const zoom of [12, 10, 8]) {
      try {
        const coarse = await fetchPlace(`${base}&zoom=${zoom}`);
        const cAddr = coarse.address || {};
        candidates.push(
          coarse.name,
          (coarse.display_name || '').split(',')[0],
          cAddr.city,
          cAddr.town,
          cAddr.county,
        );
      } catch {
        // best-effort — keep the candidates collected so far
      }
    }
    city = '';
    for (const raw of candidates) {
      const name = normalizeCityName(raw);
      if (name && !looksLikeMunicipality(name)) {
        city = name;
        break;
      }
    }
    if (!city) city = normalizeCityName(addr.state || '');
  }

  const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
  const location =
    street ||
    (detail.display_name ? detail.display_name.split(',').slice(0, 2).join(',').trim() : '') ||
    `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

  return { location, city, displayName: detail.display_name || '' };
}
