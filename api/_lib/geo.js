// Where a deal goes on the map: its ZIP code, or else its city and state. Pins sit at the ZIP's centre.
const zipcodes = require('zipcodes');

const titleCase = s => String(s || '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

function geocode(d) {
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

module.exports = { geocode, addrKey, titleCase };
