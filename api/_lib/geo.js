// Where a deal goes on the map: its ZIP code, or else its city and state. Pins sit at the ZIP's centre.
const zipcodes = require('zipcodes');

const titleCase = s => String(s || '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

function geocode(d) {
  d.geo = 'zip';
  const zip = String(d.zip || '').slice(0, 5);
  let z = /^\d{5}$/.test(zip) ? zipcodes.lookup(zip) : null;
  if (!z && d.city && d.state) { try { z = (zipcodes.lookupByName(d.city, d.state) || [])[0]; } catch (e) { z = null; } }
  if (!z) { d.lat = null; d.lon = null; return d; }
  d.lat = z.latitude; d.lon = z.longitude;
  if (!d.city) d.city = titleCase(z.city);
  if (!d.state) d.state = z.state;
  return d;
}

// house number + ZIP: how a hook finds a deal that came from the CSV import (those have no contact ID)
function addrKey(d) {
  const num = (String(d.address || '').trim().match(/^\d+/) || [''])[0], zip = String(d.zip || '').slice(0, 5);
  return num && /^\d{5}$/.test(zip) ? num + '|' + zip : '';
}

// the exact spot of the street address, from the US Census geocoder. Returns true when it found one.
async function exact(d, timeoutMs = 5000) {
  if (!d.address || !(d.zip || (d.city && d.state))) return false;
  const one = [d.address, d.city, [d.state, d.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=' + encodeURIComponent(one);
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) }); if (!r.ok) return false;
    const m = ((await r.json()).result || {}).addressMatches || [];
    if (!m.length || !m[0].coordinates) return false;
    d.lat = m[0].coordinates.y; d.lon = m[0].coordinates.x; d.geo = 'address'; return true;
  } catch (e) { return false; }
}

module.exports = { geocode, exact, addrKey, titleCase };
