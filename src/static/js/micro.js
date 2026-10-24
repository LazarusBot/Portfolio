// Micro-interactions recodées d'après le fichier Figma « Micro-Interactions »
// Tout est dans un bloc pour ne pas entrer en conflit avec les variables de site.js
{
  const M = f => `assets/micro/${f}`;

  // ---------- Nested Pop-ups : la carte grandit et accueille jusqu'à 3 notifications ----------
  const NEST = {
    parent: { face: M('nested-clemritz.png'), badge: M('badge-figma-parent.png'), who: '@clemritz made a proposal on Aer Running.',
              first: 'See more interactions below.', then: 'Click to open Figma files.' },
    children: [
      { face: M('nested-migwel.png'), badge: M('badge-figma.png'), who: '@migwel_d add a comment (Layer 403).', sub: 'Goated style.' },
      { face: M('nested-migwel.png'), badge: M('badge-figma.png'), who: '@migwel_d add a comment (Layer 404).', sub: 'Please change the radius to 8.' },
      { face: M('nested-migwel-2.png'), badge: M('badge-star-blue.svg'), who: '@migwel_d close a thread (Layer 405).', sub: 'Approved.' },
    ],
  };
  const nest = document.getElementById('nest');
  if (nest) {
    const row = (n, sub) => `<span class="nest__row"><span class="face"><img src="${n.face}" alt=""><img src="${n.badge}" alt=""></span>
      <span><b class="mc-title">${n.who}</b><small class="mc-sub">${sub}</small></span></span>`;
    nest.innerHTML = row(NEST.parent, NEST.parent.first);
    let shown = 0;
    const resize = () => {
      // Hauteur animée : on part de la hauteur actuelle vers la hauteur du contenu
      const from = nest.offsetHeight;
      nest.style.height = 'auto';
      const to = nest.offsetHeight;
      nest.style.height = `${from}px`;
      requestAnimationFrame(() => { nest.style.height = `${to}px`; });
    };
    const next = () => {
      const sub = nest.querySelector('.nest__row .mc-sub');
      if (shown === NEST.children.length) {
        shown = 0;
        nest.querySelectorAll('.nest__child').forEach(c => c.remove());
        sub.textContent = NEST.parent.first;
      } else {
        const c = NEST.children[shown++];
        const el = document.createElement('div');
        el.className = 'mc nest__child';
        el.innerHTML = row(c, c.sub);
        nest.append(el);
        sub.textContent = NEST.parent.then;
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
      }
      resize();
    };
    nest.addEventListener('click', next);
    nest.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), next()));
    nest.style.height = `${nest.offsetHeight}px`;
  }

  // ---------- Tabs Navigation : l'indicateur glisse, le panneau change, un joueur ouvre sa fiche ----------
  const BOARD = {
    goals: {
      sub: 'Best players in total goals scored',
      rows: [
        { face: 'Dtj7TVvOrwgQOPV20OXWo6qg6s8.png', flag: 'ZbfJOTf9aPkLL41iuDiA6NG9oE.png', name: 'Kylian Mbappe', score: 17, delta: 1 },
        { face: 'lyxZRcewrUlDAHHtqySW75SgZQ.png', flag: '4mDmrdhReWZvwJwCiPWU2sUw.png', name: 'Lionel Messi', score: 17 },
        { face: 'niAw1ipy4I2ZTNmQIKRxbGig.png', flag: 'Yp07HO3AeltXkESoZk351Wx0yQ.png', name: 'Haaland', score: 17, delta: 2 },
      ],
    },
    assists: {
      sub: 'Best players in total assists.',
      rows: [
        { face: 'IlFOZQYtFqfXUX52etyAqbcNNlQ.png', flag: 'ZbfJOTf9aPkLL41iuDiA6NG9oE.png', name: 'Michael Olise', score: 5, delta: 1, profile: true },
        { face: 'gZHwZJQVPrjyfwQ9cyrLncvaMUY.png', flag: 'n7gXYXeWnevJ2OBwvWrCVDzrW4w.png', name: 'Brahim Díaz', score: 4 },
        { face: 'sSMvtLmHAWRWXqte68X6j5L8sZ4.png', flag: 'BMZyZ5rQP73Nr6BQxSFAdBJeLTw.png', name: 'Bruno Guimarães', score: 4, delta: 2 },
      ],
    },
    passes: {
      sub: 'Best players in total passes.',
      rows: [
        { face: 'K1JBsnMyxUB99KTq2lsZc2PlNUU.png', flag: '4HI707AEInZWaLBGGEqXcshsdCE.jpg', name: 'Rodri', score: 694 },
        { face: 'pDy1iJdf1K7w6HI9qUhI0Q4QXc.png', flag: '4HI707AEInZWaLBGGEqXcshsdCE.jpg', name: 'Aymeric Laporte', score: 568 },
        { face: 'weYlMxqPVXkVS9Gs03wPMEVko.png', flag: '4HI707AEInZWaLBGGEqXcshsdCE.jpg', name: 'Pau Cubarsi', score: 564 },
      ],
    },
  };

  const board = document.getElementById('board');
  if (board) {
    const tabs = [...board.querySelectorAll('[role=tab]')];
    const indicator = board.querySelector('.board__indicator');
    const panel = board.querySelector('.board__panel');
    const list = board.querySelector('.board__view--list');
    const profile = board.querySelector('.board__view--profile');
    let timer;

    const fill = key => {
      const data = BOARD[key];
      panel.querySelector('[data-sub]').textContent = data.sub;
      panel.querySelector('[data-rows]').innerHTML = data.rows.map(r => `
        <li${r.profile ? ' data-player tabindex="0" title="See more player stats."' : ''}>
          <span class="face"><img src="${IMG(r.face)}" alt=""><img src="${IMG(r.flag)}" alt="" style="border-radius:50%"></span>
          <span class="board__who"><b class="mc-title">${r.name}</b><small class="mc-sub">See more player stats.</small></span>
          <span class="board__score">${r.score}${r.delta ? `<span class="board__delta">+${r.delta}</span>` : ''}</span>
        </li>`).join('');
    };
    const moveIndicator = tab => {
      const box = tab.getBoundingClientRect(), bar = tab.parentElement.getBoundingClientRect();
      const zoom = bar.width / tab.parentElement.offsetWidth || 1;
      indicator.style.transform = `translateX(${(box.left - bar.left) / zoom - 10 + (box.width / zoom - 90) / 2}px)`;
    };
    const select = tab => {
      tabs.forEach(t => t.setAttribute('aria-selected', t === tab));
      moveIndicator(tab);
      // L'indicateur part d'abord, le panneau change juste après
      clearTimeout(timer);
      panel.classList.add('swap');
      timer = setTimeout(() => { fill(tab.dataset.tab); panel.classList.remove('swap'); }, 160);
    };
    const showProfile = on => { list.hidden = on; profile.hidden = !on; board.classList.toggle('is-profile', on); };

    tabs.forEach(t => t.addEventListener('click', () => select(t)));
    panel.addEventListener('click', e => e.target.closest('[data-player]') && showProfile(true));
    panel.addEventListener('keydown', e => e.key === 'Enter' && e.target.closest('[data-player]') && showProfile(true));
    profile.querySelector('.profile-card__back').addEventListener('click', () => showProfile(false));
    fill('goals');
    requestAnimationFrame(() => moveIndicator(tabs[0]));
  }

  // ---------- Tabs Preview : aperçu façon Chrome sous l'onglet survolé ----------
  const PREVIEWS = {
    obsidian: { img: 'preview-obsidian.jpg', url: 'www.obsidian.com/home', title: 'Obsidian - Sharpen your own thinking', icon: 'favicon-obsidian.svg' },
    github: { img: 'preview-github.jpg', url: 'www.github.com/login', title: 'Github - Futur will be together', icon: 'favicon-github.svg' },
    apple: { img: 'preview-apple.jpg', url: 'www.apple.com/products', title: 'Apple - Explore our new products', icon: 'favicon-apple.svg' },
  };
  const browser = document.getElementById('browser');
  if (browser) {
    const bar = browser.querySelector('.browser__bar');
    const card = document.createElement('div');
    card.className = 'mc preview';
    browser.append(card);
    let current;

    const show = tab => {
      browser.querySelectorAll('.btab').forEach(t => t.classList.toggle('hover', t === tab));
      if (!tab) { card.classList.remove('show'); current = null; return; }
      const key = tab.dataset.preview, p = PREVIEWS[key];
      if (key !== current) {
        card.innerHTML = `<img src="${M(p.img)}" alt="">
          <span class="preview__line"></span>
          <span class="preview__meta"><span><b class="mc-title">${p.url}</b><small class="mc-sub">${p.title}</small></span><img src="${M(p.icon)}" alt=""></span>`;
        current = key;
      }
      // Centré sous l'onglet, sans dépasser de la barre
      const left = Math.min(Math.max(tab.offsetLeft + tab.offsetWidth / 2 - 208, 0), bar.offsetWidth - 416);
      card.style.left = `${left}px`;
      card.classList.add('show');
    };
    browser.querySelectorAll('.btab[data-preview]').forEach(tab => {
      tab.addEventListener('mouseenter', () => show(tab));
      tab.addEventListener('click', () => show(tab));
    });
    browser.addEventListener('mouseleave', () => show(null));
    // Précharge les aperçus pour un affichage immédiat au survol
    Object.values(PREVIEWS).forEach(p => (new Image().src = M(p.img)));
  }

  // ---------- Classic Pop-ups : la pile se déplie en liste ----------
  const deck = document.getElementById('deck');
  deck?.addEventListener('click', () => {
    const open = deck.getAttribute('aria-expanded') !== 'true';
    deck.setAttribute('aria-expanded', open);
    deck.setAttribute('aria-label', open ? 'Collapse the notifications' : 'Expand the notifications');
  });

  // ---------- Open / Close Button : badge ↔ carte complète ----------
  const toggle = document.getElementById('toggle');
  if (toggle) {
    const set = open => toggle.setAttribute('aria-expanded', open);
    toggle.addEventListener('click', () => toggle.getAttribute('aria-expanded') !== 'true' && set(true));
    toggle.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), set(true)));
    toggle.querySelector('.toggle__close').addEventListener('click', e => { e.stopPropagation(); set(false); });
  }

  // ---------- Badges Tooltip : le survol du badge ouvre les choix, un choix fait rebondir le badge ----------
  const badges = document.getElementById('badges');
  if (badges) {
    const badge = badges.querySelector('.badges__badge');
    const choices = [...badges.querySelectorAll('[data-badge]')];
    let closeTimer;
    const setOpen = open => { clearTimeout(closeTimer); badges.classList.toggle('open', open); badge.setAttribute('aria-expanded', open); };
    const pick = (btn, animate) => {
      choices.forEach(c => c.setAttribute('aria-checked', c === btn));
      const path = btn.querySelector('path'), target = badge.querySelector('path');
      target.setAttribute('d', path.getAttribute('d'));
      target.setAttribute('fill', path.getAttribute('fill'));
      if (animate) { badge.classList.remove('pop-in'); void badge.offsetWidth; badge.classList.add('pop-in'); }
    };
    badge.addEventListener('mouseenter', () => setOpen(true));
    badges.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => setOpen(false), 250); });
    badges.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    badge.addEventListener('click', e => { e.stopPropagation(); setOpen(!badges.classList.contains('open')); });
    choices.forEach(c => c.addEventListener('click', e => { e.stopPropagation(); setOpen(false); pick(c, true); }));
    document.addEventListener('click', e => !badges.contains(e.target) && setOpen(false));
    pick(choices[0], false);
  }
}
