// The GoHighLevel webhooks, one address per event (one Vercel function serves all of them):
//   POST /api/hooks/signed?key=<HEATMAP_WEBHOOK_KEY>
//   POST /api/hooks/closed?key=...
//   POST /api/hooks/cancelled?key=...
// Each hook updates the deal for its contact ID in Firestore heatmap_deals (rules in api/_lib/deals.js), and a short
// log entry with only the mapped fields goes to heatmap_hooks. The rest of the payload (transcripts, phones, links)
// is not stored.
//   GET  /api/hooks/deals?key=...&limit=50    deals, most recently updated first
//   GET  /api/hooks/inbox?key=...&limit=10    the hook log, newest first (add &event=closed for one event)
// The key can also go in an X-Heatmap-Key header. Vercel settings: HEATMAP_WEBHOOK_KEY and
// HEATMAP_FIREBASE_SERVICE_ACCOUNT (the Heat Map's own Firebase project, separate from the Hub). Logs counts only.
const { EVENTS, eventOf, parseBody, keyOk } = require('../_lib/hooks');
const { extract, applyEvent } = require('../_lib/deals');
const { geocode, exact, addrKey } = require('../_lib/geo');
const { intake } = require('../_lib/options');
const { db, rawBody, send, touch, quotaHit, QUOTA_MSG } = require('../_lib/store');

const HOOKS = 'heatmap_hooks', DEALS = 'heatmap_deals', OPTIONS = 'heatmap_meta/options';
const limitOf = (url, def, max) => Math.min(max, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || def));

module.exports = async (req, res) => {
  const want = process.env.HEATMAP_WEBHOOK_KEY;
  if (!want) return send(res, 503, { error: 'The Heat Map is not set up for webhooks yet (HEATMAP_WEBHOOK_KEY).' });
  const url = new URL(req.url, 'http://heatmap'), given = url.searchParams.get('key') || req.headers['x-heatmap-key'] || '';
  if (!keyOk(given, want)) return send(res, 401, { error: 'Bad key.' });
  const event = eventOf(req);

  if (event === 'inbox' || event === 'deals') {
    if (req.method !== 'GET') return send(res, 405, { error: 'GET only' });
    try {
      if (event === 'deals') {
        const snap = await db().collection(DEALS).orderBy('updatedAt', 'desc').limit(limitOf(url, 50, 500)).get();
        return send(res, 200, { deals: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
      }
      // filter by event in code: a Firestore filter plus this order would need an index set up by hand
      const only = url.searchParams.get('event'), limit = limitOf(url, 10, 50);
      const snap = await db().collection(HOOKS).orderBy('receivedAt', 'desc').limit(EVENTS.includes(only) ? 200 : limit).get();
      const hooks = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(h => !EVENTS.includes(only) || h.event === only).slice(0, limit);
      return send(res, 200, { hooks });
    } catch (e) { console.error(event + ' failed', e.code || '', e.message || ''); return send(res, quotaHit(e) ? 503 : 500, { error: quotaHit(e) ? QUOTA_MSG : 'Could not read the Heat Map data.' }); }
  }

  if (!EVENTS.includes(event)) return send(res, 404, { error: 'Unknown event. Use signed, closed or cancelled.' });
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const parsed = parseBody(await rawBody(req), req.headers['content-type']);
  if (!parsed.ok) return send(res, 400, { error: parsed.error });
  const f = extract(parsed.body), now = Date.now();
  if (!f.contactId) return send(res, 400, { error: 'No contact_id in the hook. Deals are matched by contact ID.' });
  try {
    const out = await db().runTransaction(async tx => {
      const newest = docs => docs.map(d => ({ ref: d.ref, data: d.data() })).sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0))[0];
      const optRef = db().doc(OPTIONS), optSnap = await tx.get(optRef);
      let latest = newest((await tx.get(db().collection(DEALS).where('contactId', '==', f.contactId))).docs);
      // a deal from the CSV history has no contact ID yet: find it by house number and ZIP, and adopt it
      let adopted = false;
      if (!latest && addrKey(f)) {
        const c = newest((await tx.get(db().collection(DEALS).where('addrKey', '==', addrKey(f)))).docs.filter(d => !d.data().contactId));
        if (c) { latest = c; latest.data.contactId = f.contactId; adopted = true; }
      }
      // the Settings lists: known spellings map to one name; new lead sources and exits are added, marked as from the CRM
      const options = optSnap.exists ? optSnap.data() : null;
      if (intake(options, f, now)) tx.set(optRef, { ...options, updatedAt: now });
      const prevZip = latest ? latest.data.zip : null;
      const { deal, isNew } = applyEvent(latest ? latest.data : null, event, f, now);
      if (adopted) deal.hist.splice(deal.hist.length - 1, 0, { t: now, event, text: 'Matched to the deal from the CSV history by address' });
      const moved = deal.lat == null || deal.zip !== prevZip || (latest && latest.data.address !== deal.address);
      if (moved) geocode(deal);
      deal.addrKey = addrKey(deal);
      const ref = isNew ? db().collection(DEALS).doc() : latest.ref;
      tx.set(ref, deal);
      tx.set(db().collection(HOOKS).doc(), { event, receivedAt: now, contactId: f.contactId, dealId: ref.id, fields: f });
      return { dealId: ref.id, status: deal.status, isNew, ref, spot: moved || deal.geo !== 'address' ? { address: deal.address, city: deal.city, state: deal.state, zip: deal.zip } : null };
    });
    // the exact street address when the Census geocoder knows it; the ZIP spot stays otherwise
    if (out.spot && await exact(out.spot)) await out.ref.update({ lat: out.spot.lat, lon: out.spot.lon, geo: 'address', geoTried: now });
    await touch();   // open pages pick the change up on their next check
    const { ref: _r, spot: _s, ...reply } = out;
    console.log(`heatmap hook: ${event} -> ${out.isNew ? 'new' : 'existing'} deal, now ${out.status}`);
    send(res, 200, { ok: true, event, ...reply });
  } catch (e) {
    console.error('heatmap hook failed', e.code || '', e.message || '');
    send(res, quotaHit(e) ? 503 : 500, { error: quotaHit(e) ? QUOTA_MSG + ' GoHighLevel can retry.' : 'Could not save the hook. GoHighLevel can retry.' });
  }
};
