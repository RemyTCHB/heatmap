// The team, mirrored from the Hub (read only). The Hub already answers POST /api/title-agent/team for its connected
// apps, signed with a shared secret: HMAC-SHA256 of "<unix seconds>.<body>". The Heat Map asks for every department
// and keeps the answer in Firestore heatmap_meta/team for 10 minutes. Nothing is written to the Hub.
// Vercel settings: HUB_TEAM_SECRET (one of the secrets the Hub's team endpoint accepts) and optionally HUB_URL.
const crypto = require('crypto');

const DEPTS = ['ACQ', 'DISPO', 'FUS', 'TC', 'OPS'];
const FRESH_MS = 10 * 60 * 1000;

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

// the mirrored team, or null when the Hub link is not set up yet
async function team(db) {
  const ref = db.doc('heatmap_meta/team'), snap = await ref.get(), cached = snap.exists ? snap.data() : null;
  const secret = process.env.HUB_TEAM_SECRET;
  if (!secret) return cached ? cached.people : null;
  if (cached && Date.now() - (cached.at || 0) < FRESH_MS) return cached.people;
  try { const people = await fetchTeam(secret); await ref.set({ people, at: Date.now() }); return people; }
  catch (e) { console.warn('team mirror failed:', e.message); return cached ? cached.people : null; }
}

module.exports = { team, fetchTeam, signed, DEPTS };
