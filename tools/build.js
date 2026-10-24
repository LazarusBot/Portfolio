// Construit le site statique à partir de src/
//
//   node tools/build.js         version test (pastilles, barre noire, problemes.html) → test/
//   node tools/build.js --prod  version publiée sur GitHub Pages, sans éléments de test → dist/
//
// - src/pages/*.html     pages écrites à la main ({{> partial}} et {{variable}})
// - src/projects/*.json  études de cas (importées par tools/import-framer.py)
// - src/static/          CSS, JS, données et images copiés tels quels
// Les images référencées mais absentes de src/static/assets/img sont téléchargées depuis Framer.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PROD = process.argv.includes('--prod');
const OUT = path.join(ROOT, PROD ? 'dist' : 'test');
const TEST_ONLY_PAGES = ['problemes.html'];
const IMG_DIR = path.join(SRC, 'static', 'assets', 'img');
const read = f => fs.readFileSync(f, 'utf8');

// En production : retire les pastilles de problèmes et les blocs marqués data-test-only
const clean = html => toVideo(!PROD ? html : html
  .replace(/ ?<(span|a) class="issue[^"]*"[^>]*>[^<]*<\/\1>/g, '')
  .replace(/\n?\s*<(section|div)[^>]*data-test-only[^>]*>[\s\S]*?<\/\1>/g, ''));

// Les GIF convertis par tools/convert-gifs.sh deviennent des vidéos muettes en boucle
const hasMp4 = id => fs.existsSync(path.join(IMG_DIR, `${id}.mp4`));
function toVideo(html) {
  // Survol des cartes : la vidéo n'est chargée et lancée qu'au survol (voir site.js)
  html = html.replace(/<img class="card__hover" data-gif="assets\/img\/(\w+)\.gif" alt="">/g, (m, id) =>
    hasMp4(id) ? `<video class="card__hover" data-src="assets/img/${id}.mp4" muted loop playsinline preload="none"></video>` : m);
  return html.replace(/<img([^>]*?) src="assets\/img\/(\w+)\.gif"([^>]*)>/g, (m, before, id, after) => {
    if (!hasMp4(id)) return m;
    const attrs = before + after;
    const keep = (attrs.match(/ (?:class|width|height)="[^"]*"/g) || []).join('');
    const alt = attrs.match(/ alt="([^"]+)"/);
    return `<video${keep} src="assets/img/${id}.mp4"${alt ? ` aria-label="${alt[1]}"` : ''} autoplay muted loop playsinline></video>`;
  });
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const partials = Object.fromEntries(fs.readdirSync(path.join(SRC, 'partials'))
  .map(f => [path.basename(f, '.html'), read(path.join(SRC, 'partials', f))]));
if (PROD) partials.topbar = '';
const photos = JSON.parse(read(path.join(SRC, 'static', 'data', 'photos.json')));

const globals = {
  lang: 'en',
  description: 'Maxence Prioux — Product Designer based in Toulouse.',
  photoStrip: photos.map(p => `<img src="assets/img/${p.image}" alt="">`).join(''),
};

function render(tpl, vars) {
  let html = tpl;
  // Les partials peuvent eux-mêmes contenir des variables
  for (let i = 0; i < 3; i++) html = html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => partials[n] ?? `<!-- partial ${n} manquant -->`);
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// <!-- meta {"title": "..."} --> en première ligne d'une page
function pageMeta(src) {
  const m = src.match(/^<!--\s*meta\s*(\{[\s\S]*?\})\s*-->\n?/);
  return m ? [JSON.parse(m[1]), src.slice(m[0].length)] : [{}, src];
}

// Mise en page d'une rangée d'images selon leur format dominant
function gallery(images) {
  if (!images.length) return '';
  const ratio = images.map(i => (i.w && i.h ? i.w / i.h : 1.5));
  const avg = ratio.reduce((a, b) => a + b, 0) / ratio.length;
  let cols = avg < 0.75 ? 4 : avg < 1.2 ? 3 : 2;
  cols = Math.min(cols, images.length);
  const imgs = images.map(i => `<img src="assets/img/${i.id}" alt=""${i.w ? ` width="${i.w}" height="${i.h}"` : ''} loading="lazy">`).join('\n          ');
  return `\n        <div class="gallery" style="--cols:${cols}">\n          ${imgs}\n        </div>`;
}

function projectSections(p) {
  return p.sections.map(s => `
      <section class="section">
        <h2>${esc(s.title)}</h2>
        ${s.text.map(t => `<p>${esc(t)}</p>`).join('\n        ')}${gallery(s.images)}
      </section>`).join('\n') + (p.wall ? `
      <section class="wall" aria-label="Logos">
        ${[0, 1, 2, 3].map(c => `<div class="wall__col"><div class="wall__track">${
          [...p.wall.slice(c * 3), ...p.wall.slice(0, c * 3)].concat([...p.wall.slice(c * 3), ...p.wall.slice(0, c * 3)])
            .map(id => `<img src="assets/img/${id}" alt="">`).join('')}</div></div>`).join('\n        ')}
      </section>` : '');
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, f.name), b = path.join(to, f.name);
    if (f.isDirectory()) copyDir(a, b);
    else if (!fs.existsSync(b) || fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs) fs.copyFileSync(a, b);
  }
}

async function downloadMissing(ids) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const missing = [...ids].filter(id => !fs.existsSync(path.join(IMG_DIR, id))
    && !fs.existsSync(path.join(SRC, 'originals', id)));
  for (const id of missing) {
    const url = `https://framerusercontent.com/images/${id}${id.endsWith('.gif') ? '' : '?scale-down-to=1600'}`;
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  ! ${id} : ${res.status}`); continue; }
    fs.writeFileSync(path.join(IMG_DIR, id), Buffer.from(await res.arrayBuffer()));
  }
  return missing.length;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const written = [];

  // Pages
  const template = read(path.join(SRC, 'templates', 'project.html'));
  for (const f of fs.readdirSync(path.join(SRC, 'pages')).filter(f => f.endsWith('.html'))) {
    if (PROD && TEST_ONLY_PAGES.includes(f)) continue;
    const [meta, body] = pageMeta(read(path.join(SRC, 'pages', f)));
    fs.writeFileSync(path.join(OUT, f), clean(render(body, { ...globals, ...meta })));
    written.push(f);
  }

  // Études de cas
  const overrides = JSON.parse(read(path.join(SRC, 'projects', '_overrides.json')));
  for (const f of fs.readdirSync(path.join(SRC, 'projects')).filter(f => /^[a-z].*\.json$/.test(f))) {
    const p = { ...JSON.parse(read(path.join(SRC, 'projects', f))), ...overrides[path.basename(f, '.json')] };
    const html = render(template, {
      ...globals,
      title: `${esc(p.title)} — Maxence Prioux`,
      name: esc(p.title),
      description: esc(p.sections[0]?.text[0] || globals.description),
      sections: projectSections(p),
    });
    fs.writeFileSync(path.join(OUT, `${p.slug}.html`), clean(html));
    written.push(`${p.slug}.html`);
  }

  // Images : toutes celles citées dans les pages, les données et le JS
  const ids = new Set();
  const scan = txt => (txt.match(/\b[A-Za-z0-9]{16,40}\.(?:png|jpe?g|gif|webp)\b/g) || []).forEach(id => ids.add(id));
  written.forEach(f => scan(read(path.join(OUT, f))));
  scan(read(path.join(SRC, 'static', 'data', 'photos.json')));
  fs.readdirSync(path.join(SRC, 'pages')).forEach(f => scan(read(path.join(SRC, 'pages', f))));
  const fetched = await downloadMissing(ids);

  copyDir(path.join(SRC, 'static'), OUT);
  console.log(`${written.length} pages générées, ${ids.size} images (${fetched} téléchargées) → ${path.basename(OUT)}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
