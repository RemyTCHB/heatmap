// The GoHighLevel webhooks, one address per event (one Vercel function serves all of them):
//   POST /api/hooks/signed?key=<HEATMAP_WEBHOOK_KEY>
//   POST /api/hooks/closed?key=...
//   POST /api/hooks/cancelled?key=...
// Each hook is saved as it arrived in Firestore heatmap_hooks, so the field mapping is built from real payloads.
//   GET  /api/hooks/inbox?key=...&limit=10   the latest saved hooks, newest first (add &event=closed for one event)
// Vercel settings: HEATMAP_WEBHOOK_KEY and HEATMAP_FIREBASE_SERVICE_ACCOUNT (the Heat Map's own Firebase project,
// separate from the Hub). Logs counts only.
const { EVENTS, eventOf, parseBody, keyOk, record } = require('../_lib/hooks');
const { db, rawBody, send } = require('../_lib/store');

const COLLECTION = 'heatmap_hooks';

module.exports = async (req, res) => {
  const want = process.env.HEATMAP_WEBHOOK_KEY;
  if (!want) return send(res, 503, { error: 'The Heat Map is not set up for webhooks yet (HEATMAP_WEBHOOK_KEY).' });
  const url = new URL(req.url, 'http://heatmap'), given = url.searchParams.get('key') || req.headers['x-heatmap-key'] || '';
  if (!keyOk(given, want)) return send(res, 401, { error: 'Bad key.' });
  const event = eventOf(req);

  if (event === 'inbox') {
    if (req.method !== 'GET') return send(res, 405, { error: 'GET only' });
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 10)), only = url.searchParams.get('event');
    try {
      // filter by event in code: a Firestore filter plus this order would need an index set up by hand
      const snap = await db().collection(COLLECTION).orderBy('receivedAt', 'desc').limit(EVENTS.includes(only) ? 200 : limit).get();
      const hooks = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(h => !EVENTS.includes(only) || h.event === only).slice(0, limit);
      return send(res, 200, { hooks });
    } catch (e) { console.error('inbox failed', e.code || '', e.message || ''); return send(res, 500, { error: 'Could not read the saved hooks.' }); }
  }

  if (!EVENTS.includes(event)) return send(res, 404, { error: 'Unknown event. Use signed, closed or cancelled.' });
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const parsed = parseBody(await rawBody(req), req.headers['content-type']);
  if (!parsed.ok) return send(res, 400, { error: parsed.error });
  try {
    const rec = record(event, parsed, req.headers['content-type']);
    const ref = await db().collection(COLLECTION).add(rec);
    console.log(`heatmap hook: ${event}, ${parsed.format}, contact id ${rec.contactId ? 'present' : 'missing'}`);
    send(res, 200, { ok: true, event, id: ref.id, contactId: rec.contactId || null });
  } catch (e) {
    console.error('heatmap hook failed', e.code || '', e.message || '');
    send(res, 500, { error: 'Could not save the hook. GoHighLevel can retry.' });
  }
};
