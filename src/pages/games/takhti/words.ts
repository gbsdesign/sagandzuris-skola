import { CARDS, TOKENS, WONDERS, type CType, type Chain, type Eff, type Res, type Sci } from '../../../data/takhtiCards';
import { ROMAN, costParts, type TLine } from '../../../utils/oriTakhti';

// „ორი ტახტი“'s words on screen — the kit's own (scripts/print-games/games/ori-takhti.mjs): the colours, resources, wisdoms,
// masters' marks, an effect in words, a chronicle line (present tense, a name in the nominative, „შენ“ in the second person).

export const TYPE_INFO: Record<CType, { color: string; name: string; adj: string }> = {
  brown: { color: '#7a5230', name: 'ნედლეული', adj: 'ყავისფერი' },
  grey: { color: '#6b7078', name: 'ხელოსნობა', adj: 'ნაცრისფერი' },
  red: { color: '#8e2430', name: 'ლაშქარი', adj: 'წითელი' },
  green: { color: '#2f6b45', name: 'სიბრძნე', adj: 'მწვანე' },
  blue: { color: '#2b5797', name: 'დიდება', adj: 'ლურჯი' },
  yellow: { color: '#bf8a1f', name: 'ვაჭრობა', adj: 'ყვითელი' },
  guild: { color: '#5e3a7e', name: 'ამქარი', adj: 'იისფერი' },
};
export const TYPE_ORDER: readonly CType[] = ['brown', 'grey', 'red', 'green', 'blue', 'yellow', 'guild'];
export const RES_INFO: Record<Res, { name: string; acc: string; color: string }> = {
  W: { name: 'ხე', acc: 'ხეს', color: '#4f7330' },
  S: { name: 'ქვა', acc: 'ქვას', color: '#737881' },
  K: { name: 'თიხა', acc: 'თიხას', color: '#b0552e' },
  G: { name: 'მინანქარი', acc: 'მინანქარს', color: '#1d7a8c' },
  P: { name: 'ეტრატი', acc: 'ეტრატს', color: '#9c7632' },
};
export const SCI_NAMES: Record<Sci, string> = {
  anbani: 'ანბანი', karabadini: 'კარაბადინი', astronomia: 'ასტრონომია', khuroba: 'ხუროთმოძღვრება', ruka: 'რუკა', galoba: 'გალობა', samartali: 'სამართალი',
};
export const SCI_ORDER: readonly Sci[] = ['anbani', 'karabadini', 'astronomia', 'khuroba', 'ruka', 'galoba', 'samartali'];
export const CHAIN_NAMES: Record<Chain, string> = {
  nali: 'ნალი', khmali: 'ხმალი', koshki: 'კოშკი', tsigni: 'წიგნი', borbali: 'ბორბალი', nighabi: 'ნიღაბი', mtvare: 'მთვარე', tsveti: 'წვეთი',
  gasaghebi: 'გასაღები', samizne: 'სამიზნე', drosha: 'დროშა', zari: 'ზარი', lampari: 'ლამპარი', sveti: 'სვეტი', mze: 'მზე', tvali: 'თვალი', tasi: 'თასი',
};
export const AGE_INFO = {
  1: { bg: '#857a6a', fg: '#efe6d4', era: 'მოქცევაჲ ქართლისაჲ', when: 'IV ს.' },
  2: { bg: '#7a2028', fg: '#ebcb7f', era: 'ოქროს ხანა', when: 'XI–XIII სს.' },
  3: { bg: '#a67a24', fg: '#fdf2d6', era: 'აღორძინება', when: 'XVIII–XIX სს.' },
} as const;
/** the two thrones' colours (west, east) */
export const SIDE_COLOR = ['#22616a', '#7a2028'] as const;
/** „toward Kutaisi / Tbilisi“ */
export const TOWARD = ['ქუთაისისკენ', 'თბილისისკენ'] as const;

/** a card's or a monument's effect in the kit's words */
export const effText = (e: Eff): string => {
  if (e.prod) return `ყოველ სვლაზე: ${e.prod.length} ${RES_INFO[e.prod[0] as Res].name}`;
  if (e.one) return `ყოველ სვლაზე ერთი: ${[...e.one].map(k => RES_INFO[k as Res].name).join(' ან ')}`;
  if (e.shields) return `${e.shields} ფარი: მხედარი ${e.shields} უჯრით მეტოქისკენ`;
  if (e.sci) return `სიბრძნე: ${SCI_NAMES[e.sci]}${e.vp ? ` · ${e.vp} ქულა` : ''}`;
  if (e.trade) return `${[...e.trade].map(k => RES_INFO[k as Res].acc).join(' და ')} ბანკიდან 1 თეთრად ყიდულობ`;
  if (e.per) {
    const what = e.per === 'wonder' ? 'შენს ყოველ ძეგლზე' : `შენს ყოველ ${TYPE_INFO[e.per].adj} ბარათზე${e.per === 'yellow' ? ' (ამასაც)' : ''}`;
    return `ახლავე ${e.coins} თეთრი ${what} · ${e.vp} ქულა`;
  }
  if (e.coins) return `ახლავე ${e.coins} თეთრი ბანკიდან`;
  if (e.vp) return `${e.vp} დიდების ქულა`;
  if (e.guild) return {
    yellow: 'სამეფოში, სადაც ყვითელი მეტია: ყოველ ყვითელზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    brownGrey: 'სადაც ყავისფერი და ნაცრისფერი ერთად მეტია: თითოზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    blue: 'სამეფოში, სადაც ლურჯი მეტია: ყოველ ლურჯზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    green: 'სამეფოში, სადაც მწვანე მეტია: ყოველ მწვანეზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    red: 'სამეფოში, სადაც წითელი მეტია: ყოველ წითელზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    wonder: 'სამეფოში, სადაც ძეგლი მეტია: ყოველ ძეგლზე 2 ქულა ბოლოს',
    coins: 'უფრო მდიდარ სამეფოში: ყოველ 3 თეთრზე 1 ქულა ბოლოს',
  }[e.guild];
  return '';
};

/** a cost in words: „3 თეთრი · ქვა, ქვა, მინანქარი“ (nothing: free) */
export const costText = (cost: string) => {
  const { coins, res } = costParts(cost);
  const parts = (Object.keys(res) as Res[]).flatMap(r => Array<string>(res[r]).fill(RES_INFO[r].name));
  return [coins ? `${coins} თეთრი` : '', parts.join(', ')].filter(Boolean).join(' · ') || 'უფასო';
};

/** the cards a mark makes free, and the card that gives it */
export const chainTargets = (c: Chain) => CARDS.filter(d => d.from === c).map(d => d.n);
export const chainSource = (c: Chain) => CARDS.find(d => d.to === c)?.n ?? '';

/** a chronicle line in present tense: a name stays in the nominative, „შენ“ takes the second person */
export const lineText = (l: TLine, names: readonly string[], me: number) => {
  const you = l.who === me;
  const v = (third: string, second: string) => `${you ? 'შენ' : names[l.who]} ${you ? second : third}`;
  const card = l.c !== undefined ? CARDS[l.c].n : '';
  const extra: string[] = [];
  if (l.chain) extra.push('ოსტატის ნიშნით, უფასოდ');
  else if (l.paid) extra.push(`${l.paid} თეთრი`);
  if (l.coins && l.k !== 'discard') extra.push(`+${l.coins} თეთრი`);
  if (l.army) extra.push(`მხედარი ${Math.abs(l.army)} უჯრით ${TOWARD[l.army > 0 ? 1 : 0]}`);
  if (l.tribute) {
    const payer = l.army ? (l.army > 0 ? 1 : 0) : 1 - l.who;
    extra.push(payer === me ? `შენ ბანკს ${l.tribute} თეთრს უხდი` : `${names[payer]} ბანკს ${l.tribute} თეთრს უხდის`);
  }
  const tail = extra.length ? ` · ${extra.join(' · ')}` : '';
  switch (l.k) {
    case 'draft': return `${v('ირჩევს', 'ირჩევ')} ძეგლს: ${WONDERS[l.w ?? 0].n}`;
    case 'build': return `${v('აშენებს', 'აშენებ')}: ${card}${tail}`;
    case 'discard': return `${v('აგდებს', 'აგდებ')}: ${card} · +${l.coins ?? 0} თეთრი`;
    case 'wonder': return `${v('აშენებს', 'აშენებ')} ძეგლს: ${WONDERS[l.w ?? 0].n}${tail}`;
    case 'token': return `${v('იღებს', 'იღებ')} ცოდნის ნიშანს: ${TOKENS[l.t ?? 0].n}${tail}`;
    case 'ruin': return `${v('ანგრევს', 'ანგრევ')}: ${card}`;
    case 'revive': return `${v('გადაგდებულიდან უფასოდ აშენებს', 'გადაგდებულიდან უფასოდ აშენებ')}: ${card}${tail}`;
    case 'begin': {
      const who = l.t ?? 0;
      return `${ROMAN[l.age ?? 1]} ეპოქას ${who === me ? 'შენ იწყებ' : `იწყებს ${names[who]}`}`;
    }
    default: return '';
  }
};
