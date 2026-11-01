// „ჩაიცვი ქართულად“'s paper dolls (2026-11-01): a boy for the chokha and a girl for the Georgian dress, drawn flat in mm (1 unit
// = 1 mm, so every piece prints at the doll's own size), and the clothes to cut out. A piece is its drawing plus the shapes its
// cut line goes round (`cut`): their thick white strokes over a slightly thicker grey one leave one thin grey line ~1 mm
// outside the drawing, wherever the shapes overlap. The hats sit on the head, the clothes on the body: each is drawn at its
// place on the doll and moved onto the sheet by the kit.

const K = {
  skin: '#f2ceb2', skinLine: '#b07a62', cheek: '#ec9c8e', eye: '#3a2a22', mouth: '#a24a3c',
  hairBoy: '#3b2a1f', hairGirl: '#4b2e20',
  shirt: '#fbf8f2', shirtLine: '#b9ab96', trousers: '#33303b', boot: '#221d1c', bootHi: '#4d4340',
  ak: '#6f2331', akDark: '#4f1822', gold: '#d3ae58', goldDark: '#a8843a',
  chokha: '#2a3e6b', chokhaDark: '#1d2d52', cuff: '#3c548d', holder: '#1a2849',
  tube: '#273759', silver: '#e4e7ec', silverLine: '#7f8690',
  belt: '#1f1c21', grip: '#2e2624', sheath: '#1c1a1e',
  fleece: '#f8f3e9', curl: '#cdbfa4', felt: '#efe3c9', feltDark: '#dcc9a2', cord: '#2b2522',
  camel: '#cba76c', camelDark: '#a9864f',
  slipper: '#8f2a35', kaba: '#a8323f', kabaDot: '#c9606c', kabaLine: '#6d1c27',
  velvet: '#1e1b28', sash: '#2d2443', katibi: '#26345e', katibiHi: '#33457c', fur: '#f6f1e8', furDot: '#cfc4b2',
  veil: '#f4f3ef', veilLine: '#aaa296', band: '#2c2031', pearl: '#fffcf4',
};
export const DOLL_COLORS = K;

const f = n => Math.round(n * 100) / 100;
export const ellD = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${rx} ${ry} 0 1 0 ${f(2 * rx)} 0a${rx} ${ry} 0 1 0 ${f(-2 * rx)} 0Z`;
export const rectD = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
const P = (d, fill, line = 'none', w = 0.45, extra = '') => `<path d="${d}" fill="${fill}" stroke="${line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
const L = (d, line, w = 0.45, extra = '') => `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;

/** the cut line round a piece: `cut` = [{ d, t? }] (t = a transform of that shape) */
export const halo = (cut, m = 1.1) => {
  const tr = c => (c.t ? ` transform="${c.t}"` : '');
  return `<g fill="none" stroke-linejoin="round" stroke-linecap="round">${cut.map(c => `<path d="${c.d}"${tr(c)} stroke="#8f877b" stroke-width="${f(2 * m + 0.5)}"/>`).join('')}${cut.map(c => `<path d="${c.d}"${tr(c)} stroke="#fff" stroke-width="${f(2 * m)}"/>`).join('')}</g><g fill="#fff">${cut.map(c => `<path d="${c.d}"${tr(c)}/>`).join('')}</g>`;
};

// ---------- the head ----------
const HEAD = { cx: 50, cy: 46, rx: 19.5, ry: 22 };
const headD = ellD(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry);
const earL = ellD(30.9, 49.5, 3, 4.6), earR = ellD(69.1, 49.5, 3, 4.6);
const neckD = 'M44.6 60L55.4 60L55.6 77L44.4 77Z';
const face = (girl) => `
${L('M40.6 41.4q3.2-1.7 6.4 0', girl ? K.hairGirl : K.hairBoy, 0.95)}${L('M53 41.4q3.2-1.7 6.4 0', girl ? K.hairGirl : K.hairBoy, 0.95)}
<ellipse cx="43.7" cy="47.3" rx="1.75" ry="2.15" fill="${K.eye}"/><ellipse cx="56.3" cy="47.3" rx="1.75" ry="2.15" fill="${K.eye}"/>
<circle cx="44.25" cy="46.6" r=".55" fill="#fff"/><circle cx="56.85" cy="46.6" r=".55" fill="#fff"/>
${girl ? `${L('M41.7 45.9l-1.3-.9', K.eye, 0.5)}${L('M58.3 45.9l1.3-.9', K.eye, 0.5)}` : ''}
<circle cx="38.6" cy="54.4" r="3.4" fill="${K.cheek}" opacity="${girl ? 0.5 : 0.36}"/><circle cx="61.4" cy="54.4" r="3.4" fill="${K.cheek}" opacity="${girl ? 0.5 : 0.36}"/>
${L('M48.9 52.6Q50 53.6 51.1 52.6', K.skinLine, 0.55)}
${L('M45.6 57.4Q50 60.9 54.4 57.4', K.mouth, 0.95)}`;

// the body (the shirt / the long chemise), the hands, the gaps between the arms and the body kept for the cut
const ARMS = 'M44 72.4L28.4 75.6C25.4 76.6 24.4 79.4 24.2 83.4L18.2 158.6L26.4 160L32 96';
const armsR = 'L68 96L73.6 160L81.8 158.6L75.8 83.4C75.6 79.4 74.6 76.6 71.6 75.6L56 72.4Q50 76 44 72.4Z';
const handL = ellD(22.4, 166.4, 5, 7), handR = ellD(77.6, 166.4, 5, 7);
const gapL = 'M32 96L26.4 160L33.6 160L34.6 134Z', gapR = 'M68 96L73.6 160L66.4 160L65.4 134Z';

// ---------- the boy ----------
const hairBoy = 'M30.6 47C29.4 31.6 38 23.2 50 23.2C62 23.2 70.6 31.6 69.4 47C68 40.6 64.4 36.6 58.8 35.4C55 38.2 46.8 38.6 40.8 36.2C36.4 37.8 32.4 41.4 30.6 47Z';
const shirtBoy = `${ARMS}L34.6 134L34 147L66 147L65.4 134${armsR}`;
const trousers = 'M34.2 141L65.8 141L66.4 151L64.6 214L52.6 214L50.8 160L49.2 160L47.4 214L35.4 214L33.6 151Z';
const legGap = 'M47.4 158L52.6 158L52.8 249L47.2 249Z';
const bootL = 'M35.1 200L47.9 200L47.6 244.2L48 248.4Q48 250.6 45.8 250.6L31.2 250.6Q28.6 250.6 29.2 248.2Q30 245.2 34.6 243.4Z';
const bootR = 'M64.9 200L52.1 200L52.4 244.2L52 248.4Q52 250.6 54.2 250.6L68.8 250.6Q71.4 250.6 70.8 248.2Q70 245.2 65.4 243.4Z';

export const boyDoll = () => ({
  cut: [headD, earL, earR, hairBoy, neckD, shirtBoy, handL, handR, gapL, gapR, trousers, legGap, bootL, bootR].map(d => ({ d })),
  art: `${P(neckD, K.skin, K.skinLine)}
${P(trousers, K.trousers, '#1f1d24')}${L('M50 160L50 151', '#1f1d24', 0.4)}
${P(bootL, K.boot, '#0e0b0b')}${P(bootR, K.boot, '#0e0b0b')}
${L('M36.4 204L46.6 204', K.bootHi, 0.7)}${L('M53.4 204L63.6 204', K.bootHi, 0.7)}${L('M36.2 246.6Q33 247.2 31.4 248.6', K.bootHi, 0.5)}${L('M63.8 246.6Q67 247.2 68.6 248.6', K.bootHi, 0.5)}
${P(handL, K.skin, K.skinLine)}${P(handR, K.skin, K.skinLine)}
${P(shirtBoy, K.shirt, K.shirtLine)}${L('M50 76L50 128', '#dccfba', 0.4)}${L('M32 96L26.4 160M68 96L73.6 160', '#d9ccb6', 0.35)}
${P(earL, K.skin, K.skinLine)}${P(earR, K.skin, K.skinLine)}${P(headD, K.skin, K.skinLine)}
${P(hairBoy, K.hairBoy, '#2a1d15')}${face(false)}`,
});

// ---------- the girl ----------
const hairGirlBack = 'M29.2 48C27.4 30.4 37 21.4 50 21.4C63 21.4 72.6 30.4 70.8 48C71.6 62 73.6 74 77 86.4L66.4 88C64.6 80 62.8 73.6 60.4 69L39.6 69C37.2 73.6 35.4 80 33.6 88L23 86.4C26.4 74 28.4 62 29.2 48Z';
const hairGirlFront = 'M30.6 47C30 31.2 39 23.6 50 23.6C61 23.6 70 31.2 69.4 47C67 39.8 61 35.4 52.6 34.8Q50.6 36.2 50 38.6Q49.4 36.2 47.4 34.8C39 35.4 33 39.8 30.6 47Z';
const chemise = `${ARMS}L34.6 132L30 240L70 240L65.4 132${armsR}`;
const slipL = 'M34.4 238L48 238L48.4 246.8Q48.4 250.4 45.4 250.4L33.2 250.4Q30.2 250.4 31.2 247.4Z';
const slipR = 'M65.6 238L52 238L51.6 246.8Q51.6 250.4 54.6 250.4L66.8 250.4Q69.8 250.4 68.8 247.4Z';
const girlGapL = 'M32 96L26.4 160L31.6 172L34.6 132Z', girlGapR = 'M68 96L73.6 160L68.4 172L65.4 132Z';

export const girlDoll = () => ({
  cut: [hairGirlBack, headD, neckD, chemise, handL, handR, girlGapL, girlGapR, slipL, slipR, 'M46 236L54 236L54 249L46 249Z'].map(d => ({ d })),
  art: `${P(hairGirlBack, K.hairGirl, '#301c12')}${P(neckD, K.skin, K.skinLine)}
${P(slipL, K.slipper, '#5e1820')}${P(slipR, K.slipper, '#5e1820')}${L('M33.6 245.4Q37 244.2 39.6 245.6M66.4 245.4Q63 244.2 60.4 245.6', '#c7737c', 0.5)}
${P(handL, K.skin, K.skinLine)}${P(handR, K.skin, K.skinLine)}
${P(chemise, K.shirt, K.shirtLine)}${L('M32 96L26.4 160M68 96L73.6 160', '#d9ccb6', 0.35)}${L('M40 150L37 236M60 150L63 236M50 140L50 238', '#e6dccb', 0.4)}
${P(headD, K.skin, K.skinLine)}${P(hairGirlFront, K.hairGirl, '#301c12')}${face(true)}`,
});

// ---------- the chokha's parts ----------
const AKHALUKHI = 'M43.6 64.8L56.4 64.8L56.6 73L71.8 75.6C75 76.6 76 79.6 76.2 83.6L82.6 158.6L73.6 160.4L69 160.2L69.6 176L30.4 176L31 160.2L26.4 160.4L17.4 158.6L23.8 83.6C24 79.6 25 76.6 28.2 75.6L43.4 73Z';
const akhalukhi = () => ({
  cut: [{ d: AKHALUKHI }],
  art: `${P(AKHALUKHI, K.ak, K.akDark)}
${L('M31.6 99L26.8 159.8M68.4 99L73.2 159.8', K.akDark, 0.5)}
${P('M43.6 64.8L56.4 64.8L56.6 73L43.4 73Z', K.ak, K.gold, 0.55)}${L('M43.6 69L56.5 69', K.gold, 0.4)}
${L('M50 73L50 175', K.akDark, 0.5)}
${Array.from({ length: 12 }, (_, i) => `<circle cx="50" cy="${f(76.5 + i * 5.2)}" r=".95" fill="${K.gold}" stroke="${K.goldDark}" stroke-width=".25"/>`).join('')}
${L('M19 152.6L27.4 153.4M72.6 153.4L81 152.6', K.gold, 0.5)}${L('M30.4 172.6L69.6 172.6', K.gold, 0.45)}`,
});

const CHOKHA = 'M42.6 71.4L23.6 75.4C20.4 76.4 19.4 79.4 19.2 83.6L12.4 160.8L27.4 161.6L30.6 161.6L23.4 226Q50 229.4 76.6 226L69.4 161.6L72.6 161.6L87.6 160.8L80.8 83.6C80.6 79.4 79.6 76.4 76.4 75.4L57.4 71.4L50 134.6Z';
const HOLDER = { l: 'rotate(-7 37.6 97)', r: 'rotate(7 62.4 97)' };
const holders = side => {
  const x0 = side === 'l' ? 31.2 : 55.2;
  return `<g transform="${HOLDER[side]}">${P(rectD(x0, 91, 13.6, 12), K.holder, '#0f1a33', 0.4)}${Array.from({ length: 6 }, (_, k) => L(`M${f(x0 + 1.94 * (k + 1))} 91.6L${f(x0 + 1.94 * (k + 1))} 102.4`, '#0c1630', 0.35)).join('')}${L(`M${x0} 91L${f(x0 + 13.6)} 91`, K.gold, 0.55)}</g>`;
};
const curl = (x, y, s = 1) => L(`M${x} ${y}c${f(2 * s)} -2.6 ${f(4.4 * s)} -2.4 ${f(4.8 * s)} -.2c${f(0.4 * s)} 2-${f(1.6 * s)} 2.4-${f(2 * s)} .8M${x} ${y}c${f(-1.4 * s)} 1.4-${f(3.4 * s)} 1.6-${f(4.2 * s)} .2`, K.gold, 0.5);
const chokha = () => ({
  cut: [{ d: CHOKHA }],
  art: `${P(CHOKHA, K.chokha, K.chokhaDark)}
${P('M19.2 83.6L12.4 160.8L27.4 161.6L30.6 99Z', K.chokhaDark, 'none', 0, ' opacity=".28"')}${P('M80.8 83.6L87.6 160.8L72.6 161.6L69.4 99Z', K.chokhaDark, 'none', 0, ' opacity=".28"')}
${L('M30.6 99L27.6 161.4M69.4 99L72.4 161.4', '#16244a', 0.5)}
${P('M13.3 150.6L28.3 151.3L27.4 161.6L12.4 160.8Z', K.cuff, '#16244a', 0.4)}${P('M86.7 150.6L71.7 151.3L72.6 161.6L87.6 160.8Z', K.cuff, '#16244a', 0.4)}
${L('M13.3 150.6L28.3 151.3M86.7 150.6L71.7 151.3', K.gold, 0.6)}
${L('M36.6 137L32.6 225.4M63.4 137L67.4 225.4M43.4 137L41.8 227.6M56.6 137L58.2 227.6', K.chokhaDark, 0.45)}
${L('M50 134.6L50 228.8', '#152246', 0.55)}
${holders('l')}${holders('r')}
${curl(33.6, 111)}${curl(66.4, 111, -1)}
${L('M42.6 71.4L50 134.6L57.4 71.4', K.gold, 0.8)}${L('M23.4 226Q50 229.4 76.6 226', K.gold, 0.75)}`,
});

const tubes = side => {
  const x0 = side === 'l' ? 31.6 : 55.6;
  const out = Array.from({ length: 7 }, (_, k) => {
    const x = f(x0 + k * 1.95);
    return `${P(rectD(x, 87.4, 1.6, 15), K.tube, '#101a30', 0.25)}${P(`M${x} 90.6L${x} 87.6Q${f(+x + 0.8)} 86.2 ${f(+x + 1.6)} 87.6L${f(+x + 1.6)} 90.6Z`, K.silver, K.silverLine, 0.25)}`;
  }).join('');
  return `<g transform="${HOLDER[side]}">${out}${L(`M${f(x0 - 0.2)} 96.2L${f(x0 + 13.4)} 96.2`, '#0d1529', 0.4)}</g>`;
};
const masrebi = side => {
  const x0 = side === 'l' ? 31.2 : 55.2;
  return { cut: [{ d: rectD(x0, 86, 13.6, 17), t: HOLDER[side] }], art: tubes(side) };
};

const BELT = 'M28.9 131.2L46.2 131.2L46.2 130.4L53.8 130.4L53.8 131.2L71.1 131.2L71.1 137.2L69.2 137.2L69.2 172L67.2 177L65.2 172L65.2 137.2L53.8 137.2L53.8 138L46.2 138L46.2 137.2L28.9 137.2Z';
const kamari = () => ({
  cut: [{ d: BELT }],
  art: `${P('M28.9 131.2L71.1 131.2L71.1 137.2L28.9 137.2Z', K.belt, '#000', 0.35)}
${P('M65.2 137.2L69.2 137.2L69.2 172L67.2 177L65.2 172Z', K.belt, '#000', 0.35)}
${[148, 158].map(y => P(rectD(64.9, y, 4.6, 1.6), K.silver, K.silverLine, 0.25)).join('')}${P('M65.1 168.4L69.3 168.4L69.3 172L67.2 177.2L65.1 172Z', K.silver, K.silverLine, 0.25)}
${[33.4, 38.6, 59.4, 63.4].map(x => `<circle cx="${x}" cy="134.2" r=".95" fill="${K.silver}" stroke="${K.silverLine}" stroke-width=".25"/>`).join('')}
${P(rectD(46.2, 130.4, 7.6, 7.6), K.silver, K.silverLine, 0.35)}${P(rectD(47.8, 132, 4.4, 4.4), K.belt, 'none')}${L('M50 132L50 136.4', K.silver, 0.6)}`,
});

const DAGGER = 'translate(44.2 128.8) rotate(-22)';
const khanjali = () => ({
  cut: [ellD(0, 0, 2.6, 2.6), rectD(-1.8, 0, 3.6, 12), rectD(-3.4, 10.3, 6.8, 2.2), 'M-2.6 12.4L2.6 12.4L1.7 41.6L0 44.8L-1.7 41.6Z'].map(d => ({ d, t: DAGGER })),
  art: `<g transform="${DAGGER}">
${P('M-2.6 12.4L2.6 12.4L1.6 41L-1.6 41Z', K.sheath, '#000', 0.3)}
${P(rectD(-2.7, 12.4, 5.4, 4), K.silver, K.silverLine, 0.3)}${L('M-1.6 13.8L1.6 13.8M-1.6 15.2L1.6 15.2', K.silverLine, 0.25)}
${P(rectD(-2.15, 27, 4.3, 1.5), K.silver, K.silverLine, 0.25)}
${P('M-1.8 37.4L1.8 37.4L1.3 42.6Q0 44.8-1.3 42.6Z', K.silver, K.silverLine, 0.3)}
${P(rectD(-1.75, 1.8, 3.5, 8.6), K.grip, '#120e0d', 0.3)}${P(rectD(-1.9, 4.6, 3.8, 1), K.silver, K.silverLine, 0.2)}${P(rectD(-1.9, 7.6, 3.8, 1), K.silver, K.silverLine, 0.2)}
${P(rectD(-3.4, 10.3, 6.8, 2.2), K.silver, K.silverLine, 0.3)}
${P(ellD(0, 0.4, 2.5, 2.3), K.silver, K.silverLine, 0.3)}<circle cx="0" cy="0.4" r=".8" fill="${K.silverLine}"/>
</g>`,
});

// ---------- the hats ----------
// the papakha: a fleece cloud of little arcs round an ellipse, curls inside
const PAPAKHA = (() => {
  const n = 26, cx = 50, cy = 25.6, rx = 24.4, ry = 16.4;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    const y = cy + ry * Math.sin(a);
    return [cx + rx * Math.cos(a), Math.min(y, 40.6)];
  });
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const ox = mx - cx, oy = my - cy, len = Math.hypot(ox / rx, oy / ry) || 1;
    const bump = my > 39 ? 0.9 : 2.1;
    d += `Q${f(mx + (ox / len / rx) * bump * rx / 10)} ${f(my + (oy / len / ry) * bump * ry / 10 * 1.2)} ${f(x1)} ${f(y1)}`;
  }
  return `${d}Z`;
})();
const papakhaCurls = Array.from({ length: 34 }, (_, i) => {
  const a = i * 2.39996, r = Math.sqrt((i + 0.5) / 34);
  const x = 50 + 20.5 * r * Math.cos(a), y = 25 + 13 * r * Math.sin(a);
  const s = i % 2 ? 1 : -1;
  return L(`M${f(x - 1.6)} ${f(y + 0.5)}c${f(0.4)} ${-1.6} ${f(2.6)} ${-1.8} ${f(3)} ${-0.2}c.2 .9-.6 1.5-1.2 1.1`, K.curl, 0.5, s < 0 ? ` transform="rotate(180 ${f(x)} ${f(y)})"` : '');
}).join('');
const papakha = () => ({ cut: [{ d: PAPAKHA }], art: `${P(PAPAKHA, K.fleece, '#b7aa90', 0.5)}${papakhaCurls}` });

const KAKHURI = 'M31.4 38.6L32 21.6Q50 15 68 21.6L68.6 38.6Z';
const KAKHURI_BRIM = 'M29.8 33.4Q50 30.8 70.2 33.4L70.6 40.8Q50 43.4 29.4 40.8Z';
const kakhuri = () => ({
  cut: [{ d: KAKHURI }, { d: KAKHURI_BRIM }],
  art: `${P(KAKHURI, K.felt, '#a99673', 0.5)}${L('M33 22.8Q50 17.6 67 22.8', K.cord, 0.55)}${L('M38 31.8Q38.6 25.4 37.8 20.4M62 31.8Q61.4 25.4 62.2 20.4', '#d8c7a3', 0.45)}
${P(KAKHURI_BRIM, K.feltDark, '#a99673', 0.5)}${L('M30.8 37Q50 34.6 69.2 37', '#c9b48b', 0.45)}`,
});

const SVANURI = 'M30.2 39.6C30 25.4 39 17.8 50 17.8C61 17.8 70 25.4 69.8 39.6Q50 43 30.2 39.6Z';
const svanuri = () => ({
  cut: [{ d: SVANURI }],
  art: `${P(SVANURI, '#f4eee2', '#a99c86', 0.5)}
${L('M50 17.8C43.4 20.4 38.8 28 38 40.8M50 17.8C56.6 20.4 61.2 28 62 40.8M50 17.8C47.6 24 47.2 33 47.6 41.4M50 17.8C52.4 24 52.8 33 52.4 41.4', K.cord, 0.75)}
${L('M30.2 39.6Q50 43 69.8 39.6', K.cord, 1.2)}
${L('M50 17.8Q58.4 18.6 61.2 22.6', K.cord, 0.75)}${P('M60 22.4Q61.2 21.2 62.4 22.4L63.2 30.2Q61.2 31.2 59.2 30.2Z', K.cord, 'none')}${L('M59.9 26.6L62.6 26.6M60.4 28L60.2 30.4M61.2 28L61.2 30.8M62 28L62.2 30.4', '#6a5a4e', 0.3)}`,
});

const KABALAKHI = 'M29.6 41.2C27.6 30 36 19 50 18.6C64 19 72.4 30 70.4 41.2Q50 44.8 29.6 41.2Z';
const KABALAKHI_TAIL = 'M63.8 36.6L71 35.8C74 52 75.6 74 74.8 104L66.6 104C67.4 78 66.6 56 63.8 36.6Z';
const kabalakhi = () => ({
  cut: [{ d: KABALAKHI }, { d: KABALAKHI_TAIL }, { d: rectD(66.6, 103, 8.2, 6.6) }],
  art: `${P(KABALAKHI_TAIL, K.camel, K.camelDark, 0.5)}${L('M69.6 42C71.6 60 72.2 82 71.2 103', K.camelDark, 0.45)}
${Array.from({ length: 9 }, (_, i) => L(`M${f(67.2 + i * 0.9)} 104.2L${f(67.2 + i * 0.9)} 109`, K.camelDark, 0.5)).join('')}
${P(KABALAKHI, K.camel, K.camelDark, 0.5)}
${L('M31 35Q49 24.4 69 31M30.6 39Q50 30.4 70.2 36.6M35.6 25.4Q51 18.8 64.6 25.8', K.camelDark, 0.7)}`,
});

// ---------- the dress's parts ----------
const KABA = 'M43 71.8Q50 77.6 57 71.8L71.6 75.4C74.8 76.4 75.8 79.4 76 83.4L82.8 157Q81.4 160.6 78.2 161.4L73.4 161.6L68.6 99L66 132L83.2 243.6Q66 247.4 50 246.6Q34 247.4 16.8 243.6L34 132L31.4 99L26.6 161.6L21.8 161.4Q18.6 160.6 17.2 157L24 83.4C24.2 79.4 25.2 76.4 28.4 75.4Z';
const kaba = () => ({
  cut: [{ d: KABA }],
  art: `<defs><pattern id="kabaDots" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r=".5" fill="${K.kabaDot}"/></pattern></defs>
${P(KABA, K.kaba, K.kabaLine)}${P(KABA, 'url(#kabaDots)', 'none')}
${L('M31.4 99L26.8 161M68.6 99L73.2 161', K.kabaLine, 0.5)}
${L('M34 132Q50 134.6 66 132', K.kabaLine, 0.45)}${L('M40 140L33 244.6M60 140L67 244.6M45.4 140L43 246.2M54.6 140L57 246.2', K.kabaLine, 0.4, ' opacity=".6"')}
${L('M18.8 238.4Q34 241.6 50 240.8Q66 241.6 81.2 238.4', K.gold, 1.3)}${L('M18 242Q34 245.2 50 244.4Q66 245.2 82 242', K.gold, 0.5)}
${L('M18 152.6L27.2 153.4M82 152.6L72.8 153.4', K.gold, 0.9)}
${L('M43 71.8Q50 77.6 57 71.8', K.gold, 0.7)}`,
});

const GULISPIRI = 'M41 76.4L59 76.4L58.6 116Q54 122.6 50 124.2Q46 122.6 41.4 116Z';
const gulCurl = (x, y, s) => L(`M${x} ${y}c${f(-2.6 * s)} 0-${f(3.4 * s)}-3.6-${f(0.8 * s)}-4.2c${f(1.8 * s)}-.3 ${f(2.2 * s)} 1.9 ${f(0.6 * s)} 2.2`, K.gold, 0.5);
const gulispiri = () => ({
  cut: [{ d: GULISPIRI }],
  art: `${P(GULISPIRI, K.velvet, '#0b0a10', 0.4)}${L('M42.4 77.8L57.6 77.8L57.2 115.4Q53.6 120.6 50 122.2Q46.4 120.6 42.8 115.4Z', K.gold, 0.45)}
${[84, 95, 106].flatMap(y => [gulCurl(46.6, y, 1), gulCurl(53.4, y, -1)]).join('')}
${Array.from({ length: 13 }, (_, i) => `<circle cx="50" cy="${f(80.4 + i * 3.2)}" r=".9" fill="${K.pearl}" stroke="#bdb5a5" stroke-width=".2"/>`).join('')}
${[82, 93, 104, 114].flatMap(y => [`<circle cx="44" cy="${y}" r=".65" fill="${K.pearl}"/>`, `<circle cx="56" cy="${y}" r=".65" fill="${K.pearl}"/>`]).join('')}`,
});

const SASH = 'M31.8 127.6L68.2 127.6L68.4 134.6L55.6 134.6L59.2 208L52.6 208L50 137.6L47.4 208L40.8 208L44.4 134.6L31.6 134.6Z';
const sartqeli = () => ({
  cut: [{ d: SASH }, { d: rectD(40.8, 207, 6.6, 7.2) }, { d: rectD(52.6, 207, 6.6, 7.2) }],
  art: `${P(SASH, K.sash, '#120d1d', 0.4)}
${L('M32.6 129.2L67.4 129.2M32.4 133L67.6 133', K.gold, 0.4)}${L(`M33.4 131.1${Array.from({ length: 17 }, (_, i) => `L${f(35.4 + i * 2)} ${i % 2 ? 131.9 : 130.3}`).join('')}`, K.gold, 0.4)}
${[0, 1].map(s => {
    const x0 = s ? 55.9 : 44.1, dx = s ? 0.098 : -0.098;
    return [148, 162, 176, 190].map(y => { const x = f(x0 + dx * (y - 137.6)); return `${P(`M${x} ${y - 3.2}L${f(+x + 2)} ${y}L${x} ${y + 3.2}L${f(+x - 2)} ${y}Z`, 'none', K.gold, 0.45)}<circle cx="${x}" cy="${y}" r=".75" fill="${K.pearl}"/>`; }).join('');
  }).join('')}
${[[40.8, 47.4], [52.6, 59.2]].map(([a, b]) => `${L(`M${a} 205.6L${b} 205.6`, K.gold, 0.6)}${Array.from({ length: 8 }, (_, i) => L(`M${f(a + 0.4 + i * 0.83)} 208L${f(a + 0.4 + i * 0.83)} 213.6`, K.gold, 0.45)).join('')}`).join('')}`,
});

const KATIBI = 'M40.6 205L40.6 80Q50 82.8 59.4 80L59.4 205Q68.6 206.2 78 203.4L67.2 132L67.6 121L69.6 121L82.4 120.6L77.2 80C76.8 77 75.6 75.6 72.6 74.8L61 70.8Q56 76.6 50 76.6Q44 76.6 39 70.8L27.4 74.8C24.4 75.6 23.2 77 22.8 80L17.6 120.6L30.4 121L32.4 121L32.8 132L22 203.4Q31.4 206.2 40.6 205Z';
const furDots = (pts) => pts.map(([x, y], i) => `<circle cx="${f(x)}" cy="${f(y)}" r="${i % 3 ? 0.35 : 0.5}" fill="${K.furDot}"/>`).join('');
const katibi = () => {
  const edge = [];
  for (let y = 84; y < 202; y += 3.1) { edge.push([41.6 + ((y * 7) % 3) * 0.5, y]); edge.push([57.4 + ((y * 5) % 3) * 0.5, y + 1.5]); }
  return {
    cut: [{ d: KATIBI }],
    art: `${P(KATIBI, K.katibi, '#141c38')}
${P('M33.6 88Q36 140 30 196L34.4 196Q39 140 37.2 88Z', K.katibiHi, 'none', 0, ' opacity=".55"')}${P('M66.4 88Q64 140 70 196L65.6 196Q61 140 62.8 88Z', K.katibiHi, 'none', 0, ' opacity=".55"')}
${L('M30.4 95L30.6 121M69.6 95L69.4 121', '#141c38', 0.5)}
${P('M40.6 80.2L43.6 80.6L43.6 201L40.6 201.4Z', K.fur, '#bdb3a2', 0.3)}${P('M59.4 80.2L56.4 80.6L56.4 201L59.4 201.4Z', K.fur, '#bdb3a2', 0.3)}
${P('M39 70.8Q44 76.6 50 76.6Q56 76.6 61 70.8L59.4 80Q50 82.8 40.6 80Z', K.fur, '#bdb3a2', 0.3)}
${P('M22.6 199.4Q31.6 202 40.6 200.8L40.6 205Q31.4 206.2 22 203.4Z', K.fur, '#bdb3a2', 0.3)}${P('M77.4 199.4Q68.4 202 59.4 200.8L59.4 205Q68.6 206.2 78 203.4Z', K.fur, '#bdb3a2', 0.3)}
${P('M18.4 114L30.8 114.4L30.4 121L17.6 120.6Z', K.fur, '#bdb3a2', 0.3)}${P('M81.6 114L69.2 114.4L69.6 121L82.4 120.6Z', K.fur, '#bdb3a2', 0.3)}
${furDots(edge)}${furDots([[43, 74.6], [46, 76.4], [50, 78.6], [54, 76.4], [57, 74.6], [48, 80.2], [52, 80.2], [26, 202], [31, 203.6], [36, 203.2], [64, 203.2], [69, 203.6], [74, 202], [21, 117], [25, 117.6], [29, 117.2], [71, 117.2], [75, 117.6], [79, 117]])}
${L('M43.6 80.6L43.6 201M56.4 80.6L56.4 201', K.gold, 0.4)}`,
  };
};

const LECHAKI = 'M50 17.4C36 17.4 26.4 27 25.4 40.6C24.6 58 21.4 90 16.8 124.2Q20.4 126.4 24.2 124.4Q27.6 126.6 31 124.6Q33.2 125.8 35.4 124.6L37.6 97L38.6 79.6L37.8 71.6C33.6 66.4 31.6 58.6 31.2 49.6L31.2 39.8Q50 35 68.8 39.8L68.8 49.6C68.4 58.6 66.4 66.4 62.2 71.6L61.4 79.6L62.4 97L64.6 124.6Q66.8 125.8 69 124.6Q72.4 126.6 75.8 124.4Q79.6 126.4 83.2 124.2C78.6 90 75.4 58 74.6 40.6C73.6 27 64 17.4 50 17.4Z';
const BAND = 'M30.4 40Q50 35 69.6 40L69.2 32.6Q50 27.4 30.8 32.6Z';
const lechaki = () => ({
  cut: [{ d: LECHAKI }, { d: BAND }],
  art: `${P(LECHAKI, K.veil, K.veilLine, 0.45)}
${L('M44 22Q34 40 30 70M56 22Q66 40 70 70M38 24Q29 46 23 96M62 24Q71 46 77 96M33 74Q31 100 29 124M67 74Q69 100 71 124', '#dcd8cf', 0.45)}
${L('M17.4 121.4Q20.6 123.4 24.2 121.6Q27.6 123.8 31 121.8Q33.2 123 35.6 121.8M64.4 121.8Q66.8 123 69 121.8Q72.4 123.8 75.8 121.6Q79.4 123.4 82.6 121.4', '#c9c2b5', 0.4, ' stroke-dasharray=".6 .8"')}
${P(BAND, K.band, '#140d16', 0.4)}${L('M31 33.8Q50 28.8 69 33.8M30.6 38.8Q50 33.8 69.4 38.8', K.gold, 0.4)}
${Array.from({ length: 15 }, (_, i) => { const x = 32.4 + i * 2.6, y = 36.3 - 4.3 * (1 - ((x - 50) / 19.6) ** 2); return `<circle cx="${f(x)}" cy="${f(y)}" r=".72" fill="${K.pearl}" stroke="#bdb5a5" stroke-width=".18"/>`; }).join('')}`,
});

// ---------- the sets ----------
/** each part: its drawing, where it sits on the doll (its box, cut line included) and what its back says */
export const CHOKHA_SET = [
  { id: 'chokha', make: chokha, box: [10.6, 69.6, 89.4, 230.6] },
  { id: 'akhalukhi', make: akhalukhi, box: [15.6, 63.2, 84.4, 177.6] },
  { id: 'masrebi-l', part: 'masrebi', make: () => masrebi('l'), box: [28.8, 82.8, 47.4, 106] },
  { id: 'masrebi-r', part: 'masrebi', make: () => masrebi('r'), box: [52.6, 82.8, 71.2, 106] },
  { id: 'kamari', make: kamari, box: [27.2, 128.8, 72.8, 178.8] },
  { id: 'khanjali', make: khanjali, box: [39.4, 124.4, 63.8, 172.8] },
  { id: 'papakha', make: papakha, box: [23.4, 6.6, 76.6, 43] },
  { id: 'kakhuri', make: kakhuri, box: [27.8, 15.4, 72.2, 44.6] },
  { id: 'svanuri', make: svanuri, box: [28.6, 13.4, 71.4, 44] },
  { id: 'kabalakhi', make: kabalakhi, box: [26.2, 17, 77.4, 111.2] },
];
export const KABA_SET = [
  { id: 'kaba', make: kaba, box: [15.2, 70.4, 84.8, 248.8] },
  { id: 'katibi', make: katibi, box: [16, 69.4, 84, 207.6] },
  { id: 'lechaki', make: lechaki, box: [15.2, 16, 84.8, 127.8] },
  { id: 'gulispiri', make: gulispiri, box: [39.4, 74.8, 60.6, 125.8] },
  { id: 'sartqeli', make: sartqeli, box: [30, 126, 70, 215.8] },
];
export const DOLL_BOX = [12.6, 18.8, 87.4, 252.2];

/** the whole outfit on its doll (the cover, the host's sheet): the parts in the order they go on */
export const dressed = (outfit, hat = 'papakha') => {
  const set = outfit === 'kaba' ? KABA_SET : CHOKHA_SET;
  const order = outfit === 'kaba' ? ['kaba', 'gulispiri', 'sartqeli', 'katibi', 'lechaki'] : ['akhalukhi', 'chokha', 'masrebi-l', 'masrebi-r', 'kamari', 'khanjali', hat];
  const doll = outfit === 'kaba' ? girlDoll() : boyDoll();
  return `${doll.art}${order.map(id => set.find(p => p.id === id).make().art).join('')}`;
};
