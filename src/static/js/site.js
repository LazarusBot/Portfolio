// Partagé par toutes les pages de test
// Images téléchargées dans le repo par tools/build.js
const IMG = id => `assets/img/${id}`;

// Sons du portfolio, trois rôles : « select » pour choisir (onglets, modes, carrousel, menu),
// « pop » pour ce qu'on touche (stickers, personnages, démos, et en plus léger au survol des onglets et du contact), « robot » quand l'app travaille
// (recherche, paiement). Ils ne jouent qu'après un premier geste (règle des navigateurs) ; le bouton
// en bas à droite les coupe et le choix est gardé.
const sound = (() => {
  // chess : le coup joué de Chess.com ; duolingo : la bonne réponse de Duolingo (ses fichiers d'origine)
  const FILES = { pop: 'assets/sounds/pop.mp3', robot: 'assets/sounds/robot.mp3', chess: 'assets/sounds/chess.mp3', duolingo: 'assets/sounds/duolingo.mp3' };
  const VOL = { pop: .45, robot: .22, chess: .6, duolingo: .35 };
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
  // « tick » : le petit pop aigu et discret du bloc contact, devenu le son de tout le site
  const TICK = { rate: 1.35, vol: .35, gap: 50 };
  // « push » (GitHub) : deux notes douces qui montent, synthétisées, comme un envoi
  const push = () => {
    const t = ctx.currentTime;
    [[880, 0], [1320, .07]].forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(.08, t + d + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + d + .14);
      o.connect(g).connect(ctx.destination);
      o.start(t + d); o.stop(t + d + .16);
    });
  };
  const play = (name, opts = {}) => {
    if (name === 'tick') return play('pop', { ...TICK, ...opts });
    const { rate = 1, vol = 1, gap = 70, exact = false } = opts;
    if (!on || !ctx) return;
    const now = performance.now();
    if (name === 'push') { if (now - (last.push || 0) < gap) return; last.push = now; if (ctx.state === 'suspended') ctx.resume(); return push(); }
    if (!buffers[name]) return;
    if (now - (last[name] || 0) < gap) return;
    last[name] = now;
    if (ctx.state === 'suspended') ctx.resume();
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffers[name];
    // Légère variation de hauteur : un son répété ne sonne jamais deux fois pareil
    // (sauf les sons de marque, joués tels quels)
    src.playbackRate.value = exact ? rate : rate * (0.96 + Math.random() * 0.08);
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
    if (on) { unlock(); setTimeout(() => play('tick'), 30); }
  });
  sync();
  document.body.append(btn);
  // Sons déclenchés au clic, selon l'élément (le premier sélecteur qui correspond gagne).
  // Par défaut, liens et boutons sonnent « tick », le son discret du bloc contact.
  // Les éléments qui jouent leur propre son (stickers, personnages, Chess.com) sont exclus.
  const CLICKS = [
    ['.bag__pouch, .pz-chars__card, .chess, .foot, .profile__job, .robot, .art', null],
    ['.pz-states__tabs [data-state="search"]', 'robot'],
    ['.pay', 'robot'],
    ['.pz-icon__modes button, .pz-evo__steps button, .pz-states__tabs button, .side__menu, .side__toggle', 'tick'],
    ['.stage', 'tick'],
    ['.card', 'tick'],
    ['a[href]', 'tick'],
    ['button, [role="button"], summary', 'tick'],
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
    if (leaves && on && ctx && buffers[hit[1] === 'tick' ? 'pop' : hit[1]]) {
      e.preventDefault();
      play(hit[1], hit[2]);
      setTimeout(() => (location.href = a.href), 140);
    } else setTimeout(() => play(hit[1], hit[2]), 0);
  });
  // Survol : petit « pop » aigu et discret, seulement sur le bloc contact
  // (mail, WhatsApp, X, LinkedIn). Ces éléments n'ont pas de son au clic, pour ne jamais doubler.
  const HOVER = '.foot a, .profile__job';
  let hovered = null;
  // Robots (About) : leur propre son, le « robot », une fois par survol
  document.querySelectorAll('.robot').forEach(r => r.addEventListener('pointerenter', e => e.pointerType === 'mouse' && play('robot', { vol: 1.3, gap: 250 })));
  addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest(HOVER);
    if (el === hovered) return;
    hovered = el;
    if (el) play('tick');
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

// Navigation de gauche (générée par tools/build.js)
const side = document.querySelector('.side');
if (side) {
  const root = document.documentElement;
  const panel = side.querySelector('.side__panel');
  const toggle = side.querySelector('.side__toggle');
  const pill = document.querySelector('.side__menu');
  const wide = matchMedia('(min-width: 1100px)');
  // Desktop : replier la colonne ; le choix est gardé d'une page à l'autre
  const syncToggle = () => {
    const off = root.classList.contains('side-off');
    toggle.setAttribute('aria-expanded', !off);
    toggle.setAttribute('aria-label', off ? 'Show navigation' : 'Hide navigation');
    toggle.title = off ? 'Show navigation' : 'Hide navigation';
  };
  toggle.addEventListener('click', () => {
    const off = root.classList.toggle('side-off');
    try { localStorage.setItem('side', off ? 'off' : 'on'); } catch {}
    syncToggle();
    // La page change de largeur sans que la fenêtre change : on prévient les scripts qui mesurent
    setTimeout(() => dispatchEvent(new Event('resize')), 320);
  });
  syncToggle();
  // Mobile : la pastille « Menu » ouvre l'arbre dans une feuille ; Échap, le voile ou un lien la ferment
  const setSheet = open => {
    root.classList.toggle('side-sheet', open);
    pill.setAttribute('aria-expanded', open);
    pill.textContent = open ? 'Close' : 'Menu';
    if (open) (panel.querySelector('[aria-current="page"]') || panel.querySelector('a, button')).focus({ preventScroll: true });
  };
  pill.addEventListener('click', e => { e.stopPropagation(); setSheet(!root.classList.contains('side-sheet')); });
  document.addEventListener('click', e => {
    if (root.classList.contains('side-sheet') && !panel.contains(e.target)) setSheet(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && root.classList.contains('side-sheet')) { setSheet(false); pill.focus(); }
  });
  // Le focus quitte la feuille (Tab) : elle se ferme, comme au clic à côté
  document.addEventListener('focusin', e => {
    if (root.classList.contains('side-sheet') && !panel.contains(e.target) && e.target !== pill) setSheet(false);
  });
  wide.addEventListener('change', () => wide.matches && setSheet(false));
}

// Repères de sections dans la marge des études de cas : un trait par section de la version affichée (Podz, XChange : V1 / V2)
(() => {
  const read = () => [...document.querySelectorAll('main:not([hidden]) :is(.section, .mi)')].filter(s => s.querySelector('h2, .mi__title'));
  let sections = [], ticks = null, raf = 0;
  const current = () => {
    // La section lue est la dernière dont le titre a passé le tiers haut de l'écran
    const line = innerHeight / 3;
    let i = 0;
    sections.forEach((s, k) => { if (s.getBoundingClientRect().top <= line) i = k; });
    // Tout en bas de la page, la dernière section est la courante même si elle est courte
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) i = sections.length - 1;
    ticks.querySelectorAll('button').forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  };
  const build = () => {
    ticks?.remove();
    ticks = null;
    sections = read();
    if (sections.length < 3) return;
    ticks = document.createElement('nav');
    ticks.className = 'ticks';
    ticks.setAttribute('aria-label', 'Sections');
    sections.forEach(s => {
      const b = document.createElement('button');
      const name = s.querySelector('h2, .mi__title').textContent.trim().replace(/\s+/g, ' ');
      b.setAttribute('aria-label', name);
      b.title = name;
      // (40 px d'air au-dessus du titre)
      b.addEventListener('click', () => scrollTo({ top: s.getBoundingClientRect().top + scrollY - 40, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
      ticks.append(b);
    });
    document.body.append(ticks);
    current();
  };
  addEventListener('scroll', () => { if (ticks && !raf) raf = requestAnimationFrame(() => { raf = 0; current(); }); }, { passive: true });
  addEventListener('resize', () => ticks && current());
  // Changement de version : les sections ne sont plus les mêmes
  document.querySelectorAll('[data-version-switch]').forEach(sw => sw.addEventListener('click', () => setTimeout(build, 0)));
  build();
})();

// Copier l'email au clic
document.querySelectorAll('.contact__mail').forEach(el => {
  // Le lien ouvre l'app mail ; l'adresse est aussi copiée, au cas où
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

// Dernier push GitHub, série Duolingo, record Chess.com. Chaque clic (ou toucher) passe à l'étape suivante :
// GitHub → Duolingo → Chess.com (l'icône et le texte glissent aussi). Au survol, chaque étape ouvre sa petite carte. Un record de moins de 7 jours est fêté : le cavalier
// reçoit une couronne, le chiffre monte depuis l'ancien record, « +N » s'envole en vert et une étiquette « PB » reste.
// Les valeurs enregistrées au build sont remplacées par celles du moment dès que Chess.com répond.
document.querySelectorAll('[data-chess]').forEach(line => {
  const pill = line.querySelector('.chess__elo');
  // Chaque valeur : [libellé, record, date du record (s), record précédent]
  let values = JSON.parse(line.dataset.chessValues), i = 0, busy = false;
  // Dernier dépôt poussé sur GitHub : une entrée de plus dans le cycle, repérée par son libellé
  let gh = line.dataset.github ? JSON.parse(line.dataset.github) : null;
  // GitHub ouvre le cycle : c'est la première chose qu'on lit
  if (gh) values.unshift(['GitHub', 0, null, null]);
  const isGh = v => v[0] === 'GitHub';
  // Série Duolingo (lue au build) : juste après GitHub, sauf si la série est cassée depuis (dernier jour avant hier)
  const duo = line.dataset.duolingo ? JSON.parse(line.dataset.duolingo) : null;
  const yesterday = new Date(Date.now() - 864e5).toLocaleDateString('en-CA');
  if (duo?.streak && duo.end >= yesterday) values.splice(gh ? 1 : 0, 0, ['Duolingo', duo.streak, null, null]);
  const isDuo = v => v[0] === 'Duolingo';
  const kindOf = v => (isGh(v) ? 'github' : isDuo(v) ? 'duolingo' : 'chess');
  // Pas d'infobulle du navigateur : la carte de survol la remplace
  const titleOf = () => '';
  const ago = iso => {
    const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4));
    // En toutes lettres, comme la série Duolingo (« 2 days ago », « 7-day streak »)
    const n = (v, unit) => `${v} ${unit}${v === 1 ? '' : 's'} ago`;
    return m < 1 ? 'just now' : m < 60 ? n(m, 'minute') : m < 1440 ? n(Math.round(m / 60), 'hour') : n(Math.round(m / 1440), 'day');
  };
  // Les deux en-têtes (icône + texte) sont écrits au build dans un <template>
  const tpl = line.querySelector('.chess__heads').content;
  const HEADS = Object.fromEntries([...tpl.children].map(n => [n.dataset.kind, n.innerHTML]));
  // Icône et texte : l'ancien monte et s'efface, le nouveau arrive par en dessous
  const head = kind => {
    const h = line.querySelector('.chess__head');
    if (h.dataset.kind === kind) return;
    h.dataset.kind = kind;
    if (calm) { h.innerHTML = HEADS[kind]; return; }
    h.classList.add('is-out');
    setTimeout(() => { h.innerHTML = HEADS[kind]; h.classList.remove('is-out'); h.classList.add('is-in'); }, 240);
    h.addEventListener('animationend', e => e.animationName === 'head-in' && h.classList.remove('is-in'));
  };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WEEK = 7 * 864e5;
  const recent = v => v[2] && Date.now() - v[2] * 1000 < WEEK;
  const gain = v => (recent(v) && v[3] && v[1] > v[3] ? v[1] - v[3] : 0);
  const markup = v => (isGh(v) ? `<small>${gh.repo}</small> <b>${ago(gh.pushed)}</b>`
    : isDuo(v) ? `${duo.course ? `<small>${duo.course}</small> ` : ''}<b>${v[1]}-day streak</b>`
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
      sound.play('tick');
    }
  };
  const show = (v, b) => (isGh(v) || isDuo(v) ? null : recent(v) ? celebrate(v, b) : calm || countUp(b, 0, v[1]));
  // Au chargement : GitHub s'il y est, sinon un record récent pour qu'il se voie
  const start = gh ? 0 : Math.max(0, values.findIndex(recent));
  i = start;
  line.title = titleOf(values[i]);
  pill.querySelector('.chess__value').innerHTML = markup(values[i]);
  show(values[i], pill.querySelector('b'));
  // L'ancienne valeur monte et s'efface, la nouvelle arrive par en dessous
  const next = () => {
    if (busy || values.length < 2) return;
    busy = true;
    i = (i + 1) % values.length;
    const v = values[i];
    // Chess.com et Duolingo arrivent avec leur propre son, GitHub avec le clic du site
    const kind = kindOf(v);
    if (kind === 'github') sound.play('push');
    else sound.play(kind, { exact: true });
    head(kindOf(v));
    line.title = titleOf(v);
    const old = pill.querySelector('.chess__value');
    const neu = document.createElement('span');
    neu.className = 'chess__value is-in';
    neu.innerHTML = markup(v);
    pill.style.width = `${pill.offsetWidth}px`;
    pill.append(neu);
    old.classList.add('is-out');
    requestAnimationFrame(() => {
      pill.style.width = `${neu.scrollWidth}px`;
      neu.classList.remove('is-in');
    });
    if (recent(v)) celebrate(v, neu.querySelector('b'));
    setTimeout(() => { old.remove(); pill.style.width = ''; busy = false; }, calm ? 0 : 480);
  };
  // Carte de survol (souris seulement) : activité GitHub, série et langues Duolingo, classements Chess.com
  const card = document.createElement('span');
  card.className = 'chess__card';
  card.setAttribute('role', 'tooltip');
  line.append(card);
  const html = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = n => Number(n).toLocaleString('en-US');
  const day = d => new Date(`${d}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const row = (label, value, cls = '') => `<span class="chess__card-row"><small>${label}</small><span${cls ? ` class="${cls}"` : ''}>${value}</span></span>`;
  // GitHub : la grille d'activité, une case par jour depuis la semaine du premier commit de l'année (calculée au build).
  // Quatre rangées seulement : les jours se suivent en colonnes de quatre, et les cases remplissent la largeur de la carte.
  const ROWS = 4;
  const grid = act => {
    const first = act.days.search(/[1-4]/);
    if (first < 0) return '';
    const days = act.days.slice(first - (first % 7)), cols = Math.ceil(days.length / ROWS);
    const size = Math.max(3, Math.min(10, Math.floor((328 + 2) / cols) - 2));
    return `<span class="chess__grid" style="--c:${size}px;--rows:${ROWS}" aria-hidden="true">${[...days].map(l => `<i data-l="${l}"></i>`).join('')}</span>`;
  };
  const chessCard = line.dataset.chessCard ? JSON.parse(line.dataset.chessCard) : {};
  const puzzles = () => (values.find(v => v[0] === 'Puzzles') || [])[1];
  const cardHTML = kind => (kind === 'github'
    // GitHub : carte plus large, la grille en grand en haut, le profil et les chiffres dessous
    ? (gh.activity ? grid(gh.activity) : '')
      + `<span class="chess__card-head"><img src="assets/img/github-avatar.png" alt="" width="24" height="24"><b>${html(gh.user)}</b>${gh.repos ? `<small>${gh.repos} public repos</small>` : ''}</span>`
      + (gh.activity ? `<small class="chess__card-note">${num(gh.activity.total)} commits in the last year</small>` : '')
      + `<a class="chess__card-link" href="https://github.com/${html(gh.user)}" target="_blank" rel="noopener">View on GitHub <span aria-hidden="true">↗</span></a>`
    : kind === 'duolingo'
    ? `<span class="chess__card-head"><img src="assets/img/duolingo-avatar.png" alt="" width="24" height="24"><b>${html(duo.username)}</b><small>Duolingo</small></span>`
      + row('Streak', `${duo.streak} days${duo.start ? `, since ${day(duo.start)}` : ''}`)
      + (duo.courses || []).map(c => row(html(c.title), `${num(c.xp)} XP`)).join('')
    : `<span class="chess__card-head"><img src="assets/img/chess-avatar.jpg" alt="" width="24" height="24"><b>${html(line.dataset.chess)}</b><small>Chess.com</small></span>`
      + (puzzles() ? row('Puzzles', `${num(puzzles())} best`) : '')
      + (chessCard.rapid ? row('Rapid', `${num(chessCard.rapid.rating)}, best ${num(chessCard.rapid.best)}`) : '')
      + (chessCard.blitz ? row('Blitz', `${num(chessCard.blitz)} best`) : '')
      + (chessCard.rapid ? row('Games', `${chessCard.rapid.win} W · ${chessCard.rapid.loss} L · ${chessCard.rapid.draw} D`) : ''));
  let hover = false;
  const syncCard = () => {
    const kind = kindOf(values[i]);
    const on = hover;
    if (on && card.dataset.kind !== kind) { card.innerHTML = cardHTML(kind); card.dataset.kind = kind; }
    card.classList.toggle('is-open', on);
  };
  line.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; syncCard(); } });
  line.addEventListener('pointerleave', () => { hover = false; syncCard(); });
  // Un clic dans la carte (ses liens) ne change pas d'étape
  card.addEventListener('click', e => e.stopPropagation());
  line.addEventListener('click', () => { next(); syncCard(); });
  fetch(`https://api.chess.com/pub/player/${line.dataset.chess}/stats`)
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(({ tactics: t }) => {
      const live = { Puzzles: [t?.highest?.rating, t?.highest?.date] };
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
  // Dernier push GitHub du moment, tous dépôts confondus (l'API publique répond aux navigateurs)
  const ghGet = q => fetch(`https://api.github.com/users/${gh.user}/${q}`).then(r => (r.ok ? r.json() : []));
  // Mes dépôts (à jour) + l'activité publique (pushs sur les dépôts des autres, avec du retard) : le plus récent gagne
  if (gh) Promise.all([ghGet('repos?sort=pushed&per_page=1'), ghGet('events/public?per_page=100')])
    .then(([repos, events]) => {
      const [last] = [...repos.map(r => ({ repo: r.name, pushed: r.pushed_at })),
        ...events.filter(e => e.type === 'PushEvent').map(e => ({ repo: e.repo.name.split('/')[1], pushed: e.created_at }))]
        .filter(p => p.pushed).sort((a, b) => b.pushed.localeCompare(a.pushed));
      if (!last) return;
      gh = { ...gh, ...last };
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
    if (c && cards.indexOf(c) !== i) { go(cards.indexOf(c)); sound.play('tick'); }
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
    sound.play('tick');
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
    if (e.target.closest?.('input, textarea, select, [contenteditable], [data-drag]')) return;
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
const heroBgs = document.querySelectorAll('.pz-hero__bg');
if (heroBgs.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addEventListener('scroll', () => heroBgs.forEach(bg => bg.style.setProperty('--py', `${Math.min(scrollY, 800) * .25}px`)), { passive: true });
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

// Podz : V1 / V2 sur la même page, le choix suit l'adresse (podz.html?v=2)
document.querySelectorAll('[data-version-switch]').forEach(sw => {
  const show = (v, push) => {
    sw.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v));
    document.querySelectorAll('[data-version]').forEach(m => { m.hidden = m.dataset.version !== v; });
    if (push) history.replaceState(null, '', v === '2' ? location.pathname : `?v=${v}`);
  };
  sw.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.v, true); });
  const v = new URLSearchParams(location.search).get('v');
  if (v === '1') show('1');
});

// Podz V2 : l'onboarding de l'en-tête se parcourt pour de vrai. Les boutons avancent ou reculent d'une étape,
// un champ touché se remplit tout seul puis passe à la suite, une région se choisit, et « Get started » revient au début
document.querySelectorAll('[data-ob-flow]').forEach(flow => {
  const steps = [...flow.querySelectorAll('[data-ob-step]')];
  const fields = [...flow.querySelectorAll('[data-ob-type]')];
  fields.forEach(f => (f.dataset.ph = f.textContent));
  let at = 0, busy = false;
  const go = n => {
    // Les étapes qui ne bougent pas changent de côté sans animation (retour au début depuis la fin)
    steps.forEach((s, k) => { if (k !== at && k !== n) s.style.transition = 'none'; });
    if (n < at) steps[at].style.zIndex = 3;
    steps.forEach((s, k) => { s.classList.toggle('is-on', k === n); s.classList.toggle('is-past', k < n); s.inert = k !== n; });
    const from = at; at = n;
    requestAnimationFrame(() => requestAnimationFrame(() => steps.forEach(s => (s.style.transition = ''))));
    setTimeout(() => (steps[from].style.zIndex = ''), 560);
  };
  flow.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || busy) return;
    if (b.dataset.obGo === 'next') go(Math.min(at + 1, steps.length - 1));
    else if (b.dataset.obGo === 'back') go(Math.max(at - 1, 0));
    else if (b.dataset.obGo === 'start') { go(0); setTimeout(() => fields.forEach(f => { f.textContent = f.dataset.ph; f.classList.remove('is-filled'); }), 600); }
    else if ('obTile' in b.dataset) b.parentElement.querySelectorAll('[data-ob-tile]').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
    else if ('obType' in b.dataset) {
      busy = true;
      const txt = b.dataset.obType;
      let k = 0;
      b.classList.add('is-filled');
      const tick = () => {
        b.textContent = txt.slice(0, ++k);
        if (k < txt.length) setTimeout(tick, 55);
        else setTimeout(() => { busy = false; go(at + 1); }, 450);
      };
      tick();
    }
  });
  go(0);
});

// Podz V2 : le logo se redessine en boucle tant qu'il est à l'écran. Le noir s'efface,
// puis les points reviennent un à un (rien ne bouge avec Réduire les animations)
document.querySelectorAll('[data-logo]').forEach(box => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let timer = null;
  const play = () => {
    // retour à zéro sans transition, puis on rejoue
    box.classList.add('is-reset');
    box.classList.remove('is-in', 'is-out');
    void box.offsetWidth;
    box.classList.remove('is-reset');
    void box.offsetWidth;
    box.classList.add('is-in');
  };
  const cycle = () => { box.classList.add('is-out'); setTimeout(play, 600); };
  new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (e.isIntersecting) timer = setInterval(cycle, 6200);
  }).observe(box);
});

// XChange V2 : le bouton de connexion, un état à la fois. On choisit l'état dans la liste,
// ou on tape le bouton pour passer au suivant ; rien ne bouge tout seul
document.querySelectorAll('[data-xds-btn]').forEach(box => {
  const btn = box.querySelector('.xds-btn__btn'), tx = box.querySelector('.xds-btn__tx');
  const opts = [...box.querySelectorAll('[data-state]')];
  const set = o => {
    opts.forEach(x => x.toggleAttribute('aria-current', x === o));
    if (o) o.setAttribute('aria-current', 'true');
    btn.dataset.s = o.dataset.state; tx.textContent = o.textContent;
  };
  opts.forEach(o => o.addEventListener('click', () => set(o)));
  btn.addEventListener('click', () => set(opts[(opts.findIndex(o => o.dataset.state === btn.dataset.s) + 1) % opts.length]));
});

// Podz V2 : les écrans d'onboarding en sombre ou en clair
document.querySelectorAll('[data-ob-mode]').forEach(sw => {
  const rail = sw.closest('section').querySelector('[data-ob-rail]');
  sw.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    sw.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', x === b));
    rail.classList.toggle('is-dark', b.dataset.mode === 'dark');
  });
});

// Du cadre au système (Podz V2) : Claude lit le cadre Paper par le MCP, un élément à la fois ;
// chaque lecture écrit ses jetons dans design.md, puis le code, puis le même cadre en sombre.
// La boucle ne tourne que visible ; avec « réduire les animations », la liste complète s'affiche sans bouger.
document.querySelectorAll('[data-ds]').forEach(ds => {
  const boxes = [...ds.querySelectorAll('.ds-box')], rows = [...ds.querySelectorAll('[data-at]')];
  const now = ds.querySelector('.ds-now');
  const [what, call, res] = ['[data-ds-what]', '[data-ds-call]', '[data-ds-res]'].map(q => ds.querySelector(q));
  // Ce qui est lu (ou écrit), l'appel réel au MCP de Paper, et ce qu'il renvoie
  const STEPS = [['Reading the frame', 'get_basic_info()', 'DetailView, 393 × 852'],
    ['The ground', 'get_computed_styles(frame)', '#FFFFFF'],
    ['The title', 'get_computed_styles(title)', 'Inter semiBold 20, #000000'],
    ['The subtitle', 'get_computed_styles(subtitle)', 'Inter regular 16, #989898'],
    ['The buttons', 'get_computed_styles(buttons)', '83 tall, 13 apart, #F1F1F1'],
    ['Writing the view', 'BookingControlStack.swift', '.background(.homePill)'],
    ['Same frame, dark', 'get_computed_styles(dark frame)', 'Same tokens, dark values']];
  const show = step => {
    boxes.forEach(b => b.classList.toggle('is-on', +b.dataset.on === step));
    rows.forEach(r => r.classList.toggle('is-on', step > 0 && +r.dataset.at <= step));
    ds.classList.toggle('is-dark', step === 6);
    [what.textContent, call.textContent, res.textContent] = STEPS[step];
    now.classList.remove('is-new'); void now.offsetWidth; now.classList.add('is-new');
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(5); boxes.forEach(b => b.classList.remove('is-on')); return; }
  const TIMES = [1800, 1700, 1700, 1700, 2000, 2200, 2800];
  let step = 0, timer = 0;
  const tick = () => { show(step); timer = setTimeout(() => { step = (step + 1) % 7; tick(); }, TIMES[step]); };
  show(0);
  new IntersectionObserver(([e]) => {
    clearTimeout(timer);
    if (e.isIntersecting) { step = 0; tick(); }
  }, { threshold: .4 }).observe(ds);
});

// Garage : au survol d'une ligne, son image apparaît à droite de la liste, à la hauteur de la ligne.
// Pour un projet, la couverture s'affiche tout de suite, puis son animation (GIF, WebP ou vidéo) la remplace une fois chargée.
// Seulement à la souris, sur écran large ; s'il n'y a pas assez de place à droite, l'aperçu ne s'affiche pas.
(() => {
  const list = document.querySelector('.garage');
  const rows = [...document.querySelectorAll('.garage__entry[data-peek]')];
  if (!list || !rows.length || !matchMedia('(hover: hover)').matches) return;
  const peek = document.createElement('div');
  peek.className = 'garage__peek';
  peek.setAttribute('aria-hidden', 'true');
  const still = document.createElement('img');
  still.alt = '';
  peek.append(still);
  list.append(peek);
  let motion = null, current = null;
  // Aperçu le plus large possible (jusqu'à 520 px) dans l'espace libre à droite de la liste, centré :
  // la même marge (au moins 40 px) entre la liste et l'image qu'entre l'image et le bord de l'écran
  const room = () => {
    const free = innerWidth - list.getBoundingClientRect().right;
    const w = Math.min(520, free - 80);
    return { w, x: (free - w) / 2 };
  };
  const show = row => {
    const { w, x } = room();
    if (w < 220) return;
    peek.style.setProperty('--peek-w', `${w}px`);
    peek.style.setProperty('--peek-x', `${x}px`);
    // À hauteur de la ligne, mais toujours dans la fenêtre : près du bas de l'écran, l'aperçu remonte (24 px de marge)
    const r = row.getBoundingClientRect(), h = w * 3 / 4;
    const lift = Math.min(Math.max(0, r.top + h - (innerHeight - 24)), Math.max(0, r.top - 24));
    peek.style.top = `${row.offsetTop - lift}px`;
    if (current !== row) {
      current = row;
      still.src = row.dataset.peek;
      motion?.remove(); motion = null;
      const src = row.dataset.peekMotion;
      if (src) {
        const m = motion = document.createElement(/\.(mp4|webm)$/.test(src) ? 'video' : 'img');
        m.className = 'is-motion';
        if (m.tagName === 'VIDEO') Object.assign(m, { muted: true, loop: true, playsInline: true, autoplay: true });
        else m.alt = '';
        m.addEventListener(m.tagName === 'VIDEO' ? 'loadeddata' : 'load', () => m.classList.add('is-ready'), { once: true });
        m.src = src;
        peek.append(m);
      }
    }
    peek.classList.add('is-on');
  };
  // Fenêtre redimensionnée : l'aperçu caché ne doit jamais dépasser à droite (pas de défilement horizontal)
  addEventListener('resize', () => { if (!peek.classList.contains('is-on')) peek.style.setProperty('--peek-w', '0px'); });
  rows.forEach(row => {
    row.addEventListener('pointerenter', e => e.pointerType === 'mouse' && show(row));
    row.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
  });
  // Les couvertures sont chargées d'avance, après la page ; les GIF (lourds) seulement au survol
  addEventListener('load', () => rows.forEach(r => { new Image().src = r.dataset.peek; }));
})();

/* Garage : « View more » affiche le reste du Backlog, puis disparaît ; le focus passe à la première ligne révélée */
(() => {
  const btn = document.querySelector('[data-garage-more]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const rest = [...document.querySelectorAll('.garage__entry[hidden]')];
    rest.forEach(r => r.hidden = false);
    btn.remove();
    const first = rest[0] && rest[0].querySelector('a');
    if (first) first.focus({ preventScroll: true });
  });
})();
