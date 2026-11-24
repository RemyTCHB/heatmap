// The parts of the webhook receiver that need no network: which events exist, reading a body and checking the key.
// Kept pure so tests can run them.
const crypto = require('crypto');

// GoHighLevel sends the same payload to each address; the address says which event happened.
const EVENTS = ['signed', 'closed', 'cancelled'];
const MAX_BODY = 500 * 1024;   // Firestore documents top out at 1 MiB; a hook is a few KB

const eventOf = req => {
  const e = (req.query && req.query.event) || String(req.url || '').split('?')[0].split('/').filter(Boolean).pop();
  return String(e || '').toLowerCase();
};

// JSON first (what GoHighLevel sends); form-encoded as a fallback; anything else is kept as text.
function parseBody(raw, contentType = '') {
  const text = String(raw || '');
  if (!text.trim()) return { ok: false, error: 'Empty body.' };
  if (text.length > MAX_BODY) return { ok: false, error: 'Body is too large.' };
  try { const v = JSON.parse(text); if (v && typeof v === 'object') return { ok: true, body: v, format: 'json' }; } catch (e) {}
  if (/x-www-form-urlencoded/i.test(contentType) || /^[^{\s][^=&]*=/.test(text)) {
    const body = {}; for (const [k, v] of new URLSearchParams(text)) body[k] = v;
    if (Object.keys(body).length) return { ok: true, body, format: 'form' };
  }
  return { ok: true, body: { raw: text }, format: 'text' };
}

// The deal is matched by contact ID. GoHighLevel puts it at the top level; Custom Data or a contact object may carry it too.
function contactIdOf(body) {
  if (!body || typeof body !== 'object') return '';
  const c = body.contact_id || body.contactId || (body.contact && body.contact.id) || (body.customData && (body.customData.contact_id || body.customData.contactId)) || '';
  return String(c).replace(/[^\w-]/g, '').slice(0, 80);
}

function keyOk(given, want) {
  if (!want || !given) return false;
  const h = s => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(given), h(want));
}

module.exports = { EVENTS, MAX_BODY, eventOf, parseBody, contactIdOf, keyOk };
