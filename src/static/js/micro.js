// Micro-interactions recodées depuis les composants Framer (page microinteractions)
// Tout est dans un bloc pour ne pas entrer en conflit avec les variables de site.js
{

// ---------- Tabs Navigation : l'indicateur glisse d'abord, puis le panneau change ----------
const BOARD = {
  goals: {
    sub: 'Best players in total goals scored',
    rows: [
      { face: 'Dtj7TVvOrwgQOPV20OXWo6qg6s8.png', flag: 'ZbfJOTf9aPkLL41iuDiA6NG9oE.png', name: 'Kylian Mbappe', from: 17, to: 18 },
      { face: 'lyxZRcewrUlDAHHtqySW75SgZQ.png', flag: '4mDmrdhReWZvwJwCiPWU2sUw.png', name: 'Lionel Messi', from: 17, to: 17 },
      { face: 'niAw1ipy4I2ZTNmQIKRxbGig.png', flag: 'Yp07HO3AeltXkESoZk351Wx0yQ.png', name: 'Haaland', from: 17, to: 19 },
    ],
  },
  assists: {
    sub: 'Best players in total assists.',
    rows: [
      { face: 'IlFOZQYtFqfXUX52etyAqbcNNlQ.png', flag: 'ZbfJOTf9aPkLL41iuDiA6NG9oE.png', name: 'Michael Olise', from: 4, to: 5 },
      { face: 'gZHwZJQVPrjyfwQ9cyrLncvaMUY.png', flag: 'n7gXYXeWnevJ2OBwvWrCVDzrW4w.png', name: 'Brahim Díaz', from: 4, to: 4 },
      { face: 'sSMvtLmHAWRWXqte68X6j5L8sZ4.png', flag: 'BMZyZ5rQP73Nr6BQxSFAdBJeLTw.png', name: 'Bruno Guimarães', from: 4, to: 4 },
    ],
  },
  passes: {
    sub: 'Best players in total passes.',
    rows: [
      { face: 'K1JBsnMyxUB99KTq2lsZc2PlNUU.png', flag: '4HI707AEInZWaLBGGEqXcshsdCE.jpg', name: 'Rodri', from: 694, to: 694 },
      { face: 'pDy1iJdf1K7w6HI9qUhI0Q4QXc.png', flag: '4HI707AEInZWaLBGGEqXcshsdCE.jpg', name: 'Aymeric Laporte', from: 568, to: 568 },
      { face: 'weYlMxqPVXkVS9Gs03wPMEVko.png', flag: '4HI707AEInZWaLBGGEqXcshsdCE.jpg', name: 'Pau Cubarsi', from: 564, to: 564 },
    ],
  },
};

const board = document.getElementById('board');
if (board) {
  const tabs = [...board.querySelectorAll('[role=tab]')];
  const indicator = board.querySelector('.board__indicator');
  const panel = board.querySelector('.board__panel');
  let timer;

  const fill = key => {
    const data = BOARD[key];
    panel.querySelector('[data-sub]').textContent = data.sub;
    panel.querySelector('[data-rows]').innerHTML = data.rows.map(r => `
      <li>
        <span class="board__face"><img src="${IMG(r.face)}" alt=""><img src="${IMG(r.flag)}" alt=""></span>
        <span class="board__who"><b class="mc-title">${r.name}</b><small class="mc-sub">See more player stats.</small></span>
        <span class="board__score">
          <span class="board__num"><span>${r.from}</span><span>${r.to}</span></span>
          ${r.to > r.from ? `<span class="board__delta">+${r.to - r.from}</span>` : ''}
        </span>
      </li>`).join('');
    // Les scores qui progressent défilent jusqu'à leur nouvelle valeur
    requestAnimationFrame(() => requestAnimationFrame(() => panel.querySelectorAll('.board__num').forEach(n => {
      if (n.children[0].textContent !== n.children[1].textContent) [...n.children].forEach(s => (s.style.transform = 'translateY(-100%)'));
    })));
  };

  const select = tab => {
    tabs.forEach(t => t.setAttribute('aria-selected', t === tab));
    const box = tab.getBoundingClientRect(), bar = tab.parentElement.getBoundingClientRect();
    indicator.style.transform = `translateX(${box.left - bar.left - 10 + (box.width - 90) / 2}px)`;
    clearTimeout(timer);
    panel.classList.add('swap');
    timer = setTimeout(() => { fill(tab.dataset.tab); panel.classList.remove('swap'); }, 180);
  };

  tabs.forEach(t => t.addEventListener('click', () => select(t)));
  fill('goals');
  // Position de départ de l'indicateur une fois la mise en page calculée
  requestAnimationFrame(() => {
    const t = tabs[0], box = t.getBoundingClientRect(), bar = t.parentElement.getBoundingClientRect();
    indicator.style.transform = `translateX(${box.left - bar.left - 10 + (box.width - 90) / 2}px)`;
  });
}

// ---------- Tabs Preview : aperçu façon Chrome sous l'onglet survolé ----------
const browser = document.getElementById('browser');
if (browser) {
  const bar = browser.querySelector('.browser__bar');
  const show = tab => {
    browser.querySelectorAll('.preview').forEach(p => {
      const on = tab && p.dataset.for === tab.dataset.preview;
      p.classList.toggle('show', on);
      if (!on) return;
      // Centré sous l'onglet, sans dépasser de la barre
      const t = tab.getBoundingClientRect(), b = bar.getBoundingClientRect();
      const left = Math.min(Math.max(t.left - b.left + t.width / 2 - p.offsetWidth / 2, 0), b.width - p.offsetWidth);
      p.style.left = `${left}px`;
    });
  };
  browser.querySelectorAll('.btab[data-preview]').forEach(tab => {
    tab.addEventListener('mouseenter', () => show(tab));
    tab.addEventListener('click', () => show(tab));
  });
  bar.addEventListener('mouseleave', () => show(null));
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

// ---------- Badges Tooltip : choisir l'icône du badge ----------
const badges = document.getElementById('badges');
if (badges) {
  const badge = badges.querySelector('.badges__badge');
  const choices = [...badges.querySelectorAll('[data-badge]')];
  const setOpen = open => { badges.classList.toggle('open', open); badge.setAttribute('aria-expanded', open); };
  const pick = btn => {
    choices.forEach(c => c.setAttribute('aria-checked', c === btn));
    const path = btn.querySelector('path');
    const target = badge.querySelector('path');
    target.setAttribute('d', path.getAttribute('d'));
    target.setAttribute('fill', path.getAttribute('fill'));
  };
  badge.addEventListener('click', e => { e.stopPropagation(); setOpen(!badges.classList.contains('open')); });
  choices.forEach(c => c.addEventListener('click', e => { e.stopPropagation(); pick(c); setOpen(false); }));
  document.addEventListener('click', e => !badges.contains(e.target) && setOpen(false));
  pick(choices[0]);
}
}
