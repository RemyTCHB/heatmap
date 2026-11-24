// Turning a GoHighLevel hook into a deal. Pure, so tests can run it.
//
// The same payload goes to all three addresses; the address says what happened. The owner's rules:
// - The event's date is the moment the hook arrives: a Signed hook today is signed today, a Closed hook tomorrow is
//   closed tomorrow. The GoHighLevel date fields are kept on the deal for reference only.
// - The first Closed on a contact is the AB closing; its profit is "AB Profit (TC)".
// - A Closed on a contact whose deal already closed is the Fix & Flip resale; its profit is "BC Profit", and the deal's
//   actual profit is both closings added up.
// - Deals are matched by contact ID.

// Where each field sits in the hook (confirmed by the owner).
const KEYS = {
  contactId: 'contact_id',
  address: 'address1', city: 'city', state: 'state', zip: 'postal_code',
  source: 'Lead Source', created: 'Date Created',
  acq: 'ACQ Manager', fus: 'FUS Manager', dispo: 'Dispo Manager',
  potential: 'Potential Profit', exit: 'Final Exit Strategy', feedback: 'FEEDBACK (MUST FILL)',
  abProfit: 'AB Profit (TC)', bcProfit: 'BC Profit',
  abSigned: 'AB Date Signed', abClosed: 'AB Actual Closing Date', bcSigned: 'BC Date Signed', sold: 'Actual Sold Date'
};

const text = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, 300);
function money(v) {
  const s = text(v).replace(/[$,\s]/g, ''); if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-'); const n = parseFloat(s.replace(/[()-]/g, ''));
  return isNaN(n) ? null : Math.round((neg ? -n : n) * 100) / 100;
}
// "2026-11-22", "7/12/2026 17:55:22" or an ISO time; plain dates are read as noon Eastern
function date(v) {
  const s = text(v); if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return Date.parse(`${m[1]}-${m[2]}-${m[3]}T12:00:00-05:00`);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) { const p = n => String(n).padStart(2, '0'); return Date.parse(`${m[3]}-${p(m[1])}-${p(m[2])}T${p(m[4] || 12)}:${p(m[5] || 0)}:${p(m[6] || 0)}-05:00`); }
  const t = Date.parse(s); return isNaN(t) ? null : t;
}

function extract(body) {
  const b = body && typeof body === 'object' ? body : {}, g = k => b[KEYS[k]];
  return {
    contactId: text(g('contactId') || b.contactId || (b.contact && b.contact.id)).replace(/[^\w-]/g, '').slice(0, 80),
    address: text(g('address')), city: text(g('city')), state: text(g('state')).toUpperCase().slice(0, 2), zip: text(g('zip')).slice(0, 5),
    source: text(g('source')), created: date(g('created')) || date(b.date_created),
    acq: text(g('acq')), fus: text(g('fus')), dispo: text(g('dispo')),
    potential: money(g('potential')), exit: text(g('exit')), feedback: text(g('feedback')),
    abProfit: money(g('abProfit')), bcProfit: money(g('bcProfit')),
    abSigned: date(g('abSigned')), abClosed: date(g('abClosed')), bcSigned: date(g('bcSigned')), sold: date(g('sold'))
  };
}

// these follow the latest hook whenever it carries a value
const DESCRIPTIVE = ['address', 'city', 'state', 'zip', 'source', 'created', 'acq', 'fus', 'dispo', 'potential', 'exit', 'abSigned', 'abClosed', 'bcSigned', 'sold'];
const NO_DISPO = 'Closed Without A DISPO · Set To TCHB For Now';
const usd = n => n == null ? 'no profit given' : (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US');

function blank(f, now) {
  return { contactId: f.contactId, status: 'signed', address: '', city: '', state: '', zip: '', source: '', created: null, acq: '', fus: '', dispo: '',
    potential: null, actual: null, exit: '', feedback: '', signedAt: null, closedAt: null, cancelledAt: null,
    abSigned: null, abClosed: null, bcSigned: null, sold: null, closings: [], hist: [], flags: [], createdAt: now, updatedAt: now };
}

// latest: the contact's newest deal (or null). Returns the deal to save and whether it is a new one.
function applyEvent(latest, event, f, now) {
  let deal = latest ? JSON.parse(JSON.stringify(latest)) : null, isNew = false;
  const start = flag => { deal = blank(f, now); isNew = true; if (flag) deal.flags.push(flag); };
  const fill = () => DESCRIPTIVE.forEach(k => { if (f[k] != null && f[k] !== '') deal[k] = f[k]; });
  const note = t => deal.hist.push({ t: now, event, text: t });

  if (event === 'signed') {
    // a new contract, unless the contact's deal is still open (then the hook only refreshes the details)
    const again = deal && deal.status === 'signed';
    if (!again) start();
    fill(); if (!deal.signedAt) deal.signedAt = now;
    note(again ? 'Signed hook again: details updated' : 'Signed');
  } else if (event === 'closed') {
    if (!deal) start('Closed Without A Signed Hook');
    fill();
    if (deal.status === 'closed') {
      deal.closings.push({ t: now, label: 'Fix & Flip Sale', revenue: f.bcProfit, exit: f.exit });
      note('Closed: Fix & Flip Sale · BC Profit ' + usd(f.bcProfit));
    } else {
      if (deal.status === 'cancelled') deal.flags.push('Closed After It Was Cancelled');
      deal.closings.push({ t: now, label: 'Closing', revenue: f.abProfit, exit: f.exit });
      note('Closed · AB Profit (TC) ' + usd(f.abProfit));
    }
    if (deal.closings.length > 1) { deal.closings[0].label = 'Fix & Flip Purchase'; deal.exit = 'Fix & Flip'; }
    const revs = deal.closings.map(c => c.revenue).filter(r => r != null);
    deal.actual = revs.length ? Math.round(revs.reduce((a, b) => a + b, 0) * 100) / 100 : null;
    deal.status = 'closed'; deal.closedAt = now;
    if (!deal.dispo || deal.dispo === 'TCHB') { deal.dispo = 'TCHB'; deal.flags.push(NO_DISPO); }
    else deal.flags = deal.flags.filter(x => x !== NO_DISPO);
  } else if (event === 'cancelled') {
    if (!deal) start('Cancelled Without A Signed Hook');
    if (deal.status === 'closed') {
      // a closed deal stays closed; the cancel is kept in its history to check
      deal.flags.push('Cancelled Hook After It Closed'); if (f.feedback) deal.feedback = f.feedback;
      note('Cancelled hook arrived, but the deal had already closed');
    } else {
      fill(); deal.status = 'cancelled'; deal.cancelledAt = now; deal.closedAt = now; deal.actual = 0;
      if (f.feedback) deal.feedback = f.feedback;
      note('Cancelled' + (f.feedback ? ' · ' + f.feedback : ''));
    }
  } else throw new Error('Unknown event: ' + event);

  deal.flags = [...new Set(deal.flags)];
  deal.hist = deal.hist.slice(-50);
  deal.updatedAt = now;
  return { deal, isNew };
}

module.exports = { KEYS, extract, applyEvent, money, date };
