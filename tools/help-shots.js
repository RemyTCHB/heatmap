// Takes the Help screenshots from the real page, filled with made-up sample deals (never real ones):
//   node tools/help-shots.js            → help/img/*.jpg
// Needs Playwright with Chromium. The page's own API, sign-in and team are stood in for here, so it runs offline;
// D3_PATH can point at a local d3.min.js when cdnjs is not reachable.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const zipcodes = require('zipcodes');

const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'help', 'img');
fs.mkdirSync(OUT, { recursive: true });

// ---------- made-up sample data ----------
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
const ACQ = ['Alex Rivera', 'Jordan Lee', 'Sam Carter'], DISPO = ['Taylor Brooks', 'Casey Morgan', 'Riley Quinn'], FUS = ['Morgan Hayes', 'Jamie Fox', 'AI SMS AGENT'];
const SOURCES = ['PPC NW RDS', 'PPC NW SM3', 'SEO (NW WordPress)', 'Facebook Ads (AM)', 'SELF GEN', 'Inbound Seller'];
const EXITS = ['Wholesale', 'Wholesale', 'Wholesale', 'Novation', 'Fix & Flip'];
const STREETS = ['Maple Ave', 'Oak St', 'Cedar Rd', 'Pine St', 'Lakeview Dr', 'Hillcrest Ln', 'Sunset Blvd', 'River Rd', 'Elm Ct', 'Park Pl'];
const REASONS = ['Seller backed out after talking to family', 'Offer too low, seller wanted more money', 'Title issue: open lien', 'Probate not finished', 'No buyer found in time', 'Seller listed with an agent instead'];
const ZIPS = ['44314', '44102', '43215', '46222', '46201', '38106', '38116', '30318', '30311', '33612', '33610', '32208', '28205', '27703', '29203', '37208', '40211', '35208', '48205', '19134', '21215', '77016', '75216', '78207', '63115', '64130', '85009', '89030', '73111', '72204'];
const DAY = 864e5, now = Date.now();
const deals = [];
for (let i = 0; i < 190; i++) {
  const z = zipcodes.lookup(pick(ZIPS)), signedAt = now - (5 + rnd() * 340) * DAY, r = rnd();
  const status = signedAt > now - 45 * DAY ? (r < .6 ? 'signed' : r < .85 ? 'closed' : 'cancelled') : (r < .58 ? 'closed' : 'cancelled');
  const closedAt = status === 'signed' ? null : Math.min(now - DAY, signedAt + (12 + rnd() * 50) * DAY), actual = status === 'closed' ? Math.round((6000 + rnd() * 52000) / 50) * 50 : status === 'cancelled' ? 0 : null;
  const exit = status === 'closed' ? pick(EXITS) : '', d = {
    id: 's' + i, origin: 'csv', contactId: i % 3 ? 'c' + i : '', status, address: (100 + Math.floor(rnd() * 9800)) + ' ' + pick(STREETS), city: z.city.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w+/g, w => w.toLowerCase()), state: z.state, zip: z.zip,
    lat: +z.latitude + (rnd() - .5) * .08, lon: +z.longitude + (rnd() - .5) * .08, geo: 'address', source: pick(SOURCES), acq: pick(ACQ), fus: pick(FUS), dispo: status === 'closed' ? (rnd() < .9 ? pick(DISPO) : 'TCHB') : '',
    potential: null, actual, exit, feedback: '', cancelReason: status === 'cancelled' && rnd() < .7 ? pick(REASONS) : '', created: signedAt - (2 + rnd() * 20) * DAY, signedAt, closedAt, cancelledAt: status === 'cancelled' ? closedAt : null,
    closings: status === 'closed' ? [{ t: closedAt, label: 'Closing', revenue: actual, exit }] : [], flags: [], hist: [{ t: signedAt, event: 'signed', text: 'Signed' }]
  };
  if (status === 'closed') d.hist.push({ t: closedAt, event: 'closed', text: 'Closed · AB Profit (TC) $' + actual.toLocaleString() });
  if (status === 'cancelled') d.hist.push({ t: closedAt, event: 'cancelled', text: 'Cancelled' + (d.cancelReason ? ' · ' + d.cancelReason : '') });
  if (d.dispo === 'TCHB') d.flags.push('Closed Without A DISPO · Set To TCHB For Now');
  deals.push(d);
}
const flip = deals.find(d => d.status === 'closed'); Object.assign(flip, { exit: 'Fix & Flip', actual: flip.actual + 41000, closings: [{ t: flip.closedAt - 60 * DAY, label: 'Fix & Flip Purchase', revenue: flip.actual, exit: 'Wholesale' }, { t: flip.closedAt, label: 'Fix & Flip Sale', revenue: 41000, exit: 'Fix & Flip' }] });
const team = [['Remy Owner', 'owner@example.com', 'manager', '', true], ...ACQ.map((n, i) => [n, 'acq' + i + '@example.com', i ? 'member' : 'lead', 'ACQ']), ...DISPO.map((n, i) => [n, 'dispo' + i + '@example.com', i ? 'member' : 'lead', 'DISPO']),
  ['Morgan Hayes', 'fus0@example.com', 'member', 'FUS'], ['Pat Editor', 'editor@example.com', 'lead', 'TC', true], ['Drew Ops', 'ops@example.com', 'member', 'OPS', true]].map(([name, email, role, dept, canEdit]) => ({ name, email, role, dept, photo: '', canEdit: !!canEdit }));
const opt = k => { const c = {}; deals.forEach(d => { if (d[k]) c[d[k]] = (c[d[k]] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a]).map(name => ({ name, aliases: [], ...(name === 'Jamie Fox' ? { tag: 'former' } : name === 'AI SMS AGENT' ? { tag: 'noLogin' } : {}) })); };
const options = { source: opt('source'), exit: opt('exit'), acq: opt('acq'), dispo: opt('dispo'), fus: opt('fus') };
options.source.push({ name: 'TikTok Ads', aliases: [], crm: true });
const online = [{ name: 'Remy Owner', email: 'owner@example.com', mobile: false, desktop: true }, { name: 'Pat Editor', email: 'editor@example.com', mobile: true, desktop: false }];
const me = role => ({ name: role === 'viewer' ? 'Sam Viewer' : 'Remy Owner', email: role === 'viewer' ? 'viewer@example.com' : 'owner@example.com', photo: '', role, canEdit: role !== 'viewer' });

// ---------- a local server for the page, with the API stood in for ----------
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.js': 'text/javascript' }[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res); });
const FB = "window.firebase={initializeApp:()=>({}),auth:Object.assign(()=>window.__auth,{GoogleAuthProvider:function(){this.setCustomParameters=()=>{}}})};window.__auth={currentUser:{getIdToken:async()=>'t'},onAuthStateChanged:f=>setTimeout(()=>f(window.__auth.currentUser),30),signOut:async()=>{},signInWithPopup:async()=>{}};";

async function open(browser, url, role, opts) {
  const p = await browser.newPage({ deviceScaleFactor: 2, ...opts });
  await p.addInitScript(() => { try { localStorage.setItem('tchb-heat-theme', 'light'); } catch (e) {} });
  if (process.env.D3_PATH) await p.route('**/d3.min.js', r => r.fulfill({ path: process.env.D3_PATH }));
  await p.route('**/firebase-app-compat.js', r => r.fulfill({ body: FB, contentType: 'text/javascript' }));
  await p.route('**/firebase-auth-compat.js', r => r.fulfill({ body: '', contentType: 'text/javascript' }));
  await p.route('**/api/app/**', r => { const u = r.request().url();
    if (u.endsWith('/config')) return r.fulfill({ json: { firebase: { apiKey: 'sample' } } });
    if (u.endsWith('/data')) return r.fulfill({ json: { me: me(role), deals, options, team, teamAt: now - 3 * 3600e3, online } });
    if (u.endsWith('/presence')) return r.fulfill({ json: { online } });
    return r.fulfill({ json: { ok: true } }); });
  await p.goto(url); await p.waitForTimeout(2600);
  await p.addStyleTag({ content: '#aurora{display:none!important} *{animation:none!important;transition:none!important}' });
  return p;
}
const shot = (loc, name, o = {}) => loc.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 72, ...o });

(async () => {
  await new Promise(r => server.listen(0, r)); const url = 'http://localhost:' + server.address().port + '/';
  const browser = await chromium.launch();
  const p = await open(browser, url, 'owner', { viewport: { width: 1440, height: 900 } });
  await shot(p, 'overview', { clip: { x: 0, y: 0, width: 1440, height: 470 } });
  await p.click('#clock'); await p.waitForTimeout(200); await shot(p, 'live-clock', { clip: { x: 80, y: 0, width: 560, height: 260 } }); await p.mouse.click(720, 440);
  await p.click('#actBtn'); await p.waitForTimeout(200); await shot(p, 'active', { clip: { x: 900, y: 0, width: 540, height: 230 } }); await p.mouse.click(720, 440);
  await p.evaluate(() => scrollTo(0, 0));
  await p.click('#periodDD'); await p.waitForTimeout(150); await p.locator('#pop .opt', { hasText: 'Custom Range' }).click(); await p.waitForTimeout(300);
  const days = p.locator('#rp [data-day]'); await days.nth(3).click(); await days.nth(17).click(); await p.waitForTimeout(150);
  await shot(p, 'custom-range', { clip: { x: 0, y: 280, width: 760, height: 560 } }); await p.mouse.click(1300, 120);
  await p.evaluate(() => document.getElementById('map').scrollIntoView()); await p.waitForTimeout(300);
  await shot(p.locator('#map'), 'map-pins');
  await p.click('[data-m="heat"]'); await p.waitForTimeout(400); await shot(p.locator('#mapbox'), 'map-heat');
  await p.click('[data-m="states"]'); await p.waitForTimeout(400); await shot(p.locator('#mapbox'), 'map-states');
  await p.click('[data-m="pins"]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('deals').scrollIntoView()); await p.waitForTimeout(300);
  await shot(p, 'deal-list', { clip: { x: 80, y: 140, width: 1280, height: 520 } });
  await p.evaluate(() => { const d = deals.find(x => x.closings && x.closings.length > 1); openDeal(d.id); }).catch(async () => { await p.locator('#table tbody tr').first().click(); });
  await p.waitForTimeout(500); await shot(p.locator('#drawer'), 'deal-panel'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('trends').scrollIntoView()); await p.waitForTimeout(300); await shot(p, 'month-by-month', { clip: { x: 80, y: 120, width: 1280, height: 440 } });
  await p.evaluate(() => document.getElementById('leaderboards').scrollIntoView()); await p.waitForTimeout(300); await shot(p, 'leaderboards', { clip: { x: 80, y: 120, width: 1280, height: 640 } });
  await p.evaluate(() => document.getElementById('insights').scrollIntoView()); await p.waitForTimeout(300); await shot(p, 'where-to-market', { clip: { x: 80, y: 120, width: 1280, height: 720 } });
  await p.evaluate(() => scrollTo(0, 0)); await p.click('#avatarBtn'); await p.waitForTimeout(200); await shot(p, 'photo-menu', { clip: { x: 1060, y: 0, width: 380, height: 420 } });
  await p.click('[data-act="team"]'); await p.waitForTimeout(300); await shot(p.locator('#teamWin'), 'team-members'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.click('#avatarBtn'); await p.click('[data-act="settings"]'); await p.waitForTimeout(300); await shot(p.locator('#settings'), 'settings-lists');
  await p.click('[data-kind="fus"]'); await p.waitForTimeout(300); await shot(p.locator('#settings'), 'settings-people'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.locator('.addchip').click(); await p.waitForTimeout(500); await shot(p.locator('#drawer'), 'add-deal'); await p.keyboard.press('Escape');
  const v = await open(browser, url, 'viewer', { viewport: { width: 1440, height: 900 } });
  await v.evaluate(() => document.getElementById('deals').scrollIntoView()); await v.waitForTimeout(300); await v.locator('#table tbody tr').first().click(); await v.waitForTimeout(500);
  await shot(v.locator('#drawer'), 'deal-panel-view');
  const m = await open(browser, url, 'owner', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await shot(m, 'phone'); await m.click('#avatarBtn'); await m.waitForTimeout(250); await shot(m, 'phone-menu');
  await browser.close(); server.close();
  console.log('screenshots in', OUT, fs.readdirSync(OUT).length);
})().catch(e => { console.error(e); process.exit(1); });
