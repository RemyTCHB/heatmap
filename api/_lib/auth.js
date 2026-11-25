// Who is asking. People sign in with Google (Firebase Auth on the Heat Map's own project); the page sends the ID token
// as "Authorization: Bearer <token>". Company accounts can view; only Remy, Monz and Jan can edit or add.
// Vercel settings (all optional, comma-separated emails or domains):
//   HEATMAP_ALLOWED_DOMAINS  who may sign in at all      default: totalchb.com,kpidriver.com
//   HEATMAP_OWNERS           owner (Remy)               default: systems@totalchb.com,systems@kpidriver.com
//   HEATMAP_EDITORS          editors (Monz, Jan)        default: monz@totalchb.com,info@totalchb.com
// The webhook key (X-Heatmap-Key) also works, with the owner's rights, for maintenance such as the CSV import.
const { app } = require('./store');
const { keyOk } = require('./hooks');

const list = (v, d) => String(v || d).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function roleOf(email, env = process.env) {
  const e = String(email || '').toLowerCase(), domain = e.split('@')[1] || '';
  if (!list(env.HEATMAP_ALLOWED_DOMAINS, 'totalchb.com,kpidriver.com').includes(domain)) return null;
  if (list(env.HEATMAP_OWNERS, 'systems@totalchb.com,systems@kpidriver.com').includes(e)) return 'owner';
  if (list(env.HEATMAP_EDITORS, 'monz@totalchb.com,info@totalchb.com').includes(e)) return 'editor';
  return 'viewer';
}

async function who(req) {
  const url = new URL(req.url, 'http://heatmap'), key = req.headers['x-heatmap-key'] || url.searchParams.get('key');
  if (key && keyOk(key, process.env.HEATMAP_WEBHOOK_KEY)) return { email: '', name: 'Maintenance', photo: '', role: 'owner', canEdit: true, viaKey: true };
  const m = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (!m) return { error: 401, message: 'Sign in first.' };
  let t; try { t = await app().auth().verifyIdToken(m[1]); } catch (e) { return { error: 401, message: 'Your sign-in expired. Sign in again.' }; }
  const role = t.email_verified === false ? null : roleOf(t.email);
  if (!role) return { error: 403, message: 'This account is not allowed. Sign in with your company Google account.' };
  return { email: t.email.toLowerCase(), name: t.name || t.email, photo: t.picture || '', role, canEdit: role !== 'viewer' };
}

module.exports = { who, roleOf };
