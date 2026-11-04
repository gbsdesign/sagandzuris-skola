// The five ornaments of „ლურჯი სუფრა“'s stamps, drawn as in the printed kit (src/print/games/lurji-supra.js — keep
// them the same): white on their colour, `bg` cuts the details out, in a 100×100 box; in the order of `ORNS` (utils/lurjiSupra.ts).
export const ORNAMENT: ((fg: string, bg: string) => string)[] = [
  /* tevzi */ (fg: string, bg: string) => `<path d="M24 50L6 31Q13 50 6 69Z" fill="${fg}"/>
<path d="M19 50C31 28 62 24 82 43Q89 50 82 57C62 76 31 72 19 50Z" fill="${fg}"/>
<path d="M41 32Q52 17 66 30Z" fill="${fg}"/><path d="M47 68Q55 80 64 67Z" fill="${fg}"/>
<path d="M68 35.5Q61 50 68 64.5" fill="none" stroke="${bg}" stroke-width="2.8" stroke-linecap="round"/>
<path d="M43 38Q37 44 43 50Q37 56 43 62M54 37Q48 43.5 54 50Q48 56.5 54 63" fill="none" stroke="${bg}" stroke-width="2.6" stroke-linecap="round"/>
<circle cx="75.5" cy="46.5" r="3.8" fill="${bg}"/>`,
  /* iremi */ (fg: string, bg: string) => `<path d="M38 44V7" stroke="${fg}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M38 8L59 10L52.5 15.5L59 21L38 21Z" fill="${fg}"/><circle cx="44" cy="14.6" r="2.3" fill="${bg}"/>
<path d="M25 54C25 47 30 43 38 43H62C68 43 72 47 72 52V58C72 63 68 66 62 66H35C29 66 25 62 25 58Z" fill="${fg}"/>
<path d="M60 47L70 29L79 31L73 51Z" fill="${fg}"/>
<path d="M69 30C71 25 77 22 82 24L93 30.5C95 32.5 94 35.5 91 35.5L80 36C75 37 71 35 69 30Z" fill="${fg}"/>
<path d="M72.5 26.5L67 20L76.5 23Z" fill="${fg}"/>
<path d="M76 24C74 18 70 14 64 11.5M72.6 18L67 18.6M70.4 14.6L71 8.6M80.5 23C81.5 17 85 13 90 10M82 17.4L87.5 18.4M84.8 13.4L85 7.4" stroke="${fg}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M31 64L29 87M39.5 65L41.5 87M60 65L58 87M67 63L70.5 87" stroke="${fg}" stroke-width="3.6" stroke-linecap="round"/>
<path d="M26 50L17 46L22 56Z" fill="${fg}"/>
<g fill="${bg}"><circle cx="34" cy="54.5" r="2.1"/><circle cx="43.5" cy="50" r="2.1"/><circle cx="43.5" cy="59" r="2.1"/><circle cx="53" cy="54.5" r="2.1"/><circle cx="62.5" cy="50" r="2.1"/><circle cx="62.5" cy="59" r="2.1"/></g>
<circle cx="84" cy="28.6" r="1.9" fill="${bg}"/>`,
  /* chiti */ (fg: string, bg: string) => `<path d="M33 55C22 50 15 38 13 22C21 29 29 39 40 49Z" fill="${fg}"/>
<path d="M31 61C19 63 9 56 3 45C14 49 23 53 34 57Z" fill="${fg}"/>
<path d="M28 58C28 45 44 38 58 40C68 41 73 48 71 56C69 66 54 72 42 70C35 69 28 64 28 58Z" fill="${fg}"/>
<path d="M60 44C61 33 67 24 76 23C83 22 88 27 88 33C88 39 83 41 79 42C73 44 71 50 70 54Z" fill="${fg}"/>
<path d="M86.5 28L97 32L86.5 36.5Z" fill="${fg}"/>
<path d="M50 70L47 85M58 69L61 85M42 85.5H52M56 85.5H66" stroke="${fg}" stroke-width="2.8" stroke-linecap="round"/>
<path d="M65 50C58 43 46 45 37 57C47 53 57 54 65 50Z" fill="${bg}"/><path d="M47 54.5L55 51" stroke="${fg}" stroke-width="1.6" stroke-linecap="round"/>
<circle cx="80" cy="30" r="2.7" fill="${bg}"/>`,
  /* varskvlavi */ (fg: string, bg: string) => {
    const pt = (k: number, r: number) => { const a = (k * 22.5 - 90) * Math.PI / 180; return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`; };
    const star = Array.from({ length: 16 }, (_, k) => pt(k, k % 2 ? 30.5 : 44)).join(' ');
    const petals = Array.from({ length: 8 }, (_, k) => `<ellipse cx="50" cy="41.2" rx="3.3" ry="6.4" transform="rotate(${k * 45} 50 50)"/>`).join('');
    const holes = Array.from({ length: 8 }, (_, k) => { const a = (k * 45 - 90) * Math.PI / 180; return `<circle cx="${(50 + 33 * Math.cos(a)).toFixed(2)}" cy="${(50 + 33 * Math.sin(a)).toFixed(2)}" r="2.3"/>`; }).join('');
    return `<polygon points="${star}" fill="${fg}"/><g fill="${bg}">${holes}</g><circle cx="50" cy="50" r="19.5" fill="${bg}"/>
<circle cx="50" cy="50" r="17" fill="none" stroke="${fg}" stroke-width="1.8"/><g fill="${fg}">${petals}</g><circle cx="50" cy="50" r="3.8" fill="${bg}"/>`;
  },
  /* vazi */ (fg: string, bg: string) => {
    const grapes = [[32, 45], [44, 45], [56, 45], [68, 45], [38, 56], [50, 56], [62, 56], [44, 67], [56, 67], [50, 78]];
    return `<path d="M50 35C50 29 52 25 50 18" stroke="${fg}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<path d="M48 29C42 17 27 15 18 22C24 25 22 31 15 35C26 41 39 38 48 30Z" fill="${fg}"/>
<path d="M45 29C36 27 28 27 21 30M37 28L31 21.5M33 28.5L29 34" stroke="${bg}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
<path d="M53 25C60 15 75 16 76 24.5C77 32 67.5 33 66.5 26.5" stroke="${fg}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
${grapes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.3" fill="${fg}"/><circle cx="${x - 2}" cy="${y - 2}" r="1.6" fill="${bg}"/>`).join('')}`;
  },
];
