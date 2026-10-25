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
    ['.bag__pouch, .pz-chars__card, .chess, .nav a, .contact, .profile__job', null],
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

// Meilleurs classements Chess.com. Le premier (Rapid) défile depuis 0 au chargement ; chaque survol
// (ou toucher, sur mobile) passe au suivant : Rapid → Blitz → Puzzles. Les valeurs enregistrées au build
// sont remplacées par celles du moment dès que Chess.com répond.
document.querySelectorAll('[data-chess]').forEach(line => {
  const pill = line.querySelector('.chess__elo');
  let values = JSON.parse(line.dataset.chessValues), i = 0, shown = 0, busy = false;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countUp = (b, to) => {
    const t0 = performance.now(), dur = 900;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur);
      shown = Math.round(to * (1 - Math.pow(1 - k, 3)));
      b.textContent = shown;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const first = pill.querySelector('b');
  if (!calm) countUp(first, values[0][1]);
  // L'ancienne valeur monte et s'efface, la nouvelle arrive par en dessous
  const next = () => {
    if (busy || values.length < 2) return;
    busy = true;
    sound.play('select', { vol: .6, rate: 1.1 });
    i = (i + 1) % values.length;
    const [label, val] = values[i];
    const old = pill.querySelector('.chess__value');
    const neu = document.createElement('span');
    neu.className = 'chess__value is-in';
    neu.innerHTML = `<small>${label}</small> <b>${val}</b>`;
    pill.style.width = `${pill.offsetWidth}px`;
    pill.append(neu);
    old.classList.add('is-out');
    requestAnimationFrame(() => {
      pill.style.width = `${neu.scrollWidth + 18}px`;
      neu.classList.remove('is-in');
    });
    setTimeout(() => { old.remove(); pill.style.width = ''; busy = false; }, calm ? 0 : 320);
  };
  line.addEventListener('pointerenter', e => e.pointerType === 'mouse' && next());
  line.addEventListener('click', next);
  fetch(`https://api.chess.com/pub/player/${line.dataset.chess}/stats`)
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(({ chess_rapid: r, chess_blitz: b, tactics: t }) => {
      const fresh = [['Rapid', r?.best?.rating ?? r?.last?.rating], ['Blitz', b?.best?.rating ?? b?.last?.rating], ['Puzzles', t?.highest?.rating]].filter(([, v]) => v);
      if (!fresh.length) return;
      values = fresh;
      const cur = values.find(([l]) => l === pill.querySelector('small').textContent);
      if (cur) pill.querySelector('b').textContent = cur[1];
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
