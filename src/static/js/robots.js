// Schémas techniques des robots (About), dessinés à partir des dimensions publiées par les fabricants.
// Tous à la même échelle (sol en bas, 1 m = S px) pour pouvoir les comparer. Les points noirs sont les articulations.
// Chaque schéma est une liste de pièces en mètres : x depuis l'axe du robot, y depuis le sol.
{
  const W = 520, H = 520, GROUND = 470, S = 230, CX = 250;
  const X = m => CX + m * S, Y = m => GROUND - m * S;
  const f = n => n.toFixed(1);

  // Pièces de base. pathLength="1" permet d'animer le tracé de chaque trait (voir CSS)
  const box = (x, y, w, h, r = .02) => `<rect class="t" pathLength="1" x="${f(X(x - w / 2))}" y="${f(Y(y + h))}" width="${f(w * S)}" height="${f(h * S)}" rx="${f(r * S)}"/>`;
  const oval = (x, y, w, h) => `<ellipse class="t" pathLength="1" cx="${f(X(x))}" cy="${f(Y(y))}" rx="${f(w * S / 2)}" ry="${f(h * S / 2)}"/>`;
  // Membre : un trait noir épais (le contour, qui se dessine) puis le même trait blanc un peu plus fin par-dessus
  const limb = (pts, w = .045) => {
    const p = pts.map(([x, y]) => `${f(X(x))},${f(Y(y))}`).join(' ');
    return `<polyline class="t limb-o" pathLength="1" style="stroke-width:${f(w * S + 2.6)}" points="${p}"/>`
      + `<polyline class="limb-i" style="stroke-width:${f(w * S)}" points="${p}"/>`;
  };
  const joint = (x, y) => `<circle class="j" cx="${f(X(x))}" cy="${f(Y(y))}" r="3.2"/>`;
  const joints = pts => pts.map(([x, y]) => joint(x, y)).join('');
  const mirror = pts => pts.flatMap(([x, y]) => [[x, y], [-x, y]]);
  const both = (pts, w) => limb(pts, w) + limb(pts.map(([x, y]) => [-x, y]), w);
  // Note reliée à un point du dessin
  const note = (x, y, tx, ty, text) => `<polyline class="n" points="${f(X(x))},${f(Y(y))} ${f(X(tx))},${f(Y(ty))} ${f(X(tx) + (tx > x ? 10 : -10))},${f(Y(ty))}"/>`
    + `<text class="nt" x="${f(X(tx) + (tx > x ? 14 : -14))}" y="${f(Y(ty) + 3.5)}" text-anchor="${tx > x ? 'start' : 'end'}">${text}</text>`;
  // Cote verticale (hauteur) à gauche et cote horizontale sous les pieds
  const vDim = (h, label) => {
    const x = 34;
    return `<g class="d"><line x1="${x}" y1="${f(Y(0))}" x2="${x}" y2="${f(Y(h))}"/><line x1="${x - 5}" y1="${f(Y(0))}" x2="${x + 5}" y2="${f(Y(0))}"/><line x1="${x - 5}" y1="${f(Y(h))}" x2="${x + 5}" y2="${f(Y(h))}"/>`
      + `<line class="dash" x1="${x + 5}" y1="${f(Y(h))}" x2="${f(X(0))}" y2="${f(Y(h))}"/></g>`
      + `<text class="dt" transform="translate(${x - 9} ${f(Y(h / 2))}) rotate(-90)" text-anchor="middle">${label}</text>`;
  };
  const hDim = (w, label) => {
    const y = GROUND + 26;
    return `<g class="d"><line x1="${f(X(-w / 2))}" y1="${y}" x2="${f(X(w / 2))}" y2="${y}"/><line x1="${f(X(-w / 2))}" y1="${y - 5}" x2="${f(X(-w / 2))}" y2="${y + 5}"/><line x1="${f(X(w / 2))}" y1="${y - 5}" x2="${f(X(w / 2))}" y2="${y + 5}"/></g>`
      + `<text class="dt" x="${f(X(0))}" y="${y + 16}" text-anchor="middle">${label}</text>`;
  };
  const ground = `<line class="g" x1="60" y1="${GROUND}" x2="${W - 20}" y2="${GROUND}"/>`;

  const DRAW = {
    // Sprout : petit, grosse tête ronde, antennes « sourcils », corps capitonné, pinces à 3 doigts
    sprout: () => {
      const legs = [[.09, .42], [.1, .22], [.1, .05]], arm = [[.21, .69], [.26, .48], [.27, .27]];
      return box(0, .76, .44, .31, .12) + box(-.09, .9, .1, .06, .03) + box(.09, .9, .1, .06, .03)
        + `<path class="t" pathLength="1" d="M${f(X(-.1))},${f(Y(1.07))} q${f(-.04 * S)},${f(-.08 * S)} ${f(-.1 * S)},${f(-.06 * S)} M${f(X(.1))},${f(Y(1.07))} q${f(.04 * S)},${f(-.08 * S)} ${f(.1 * S)},${f(-.06 * S)}"/>`
        + box(0, .42, .38, .3, .09) + both(arm, .06) + both(legs, .07)
        + box(-.11, 0, .13, .05, .02) + box(.11, 0, .13, .05, .02) + box(-.28, .2, .05, .07, .02) + box(.28, .2, .05, .07, .02)
        + joints([[0, .74], ...mirror([...arm, ...legs]), [-.1, 1.07], [.1, 1.07], [0, .57]])
        + note(.1, 1.07, .5, 1.13, 'Antenna eyebrows') + note(.17, .5, .55, .6, 'Padded shell') + note(-.28, .23, -.5, .16, 'Gripper');
    },
    // Digit, vu de profil : jambes d'oiseau (genou vers l'arrière), torse fait pour porter un bac
    digit: () => {
      const leg = [[0, 1.02], [.12, .62], [-.07, .26], [.02, .06]];
      return box(0, 1.6, .24, .13, .03) + `<rect class="t" pathLength="1" x="${f(X(.04))}" y="${f(Y(1.69))}" width="${f(.08 * S)}" height="${f(.03 * S)}" rx="2"/>`
        + limb([[0, 1.49], [0, 1.6]], .04) + box(-.02, 1.05, .34, .45, .06) + limb(leg, .07) + limb(leg.map(([x, y]) => [x - .05, y]), .07)
        + box(.02, 0, .26, .05, .02) + limb([[.02, 1.42], [.2, 1.24], [.36, 1.16]], .055)
        + box(.44, 1.0, .3, .2, .02) + `<line class="t" pathLength="1" x1="${f(X(.29))}" y1="${f(Y(1.12))}" x2="${f(X(.59))}" y2="${f(Y(1.12))}"/>`
        + joints([[0, 1.55], [.02, 1.42], [.2, 1.24], [.36, 1.16], ...leg])
        + note(.12, .62, .45, .72, 'Knee bends backwards') + note(.5, 1.0, .62, .86, 'Tote') + note(.08, 1.7, .4, 1.8, 'LED face');
    },
    // G1 : compact, tête-visière (caméra de profondeur + lidar), membres fins, mains Dex3
    g1: () => {
      const leg = [[.1, .66], [.11, .36], [.1, .07]], arm = [[.2, 1.05], [.25, .83], [.26, .63]];
      return box(0, 1.1, .2, .22, .09) + `<path class="t" pathLength="1" d="M${f(X(-.08))},${f(Y(1.24))} h${f(.16 * S)}"/>`
        + box(0, .72, .32, .34, .07) + box(0, .64, .24, .08, .03) + both(arm, .05) + both(leg, .06)
        + box(-.11, 0, .13, .05, .02) + box(.11, 0, .13, .05, .02)
        + joints([[0, 1.08], [0, .7], ...mirror([...arm, ...leg]), [.1, .6], [-.1, .6], [.12, .2], [-.12, .2]])
        + note(.06, 1.22, .45, 1.32, 'Visor: depth camera + lidar') + note(.26, .63, .52, .52, 'Dex3 hand') + note(-.11, .36, -.45, .4, 'Thigh + calf 0.6 m');
    },
    // NEO : silhouette humaine fine, tête ovale sans visage, muscles à tendons sous une combinaison tricotée
    neo: () => {
      const leg = [[.1, .95], [.11, .5], [.1, .07]], arm = [[.21, 1.38], [.26, 1.1], [.27, .84]];
      const tendon = (x1, y1, x2, y2) => `<line class="tn" x1="${f(X(x1))}" y1="${f(Y(y1))}" x2="${f(X(x2))}" y2="${f(Y(y2))}"/>`;
      return oval(0, 1.55, .21, .27) + joint(-.04, 1.56) + joint(.04, 1.56)
        + box(0, .95, .38, .48, .12) + both(arm, .055) + both(leg, .07)
        + box(-.11, 0, .14, .05, .02) + box(.11, 0, .14, .05, .02)
        + tendon(.11, .92, .11, .55) + tendon(.08, .92, .095, .55) + tendon(-.11, .92, -.11, .55) + tendon(-.08, .92, -.095, .55)
        + joints([[0, 1.42], [0, 1.15], ...mirror([...arm, ...leg]), ...mirror([[.25, .8], [.29, .79], [.27, .76]])])
        + note(.1, .75, .5, .8, 'Tendon drive') + note(.27, .8, .52, 1.0, '22 DoF per hand') + note(-.15, 1.2, -.48, 1.3, 'Knit suit');
    },
  };

  const SIZES = { sprout: [1.07, '1 070 mm', .6, '≈ 600 mm'], digit: [1.75, '1 750 mm', 0, ''], g1: [1.32, '1 320 mm', .45, '450 mm'], neo: [1.68, '1 680 mm', .6, '≈ 600 mm'] };

  window.robotDrawing = key => {
    const [h, hl, w, wl] = SIZES[key];
    return `<svg class="robot-draw" viewBox="0 0 ${W} ${H + 24}" role="img" aria-label="Technical drawing, ${hl} tall">`
      + `<defs><pattern id="robot-grid" width="23" height="23" patternUnits="userSpaceOnUse"><path d="M23 0H0V23" fill="none" class="grid"/></pattern></defs>`
      + `<rect width="100%" height="100%" fill="url(#robot-grid)"/>`
      + ground + vDim(h, hl) + (w ? hDim(w, wl) : '') + `<g class="robot-draw__body">${DRAW[key]()}</g></svg>`;
  };
}
