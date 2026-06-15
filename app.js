// SA Lead Finder — runs entirely in your browser, so it works on GitHub Pages
// (and on your phone) with no server and no API key.
//
// Free OpenStreetMap data sources, called directly from the browser:
//   - Nominatim turns a place name ("Durban") into a map bounding box.
//   - Overpass returns businesses inside that box.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
// Public Overpass mirrors that allow browser (CORS) requests; tried in order.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Major South African metros for the "sweep all cities" feature.
// Each bbox is [south, west, north, east] — pre-set so the sweep needs no geocoding.
const CITIES = [
  { name: 'Johannesburg', bbox: [-26.45, 27.78, -26.00, 28.20] },
  { name: 'Pretoria', bbox: [-25.85, 28.10, -25.65, 28.35] },
  { name: 'Cape Town', bbox: [-34.20, 18.30, -33.75, 18.80] },
  { name: 'Durban', bbox: [-30.00, 30.75, -29.70, 31.10] },
  { name: 'Gqeberha (PE)', bbox: [-34.05, 25.50, -33.80, 25.75] },
  { name: 'Bloemfontein', bbox: [-29.20, 26.10, -29.05, 26.32] },
  { name: 'East London', bbox: [-33.10, 27.80, -32.95, 27.97] },
  { name: 'Pietermaritzburg', bbox: [-29.70, 30.30, -29.55, 30.47] },
  { name: 'Polokwane', bbox: [-23.95, 29.40, -23.83, 29.52] },
  { name: 'Mbombela (Nelspruit)', bbox: [-25.52, 30.90, -25.42, 31.07] },
  { name: 'Kimberley', bbox: [-28.78, 24.69, -28.70, 24.82] },
  { name: 'George', bbox: [-34.06, 22.38, -33.93, 22.52] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Plain-English business type -> OpenStreetMap tags to search for.
const CATEGORY_TAGS = {
  plumber: [['craft', 'plumber']],
  plumbers: [['craft', 'plumber']],
  electrician: [['craft', 'electrician']],
  electricians: [['craft', 'electrician']],
  hairdresser: [['shop', 'hairdresser']],
  'hair salon': [['shop', 'hairdresser']],
  'hair salons': [['shop', 'hairdresser']],
  barber: [['shop', 'hairdresser']],
  'beauty salon': [['shop', 'beauty']],
  spa: [['leisure', 'spa'], ['shop', 'massage']],
  spas: [['leisure', 'spa'], ['shop', 'massage']],
  restaurant: [['amenity', 'restaurant']],
  restaurants: [['amenity', 'restaurant']],
  cafe: [['amenity', 'cafe']],
  'coffee shop': [['amenity', 'cafe']],
  takeaway: [['amenity', 'fast_food']],
  'fast food': [['amenity', 'fast_food']],
  builder: [['craft', 'builder']],
  builders: [['craft', 'builder']],
  mechanic: [['shop', 'car_repair']],
  mechanics: [['shop', 'car_repair']],
  'car repair': [['shop', 'car_repair']],
  'panel beater': [['shop', 'car_repair']],
  painter: [['craft', 'painter']],
  painters: [['craft', 'painter']],
  carpenter: [['craft', 'carpenter']],
  carpenters: [['craft', 'carpenter']],
  landscaper: [['craft', 'gardener']],
  landscapers: [['craft', 'gardener']],
  gardener: [['craft', 'gardener']],
  dentist: [['amenity', 'dentist'], ['healthcare', 'dentist']],
  dentists: [['amenity', 'dentist'], ['healthcare', 'dentist']],
  doctor: [['amenity', 'doctors'], ['healthcare', 'doctor']],
  doctors: [['amenity', 'doctors'], ['healthcare', 'doctor']],
  lawyer: [['office', 'lawyer']],
  lawyers: [['office', 'lawyer']],
  attorney: [['office', 'lawyer']],
  accountant: [['office', 'accountant']],
  accountants: [['office', 'accountant']],
  bakery: [['shop', 'bakery']],
  bakeries: [['shop', 'bakery']],
  butcher: [['shop', 'butcher']],
  butchery: [['shop', 'butcher']],
  florist: [['shop', 'florist']],
  florists: [['shop', 'florist']],
  photographer: [['craft', 'photographer'], ['shop', 'photo']],
  photographers: [['craft', 'photographer'], ['shop', 'photo']],
  caterer: [['craft', 'caterer']],
  caterers: [['craft', 'caterer']],
  'guest house': [['tourism', 'guest_house']],
  'guest houses': [['tourism', 'guest_house']],
  'b&b': [['tourism', 'guest_house']],
  gym: [['leisure', 'fitness_centre']],
  gyms: [['leisure', 'fitness_centre']],
  pharmacy: [['amenity', 'pharmacy']],
  pharmacies: [['amenity', 'pharmacy']],
  'car wash': [['amenity', 'car_wash']],
  'clothing shop': [['shop', 'clothes']],
  'furniture shop': [['shop', 'furniture']],
  'hardware store': [['shop', 'hardware']],
  hardware: [['shop', 'hardware']],
  tattoo: [['shop', 'tattoo']],
  optician: [['shop', 'optician']],
  opticians: [['shop', 'optician']],
  veterinary: [['amenity', 'veterinary']],
  vet: [['amenity', 'veterinary']],
  vets: [['amenity', 'veterinary']],
  nursery: [['shop', 'garden_centre']],
  tyres: [['shop', 'tyres']],
  locksmith: [['craft', 'locksmith'], ['shop', 'locksmith']],
  locksmiths: [['craft', 'locksmith'], ['shop', 'locksmith']],
};

// ---- DOM references ----
const form = document.getElementById('search-form');
const statusBox = document.getElementById('status');
const resultsHead = document.getElementById('results-head');
const resultsEl = document.getElementById('results');
const leadCountEl = document.getElementById('lead-count');
const scanNote = document.getElementById('scan-note');
const moreBtn = document.getElementById('more-btn');
const exportBtn = document.getElementById('export-btn');
const searchBtn = document.getElementById('search-btn');
const sweepBtn = document.getElementById('sweep-btn');
const jobSweepBtn = document.getElementById('job-sweep-btn');

function setBusy(busy) {
  searchBtn.disabled = busy;
  if (sweepBtn) sweepBtn.disabled = busy;
  if (jobSweepBtn) jobSweepBtn.disabled = busy;
}

if (moreBtn) moreBtn.hidden = true; // no pagination in the browser version

let leads = [];
let currentQuery = { category: '', area: '' };

// "Contacted" ticks persist in this browser.
const CONTACTED_KEY = 'sa-lead-finder:contacted';
const contacted = new Set(JSON.parse(localStorage.getItem(CONTACTED_KEY) || '[]'));

// ---- small helpers ----
function leadId(lead) {
  return `${lead.name}|${lead.phone}`;
}
function saveContacted() {
  localStorage.setItem(CONTACTED_KEY, JSON.stringify([...contacted]));
}
function setStatus(msg, isError = false) {
  if (!msg) {
    statusBox.hidden = true;
    return;
  }
  statusBox.hidden = false;
  statusBox.textContent = msg;
  statusBox.classList.toggle('error', isError);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
function firstTag(tags, keys) {
  for (const k of keys) if (tags[k]) return tags[k];
  return '';
}

// Turn a South African phone number into a wa.me WhatsApp link.
function toWhatsApp(phone) {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, '').replace(/\+/g, '');
  if (d.startsWith('27')) {
    // already has country code
  } else if (d.startsWith('0')) {
    d = '27' + d.slice(1);
  } else if (d.length === 9) {
    d = '27' + d;
  }
  return d.length >= 10 ? `https://wa.me/${d}` : null;
}

function buildAddress(tags) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [street, tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ');
}

function resolveCategory(category) {
  const key = category.trim().toLowerCase();
  if (CATEGORY_TAGS[key]) return { tags: CATEGORY_TAGS[key], nameTerm: null };
  const safe = key.replace(/["\\]/g, '').slice(0, 40);
  return { tags: null, nameTerm: safe };
}

function buildOverpassQuery({ tags, nameTerm }, bbox) {
  const [s, w, n, e] = bbox;
  const box = `(${s},${w},${n},${e})`;
  let lines = '';
  if (tags) {
    for (const [k, v] of tags) lines += `  nwr["${k}"="${v}"]${box};\n`;
  } else {
    for (const k of ['shop', 'amenity', 'craft', 'office'])
      lines += `  nwr["name"~"${nameTerm}",i]["${k}"]${box};\n`;
  }
  return `[out:json][timeout:60];\n(\n${lines});\nout tags center 600;`;
}

async function geocodeArea(area) {
  const url = `${NOMINATIM}?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(
    area + ', South Africa'
  )}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`could not look up that area (status ${r.status})`);
  const arr = await r.json();
  if (!arr.length) return null;
  // Nominatim boundingbox = [south, north, west, east]; we want S,W,N,E.
  const bb = arr[0].boundingbox.map(Number);
  return [bb[0], bb[2], bb[1], bb[3]];
}

async function queryOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
      });
      if (r.ok) return await r.json();
    } catch {
      // this mirror failed (busy or no CORS) — try the next
    }
  }
  throw new Error('busy');
}

function elementsToLeads(elements) {
  const seen = new Set();
  const out = [];
  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name) continue;

    const website = firstTag(tags, ['website', 'contact:website', 'url', 'contact:url']);
    if (website) continue; // has a website -> not a lead

    const phone = firstTag(tags, ['phone', 'contact:phone', 'contact:mobile', 'mobile']);
    if (!phone) continue; // no way to reach them -> skip

    const id = `${name}|${phone}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const typeRaw = firstTag(tags, [
      'shop', 'amenity', 'craft', 'office', 'leisure', 'tourism', 'healthcare',
    ]);

    out.push({
      name,
      type: typeRaw.replace(/_/g, ' '),
      address: buildAddress(tags),
      phone,
      whatsapp: toWhatsApp(phone),
      mapsUri: lat && lon ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : '',
    });
  }
  return out;
}

// ---- rendering ----
function renderLeads() {
  resultsEl.innerHTML = '';
  leads.forEach((lead) => {
    const id = leadId(lead);
    const isDone = contacted.has(id);

    const li = document.createElement('li');
    li.className = 'lead' + (isDone ? ' done' : '');

    const actions = [];
    if (lead.whatsapp)
      actions.push(`<a class="a-wa" href="${lead.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>`);
    if (lead.phone)
      actions.push(`<a class="a-call" href="tel:${escapeHtml(lead.phone)}">Call</a>`);
    if (lead.mapsUri)
      actions.push(`<a class="a-map" href="${lead.mapsUri}" target="_blank" rel="noopener">Map</a>`);

    li.innerHTML = `
      <input type="checkbox" ${isDone ? 'checked' : ''} title="Mark as contacted" />
      <div class="info">
        <div class="name">${escapeHtml(lead.name)}</div>
        ${(lead.type || lead.city) ? `<div class="type">${escapeHtml([lead.type, lead.city].filter(Boolean).join(' · '))}</div>` : ''}
        ${lead.address ? `<div class="addr">${escapeHtml(lead.address)}</div>` : ''}
        ${lead.phone ? `<div class="phone">📞 ${escapeHtml(lead.phone)}</div>` : '<div class="phone muted">No phone listed</div>'}
      </div>
      <div class="actions">${actions.join('')}</div>
    `;

    const cb = li.querySelector('input[type="checkbox"]');
    cb.addEventListener('change', () => {
      if (cb.checked) contacted.add(id);
      else contacted.delete(id);
      saveContacted();
      li.classList.toggle('done', cb.checked);
    });

    resultsEl.appendChild(li);
  });

  leadCountEl.textContent = leads.length;
  resultsHead.hidden = leads.length === 0;
}

// ---- search flow ----
async function runSearch() {
  setBusy(true);
  setStatus('Searching OpenStreetMap for businesses…');
  try {
    const bbox = await geocodeArea(currentQuery.area);
    if (!bbox) {
      setStatus(`Couldn't find "${currentQuery.area}" in South Africa. Try a nearby city.`, true);
      return;
    }
    const resolved = resolveCategory(currentQuery.category);
    const query = buildOverpassQuery(resolved, bbox);

    let data;
    try {
      data = await queryOverpass(query);
    } catch {
      setStatus('The free map service is busy right now. Wait a few seconds and try again.', true);
      return;
    }

    const elements = data.elements || [];
    leads = elementsToLeads(elements);
    renderLeads();
    scanNote.textContent = `(checked ${elements.length} businesses)`;

    if (leads.length === 0) {
      setStatus('No website-less businesses found for that type and area. Try a bigger city or a different business type.');
    } else {
      setStatus(null);
    }
  } catch (err) {
    setStatus(`Something went wrong: ${err.message}`, true);
  } finally {
    setBusy(false);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  currentQuery = {
    category: document.getElementById('category').value.trim(),
    area: document.getElementById('area').value.trim(),
  };
  runSearch();
});

// Sweep one business type across every major SA city, pooling + de-duplicating.
async function runSweep() {
  const category = document.getElementById('category').value.trim();
  if (!category) {
    setStatus('Enter a business type first, then sweep.', true);
    return;
  }
  currentQuery = { category, area: 'major SA cities' };
  setBusy(true);
  leads = [];
  renderLeads();

  const resolved = resolveCategory(category);
  const seen = new Set();
  let scannedTotal = 0;

  try {
    for (let i = 0; i < CITIES.length; i++) {
      const city = CITIES[i];
      setStatus(`Sweeping ${city.name}… (${i + 1}/${CITIES.length}) — ${leads.length} leads so far`);

      let data;
      try {
        data = await queryOverpass(buildOverpassQuery(resolved, city.bbox));
      } catch {
        continue; // this city's mirror was busy — skip it and keep going
      }

      const elements = data.elements || [];
      scannedTotal += elements.length;
      for (const lead of elementsToLeads(elements)) {
        const id = leadId(lead);
        if (seen.has(id)) continue; // already found in another city
        seen.add(id);
        lead.city = city.name;
        leads.push(lead);
      }
      renderLeads();
      scanNote.textContent = `(checked ${scannedTotal} businesses across ${i + 1} cities)`;

      if (i < CITIES.length - 1) await sleep(1200); // be polite to the free service
    }
    setStatus(
      leads.length
        ? null
        : 'No website-less businesses found in the swept cities. Try a more common business type.'
    );
  } finally {
    setBusy(false);
  }
}

sweepBtn.addEventListener('click', runSweep);

// Sweep many common trades/jobs across a single city.
const JOB_TYPES = [
  'plumber', 'electrician', 'builder', 'painter', 'carpenter', 'mechanic',
  'landscaper', 'locksmith', 'caterer', 'photographer', 'hairdresser',
  'beauty salon', 'spa', 'butcher', 'bakery', 'florist',
];

async function runJobSweep() {
  const area = document.getElementById('area').value.trim();
  if (!area) {
    setStatus('Enter a city/area above first — the trades sweep searches one city.', true);
    return;
  }
  currentQuery = { category: 'all trades', area };
  setBusy(true);
  leads = [];
  renderLeads();
  setStatus(`Locating ${area}…`);

  try {
    const bbox = await geocodeArea(area);
    if (!bbox) {
      setStatus(`Couldn't find "${area}" in South Africa. Try a nearby city.`, true);
      return;
    }
    const seen = new Set();
    let scannedTotal = 0;

    for (let i = 0; i < JOB_TYPES.length; i++) {
      const job = JOB_TYPES[i];
      setStatus(`Sweeping ${job}s in ${area}… (${i + 1}/${JOB_TYPES.length}) — ${leads.length} leads so far`);

      let data;
      try {
        data = await queryOverpass(buildOverpassQuery(resolveCategory(job), bbox));
      } catch {
        continue; // busy mirror — skip this trade and continue
      }

      const elements = data.elements || [];
      scannedTotal += elements.length;
      for (const lead of elementsToLeads(elements)) {
        const id = leadId(lead);
        if (seen.has(id)) continue;
        seen.add(id);
        lead.city = area;
        leads.push(lead);
      }
      renderLeads();
      scanNote.textContent = `(checked ${scannedTotal} businesses across ${i + 1} trades)`;

      if (i < JOB_TYPES.length - 1) await sleep(1200);
    }
    setStatus(
      leads.length
        ? null
        : `No website-less businesses found across trades in ${area}. Try a bigger city.`
    );
  } finally {
    setBusy(false);
  }
}

jobSweepBtn.addEventListener('click', runJobSweep);

exportBtn.addEventListener('click', () => {
  if (leads.length === 0) return;
  const rows = [['Name', 'Type', 'City', 'Address', 'Phone', 'Contacted', 'Google Maps']];
  leads.forEach((l) => {
    rows.push([
      l.name, l.type, l.city || currentQuery.area, l.address, l.phone,
      contacted.has(leadId(l)) ? 'yes' : 'no', l.mapsUri,
    ]);
  });
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${currentQuery.category || 'export'}.csv`.replace(/\s+/g, '-');
  a.click();
  URL.revokeObjectURL(url);
});
