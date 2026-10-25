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

// Version des fichiers CSS/JS calculée sur leur contenu : un navigateur ne peut pas
// garder un ancien site.js en cache après une mise à jour
const hash = f => require('crypto').createHash('md5').update(read(path.join(SRC, 'static', f))).digest('hex').slice(0, 8);
const ASSETS = ['css/style.css', 'js/site.js', 'js/micro.js', 'js/parts.js'];
const versioned = html => ASSETS.reduce((h, f) => h.split(`"${f}"`).join(`"${f}?v=${hash(f)}"`), html);

// En production : retire les pastilles de problèmes et les blocs marqués data-test-only
const clean = html => versioned(toVideo(!PROD ? html : html
  .replace(/ ?<(span|a) class="issue[^"]*"[^>]*>[^<]*<\/\1>/g, '')
  .replace(/\n?\s*<(section|div)[^>]*data-test-only[^>]*>[\s\S]*?<\/\1>/g, '')));

// Les GIF convertis par tools/convert-gifs.sh deviennent un WebP animé (une image, comme le GIF)
// ou, s'il était trop lourd en WebP, une vidéo muette en boucle
const has = (id, ext) => fs.existsSync(path.join(IMG_DIR, `${id}.${ext}`));
function toVideo(html) {
  html = html.replace(/assets\/img\/(\w+)\.gif/g, (m, id) => (has(id, 'webp') ? `assets/img/${id}.webp` : m));
  // Survol des cartes : la vidéo n'est chargée et lancée qu'au survol (voir site.js)
  html = html.replace(/<img class="card__hover" data-gif="assets\/img\/(\w+)\.gif" alt="">/g, (m, id) =>
    has(id, 'mp4') ? `<video class="card__hover" data-src="assets/img/${id}.mp4" muted loop playsinline preload="none"></video>` : m);
  return html.replace(/<img([^>]*?) src="assets\/img\/(\w+)\.gif"([^>]*)>/g, (m, before, id, after) => {
    if (!has(id, 'mp4')) return m;
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
  chessLine: '',
  projectNav: '',
  photoStrip: photos.map(p => `<img src="assets/img/${p.image}" alt="">`).join(''),
  // Carrousel du profil (desktop) : la première photo est la photo de profil
  photoCarousel: photos.map((p, i) => `<img src="assets/img/${p.image}" alt="${i ? '' : 'Maxence Prioux'}"${i ? ' loading="lazy"' : ''}>`).join(''),
};

// Meilleur classement Chess.com (Rapid) affiché sur l'accueil. Relu à chaque build ; si Chess.com ne répond pas,
// on garde la dernière valeur enregistrée dans src/static/data/chess.json. La page le met aussi à jour en direct.
const CHESS_FILE = path.join(SRC, 'static', 'data', 'chess.json');
async function chessData() {
  const saved = JSON.parse(read(CHESS_FILE));
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${saved.username}/stats`, {
      headers: { 'User-Agent': 'maxence.fyi portfolio build (contact@maxence.fyi)' }, signal: AbortSignal.timeout(8000),
    });
    const d = await res.json(), r = d.chess_rapid;
    if (!r?.last?.rating) throw new Error('pas de partie rapide');
    const fresh = { ...saved, rapid: { rating: r.last.rating, best: r.best?.rating ?? null, win: r.record.win, loss: r.record.loss, draw: r.record.draw },
      blitz: d.chess_blitz?.best?.rating ?? d.chess_blitz?.last?.rating ?? saved.blitz ?? null,
      puzzles: d.tactics?.highest?.rating ?? saved.puzzles ?? null,
      updated: new Date().toISOString().slice(0, 10) };
    fs.writeFileSync(CHESS_FILE, JSON.stringify(fresh, null, 2) + '\n');
    return fresh;
  } catch (e) {
    console.warn(`  ! Chess.com indisponible (${e.message}), dernière valeur gardée`);
    return saved;
  }
}
// Le chiffre change de catégorie à chaque survol : Rapid → Blitz → Puzzles (meilleurs scores)
function chessLine(c) {
  const best = c.rapid.best ?? c.rapid.rating;
  const values = [['Rapid', best], ['Blitz', c.blitz], ['Puzzles', c.puzzles]].filter(([, v]) => v);
  return `<span class="chess" data-chess="${c.username}" data-chess-values='${JSON.stringify(values)}'>
          <svg class="chess__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19.5h10V21H7zM8.5 18c0-2.7 1.9-4.3 2.4-6.3-1.4.9-3 .9-4.1 1.8L5.5 11.8c1.4-2.6 3-4.8 5-6.3L10 3l2.5 1.4c3.6.6 5.6 4.2 5 13.6z" fill="currentColor"/></svg>
          <span class="chess__label">Currently playing on Chess.com</span>
          <span class="chess__elo" aria-live="polite"><span class="chess__value"><small>Rapid</small> <b>${best}</b></span></span>
        </span>`;
}

// Navigation entre projets : l'ordre est celui des cartes de Product (index) puis de Visual.
// Chaque étude de cas reçoit un lien vers la précédente et la suivante, et son fil d'Ariane pointe vers sa page.
function projectOrder() {
  const list = [];
  for (const [page, section] of [['index.html', 'product'], ['visual.html', 'visual']]) {
    const src = read(path.join(SRC, 'pages', page));
    for (const m of src.matchAll(/<a class="card" href="([\w-]+)\.html">\s*<div class="card__media[^>]*>([\s\S]*?)<\/div>\s*<p class="card__caption">([\s\S]*?)<\/p>/g)) {
      const [, slug, media, caption] = m;
      // Image fixe de la carte, sinon son animation de survol (Micro-interactions n'a pas d'image fixe)
      const cover = (media.match(/<img(?![^>]*card__(?:hover|badge))[^>]*\ssrc="([^"]+)"/) || media.match(/data-gif="([^"]+)"/) || [])[1];
      if (!cover) continue;
      if (slug === 'photographs' || list.some(p => p.slug === slug)) continue;
      list.push({ slug, cover, section, caption: caption.replace(/<[^>]+>[^<]*<\/[^>]+>/g, '').replace(/<[^>]+>/g, '').trim() });
    }
  }
  return list;
}
const TITLES = { podz: 'Podz', microinteractions: 'Micro-interactions' };
function projectNav(order, slug, titleOf) {
  const i = order.findIndex(p => p.slug === slug);
  if (i < 0) return '';
  const prev = order[(i - 1 + order.length) % order.length], next = order[(i + 1) % order.length];
  const link = (p, dir) => `<a class="pnav__link pnav__link--${dir}" href="${p.slug}.html" data-${dir}>
          <img src="${p.cover}" alt="" loading="lazy">
          <span><small>${dir === 'prev' ? '← Previous' : 'Next →'}</small><b>${esc(titleOf(p.slug))}</b><em>${esc(p.caption)}</em></span>
        </a>`;
  return `
      <nav class="pnav" aria-label="Other projects">
        ${link(prev, 'prev')}
        ${link(next, 'next')}
      </nav>`;
}
function crumbOf(order, slug) {
  const p = order.find(p => p.slug === slug);
  return p && p.section === 'visual' ? { crumbHref: 'visual.html', crumbLabel: 'Visual' } : { crumbHref: 'index.html', crumbLabel: 'Product' };
}

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

// Mise en page d'une rangée d'images selon leur format dominant.
// layout "row" : une seule rangée à hauteur égale, chaque image prend une largeur proportionnelle à son format.
// Une image marquée "full" passe après, sur toute la largeur.
function gallery(images, layout) {
  const full = images.filter(i => i.full).map(i => `\n        <img class="gallery-full" src="assets/img/${i.id}" alt=""${i.w ? ` width="${i.w}" height="${i.h}"` : ''} loading="lazy">`).join('');
  images = images.filter(i => !i.full);
  // layout "grid2" : 2 rangées de 2 sur toute la largeur. Dans chaque rangée, les deux images ont la même
  // hauteur et une largeur proportionnelle à leur format, donc rien n'est recadré
  if (layout === 'grid2' && images.length) {
    const rows = [];
    for (let k = 0; k < images.length; k += 2) rows.push(images.slice(k, k + 2));
    const html = rows.map(row => `<div class="gallery-2x2__row">${row.map(i => {
      const r = i.w && i.h ? i.w / i.h : 1;
      return `<img src="assets/img/${i.id}" alt="" style="--r:${r.toFixed(3)}" loading="lazy">`;
    }).join('')}</div>`).join('\n          ');
    return `\n        <div class="gallery-2x2">\n          ${html}\n        </div>${full}`;
  }
  if (layout === 'row' && images.length) {
    const imgs = images.map(i => {
      const r = i.w && i.h ? i.w / i.h : 1;
      return `<img src="assets/img/${i.id}" alt="" style="--r:${r.toFixed(3)}"${r > 1.3 ? ' data-wide' : ''} loading="lazy">`;
    }).join('\n          ');
    return `\n        <div class="gallery-row">\n          ${imgs}\n        </div>${full}`;
  }
  return galleryGrid(images) + full;
}
function galleryGrid(images) {
  if (!images.length) return '';
  const ratio = images.map(i => (i.w && i.h ? i.w / i.h : 1.5));
  const avg = ratio.reduce((a, b) => a + b, 0) / ratio.length;
  let cols = avg < 0.75 ? 4 : avg < 1.2 ? 3 : 2;
  cols = Math.min(cols, images.length);
  const imgs = images.map(i => `<img src="assets/img/${i.id}" alt=""${i.w ? ` width="${i.w}" height="${i.h}"` : ''} loading="lazy">`).join('\n          ');
  return `\n        <div class="gallery" style="--cols:${cols}">\n          ${imgs}\n        </div>`;
}

// Sachet transparent avec des stickers qui flottent dedans (composition Framer recréée).
// Chaque sticker a sa place, son angle et son rythme ; site.js les pousse avec le pointeur
const BAG_SLOTS = [
  { x: 32, y: 34, w: 54, r: -12 }, { x: 68, y: 42, w: 52, r: 9 },
  { x: 34, y: 70, w: 52, r: 7 }, { x: 68, y: 76, w: 48, r: -8 },
];
function bag(b) {
  if (!b) return '';
  const n = b.stickers.length;
  // Avec moins de stickers, ils sont plus grands et mieux répartis
  // Positions de départ ; site.js les resserre si un sticker dépasse du sachet
  const slots = n <= 2 ? [{ x: 40, y: 38, w: 72, r: -10 }, { x: 60, y: 70, w: 68, r: 8 }]
    : n === 3 ? [{ x: 36, y: 32, w: 60, r: -10 }, { x: 66, y: 50, w: 54, r: 9 }, { x: 42, y: 74, w: 58, r: 5 }]
    : BAG_SLOTS;
  const stickers = b.stickers.map((id, i) => {
    const sl = slots[i];
    return `<img class="bag__sticker" src="assets/img/${id}" alt="" style="--x:${sl.x}%;--y:${sl.y}%;--w:${sl.w}%;--r:${sl.r}deg;--d:${(i * -1.7).toFixed(1)}s">`;
  }).join('');
  return `\n        <div class="bag" data-bag><div class="bag__pouch">${stickers}<img class="bag__plastic" src="assets/img/${b.bag}" alt=""></div></div>`;
}

// Sachet posé par-dessus la grille (il reste visible pendant qu'on fait défiler les visuels) ;
// l'image "full" éventuelle passe après le tout
function bagOver(s) {
  const grid = gallery(s.images.filter(i => !i.full), s.layout);
  const full = gallery(s.images.filter(i => i.full), s.layout);
  return `\n        <div class="bag-over">${grid}\n          <div class="bag-over__layer">${bag(s.bag).replace('class="bag"', 'class="bag bag--over"')}</div>\n        </div>${full}`;
}

function projectSections(p) {
  return p.sections.map(s => `
      <section class="section">
        <h2>${esc(s.title)}</h2>
        ${s.text.map(t => `<p>${esc(t)}</p>`).join('\n        ')}${s.bagOver ? bagOver(s) : gallery(s.images, s.layout) + bag(s.bag)}
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

  const chess = chessLine(await chessData());
  const order = projectOrder();
  const titles = Object.fromEntries(fs.readdirSync(path.join(SRC, 'projects')).filter(f => /^[a-z].*\.json$/.test(f))
    .map(f => { const p = JSON.parse(read(path.join(SRC, 'projects', f))); return [p.slug, p.title]; }));
  const titleOf = slug => titles[slug] || TITLES[slug] || slug;
  const navVars = slug => ({ projectNav: projectNav(order, slug, titleOf), ...crumbOf(order, slug) });

  // Pages
  const template = read(path.join(SRC, 'templates', 'project.html'));
  for (const f of fs.readdirSync(path.join(SRC, 'pages')).filter(f => f.endsWith('.html'))) {
    if (PROD && TEST_ONLY_PAGES.includes(f)) continue;
    const [meta, body] = pageMeta(read(path.join(SRC, 'pages', f)));
    fs.writeFileSync(path.join(OUT, f), clean(render(body, { ...globals, chessLine: meta.chess ? chess : '', ...navVars(path.basename(f, '.html')), ...meta })));
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
      ...navVars(p.slug),
    });
    fs.writeFileSync(path.join(OUT, `${p.slug}.html`), clean(html));
    written.push(`${p.slug}.html`);
  }

  // Images : toutes celles citées dans les pages, les données et le JS
  const ids = new Set();
  const scan = txt => (txt.match(/\b[A-Za-z0-9]{16,40}\.(?:png|jpe?g|gif|webp)\b/g) || []).forEach(id => ids.add(id));
  written.forEach(f => scan(read(path.join(OUT, f))));
  scan(read(path.join(SRC, 'static', 'data', 'photos.json')));
  fs.readdirSync(path.join(SRC, 'static', 'js')).forEach(f => scan(read(path.join(SRC, 'static', 'js', f))));
  fs.readdirSync(path.join(SRC, 'pages')).forEach(f => scan(read(path.join(SRC, 'pages', f))));
  const fetched = await downloadMissing(ids);

  copyDir(path.join(SRC, 'static'), OUT);
  console.log(`${written.length} pages générées, ${ids.size} images (${fetched} téléchargées) → ${path.basename(OUT)}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
