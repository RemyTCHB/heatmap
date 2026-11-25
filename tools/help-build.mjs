// Builds the in-app Help (photo menu → Help) from the two guides' Markdown:
//   node tools/help-build.mjs            → help/guides.json ({ viewer, editor }: { title, sections: [{ id, title }], html })
// docs/guide/viewer.md is for everyone; docs/guide/editor.md is for the people who can edit, and their guide goes on
// with every section of the Viewer Guide. Screenshots come from tools/help-shots.js (made-up sample deals only).
// Markdown kept small: # title, a lead paragraph, ## sections, ### headings, paragraphs, - and 1. lists, | tables |,
// ![caption](file.jpg) figures (phone:file.jpg for phone shots), **bold** and `code`.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const IMG = path.join(ROOT, 'help', 'img');

const esc = s => s.replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
const slug = t => 'g-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// a JPEG's width and height (its SOF marker), so the page keeps the image's space before it loads
function jpegSize(file) {
  const b = fs.readFileSync(file); let i = 2;
  while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len; }
  return { w: 0, h: 0 };
}

function parse(md) {
  const lines = md.replace(/\r/g, '').split('\n'); let title = '', lead = '', i = 0; const sections = [];
  while (i < lines.length && !lines[i].startsWith('## ')) { const l = lines[i].trim(); if (l.startsWith('# ')) title = l.slice(2); else if (l && !lead) lead = l; i++; }
  let cur = null;
  for (; i < lines.length; i++) { const l = lines[i]; if (l.startsWith('## ')) { cur = { title: l.slice(3).trim(), body: [] }; sections.push(cur); } else if (cur) cur.body.push(l); }
  return { title, lead, sections };
}

function body(lines) {
  const out = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i].trimEnd();
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('### ')) { out.push(`<h3>${inline(l.slice(4))}</h3>`); i++; continue; }
    const fig = l.match(/^!\[(.*)\]\((phone:)?(.+)\)$/);
    if (fig) { const f = path.join(IMG, fig[3]); if (!fs.existsSync(f)) throw new Error('Missing screenshot: ' + fig[3]); const { w, h } = jpegSize(f);
      out.push(`<figure class="${fig[2] ? 'phone' : ''}"><img src="help/img/${fig[3]}" width="${Math.round(w / 2)}" height="${Math.round(h / 2)}" alt="${esc(fig[1])}" loading="lazy"><figcaption>${inline(fig[1])}</figcaption></figure>`); i++; continue; }
    if (l.startsWith('|')) { const rows = []; while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim())); i++; }
      const [head, , ...rest] = rows; out.push(`<div class="g-table"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
    if (/^(- |\d+\. )/.test(l)) { const ordered = /^\d+\. /.test(l), items = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) { items.push(lines[i].replace(/^(- |\d+\. )/, '')); i++; }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map(t => `<li>${inline(t)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`); continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(### |!\[|\||- |\d+\. )/.test(lines[i])) { para.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

function guide(doc, more = []) {
  const all = [...doc.sections, ...more], sections = all.map(s => ({ id: slug(s.title), title: s.title }));
  const html = `<p class="g-lead">${inline(doc.lead)}</p>\n` + all.map((s, n) => `<h2 id="${slug(s.title)}"><span class="n">${n + 1}</span>${inline(s.title)}</h2>\n${body(s.body)}`).join('\n');
  return { title: doc.title, sections, html };
}

const viewer = parse(fs.readFileSync(path.join(ROOT, 'docs/guide/viewer.md'), 'utf8'));
const editor = parse(fs.readFileSync(path.join(ROOT, 'docs/guide/editor.md'), 'utf8'));
const out = { viewer: guide(viewer), editor: guide(editor, viewer.sections) };
fs.writeFileSync(path.join(ROOT, 'help', 'guides.json'), JSON.stringify(out));
console.log(`help/guides.json: viewer ${out.viewer.sections.length} sections, editor ${out.editor.sections.length} sections`);
