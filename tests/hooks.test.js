const test = require('node:test');
const assert = require('node:assert');
const { eventOf, parseBody, contactIdOf, keyOk, record, MAX_BODY } = require('../api/_lib/hooks');

test('the event comes from the address', () => {
  assert.strictEqual(eventOf({ query: { event: 'Closed' } }), 'closed');
  assert.strictEqual(eventOf({ url: '/api/hooks/cancelled?key=x' }), 'cancelled');
  assert.strictEqual(eventOf({ url: '/api/hooks/inbox' }), 'inbox');
});

test('bodies: JSON, form-encoded, text, empty, too large', () => {
  assert.deepStrictEqual(parseBody('{"contact_id":"abc"}').body, { contact_id: 'abc' });
  const f = parseBody('contact_id=abc&city=Akron', 'application/x-www-form-urlencoded');
  assert.strictEqual(f.format, 'form'); assert.strictEqual(f.body.city, 'Akron');
  assert.strictEqual(parseBody('hello there').format, 'text');
  assert.strictEqual(parseBody('  ').ok, false);
  assert.strictEqual(parseBody('x'.repeat(MAX_BODY + 1)).ok, false);
});

test('contact ID from the top level, a contact object or Custom Data', () => {
  assert.strictEqual(contactIdOf({ contact_id: 'ab-12' }), 'ab-12');
  assert.strictEqual(contactIdOf({ contact: { id: 'xy9' } }), 'xy9');
  assert.strictEqual(contactIdOf({ customData: { contactId: 'q1' } }), 'q1');
  assert.strictEqual(contactIdOf({ contact_id: '<b>bad</b>' }), 'bbadb');
  assert.strictEqual(contactIdOf({}), '');
});

test('the key must match', () => {
  assert.strictEqual(keyOk('s3cret', 's3cret'), true);
  assert.strictEqual(keyOk('nope', 's3cret'), false);
  assert.strictEqual(keyOk('', 's3cret'), false);
  assert.strictEqual(keyOk('s3cret', ''), false);
});

test('the stored record', () => {
  const r = record('signed', parseBody('{"contact_id":"c1","city":"Akron"}'), 'application/json', 5);
  assert.deepStrictEqual(r, { event: 'signed', receivedAt: 5, contactId: 'c1', format: 'json', contentType: 'application/json', body: { contact_id: 'c1', city: 'Akron' } });
});
