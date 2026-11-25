// The dropdown lists (Settings): lead sources, exit strategies, and the ACQ, DISPO and FUS names. Each option keeps
// the other spellings the CRM has sent for it (aliases). Pure, so tests can run it.
const KINDS = ['source', 'exit', 'acq', 'dispo', 'fus'];
const CRM_ADDS = ['source', 'exit'];   // people come from the Hub later, so only these two grow from the CRM
const norm = s => String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toLowerCase();
const clean = s => String(s == null ? '' : s).trim().replace(/\s+/g, ' ').slice(0, 120);

// starting lists from the deals, most used first
function fromDeals(deals) {
  const out = {};
  for (const k of KINDS) {
    const c = {}; for (const d of deals) if (d[k]) c[d[k]] = (c[d[k]] || 0) + 1;
    out[k] = Object.keys(c).sort((a, b) => c[b] - c[a]).map(name => ({ name, aliases: [] }));
  }
  return out;
}

const find = (list, raw) => { const n = norm(raw); return n ? (list || []).find(o => norm(o.name) === n || (o.aliases || []).some(a => norm(a) === n)) : null; };

// a hook's values: use the list's spelling when they match; add new lead sources and exits, marked as from the CRM
function intake(options, f, now) {
  let changed = false; if (!options) return false;
  for (const k of KINDS) {
    if (!f[k]) continue;
    const o = find(options[k], f[k]);
    if (o) { f[k] = o.name; continue; }
    if (CRM_ADDS.includes(k)) { (options[k] = options[k] || []).push({ name: clean(f[k]), aliases: [], crm: true, added: now }); changed = true; }
  }
  return changed;
}

// a change from Settings. Returns the new lists and, when deals must follow, which value moves to which.
function apply(options, { kind, op, name, to }) {
  if (!KINDS.includes(kind)) throw new Error('Unknown list.');
  const o = JSON.parse(JSON.stringify(options || {})); const list = o[kind] = o[kind] || [];
  name = clean(name); to = clean(to);
  const i = list.findIndex(x => x.name === name);
  if (op === 'add') {
    if (!name) throw new Error('Type a name first.');
    if (find(list, name)) throw new Error(`"${name}" is already on the list.`);
    list.push({ name, aliases: [] }); return { options: o, move: null };
  }
  if (i < 0) throw new Error(`"${name}" is not on the list.`);
  if (op === 'ok') { delete list[i].crm; return { options: o, move: null }; }
  // people who are real but not in the Hub: no login (AI agents, some FUS), or former members whose name stays on their deals
  if (op === 'tag') { const tag = ['noLogin', 'former'].includes(arguments[1].tag) ? arguments[1].tag : ''; if (tag) list[i].tag = tag; else delete list[i].tag; delete list[i].crm; return { options: o, move: null }; }
  if (op === 'remove') { list.splice(i, 1); return { options: o, move: null }; }
  if (op === 'rename') {
    if (!to || to === name) throw new Error('Type the new name.');
    if (list.some((x, j) => j !== i && norm(x.name) === norm(to))) throw new Error(`"${to}" is already on the list. To merge them, remove "${name}" and move its contracts there.`);
    const it = list[i]; if (norm(name) !== norm(to) && !(it.aliases || []).some(a => norm(a) === norm(name))) (it.aliases = it.aliases || []).push(name);
    it.name = to; delete it.crm; return { options: o, move: { kind, from: name, to } };
  }
  if (op === 'merge') {
    const t = list.find(x => x.name === to); if (!t || t === list[i]) throw new Error('Pick another option to move the contracts to.');
    for (const a of [name, ...(list[i].aliases || [])]) if (norm(a) !== norm(t.name) && !(t.aliases || []).some(x => norm(x) === norm(a))) (t.aliases = t.aliases || []).push(a);
    list.splice(i, 1); return { options: o, move: { kind, from: name, to: t.name } };
  }
  throw new Error('Unknown change.');
}

module.exports = { KINDS, fromDeals, intake, apply, find, norm };
