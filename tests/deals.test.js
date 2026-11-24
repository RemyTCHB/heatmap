const test = require('node:test');
const assert = require('node:assert');
const { extract, applyEvent, money, date } = require('../api/_lib/deals');

// a made-up hook in the shape GoHighLevel sends
const hook = (extra = {}) => ({
  contact_id: 'c1', address1: '12 Oak St', city: 'Akron', state: 'oh', postal_code: '44314', 'Lead Source': 'PPC NW RDS',
  'Date Created': '7/12/2026 17:55:22', 'ACQ Manager': 'Luke Pollack', 'FUS Manager': 'Will Robinson', 'Dispo Manager': '',
  'Potential Profit': '', 'Final Exit Strategy': 'Wholesale', 'FEEDBACK (MUST FILL)': '', 'AB Profit (TC)': '50000', 'BC Profit': '',
  'AB Date Signed': '2026-11-22', 'CALL FULL TRANSCRIPT': 'not kept', phone: '+10000000000', ...extra
});
const run = (steps) => { let deal = null, t = 1000; const out = []; for (const [ev, body] of steps) { const r = applyEvent(deal, ev, extract(body), t += 1000); deal = r.deal; out.push(r); } return out; };

test('money and dates', () => {
  assert.strictEqual(money('$1,234.50'), 1234.5); assert.strictEqual(money('($25,698.47)'), -25698.47); assert.strictEqual(money(''), null);
  assert.strictEqual(date('2026-11-22'), Date.parse('2026-11-22T12:00:00-05:00'));
  assert.strictEqual(date('7/12/2026 17:55:22'), Date.parse('2026-07-12T17:55:22-05:00'));
  assert.strictEqual(date(''), null);
});

test('only the mapped fields are taken from the hook', () => {
  const f = extract(hook());
  assert.strictEqual(f.contactId, 'c1'); assert.strictEqual(f.state, 'OH'); assert.strictEqual(f.abProfit, 50000);
  assert.strictEqual(f.acq, 'Luke Pollack'); assert.ok(!JSON.stringify(f).includes('not kept')); assert.ok(!('phone' in f));
});

test('signed, then closed: the dates are when the hooks arrive, profit is AB Profit (TC)', () => {
  const [s, c] = run([['signed', hook()], ['closed', hook({ 'Dispo Manager': 'Moe Al Amir' })]]);
  assert.strictEqual(s.isNew, true); assert.strictEqual(s.deal.signedAt, 2000); assert.strictEqual(s.deal.abSigned, Date.parse('2026-11-22T12:00:00-05:00'));
  assert.strictEqual(c.isNew, false); assert.strictEqual(c.deal.status, 'closed'); assert.strictEqual(c.deal.closedAt, 3000);
  assert.strictEqual(c.deal.actual, 50000); assert.strictEqual(c.deal.dispo, 'Moe Al Amir'); assert.deepStrictEqual(c.deal.flags, []);
});

test('a second Closed is the Fix & Flip sale: BC Profit, added to the total', () => {
  const out = run([['signed', hook()], ['closed', hook({ 'Dispo Manager': 'Moe Al Amir' })], ['closed', hook({ 'BC Profit': '100000', 'Dispo Manager': 'Moe Al Amir' })]]);
  const d = out[2].deal;
  assert.strictEqual(d.closings.length, 2); assert.strictEqual(d.closings[0].label, 'Fix & Flip Purchase'); assert.strictEqual(d.closings[1].label, 'Fix & Flip Sale');
  assert.strictEqual(d.actual, 150000); assert.strictEqual(d.exit, 'Fix & Flip'); assert.strictEqual(d.closedAt, 4000);
});

test('closed without a DISPO is set to TCHB and flagged', () => {
  const d = run([['signed', hook()], ['closed', hook()]])[1].deal;
  assert.strictEqual(d.dispo, 'TCHB'); assert.ok(d.flags[0].startsWith('Closed Without A DISPO'));
});

test('cancelled keeps the feedback; signing again after a cancel starts a new deal', () => {
  const out = run([['signed', hook()], ['cancelled', hook({ 'FEEDBACK (MUST FILL)': 'Seller backed out' })], ['signed', hook()]]);
  assert.strictEqual(out[1].deal.status, 'cancelled'); assert.strictEqual(out[1].deal.feedback, 'Seller backed out'); assert.strictEqual(out[1].deal.actual, 0);
  assert.strictEqual(out[2].isNew, true); assert.strictEqual(out[2].deal.status, 'signed');
});

test('a repeat Signed only refreshes the open deal', () => {
  const out = run([['signed', hook()], ['signed', hook({ 'ACQ Manager': 'Bryan Lopez' })]]);
  assert.strictEqual(out[1].isNew, false); assert.strictEqual(out[1].deal.acq, 'Bryan Lopez'); assert.strictEqual(out[1].deal.signedAt, 2000);
});

test('hooks that arrive without a signed one are flagged; a cancel after closing keeps it closed', () => {
  assert.deepStrictEqual(run([['closed', hook()]])[0].deal.flags.includes('Closed Without A Signed Hook'), true);
  assert.deepStrictEqual(run([['cancelled', hook()]])[0].deal.flags, ['Cancelled Without A Signed Hook']);
  const d = run([['signed', hook()], ['closed', hook({ 'Dispo Manager': 'Moe Al Amir' })], ['cancelled', hook()]])[2].deal;
  assert.strictEqual(d.status, 'closed'); assert.ok(d.flags.includes('Cancelled Hook After It Closed'));
});
