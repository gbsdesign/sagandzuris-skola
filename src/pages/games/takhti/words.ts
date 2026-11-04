import { CARDS, type TCard, type TKind } from '../../../data/takhtiCards';
import { ARMY_PTS, ARMY_TIE, WINE_PTS, type TLine } from '../../../utils/oriTakhti';

// „ორი ტახტი“'s words on screen, the same as on paper (printKit.ts): the five kinds with their
// colours and one-line rules, the two thrones' colours, a chronicle line (present tense, a name in the nominative, „შენ“ in
// the second person).

export const KIND_INFO: Record<TKind, { name: string; color: string; tint: string; rule: string }> = {
  tsikhe: { name: 'ციხე', color: '#6b5a48', tint: '#f1e9dc', rule: 'იმდენი ქულა, რამდენიც აწერია' },
  lashkari: { name: 'ლაშქარი', color: '#8e2430', tint: '#f7e4e1', rule: `უფრო ძლიერ ლაშქარს — ${ARMY_PTS} ქულა, ტოლს — ${ARMY_TIE}-${ARMY_TIE}` },
  ghvino: { name: 'ღვინო', color: '#5e2a5a', tint: '#f1e3ef', rule: `ვაზი და ჭურჭელი ერთად — ღვინო, ${WINE_PTS} ქულა` },
  tsigni: { name: 'წიგნი', color: '#2b5797', tint: '#e3eaf6', rule: 'იმდენი ქულა, რამდენი სხვა სახის ბარათიც გაქვს' },
  elchi: { name: 'ელჩი', color: '#8a5a12', tint: '#f6ecd6', rule: 'მეორე წილიდან ერთ ბარათს გადმოიბირებს' },
};
/** the two thrones' colours (west, east) */
export const SIDE_COLOR = ['#22616a', '#7a2028'] as const;
export const IN_CAPITAL = ['ქუთაისში', 'თბილისში'] as const;

/** a card's second line: its kind and number */
export const subOf = (c: TCard) =>
  c.k === 'tsikhe' ? `ციხე · ${c.v} ქულა` : c.k === 'lashkari' ? `ლაშქარი · ძალა ${c.v}` : c.k === 'ghvino' ? (c.w === 'vazi' ? 'ვაზი' : 'ჭურჭელი') : c.k === 'tsigni' ? 'წიგნი' : 'ელჩი';

const list = (ids: number[]) => ids.map(id => CARDS[id].n).join(', ');

export const lineText = (l: TLine, names: string[], me: number) => {
  const I = l.who === me, who = I ? 'შენ' : names[l.who];
  if (l.k === 'split') return `${who} ${I ? 'ყოფ' : 'ყოფს'} ძღვენს: ${l.a.length} და ${l.b.length} ბარათი`;
  if (l.k === 'choose') return `${who} ${I ? 'იღებ' : 'იღებს'}: ${list(l.cards)}`;
  return `${who} ელჩით ${I ? 'იბირებ' : 'იბირებს'}: ${CARDS[l.card].n}`;
};
