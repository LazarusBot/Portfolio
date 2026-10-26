// Partagé par toutes les pages de test
// Images téléchargées dans le repo par tools/build.js
const IMG = id => `assets/img/${id}`;

// Sons du portfolio, trois rôles : « select » pour choisir (onglets, modes, carrousel, menu),
// « pop » pour ce qu'on touche (stickers, personnages, démos, et en plus léger au survol des onglets et du contact), « robot » quand l'app travaille
// (recherche, paiement). Ils ne jouent qu'après un premier geste (règle des navigateurs) ; le bouton
// en bas à droite les coupe et le choix est gardé.
const sound = (() => {
  const FILES = { select: 'assets/sounds/select.mp3', pop: 'assets/sounds/pop.mp3', robot: 'assets/sounds/robot.mp3' };
  const VOL = { select: .3, pop: .45, robot: .22 };
  let ctx = null, buffers = {}, last = {};
  let on = true;
  try { on = localStorage.getItem('sound') !== 'off'; } catch {}
  const unlock = () => {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    Object.entries(FILES).forEach(([k, url]) => fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => (buffers[k] = buf)).catch(() => {}));
  };
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, unlock, { once: true, capture: true }));
  const play = (name, { rate = 1, vol = 1, gap = 70 } = {}) => {
    if (!on || !ctx || !buffers[name]) return;
    const now = performance.now();
    if (now - (last[name] || 0) < gap) return;
    last[name] = now;
    if (ctx.state === 'suspended') ctx.resume();
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffers[name];
    // Légère variation de hauteur : un son répété ne sonne jamais deux fois pareil
    src.playbackRate.value = rate * (0.96 + Math.random() * 0.08);
    g.gain.value = VOL[name] * vol;
    src.connect(g).connect(ctx.destination);
    src.start();
  };
  // Bouton son : petit rond fixe en bas à droite
  const btn = document.createElement('button');
  btn.className = 'sound-toggle';
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path class="sound-toggle__waves" d="M15.5 9.2a4 4 0 0 1 0 5.6M18 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="sound-toggle__off" d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const sync = () => {
    btn.classList.toggle('is-off', !on);
    btn.setAttribute('aria-pressed', on);
    btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    btn.title = on ? 'Sound on' : 'Sound off';
  };
  btn.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem('sound', on ? 'on' : 'off'); } catch {}
    sync();
    if (on) { unlock(); setTimeout(() => play('select'), 30); }
  });
  sync();
  document.body.append(btn);
  // Sons déclenchés au clic, selon l'élément (le premier sélecteur qui correspond gagne).
  // Par défaut, tout lien sonne « select » (on se déplace) et tout bouton « pop » (on agit).
  // Les éléments qui jouent leur propre son (stickers, personnages, Chess.com) sont exclus.
  const CLICKS = [
    ['.bag__pouch, .pz-chars__card, .chess, .nav a, .contact, .profile__job, .robot, .art', null],
    ['.pz-states__tabs [data-state="search"]', 'robot'],
    ['.pay', 'robot'],
    ['.logo', 'select', { rate: 1.08 }],
    ['.pz-icon__modes button, .pz-evo__steps button, .pz-states__tabs button, .carousel, .menu-btn', 'select'],
    ['.stage', 'pop'],
    ['.card, .crumb a', 'select', { vol: .8, rate: .95 }],
    ['a[href]', 'select', { vol: .7 }],
    ['button, [role="button"], summary', 'pop', { vol: .8 }],
  ];
  addEventListener('click', e => {
    if (e.target.closest('.sound-toggle')) return;
    const hit = CLICKS.find(([sel]) => e.target.closest(sel));
    if (!hit || !hit[1]) return;
    // Lien interne ouvert dans la même page : on attend un instant avant de partir,
    // sinon le son est coupé par le changement de page
    const a = e.target.closest('a[href]');
    const leaves = a && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.defaultPrevented
      && a.origin === location.origin && !a.getAttribute('href').startsWith('#') && a.href !== location.href;
    if (leaves && on && ctx && buffers[hit[1]]) {
      e.preventDefault();
      play(hit[1], hit[2]);
      setTimeout(() => (location.href = a.href), 140);
    } else setTimeout(() => play(hit[1], hit[2]), 0);
  });
  // Survol : petit « pop » aigu et discret, seulement sur les onglets de navigation et le bloc contact
  // (mail, WhatsApp, X, LinkedIn). Ces éléments n'ont pas de son au clic, pour ne jamais doubler.
  const HOVER = '.nav a, .contact__mail, .contact__btn, .profile__job';
  let hovered = null;
  // Robots (About) : leur propre son, le « robot », une fois par survol
  document.querySelectorAll('.robot').forEach(r => r.addEventListener('pointerenter', e => e.pointerType === 'mouse' && play('robot', { vol: 1.3, gap: 250 })));
  addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest(HOVER);
    if (el === hovered) return;
    hovered = el;
    if (el) play('pop', { rate: 1.35, vol: .35, gap: 50 });
  }, { passive: true });
  return { play };
})();

// Cartes projets : le GIF (ou la vidéo qui le remplace) n'est chargé qu'au survol
// et repart du début à chaque fois
document.querySelectorAll('.card__hover[data-gif], .card__hover[data-src]').forEach(media => {
  const card = media.closest('.card');
  card.addEventListener('mouseenter', () => {
    if (media.tagName === 'VIDEO') {
      if (!media.getAttribute('src')) media.src = media.dataset.src;
      media.currentTime = 0;
      media.play().catch(() => {});
    } else {
      media.src = '';
      media.src = media.dataset.gif;
    }
  });
  if (media.tagName === 'VIDEO') card.addEventListener('mouseleave', () => media.pause());
});

// Sur un appareil avec souris, précharge l'animation de survol quand la carte approche de
// l'écran : au survol elle démarre tout de suite au lieu d'attendre le téléchargement
if (matchMedia('(hover: hover) and (pointer: fine)').matches && 'IntersectionObserver' in window) {
  const preload = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target }) => {
    if (!isIntersecting) return;
    preload.unobserve(target);
    if (target.tagName === 'VIDEO') {
      target.preload = 'auto';
      target.src = target.dataset.src;
    } else {
      new Image().src = target.dataset.gif;
    }
  }), { rootMargin: '300px 0px' });
  // Les GIF ne sont pas préchargés : ils pèsent jusqu'à 9 Mo chacun
  document.querySelectorAll('.card__hover[data-gif]:not([data-gif$=".gif"]), .card__hover[data-src]').forEach(m => preload.observe(m));
}

// Carrousel de photos du profil : un clic l'ouvre (les autres photos apparaissent), un autre le referme
document.querySelectorAll('.carousel').forEach(c => {
  c.addEventListener('click', () => {
    const open = c.getAttribute('aria-expanded') !== 'true';
    c.setAttribute('aria-expanded', open);
    c.setAttribute('aria-label', open ? 'Hide the photos' : 'Show more photos');
    if (!open) c.scrollTo({ left: 0, behavior: 'smooth' });
  });
  // Une fois refermé, on revient toujours sur la photo de profil
  c.addEventListener('transitionend', e => {
    if (e.propertyName === 'width' && c.getAttribute('aria-expanded') !== 'true') c.scrollLeft = 0;
  });

  // Arrivé au bout, continuer à faire glisser étire la dernière photo, qui file et blanchit peu à peu ;
  // au-delà d'un seuil, on part sur la page Photographs. Si on lâche avant, elle revient en place.
  const last = c.querySelector('img:last-child');
  const hint = document.createElement('span');
  hint.className = 'carousel-hint';
  hint.innerHTML = 'Photographs <span aria-hidden="true">→</span>';
  c.after(hint);
  const BASE = 200, LIMIT = 220;
  // Filtre SVG de flou horizontal : en s'étirant, la photo file comme une traînée, sans se casser
  const NS = 'http://www.w3.org/2000/svg';
  const fx = document.createElementNS(NS, 'svg');
  fx.setAttribute('width', 0); fx.setAttribute('height', 0); fx.setAttribute('aria-hidden', 'true');
  fx.style.position = 'absolute';
  fx.innerHTML = '<filter id="carousel-smear" x="-5%" y="0" width="110%" height="100%"><feGaussianBlur stdDeviation="0 0" edgeMode="duplicate"/></filter>';
  document.body.append(fx);
  const smear = fx.querySelector('feGaussianBlur');
  let pull = 0, release, gone = false;
  const render = () => {
    last.style.width = `${BASE + pull}px`;
    // Plus on tire, plus la photo file à l'horizontale et blanchit, comme si elle s'effaçait dans la page
    const kk = Math.min(1, pull / LIMIT);
    smear.setAttribute('stdDeviation', `${(kk * kk * 9).toFixed(2)} 0`);
    last.style.setProperty('--fade-out', (kk * .9).toFixed(3));
    c.scrollLeft = c.scrollWidth;
    const k = Math.min(1, pull / LIMIT);
    hint.style.opacity = k;
    hint.style.translate = `${(1 - k) * -12}px 0`;
    // Position de l'indication : sur le bord droit du carrousel, quelle que soit sa largeur
    hint.style.left = `${c.offsetLeft + c.offsetWidth - hint.offsetWidth - 14}px`;
    hint.style.top = `${c.offsetTop + c.offsetHeight - hint.offsetHeight - 12}px`;
    c.classList.toggle('is-pulling', pull > 0);
  };
  const letGo = () => {
    c.classList.add('is-releasing');
    pull = 0; render();
    setTimeout(() => c.classList.remove('is-releasing'), 700);
  };
  c.addEventListener('wheel', e => {
    if (gone || c.getAttribute('aria-expanded') !== 'true') return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    const atEnd = c.scrollLeft + c.clientWidth >= c.scrollWidth - 2;
    if (!(atEnd && (d > 0 || pull > 0))) return;
    e.preventDefault();
    // Plus on tire, plus ça résiste
    pull = Math.max(0, pull + d * (1 - pull / (LIMIT * 1.5)) * .95);
    c.classList.remove('is-releasing');
    render();
    clearTimeout(release);
    if (pull >= LIMIT) {
      gone = true;
      sound.play('select');
      setTimeout(() => (location.href = 'photographs.html'), 160);
      return;
    }
    release = setTimeout(letGo, 180);
  }, { passive: false });
});

// Menu mobile : le bouton « + » déplie la nav en pastilles
const menuBtn = document.querySelector('.menu-btn');
if (menuBtn) {
  const header = menuBtn.closest('.header');
  const setOpen = open => {
    header.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
  };
  menuBtn.addEventListener('click', e => { e.stopPropagation(); setOpen(!header.classList.contains('menu-open')); });
  document.addEventListener('click', e => { if (!header.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => e.key === 'Escape' && setOpen(false));
}

// Lien actif dans la nav
const page = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav a').forEach(a => {
  if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page');
});

// Copier l'email au clic
document.querySelectorAll('.contact__mail').forEach(el => {
  el.addEventListener('click', () => {
    navigator.clipboard?.writeText(el.textContent.trim());
    const t = el.textContent;
    el.textContent = 'Copied!';
    setTimeout(() => (el.textContent = t), 1200);
  });
});

// Sachets de stickers. Tout se calcule dans le repère du sachet (même s'il est penché) et chaque sticker
// reste dans le sachet : le pointeur les pousse, cliquer sur un sticker le fait remonter et dépasser par
// l'ouverture (le haut, seule sortie possible) ; un second clic le range. Ils peuvent se chevaucher.
document.querySelectorAll('[data-bag] .bag__pouch').forEach(pouch => {
  const stickers = [...pouch.querySelectorAll('.bag__sticker')];
  const tilt = () => (parseFloat(getComputedStyle(pouch.closest('.bag')).rotate) || 0) * Math.PI / 180;
  // Boîte occupée par un sticker penché (son angle + l'oscillation de l'animation)
  const box = st => {
    const a = Math.abs((parseFloat(st.style.getPropertyValue('--r')) || 0) + 4) * Math.PI / 180;
    const w = st.offsetWidth, h = st.offsetHeight;
    return { w: w * Math.cos(a) + h * Math.sin(a), h: w * Math.sin(a) + h * Math.cos(a) };
  };
  // Centre de base (avant décalage) et limites dans lesquelles le centre peut aller
  // Une fois sortis (après le clic), un quart du sticker peut dépasser au-dessus de l'ouverture, jamais ailleurs
  const place = st => {
    const W = pouch.offsetWidth, H = pouch.offsetHeight, b = box(st), out = st.classList.contains('is-out');
    return {
      x: parseFloat(st.style.getPropertyValue('--x')) / 100 * W, y: parseFloat(st.style.getPropertyValue('--y')) / 100 * H,
      minX: W * .04 + b.w / 2, maxX: W * .96 - b.w / 2, minY: (out ? -b.h * .28 : H * .09) + b.h / 2, maxY: H * .97 - b.h / 2, b,
    };
  };
  const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
  const state = stickers.map(() => ({ ox: 0, oy: 0, px: 0, py: 0 }));
  const apply = () => stickers.forEach((st, i) => {
    const p = place(st), s = state[i];
    const cx = clamp(p.x + s.ox + s.px, p.minX, p.maxX), cy = clamp(p.y + s.oy + s.py, p.minY, p.maxY);
    st.style.setProperty('--px', `${(cx - p.x).toFixed(1)}px`);
    st.style.setProperty('--py', `${(cy - p.y).toFixed(1)}px`);
  });
  // Position du pointeur dans le repère du sachet
  const local = e => {
    const r = pouch.getBoundingClientRect(), t = -tilt();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    return { x: dx * Math.cos(t) - dy * Math.sin(t) + pouch.offsetWidth / 2, y: dx * Math.sin(t) + dy * Math.cos(t) + pouch.offsetHeight / 2 };
  };
  pouch.addEventListener('pointermove', e => {
    const m = local(e), W = pouch.offsetWidth;
    stickers.forEach((st, i) => {
      const p = place(st), s = state[i];
      const dx = p.x + s.ox - m.x, dy = p.y + s.oy - m.y, d = Math.hypot(dx, dy) || 1;
      const push = Math.max(0, 1 - d / (W * .6)) * W * .06 * (1 + i * .15);
      s.px = dx / d * push; s.py = dy / d * push;
    });
    apply();
  });
  pouch.addEventListener('pointerleave', () => { state.forEach(s => { s.px = 0; s.py = 0; }); apply(); });
  // Sticker réellement sous le pointeur : on ignore les zones transparentes de chaque PNG,
  // pour pouvoir attraper un sticker caché derrière le coin vide d'un autre
  const alpha = new Map();
  const opaqueAt = (st, e) => {
    if (!alpha.has(st)) {
      const c = document.createElement('canvas');
      c.width = st.naturalWidth; c.height = st.naturalHeight;
      try { c.getContext('2d', { willReadFrequently: true }).drawImage(st, 0, 0); alpha.set(st, c); } catch { alpha.set(st, null); }
    }
    const c = alpha.get(st);
    if (!c) return true;
    // Point du clic ramené dans l'image (le sticker est penché comme le sachet + son propre angle)
    const r = st.getBoundingClientRect(), t = -(tilt() + (parseFloat(st.style.getPropertyValue('--r')) || 0) * Math.PI / 180);
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const x = (dx * Math.cos(t) - dy * Math.sin(t)) / st.offsetWidth + .5, y = (dx * Math.sin(t) + dy * Math.cos(t)) / st.offsetHeight + .5;
    if (x < 0 || x > 1 || y < 0 || y > 1) return false;
    return c.getContext('2d').getImageData(Math.floor(x * c.width), Math.floor(y * c.height), 1, 1).data[3] > 40;
  };
  pouch.addEventListener('click', e => {
    pouch.classList.remove('is-shake'); void pouch.offsetWidth; pouch.classList.add('is-shake');
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => stickers.includes(el) && opaqueAt(el, e));
    if (!hit) return sound.play('pop', { rate: .7, vol: .6 });
    const i = stickers.indexOf(hit), out = hit.classList.toggle('is-out'), W = pouch.offsetWidth;
    sound.play('pop', { rate: out ? 1.15 : .9 });
    const p = place(hit), s = state[i];
    // Remonté jusqu'à dépasser par l'ouverture, en gardant à peu près sa place en largeur
    s.ox = out ? clamp(p.x + (p.x < W / 2 ? -W * .04 : W * .04), p.minX, p.maxX) - p.x : 0;
    s.oy = out ? p.minY - p.y : 0;
    apply();
  });
  pouch.addEventListener('animationend', e => e.target === pouch && pouch.classList.remove('is-shake'));
  // Les stickers sont agrandis : on vérifie dès le chargement qu'ils tiennent dans le sachet
  stickers.forEach(st => (st.complete ? apply() : st.addEventListener('load', apply)));
  addEventListener('resize', apply);
});

// Meilleurs classements Chess.com, puis le dernier commit GitHub. Le premier défile depuis 0 au chargement ; chaque survol
// (ou toucher, sur mobile) passe au suivant : Rapid → Blitz → Puzzles → GitHub (l'icône et le texte glissent aussi). Un record de moins de 7 jours est fêté : le cavalier
// reçoit une couronne, le chiffre monte depuis l'ancien record, « +N » s'envole en vert et une étiquette « PB » reste.
// Les valeurs enregistrées au build sont remplacées par celles du moment dès que Chess.com répond.
document.querySelectorAll('[data-chess]').forEach(line => {
  const pill = line.querySelector('.chess__elo');
  // Chaque valeur : [libellé, record, date du record (s), record précédent]
  let values = JSON.parse(line.dataset.chessValues), i = 0, busy = false;
  // Dernier dépôt poussé sur GitHub : une entrée de plus dans le cycle, repérée par son libellé
  let gh = line.dataset.github ? JSON.parse(line.dataset.github) : null;
  if (gh) values.push(['GitHub', 0, null, null]);
  const isGh = v => v[0] === 'GitHub';
  const ago = iso => {
    const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4));
    return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
  };
  const HEADS = {
    chess: line.querySelector('.chess__head').innerHTML,
    github: '<svg class="chess__icon chess__icon--gh" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg><span class="chess__label">Currently committing <span class="chess__opt">things </span>on GitHub</span>',
  };
  // Icône et texte : l'ancien monte et s'efface, le nouveau arrive par en dessous
  const head = kind => {
    const h = line.querySelector('.chess__head');
    if (h.dataset.kind === kind || (!h.dataset.kind && kind === 'chess')) return;
    h.dataset.kind = kind;
    if (calm) { h.innerHTML = HEADS[kind]; return; }
    h.classList.add('is-out');
    setTimeout(() => { h.innerHTML = HEADS[kind]; h.classList.remove('is-out'); h.classList.add('is-in'); }, 160);
    h.addEventListener('animationend', e => e.animationName === 'head-in' && h.classList.remove('is-in'));
  };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WEEK = 7 * 864e5;
  const recent = v => v[2] && Date.now() - v[2] * 1000 < WEEK;
  const gain = v => (recent(v) && v[3] && v[1] > v[3] ? v[1] - v[3] : 0);
  const markup = v => (isGh(v) ? `<small>${gh.repo}</small> <b>${ago(gh.pushed)}</b>`
    : `<small>${v[0]}</small> <b>${v[1]}</b>${recent(v) ? '<em class="chess__new" title="Personal best, less than 7 days ago">PB</em>' : ''}`);
  const countUp = (b, from, to) => {
    const t0 = performance.now(), dur = 900;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur);
      b.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  // Fête un record récent sur la valeur affichée
  const celebrate = (v, b) => {
    const g = gain(v);
    if (calm) return;
    countUp(b, g ? v[3] : 0, v[1]);
    pill.classList.remove('is-record'); void pill.offsetWidth; pill.classList.add('is-record');
    if (g) {
      const plus = document.createElement('span');
      plus.className = 'chess__gain';
      plus.textContent = `+${g}`;
      line.append(plus);
      plus.addEventListener('animationend', () => plus.remove());
      sound.play('select', { rate: 1.3, vol: .8 });
    }
  };
  const show = (v, b) => (recent(v) ? celebrate(v, b) : calm || countUp(b, 0, v[1]));
  // Au chargement, on commence par un record récent s'il y en a un, pour qu'il se voie
  const start = Math.max(0, values.findIndex(recent));
  i = start;
  pill.querySelector('.chess__value').innerHTML = markup(values[i]);
  show(values[i], pill.querySelector('b'));
  // L'ancienne valeur monte et s'efface, la nouvelle arrive par en dessous
  const next = () => {
    if (busy || values.length < 2) return;
    busy = true;
    sound.play('select', { vol: .6, rate: 1.1 });
    i = (i + 1) % values.length;
    const v = values[i];
    head(isGh(v) ? 'github' : 'chess');
    line.title = isGh(v) ? `Last push to ${gh.repo}` : '';
    const old = pill.querySelector('.chess__value');
    const neu = document.createElement('span');
    neu.className = 'chess__value is-in';
    neu.innerHTML = markup(v);
    pill.style.width = `${pill.offsetWidth}px`;
    pill.append(neu);
    old.classList.add('is-out');
    requestAnimationFrame(() => {
      pill.style.width = `${neu.scrollWidth + 18}px`;
      neu.classList.remove('is-in');
    });
    if (recent(v)) celebrate(v, neu.querySelector('b'));
    setTimeout(() => { old.remove(); pill.style.width = ''; busy = false; }, calm ? 0 : 320);
  };
  line.addEventListener('pointerenter', e => e.pointerType === 'mouse' && next());
  line.addEventListener('click', next);
  fetch(`https://api.chess.com/pub/player/${line.dataset.chess}/stats`)
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(({ chess_rapid: r, chess_blitz: b, tactics: t }) => {
      const live = { Rapid: [r?.best?.rating ?? r?.last?.rating, r?.best?.date], Blitz: [b?.best?.rating ?? b?.last?.rating, b?.best?.date], Puzzles: [t?.highest?.rating, t?.highest?.date] };
      const cur = values[i];
      values = values.map(v => {
        const [best, date] = live[v[0]] || [];
        if (!best) return v;
        // Record battu depuis le dernier build : l'ancien record est celui enregistré au build
        return best > v[1] ? [v[0], best, date ?? v[2], v[1]] : [v[0], best, date ?? v[2], v[3]];
      });
      const now = values[i];
      if (now[1] !== cur[1]) { pill.querySelector('.chess__value').innerHTML = markup(now); celebrate(now, pill.querySelector('b')); }
    })
    .catch(() => {});
  // Dernier push GitHub du moment (l'API publique répond aux navigateurs)
  if (gh) fetch(`https://api.github.com/users/${gh.user}/repos?sort=pushed&per_page=1`)
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(([r]) => {
      if (!r?.pushed_at) return;
      gh = { ...gh, repo: r.name, pushed: r.pushed_at };
      if (isGh(values[i])) pill.querySelector('.chess__value').innerHTML = markup(values[i]);
    })
    .catch(() => {});
});

// Éléments pleine largeur dans une colonne (data-bleed) : on mesure l'écart entre leur colonne et les bords de l'écran
const bleeds = [...document.querySelectorAll('[data-bleed]')];
const bleed = () => bleeds.forEach(el => {
  const r = el.parentElement.getBoundingClientRect(), w = document.documentElement.clientWidth;
  el.style.setProperty('--bleed-l', `${Math.max(0, r.left)}px`);
  el.style.setProperty('--bleed-r', `${Math.max(0, w - r.right)}px`);
});
if (bleeds.length) { bleed(); addEventListener('resize', bleed); }

// Art (About) : la carte active se lève et montre sa légende ; on passe à la suivante toutes les 3,5 s
document.querySelectorAll('.art').forEach(art => {
  const cards = [...art.querySelectorAll('.art__card')];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  // Sur mobile la bande défile : la carte active est ramenée en place (sans faire défiler la page)
  const strip = () => art.scrollWidth > art.clientWidth + 2;
  const left = c => c.offsetLeft - cards[0].offsetLeft;   // position dans la bande
  const go = (k, scroll = true) => {
    i = (k + cards.length) % cards.length; cards.forEach((c, n) => c.classList.toggle('is-active', n === i));
    if (scroll && strip()) art.scrollTo({ left: left(cards[i]), behavior: calm ? 'auto' : 'smooth' });
  };
  // Glissé au doigt : à l'arrêt, la carte calée à gauche devient active ; le défilement automatique se met en pause un moment
  let settle, touched = 0;
  art.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (!strip()) return;
      const n = cards.reduce((b, c, k) => (Math.abs(left(c) - art.scrollLeft) < Math.abs(left(cards[b]) - art.scrollLeft) ? k : b), 0);
      if (n !== i) go(n, false);
    }, 120);
  }, { passive: true });
  art.addEventListener('touchstart', () => { touched = Date.now(); }, { passive: true });
  cards.forEach(c => { c.tabIndex = 0; });
  art.addEventListener('click', e => {
    const c = e.target.closest('.art__card');
    if (c && cards.indexOf(c) !== i) { go(cards.indexOf(c)); sound.play('select', { vol: .7 }); }
  });
  art.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.closest('.art__card')) e.target.click();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(i + (e.key === 'ArrowRight' ? 1 : -1)); }
  });
  // Glisser (doigt ou souris) pour passer à la suivante / précédente
  let x0 = null;
  art.addEventListener('pointerdown', e => { x0 = e.clientX; });
  art.addEventListener('pointerup', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40 && !strip()) go(i + (dx < 0 ? 1 : -1));
  });
  // Défilement automatique, en pause au survol
  let hover = false;
  art.addEventListener('pointerenter', () => { hover = true; });
  art.addEventListener('pointerleave', () => { hover = false; x0 = null; });
  if (!calm) setInterval(() => { if (!hover && !document.hidden && Date.now() - touched > 6000) go(i + 1); }, 3500);
  go(0, false);
});

// Robots (About) : un clic ouvre la fiche du robot : liste des composants, design industriel et caractéristiques mécaniques
const robotsData = document.getElementById('robots-data');
if (robotsData) {
  const robots = JSON.parse(robotsData.textContent);
  const sheet = document.createElement('dialog');
  sheet.className = 'robot-sheet';
  sheet.setAttribute('aria-labelledby', 'robot-sheet-title');
  document.body.append(sheet);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Liste des composants (nomenclature) : pictogramme au trait (parts.js), quantité, nom et détail
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${(window.PART_ICONS || {})[name] || ''}</svg>`;
  const bom = r => `<section class="robot-bom" aria-label="Components"><div class="robot-bom__scroll">
        <header class="robot-bom__head"><img src="assets/img/${r.img}" alt=""><div><p>Bill of materials</p><b>${r.parts.length} components</b></div></header>
        <ul class="robot-bom__list">${r.parts.map(([ic, name, qty, detail], i) => `
          <li style="--i:${i}"><span class="robot-bom__icon">${icon(ic)}</span>
            <span class="robot-bom__text"><b>${esc(name)}</b>${detail ? `<small>${esc(detail)}</small>` : ''}</span>
            <span class="robot-bom__qty">${qty == null ? '' : `×${esc(qty)}`}</span></li>`).join('')}
        </ul>
      </div></section>`;
  const open = key => {
    const r = robots[key];
    sheet.innerHTML = `
      <button class="robot-sheet__close" aria-label="Close">×</button>
      ${bom(r)}
      <div class="robot-sheet__body">
        <p class="robot-sheet__maker">${esc(r.maker)} <span>${esc(r.year)}</span></p>
        <h3 id="robot-sheet-title">${esc(r.name)}</h3>
        <p class="robot-sheet__kicker">Industrial design</p>
        <p class="robot-sheet__design">${esc(r.design)}</p>
        <p class="robot-sheet__kicker">Mechanical properties</p>
        <dl class="robot-sheet__specs">${r.specs.map(([k, v], i) => `<div style="--i:${i}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <p class="robot-sheet__note">${r.source ? `Figures from the maker's research paper (<a href="${r.source.url}" target="_blank" rel="noopener">${esc(r.source.text)}</a>).` : 'Figures published by the maker. Quantities left blank are not published.'}</p>
      </div>`;
    sheet.querySelector('.robot-sheet__close').addEventListener('click', close);

    sheet.showModal();
    sound.play('select');
  };
  // Après la fermeture, le robot cliqué garde le focus et sa bulle resterait affichée par-dessus les autres :
  // on le libère si la fiche a été ouverte à la souris (au clavier, on garde le focus pour la navigation)
  let byMouse = false;
  const close = () => {
    sheet.classList.add('is-closing');
    setTimeout(() => {
      sheet.close();
      sheet.classList.remove('is-closing');
      if (byMouse) document.activeElement?.blur();
    }, 220);
  };
  // Un clic sur le fond (en dehors de la fiche) la ferme, Échap aussi
  sheet.addEventListener('click', e => e.target === sheet && close());
  sheet.addEventListener('cancel', e => { e.preventDefault(); close(); });
  document.querySelectorAll('[data-robot]').forEach(el => {
    el.addEventListener('click', e => { byMouse = e.detail > 0; open(el.dataset.robot); });
    el.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), byMouse = false, open(el.dataset.robot)));
  });
}

// Études de cas : les flèches ← et → du clavier ouvrent le projet précédent ou suivant
// (sauf dans un champ de saisie, une fenêtre ouverte ou avec une touche de raccourci)
const pnavPrev = document.querySelector('[data-prev]'), pnavNext = document.querySelector('[data-next]');
if (pnavPrev && pnavNext) {
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || document.querySelector('dialog[open]')) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable], [data-drag], .carousel')) return;
    const link = e.key === 'ArrowLeft' ? pnavPrev : e.key === 'ArrowRight' ? pnavNext : null;
    if (link) link.click();
  });
}

// Afficher / masquer les annotations de test
const toggle = document.querySelector('[data-toggle-issues]');
if (toggle) {
  const key = 'hide-issues';
  const apply = hide => {
    document.body.classList.toggle('no-issues', hide);
    toggle.textContent = hide ? 'Afficher les problèmes' : 'Masquer les problèmes';
  };
  let hide = false;
  try { hide = localStorage.getItem(key) === '1'; } catch {}
  apply(hide);
  toggle.addEventListener('click', () => {
    hide = !hide;
    apply(hide);
    try { localStorage.setItem(key, hide ? '1' : '0'); } catch {}
  });
}

// Compteurs animés (about > sports)
document.querySelectorAll('[data-count-to]').forEach(el => {
  const to = Number(el.dataset.countTo);
  let n = 0;
  const step = () => { el.textContent = '+' + n; if (n++ < to) setTimeout(step, 60); };
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { step(); o.disconnect(); } }).observe(el);
});


// Podz : apparition au défilement (les grilles marquées data-stagger arrivent en cascade)
const reveal = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target }) => {
  if (!isIntersecting) return;
  target.classList.add('is-in');
  reveal.unobserve(target);
}), { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--d', `${Math.min(i, 6) * 0.07}s`)));
document.querySelectorAll('[data-reveal]').forEach(el => reveal.observe(el));

// Podz : la vidéo de l'en-tête tourne seulement quand elle est visible. Si le navigateur bloque la lecture
// automatique (Safari en mode économie d'énergie), l'image fixe reste et un bouton lecture apparaît.
document.querySelectorAll('[data-beta]').forEach(video => {
  const btn = video.parentElement.querySelector('.pz-hero__play');
  const play = () => video.play().then(() => (btn.hidden = true)).catch(() => (btn.hidden = false));
  btn.addEventListener('click', play);
  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : video.pause()), { threshold: .25 }).observe(video);
});

// Podz : la photo de l'en-tête défile un peu moins vite que la page
const heroBg = document.querySelector('.pz-hero__bg');
if (heroBg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addEventListener('scroll', () => heroBg.style.setProperty('--py', `${Math.min(scrollY, 800) * .25}px`), { passive: true });
}

// Podz : évolution du logo, une étape toutes les 2,4 s tant que la section est visible
document.querySelectorAll('[data-evo]').forEach(box => {
  const imgs = [...box.querySelectorAll('.pz-evo__stage img')];
  const btns = [...box.querySelectorAll('.pz-evo__steps button')];
  let i = 0, timer = null;
  const show = n => {
    imgs[i].classList.replace('is-on', 'is-off');
    const old = imgs[i];
    setTimeout(() => old.classList.remove('is-off'), 500);
    i = n;
    imgs[i].classList.add('is-on');
    btns.forEach((b, k) => b.setAttribute('aria-current', k === i));
  };
  const play = () => { clearInterval(timer); box.classList.remove('is-paused'); timer = setInterval(() => show((i + 1) % imgs.length), 2400); };
  btns.forEach((b, k) => b.addEventListener('click', () => {
    clearInterval(timer);
    box.classList.add('is-paused');
    if (k !== i) show(k);
  }));
  new IntersectionObserver(([e]) => {
    if (box.classList.contains('is-paused')) return;
    if (e.isIntersecting) play(); else clearInterval(timer);
  }, { threshold: .5 }).observe(box);
});

// Podz : choix du mode de l'icône (fondu avec un léger rebond)
document.querySelectorAll('[data-icon-switch]').forEach(box => {
  const img = box.querySelector('[data-icon]');
  box.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-selected') === 'true') return;
    box.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b === btn));
    box.classList.toggle('is-dark', btn.dataset.tone === 'dark');
    img.classList.add('is-swap');
    setTimeout(() => {
      img.src = `assets/podz/${btn.dataset.src}.png`;
      img.alt = `Podz app icon, ${btn.textContent.toLowerCase()} mode`;
      img.classList.remove('is-swap');
    }, 180);
  }));
});

// Podz : l'icône s'incline vers la souris et revient avec un rebond
document.querySelectorAll('[data-tilt]').forEach(stage => {
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    stage.classList.add('is-tilting');
    stage.style.setProperty('--ry', `${x * 28}deg`);
    stage.style.setProperty('--rx', `${-y * 28}deg`);
  });
  stage.addEventListener('pointerleave', () => {
    stage.classList.remove('is-tilting');
    stage.style.setProperty('--ry', '0deg');
    stage.style.setProperty('--rx', '0deg');
  });
});

// Podz : les personnages sautent au clic
const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
document.querySelectorAll('.pz-chars__card').forEach((b, i) => {
  b.addEventListener('click', () => { replay(b, 'is-jump'); sound.play('pop', { rate: [.85, 1, 1.2][i] || 1 }); });
  b.addEventListener('animationend', e => e.animationName === 'pz-jump' && b.classList.remove('is-jump'));
});

// Podz : les personnages suivent le pointeur des yeux et penchent légèrement la tête vers lui.
// Le mouvement est lissé image par image ; sur écran tactile, sans souris, le regard se promène seul.
// Après 7 s sans mouvement, ils s'endorment (yeux fermés, tête penchée).
document.querySelectorAll('[data-chars]').forEach(row => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const chars = [...row.querySelectorAll('.pz-char')].map(svg => ({
    svg, eyes: svg.querySelector('.pz-eyes'), x: 0, y: 0, lean: 0,
  }));
  let px = null, py = null, lastMove = 0, visible = false, frame = 0, sleepTimer;
  const asleep = () => row.classList.contains('is-asleep');
  const wake = () => {
    row.classList.remove('is-asleep');
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => row.classList.add('is-asleep'), 7000);
  };
  const tick = t => {
    const wander = touch && t - lastMove > 2500;
    chars.forEach((c, i) => {
      let tx = 0, ty = 0, tl = 0;
      if (asleep()) { ty = 3; tl = -5; }
      else if (wander) {
        // Regard qui se promène : une cible différente par personnage, qui change doucement
        tx = Math.sin(t / 1300 + i * 2) * 7; ty = Math.cos(t / 1700 + i) * 3 - 2;
      } else if (px !== null) {
        const r = c.eyes.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const reach = 9 * (1 - Math.exp(-d / 220));
        tx = dx / d * reach;
        ty = Math.max(-7, Math.min(3, dy / d * reach * .8));
        tl = Math.max(-6, Math.min(6, dx / 60));
      }
      const ease = asleep() ? .04 : .16;
      c.x += (tx - c.x) * ease; c.y += (ty - c.y) * ease; c.lean += (tl - c.lean) * ease * .6;
      c.eyes.setAttribute('transform', `translate(${c.x.toFixed(2)} ${c.y.toFixed(2)})`);
      c.svg.style.setProperty('--lean', `${c.lean.toFixed(2)}deg`);
    });
    frame = visible ? requestAnimationFrame(tick) : 0;
  };
  addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY; lastMove = performance.now();
    if (visible) wake();
  }, { passive: true });
  addEventListener('scroll', () => visible && wake(), { passive: true });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) return clearTimeout(sleepTimer);
    wake();
    if (!calm && !frame) frame = requestAnimationFrame(tick);
  }).observe(row);
  if (calm) return;
  chars.forEach(({ svg }) => {
    const blink = () => {
      if (visible && !asleep()) {
        svg.classList.add('is-blink');
        setTimeout(() => svg.classList.remove('is-blink'), 140);
      }
      setTimeout(blink, 2200 + Math.random() * 4000);
    };
    setTimeout(blink, 800 + Math.random() * 2500);
  });
});

// Podz : onglets des états de l'app (pas de trajet, recherche, pas de favoris)
document.querySelectorAll('[data-states]').forEach(box => {
  const tabs = [...box.querySelectorAll('[role="tab"]')];
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(o => o.setAttribute('aria-selected', o === t));
    box.querySelectorAll('.pz-state').forEach(st => st.classList.toggle('is-on', st.dataset.state === t.dataset.state));
  }));
});

// Défilement des écrans à la souris (glisser)
document.querySelectorAll('[data-drag]').forEach(rail => {
  let x0 = 0, left0 = 0, down = false;
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    down = true; x0 = e.clientX; left0 = rail.scrollLeft;
    rail.classList.add('is-dragging');
  });
  addEventListener('pointermove', e => { if (down) rail.scrollLeft = left0 - (e.clientX - x0); });
  addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    rail.classList.remove('is-dragging');
  });
});

// Signature personnalisable : un clic sur « Bosoveille » ouvre une fenêtre où l'on dessine ou écrit un mot
// quelque chose ; le résultat remplace la signature dans l'en-tête, pour ce visiteur seulement (gardé dans le navigateur).
document.querySelectorAll('.logo').forEach(logo => {
  const KEY = 'logo-swap';
  // La signature est un masque : on lui donne l'image du visiteur, et une largeur à son format (17 px de haut)
  const apply = (url, ratio) => {
    logo.style.setProperty('--logo', url ? `url("${url}")` : '');
    logo.style.width = url ? `${Math.round(Math.min(110, Math.max(24, 17 * ratio)))}px` : '';
  };
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved?.url) apply(saved.url, saved.ratio); } catch {}
  logo.setAttribute('aria-haspopup', 'dialog');
  logo.title = 'Make it yours';

  const sheet = document.createElement('dialog');
  sheet.className = 'logo-sheet';
  sheet.setAttribute('aria-labelledby', 'logo-sheet-title');
  sheet.innerHTML = `
    <button class="robot-sheet__close" aria-label="Close">×</button>
    <h3 id="logo-sheet-title">Make it yours</h3>
    <p class="logo-sheet__hint">Draw something or write a word. It takes the place of my signature, just for you.</p>
    <div class="logo-sheet__tabs" role="tablist">
      <button role="tab" data-mode="draw" aria-selected="true">Draw</button>
      <button role="tab" data-mode="write" aria-selected="false">Write</button>
    </div>
    <div class="logo-sheet__pad" data-mode="draw">
      <input class="logo-sheet__input" type="text" maxlength="18" placeholder="Your word" aria-label="Your word" autocomplete="off" spellcheck="false">
      <canvas class="logo-sheet__canvas" aria-label="Drawing area"></canvas>
      <button class="logo-sheet__clear" type="button">Clear</button>
    </div>
    <div class="logo-sheet__actions">
      <button class="logo-sheet__reset" type="button">Bring back Bosoveille</button>
      <button class="logo-sheet__ok" type="button" disabled>Swap</button>
    </div>`;
  document.body.append(sheet);
  const pad = sheet.querySelector('.logo-sheet__pad'), input = sheet.querySelector('input');
  const canvas = sheet.querySelector('canvas'), ctx = canvas.getContext('2d'), ok = sheet.querySelector('.logo-sheet__ok');
  let mode = 'draw', drawn = false;
  const ready = () => { ok.disabled = mode === 'write' ? !input.value.trim() : !drawn; };

  const setMode = m => {
    mode = m; pad.dataset.mode = m;
    sheet.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m));
    if (m === 'draw') size(); else input.focus();
    ready();
  };
  sheet.querySelectorAll('[role="tab"]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  input.addEventListener('input', ready);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); });

  // Dessin : trait noir arrondi, lissé entre les points
  const size = () => {
    const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    if (canvas.width === Math.round(r.width * dpr)) return;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawn = false; ready();
  };
  let last = null;
  const at = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); last = at(e);
    ctx.lineWidth = 4; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#000';
    ctx.beginPath(); ctx.arc(last[0], last[1], 2, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
    drawn = true; ready();
  });
  canvas.addEventListener('pointermove', e => {
    if (!last) return;
    const p = at(e), mid = [(last[0] + p[0]) / 2, (last[1] + p[1]) / 2];
    ctx.beginPath(); ctx.moveTo(...(last.mid || last)); ctx.quadraticCurveTo(last[0], last[1], ...mid); ctx.stroke();
    last = Object.assign(p, { mid });
  });
  ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { last = null; }));
  sheet.querySelector('.logo-sheet__clear').addEventListener('click', () => {
    if (mode === 'write') { input.value = ''; input.focus(); }
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); drawn = false; }
    ready();
  });

  // Image finale, recadrée au plus près : le mot (écrit à la main, en Caveat) ou le dessin
  const crop = src => {
    const { width: w, height: h } = src, data = src.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) return null;
    const m = 4, out = document.createElement('canvas');
    out.width = x1 - x0 + 1 + m * 2; out.height = y1 - y0 + 1 + m * 2;
    out.getContext('2d').drawImage(src, x0 - m, y0 - m, out.width, out.height, 0, 0, out.width, out.height);
    return { url: out.toDataURL('image/png'), ratio: out.width / out.height };
  };
  const render = async () => {
    if (mode === 'draw') return crop(canvas);
    await document.fonts.load('120px Caveat');
    const c = document.createElement('canvas'), x = c.getContext('2d'), text = input.value.trim();
    x.font = '120px Caveat'; c.width = Math.ceil(x.measureText(text).width) + 40; c.height = 190;
    x.font = '120px Caveat'; x.textBaseline = 'middle'; x.fillStyle = '#000'; x.fillText(text, 20, 95);
    return crop(c);
  };

  // Échange : la signature s'efface en flou, la nouvelle apparaît avec un petit rebond
  const swap = (img) => {
    const out = logo.animate([{}, { opacity: 0, filter: 'blur(4px)', scale: .7 }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
    // (minuterie plutôt que onfinish : l'échange se fait même si l'onglet ne dessine pas d'images)
    setTimeout(() => {
      apply(img?.url, img?.ratio); out.cancel();
      logo.animate([{ opacity: 0, filter: 'blur(4px)', scale: .7 }, { opacity: 1, filter: 'blur(0)', scale: 1.12, offset: .6 }, { scale: 1 }],
        { duration: 420, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
    }, 180);
    try { img ? localStorage.setItem(KEY, JSON.stringify(img)) : localStorage.removeItem(KEY); } catch {}
  };
  ok.addEventListener('click', async () => { const img = await render(); if (img) { close(); setTimeout(() => swap(img), 240); } });
  sheet.querySelector('.logo-sheet__reset').addEventListener('click', () => { close(); setTimeout(() => swap(null), 240); });

  const close = () => {
    sheet.classList.add('is-closing');
    setTimeout(() => { sheet.close(); sheet.classList.remove('is-closing'); }, 220);
  };
  sheet.querySelector('.robot-sheet__close').addEventListener('click', close);
  sheet.addEventListener('click', e => e.target === sheet && close());
  sheet.addEventListener('cancel', e => { e.preventDefault(); close(); });
  logo.addEventListener('click', e => {
    e.preventDefault();
    sheet.showModal(); setMode(mode);
  });
});

// Aer : la conversation avec le fabricant se joue quand l'en-tête arrive à l'écran, puis recommence, comme sur iOS :
// mes messages sont tapés dans le champ puis envoyés (« Distribué »), le fabricant les lit (« Lu ») et écrit avant de répondre.
document.querySelectorAll('.chat').forEach(chat => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const thread = chat.querySelector('.chat__thread');
  const msgs = [...thread.querySelectorAll('.msg')];
  const field = chat.querySelector('.chat__field'), draft = chat.querySelector('.chat__draft');
  const typing = document.createElement('div');
  typing.className = 'msg them tail typing';
  typing.innerHTML = '<div class="msg__in"><p aria-hidden="true"><i></i><i></i><i></i></p></div>';
  const receipt = document.createElement('p');
  receipt.className = 'chat__receipt';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Chaque changement du fil (bulle qui arrive, points qui partent, accusé) : on note la place de chaque élément,
  // on applique le changement, puis chacun glisse de son ancienne place à la nouvelle ; ce qui apparaît éclot depuis son coin.
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';
  const change = fn => {
    // (les éléments cachés n'ont pas de place : ils ne sont pas notés, et seront traités comme nouveaux)
    const before = new Map([...thread.children].filter(el => el.getClientRects().length).map(el => [el, el.getBoundingClientRect().top]));
    fn();
    for (const el of thread.children) {
      if (!el.getClientRects().length) continue;
      const top = before.get(el);
      if (top === undefined) {
        const target = el.classList.contains('msg') ? el.firstElementChild : el;
        target.animate([{ opacity: 0, transform: 'translateY(10px) scale(.86)' }, { opacity: 1, transform: 'none' }],
          { duration: 420, easing: 'cubic-bezier(.3, 1.35, .5, 1)' });
      } else {
        const dy = top - el.getBoundingClientRect().top;
        if (Math.abs(dy) > .5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: EASE });
      }
    }
  };
  const shut = el => el.classList.remove('is-in');
  // Après l'envoi de la pile : on la feuillette d'un coup de doigt, chaque carte part à gauche et la suivante vient devant
  const swipe = async stack => {
    const cards = [stack.querySelector('.stack__front'), ...[...stack.querySelectorAll(':scope > img')].reverse()];
    const out = { translate: '-140px 0', rotate: '-12deg', opacity: 0 };
    for (let k = 0; k < cards.length - 1; k++) {
      cards[k].animate([{}, out], { duration: 260, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' });
      cards[k + 1].animate([{}, { translate: '0 0', rotate: '0deg', filter: 'none' }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
      await wait(330);
    }
    await wait(500);
    // retour à la première, en fondu
    cards.forEach(c => c.getAnimations().forEach(a => a.cancel()));
    cards[0].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  };
  const clock = n => `09:${String(41 + n).padStart(2, '0')}`;
  let running = false;
  const play = async () => {
    if (running) return; running = true;
    while (true) {
      chat.classList.add('is-playing');
      msgs.forEach(shut);
      receipt.remove();
      await wait(700);
      let sent = 0;
      for (const m of msgs) {
        if (m.classList.contains('them')) {
          if (receipt.isConnected) { await wait(500); receipt.textContent = `Read ${clock(sent)}`; }
          typing.classList.add('is-in');
          change(() => thread.insertBefore(typing, m));
          await wait(1200);
          change(() => { typing.remove(); m.classList.add('is-in'); });
          sound.play('pop', { vol: .2, rate: .9 });
          await wait(800);
          continue;
        }
        // Mes messages : le texte se tape (ou les photos se posent) dans le champ, puis la flèche bleue l'envoie
        const text = m.querySelector('p')?.textContent;
        field.classList.add('has-draft');
        if (text) {
          for (let k = 1; k <= text.length; k++) { draft.textContent = text.slice(0, k); await wait(28); }
        } else {
          draft.innerHTML = [...m.querySelectorAll('img, video')].map(e => `<img src="${e.poster || e.getAttribute('src')}" alt="">`).join('');
        }
        await wait(text ? 350 : 700);
        draft.textContent = ''; field.classList.remove('has-draft');
        receipt.textContent = 'Delivered';
        change(() => { m.classList.add('is-in'); m.after(receipt); }); sent++;
        sound.play('pop', { vol: .2, rate: 1.2 });
        await wait(m.classList.contains('pic') ? 1300 : 700);
        if (m.classList.contains('bunch')) { await swipe(m.querySelector('.stack')); await wait(400); }
      }
      await wait(4500);
      chat.classList.add('is-reset'); await wait(450);
      chat.classList.remove('is-reset');
    }
  };
  // déjà à l'écran au chargement (en haut de la page) : on joue tout de suite, sinon quand on y arrive
  const r = chat.getBoundingClientRect();
  if (r.top < innerHeight * .7 && r.bottom > 0) { play(); return; }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { play(); io.disconnect(); } }, { threshold: .35 });
  io.observe(chat);
});
