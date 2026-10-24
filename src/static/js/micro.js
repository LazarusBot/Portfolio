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
      fill(tab.dataset.tab);
    };
    const showProfile = on => { list.hidden = on; profile.hidden = !on; board.classList.toggle('is-profile', on); };

    tabs.forEach(t => t.addEventListener('click', () => select(t)));
    panel.addEventListener('click', e => e.target.closest('[data-player]') && showProfile(true));
    panel.addEventListener('keydown', e => e.key === 'Enter' && e.target.closest('[data-player]') && showProfile(true));
    profile.querySelector('.profile-card__back').addEventListener('click', () => showProfile(false));
    fill('goals');
    requestAnimationFrame(() => moveIndicator(tabs[0]));
  }

  // ---------- Tabs Preview (« TabsGroup » Framer) : l'onglet survolé s'élargit et montre son aperçu ----------
  const PREVIEWS = {
    github: `<div class="mc preview preview--card"><img src="${IMG('1Z4hV4m6WcIfUKFIhxfOtAsJkA.png')}" alt="">
      <span class="preview__line"></span>
      <span class="preview__meta"><span><b class="mc-title">www.github.com/login</b><small class="mc-sub">Github - Futur will be together</small></span>
      <svg viewBox="0 0 26 25" width="21" height="20"><path d="${document.querySelector('[data-preview=github] .btab__icon path')?.getAttribute('d') || ''}"/></svg></span></div>`,
    // Sur Framer, l'aperçu Apple est une seule image qui contient déjà la carte
    apple: `<div class="preview preview--image"><img src="${IMG('qqWo1L1nX933enb3HiG6nFgeo.png')}" alt=""></div>`,
  };
  const browser = document.getElementById('browser');
  if (browser) {
    const bar = browser.querySelector('.browser__bar');
    const cards = {};
    Object.entries(PREVIEWS).forEach(([key, html]) => {
      browser.insertAdjacentHTML('beforeend', html);
      cards[key] = browser.lastElementChild;
    });
    const show = tab => {
      browser.classList.toggle('is-hover', !!tab);
      browser.querySelectorAll('.btab').forEach(t => t.classList.toggle('hover', t === tab));
      Object.entries(cards).forEach(([key, card]) => {
        const on = !!tab && tab.dataset.preview === key;
        card.classList.toggle('show', on);
        if (on) {
          // Centré sous l'onglet (largeur finale après l'élargissement), sans dépasser de la barre
          const left = key === 'github' ? 242 + 243 / 2 - 208 : 698 - 416 + 24;
          card.style.left = `${left}px`;
        }
      });
    };
    browser.querySelectorAll('.btab[data-preview]').forEach(tab => {
      tab.addEventListener('mouseenter', () => show(tab));
      tab.addEventListener('click', () => show(tab));
    });
    browser.querySelector('.btab--active').addEventListener('mouseenter', () => show(null));
    bar.addEventListener('mouseleave', () => show(null));
    Object.values(cards).forEach(c => c.querySelector('img').decode?.().catch(() => {}));
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

  // ---------- Badges Tooltip (« Tooltip » Framer) ----------
  // Survol du badge : il grossit. Clic : la pastille s'ouvre. Dans la pastille, l'anneau suit l'icône survolée ;
  // un clic choisit l'icône sous l'anneau, qui devient le badge, et referme la pastille.
  const badges = document.getElementById('badges');
  if (badges) {
    const badge = badges.querySelector('.badges__badge');
    const ring = badges.querySelector('.badges__ring');
    const choices = [...badges.querySelectorAll('[data-badge]')];
    let current = 0, focus = 0;
    const moveRing = i => { focus = i; ring.style.transform = `translateY(${i * 43}px)`; };
    const setOpen = open => {
      badges.classList.toggle('open', open);
      badge.setAttribute('aria-expanded', open);
      if (open) moveRing(current);
    };
    const pick = (i, animate) => {
      current = i;
      choices.forEach((c, j) => c.setAttribute('aria-checked', j === i));
      const path = choices[i].querySelector('path'), target = badge.querySelector('path');
      target.setAttribute('d', path.getAttribute('d'));
      target.setAttribute('fill', path.getAttribute('fill'));
      if (animate) { badge.classList.remove('pop-in'); void badge.offsetWidth; badge.classList.add('pop-in'); }
    };
    badge.addEventListener('click', e => { e.stopPropagation(); setOpen(!badges.classList.contains('open')); });
    choices.forEach((c, i) => {
      c.addEventListener('mouseenter', () => moveRing(i));
      c.addEventListener('focus', () => moveRing(i));
    });
    badges.querySelector('.badges__tip').addEventListener('click', e => { e.stopPropagation(); pick(focus, true); setOpen(false); });
    document.addEventListener('click', e => !badges.contains(e.target) && setOpen(false));
    pick(0, false);
  }

  // ---------- Payment (« Payment » Framer) : appui → le vert balaie le bouton → « Payment is done ✓ » → retour ----------
  const pay = document.getElementById('pay');
  if (pay) {
    let busy = false;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    pay.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      pay.classList.add('processing');
      await wait(500);
      pay.classList.add('done');
      await wait(450);
      pay.classList.add('checked');
      await wait(1300);
      pay.classList.remove('processing', 'done', 'checked');
      await wait(400);
      busy = false;
    });
  }

}
