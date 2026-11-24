// Firebase Admin for the Heat Map's own Firebase project (kept apart from the Hub), the raw request body, and JSON
// replies. Vercel setting: HEATMAP_FIREBASE_SERVICE_ACCOUNT holds that project's service account key as JSON.
const admin = require('firebase-admin');

function app() {
  if (!admin.apps.length) {
    const raw = process.env.HEATMAP_FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw Object.assign(new Error('HEATMAP_FIREBASE_SERVICE_ACCOUNT is not set.'), { code: 'not-configured' });
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}
const db = () => app().firestore();

async function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks = []; for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };

module.exports = { app, db, rawBody, send };
