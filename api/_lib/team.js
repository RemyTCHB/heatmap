// The team, mirrored from the Hub (read only). The Hub already answers POST /api/title-agent/team for its connected
// apps, signed with a shared secret: HMAC-SHA256 of "<unix seconds>.<body>". The Heat Map asks for every department
// and keeps the answer in Firestore heatmap_meta/team for a day, or until someone presses Refresh From Hub. Nothing is
// written to the Hub.
// Vercel settings: HEAT_MAP_SECRET (the same value as in the Hub's project; HUB_TEAM_SECRET also works) and optionally
// HUB_URL.
const crypto = require('crypto');

const DEPTS = ['ACQ', 'DISPO', 'FUS', 'TC', 'OPS'];
const FRESH_MS = 24 * 60 * 60 * 1000;

function signed(secret, body, ts = Math.floor(Date.now() / 1000)) {
  return { 'X-Hub-Timestamp': String(ts), 'X-Hub-Signature': 'sha256=' + crypto.createHmac('sha256', secret).update(ts + '.' + body).digest('hex') };
}

async function fetchTeam(secret, base = process.env.HUB_URL || 'https://hub.totalchb.com') {
  const body = JSON.stringify({ depts: DEPTS });
  const r = await fetch(base.replace(/\/$/, '') + '/api/title-agent/team', { method: 'POST', headers: { 'Content-Type': 'application/json', ...signed(secret, body) }, body, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error('The Hub answered ' + r.status);
  const people = ((await r.json()) || {}).people;
  if (!Array.isArray(people)) throw new Error('No people in the answer');
  return people.map(p => ({ name: String(p.name || ''), email: String(p.email || '').toLowerCase(), role: String(p.role || 'member'), dept: String(p.dept || ''), photo: String(p.photo || '') }));
}

// the mirrored team { people, at }, or null when the Hub link is not set up yet. force: ask the Hub now.
async function team(db, force) {
  const ref = db.doc('heatmap_meta/team'), snap = await ref.get(), cached = snap.exists ? snap.data() : null;
  const secret = process.env.HEAT_MAP_SECRET || process.env.HUB_TEAM_SECRET;
  if (!secret) return cached;
  if (!force && cached && Date.now() - (cached.at || 0) < FRESH_MS) return cached;
  try { const people = await fetchTeam(secret), out = { people, at: Date.now() }; await ref.set(out); return out; }
  catch (e) { console.warn('team mirror failed:', e.message); if (force) throw e; return cached; }
}

module.exports = { team, fetchTeam, signed, DEPTS };
