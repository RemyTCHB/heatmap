// The Heat Map page's own endpoints, one Vercel function:
//   GET  /api/app/config    the Firebase web config for Google sign-in (public by design; no sign-in needed)
//   GET  /api/app/data      every deal, the dropdown lists, and who you are (company accounts)
//   POST /api/app/deal      add, edit or delete a deal (owner and managers)
//   POST /api/app/options   change a dropdown list: add, rename, merge, remove, ok (owner and managers)
//   POST /api/app/import    one-time load of the CSV history (webhook key only)
// Vercel settings: HEATMAP_FIREBASE_WEB_CONFIG (the web app's config JSON from Firebase), plus those in auth.js.
const { db, rawBody, send } = require('../_lib/store');
const { who } = require('../_lib/auth');
const { blank } = require('../_lib/deals');
const { geocode, addrKey } = require('../_lib/geo');
const opts = require('../_lib/options');

const DEALS = 'heatmap_deals', OPTIONS = 'heatmap_meta/options';
const NOMAP = 'No City Or ZIP, So It Is Not On The Map';
const STATUSES = ['signed', 'closed', 'cancelled'];
const opOf = req => String((req.query && req.query.op) || String(req.url || '').split('?')[0].split('/').filter(Boolean).pop() || '');
const body = async req => { try { return JSON.parse(await rawBody(req) || '{}'); } catch (e) { return null; } };
const str = (v, n = 300) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const numOrNull = v => (v === null || v === '' || v === undefined) ? null : (Number.isFinite(+v) ? Math.round(+v * 100) / 100 : undefined);

// only these fields can be set from the page, each checked for its type
function cleanFields(f) {
  const out = {}; if (!f || typeof f !== 'object') return out;
  for (const k of ['address', 'city', 'source', 'acq', 'dispo', 'fus', 'exit']) if (k in f) out[k] = str(f[k]);
  if ('feedback' in f) out.feedback = str(f.feedback, 1000);
  if ('state' in f) out.state = str(f.state, 2).toUpperCase();
  if ('zip' in f) out.zip = str(f.zip, 5).replace(/\D/g, '');
  for (const k of ['potential', 'actual', 'created', 'signedAt', 'closedAt']) if (k in f) { const n = numOrNull(f[k]); if (n !== undefined) out[k] = n; }
  if ('status' in f && STATUSES.includes(f.status)) out.status = f.status;
  return out;
}
const cleanFlags = a => Array.isArray(a) ? [...new Set(a.map(x => str(x, 200)).filter(Boolean))].slice(0, 20) : null;
const placeFlags = d => { d.flags = (d.flags || []).filter(x => x !== NOMAP); if (d.lat == null) d.flags.push(NOMAP); };

async function loadOptions() {
  const snap = await db().doc(OPTIONS).get();
  if (snap.exists) return snap.data();
  const deals = (await db().collection(DEALS).get()).docs.map(d => d.data());
  return opts.fromDeals(deals);
}

module.exports = async (req, res) => {
  const op = opOf(req);
  try {
    if (op === 'config') {
      let cfg = null; try { cfg = JSON.parse(process.env.HEATMAP_FIREBASE_WEB_CONFIG || 'null'); } catch (e) {}
      return send(res, 200, { firebase: cfg });
    }
    const me = await who(req);
    if (me.error) return send(res, me.error, { error: me.message });

    if (op === 'data') {
      if (req.method !== 'GET') return send(res, 405, { error: 'GET only' });
      const [deals, options] = await Promise.all([db().collection(DEALS).limit(5000).get(), db().doc(OPTIONS).get()]);
      return send(res, 200, { me: { name: me.name, email: me.email, photo: me.photo, role: me.role, canEdit: me.canEdit },
        deals: deals.docs.map(d => ({ id: d.id, ...d.data() })), options: options.exists ? options.data() : null });
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    if (!me.canEdit) return send(res, 403, { error: 'Only the owner and managers can change deals.' });
    const b = await body(req); if (!b) return send(res, 400, { error: 'Not JSON.' });
    const now = Date.now(), by = me.name;

    if (op === 'deal') {
      if (b.delete) {
        if (!b.id) return send(res, 400, { error: 'Which deal?' });
        await db().collection(DEALS).doc(String(b.id)).delete();
        console.log('deal deleted');
        return send(res, 200, { ok: true });
      }
      const f = cleanFields(b.fields), flags = cleanFlags(b.flags);
      if (!b.id) {   // a new deal from the owner or a manager
        if (!f.address) return send(res, 400, { error: 'Add the street address first.' });
        const d = { ...blank({ contactId: '' }, now), ...f, origin: 'manual', flags: flags || [], hist: [{ t: now, by, text: `Added by ${by}` }] };
        if (!d.signedAt && d.status === 'signed') d.signedAt = now;
        if (d.status === 'cancelled') { d.cancelledAt = d.closedAt || now; d.closedAt = d.cancelledAt; }
        geocode(d); d.addrKey = addrKey(d); placeFlags(d);
        const ref = await db().collection(DEALS).add(d);
        console.log('deal added');
        return send(res, 200, { deal: { id: ref.id, ...d } });
      }
      const ref = db().collection(DEALS).doc(String(b.id));
      const out = await db().runTransaction(async tx => {
        const snap = await tx.get(ref); if (!snap.exists) return null;
        const d = snap.data(), before = { address: d.address, city: d.city, state: d.state, zip: d.zip };
        Object.assign(d, f);
        if (flags) d.flags = flags;
        if (['address', 'city', 'state', 'zip'].some(k => k in f && f[k] !== before[k]) || d.lat === undefined) { geocode(d); d.addrKey = addrKey(d); }
        placeFlags(d);
        if (d.status === 'cancelled' && !d.cancelledAt) d.cancelledAt = d.closedAt || now;
        if (d.status === 'signed') { d.closedAt = null; d.cancelledAt = null; }
        d.hist = [...(d.hist || []), { t: now, by, text: str(b.note, 600) || 'Edited' }].slice(-50);
        d.updatedAt = now;
        tx.set(ref, d); return d;
      });
      if (!out) return send(res, 404, { error: 'That deal no longer exists. Refresh the page.' });
      console.log('deal edited');
      return send(res, 200, { deal: { id: ref.id, ...out } });
    }

    if (op === 'options') {
      const current = await loadOptions();
      let result; try { result = opts.apply(current, b); } catch (e) { return send(res, 400, { error: e.message }); }
      await db().doc(OPTIONS).set({ ...result.options, updatedAt: now });
      let moved = 0;
      if (result.move) {   // deals follow a rename or a merge
        const snap = await db().collection(DEALS).where(result.move.kind, '==', result.move.from).get();
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = db().batch();
          snap.docs.slice(i, i + 400).forEach(doc => batch.update(doc.ref, { [result.move.kind]: result.move.to, updatedAt: now }));
          await batch.commit();
        }
        moved = snap.size;
      }
      console.log(`options ${b.op}: ${moved} deals moved`);
      return send(res, 200, { options: result.options, moved });
    }

    if (op === 'import') {
      if (!me.viaKey) return send(res, 403, { error: 'The import needs the webhook key.' });
      const list = Array.isArray(b.deals) ? b.deals : [];
      if (!list.length) return send(res, 400, { error: 'No deals to import.' });
      const existing = await db().collection(DEALS).where('origin', '==', 'csv').limit(1).get();
      if (!existing.empty && !b.replace) return send(res, 409, { error: 'The CSV history is already loaded. Send replace: true to load it again.' });
      for (let i = 0; i < list.length; i += 400) {
        const batch = db().batch();
        for (const d of list.slice(i, i + 400)) { const id = 'csv-' + String(d.importId).replace(/\W/g, ''); const { importId, ...rest } = d; batch.set(db().collection(DEALS).doc(id), { ...rest, origin: 'csv' }); }
        await batch.commit();
      }
      if (b.options) await db().doc(OPTIONS).set({ ...b.options, updatedAt: now });
      console.log(`import: ${list.length} deals`);
      return send(res, 200, { ok: true, imported: list.length });
    }

    return send(res, 404, { error: 'Not found.' });
  } catch (e) {
    console.error('app ' + op + ' failed', e.code || '', e.message || '');
    return send(res, 500, { error: 'Something went wrong. Try again.' });
  }
};
