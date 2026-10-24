// Partagé par toutes les pages de test
// Images téléchargées dans le repo par tools/build.js
const IMG = id => `assets/img/${id}`;

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
    if (!hit) return;
    const i = stickers.indexOf(hit), out = hit.classList.toggle('is-out'), W = pouch.offsetWidth;
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
document.querySelectorAll('.pz-chars__card').forEach(b => {
  b.addEventListener('click', () => replay(b, 'is-jump'));
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
