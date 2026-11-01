import React from 'react';
import { Eye, VenetianMask } from 'lucide-react';
import { PANTO_CARDS, pantoTheme } from '../../../data/pantomimaCards';
import { OTKHI_LETTERS } from '../../../utils/otkhi';
import { drawPantomima, type PantoQ } from '../../../utils/pantomima';
import type { PublicQ } from '../../../utils/roundGames';
import { openQ, type RoundFace } from '../rounds/face';
import { FourPick, FourReveal, fourConfirm, fourName } from '../rounds/four';
import { PantoOptions, ThemeTag } from './parts';
import { readSeen, readTalk, readThemes, rememberSeen } from './store';

// „პანტომიმა“ in a class's room (the quick games' screens, 2026-11-01): the host is the actor — the word is on their phone
// only (`Secret`), they show it in the game's call, and every player picks it out of four words of its theme on their own
// phone; the quicker, the more. The one-phone game with teams is Table.tsx; the rules utils/pantomima.ts, the words
// data/pantomimaCards.ts.

const q$ = (q: PublicQ) => openQ<PantoQ>(q);

const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-2">
      {o.theme && <ThemeTag theme={o.theme} verb />}
      <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#4a3426]">
        {who === 'host' ? 'აჩვენე ზარში — მოთამაშეები ოთხიდან ირჩევენ.' : 'რას აჩვენებს მსახიობი?'}
      </p>
      {who === 'player' && <p className="text-[12.5px] leading-snug text-[#75685a]">{o.talk ? 'მსახიობს სიტყვებითაც შეუძლია ახსნა — უსმინე ზარში.' : 'მსახიობი უსიტყვოდ აჩვენებს — უყურე ზარში.'}</p>}
    </section>
  );
};

/** the word, on the host's phone only */
const Secret: NonNullable<RoundFace['Secret']> = ({ q }) => {
  if (q.kind !== 'pantomima') return null;
  const t = pantoTheme(q.theme);
  return (
    <section className="rounded-3xl bg-[#7a2028] text-white px-4 py-4 text-center shadow-[0_10px_24px_-14px_rgba(122,32,40,0.7)]">
      <p className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#f0d9a0]"><Eye className="w-4 h-4" />მხოლოდ შენ ხედავ · {OTKHI_LETTERS[q.right]}</p>
      <p className="mt-1 font-serif-ge text-[34px] sm:text-[40px] font-bold leading-tight [overflow-wrap:anywhere]">{q.id}</p>
      {t && <p className="mt-0.5 text-[14px] font-bold text-[#f0d9a0]">{t.verb}</p>}
    </section>
  );
};

const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.id) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-2">
      {o.theme && <ThemeTag theme={o.theme} />}
      <p className="font-serif-ge text-[22px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.id}</p>
    </section>
  );
};

export const PANTO_FACE: RoundFace = {
  game: 'pantomima',
  title: 'პანტომიმა',
  Icon: VenetianMask,
  intro: 'სიტყვა სხეულით უნდა აჩვენო — უსიტყვოდ, უხმოდ: დაუკარი ჩონგურზე, იცეკვე ხორუმი, გადაიქეცი ზღარბად, ჩაიცვი ჩოხა. ვინც მალე მიხვდება, მეტ ქულას იღებს. პატარებთან სიტყვებით ახსნაც შეიძლება.',
  online: 'ონლაინ: ოთახს მსახიობი ხსნის — თვითონ არ თამაშობს, აჩვენებს. სიტყვა მხოლოდ მის ტელეფონზე ჩანს, აჩვენებს თამაშის ზარში, დანარჩენები სახლიდანაც უყურებენ და თავის ტელეფონზე ოთხიდან ერთს ირჩევენ: სწორი მაშინვე 1000 ქულაა, ბოლო წამს 500.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი, კლასი გუნდებად. მსახიობს ტელეფონი ხელში უჭირავს და თავის გუნდს აჩვენებს — ან ტელეფონი გამომცნობს შუბლზე უდევს და გუნდი აჩვენებს. გამოიცნეს — ქულა, დრო რომ გავა, შემდეგი გუნდია.',
  draw: count => drawPantomima({ words: PANTO_CARDS, themes: readThemes(), count, seen: readSeen(), talk: readTalk() }),
  remember: rounds => rememberSeen(rounds.flatMap(r => (r.kind === 'pantomima' ? [r.id] : []))),
  askHost: 'აჩვენე სიტყვა — მოთამაშეები თავის ტელეფონზე ირჩევენ.',
  askPlayer: 'რას აჩვენებს მსახიობი? მონიშნე.',
  askTeams: 'აჩვენე სიტყვა. გუნდები ასოს ფურცელზე წერენ.',
  clipSeconds: 0,
  Ask,
  Secret,
  Options: PantoOptions,
  Pick: FourPick,
  pickName: fourName,
  confirm: fourConfirm,
  Reveal: FourReveal,
  Answer,
  verdict: (q, pick) => {
    const o = q$(q);
    if (pick === null || o.right === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    if (pick === o.right) return { tone: 'right', text: 'სწორია!' };
    return { tone: 'wrong', text: `არა — ეს იყო „${o.id ?? o.options?.[o.right] ?? ''}“` };
  },
  marks: [{ points: 1, label: 'სწორი' }, { points: 0, label: 'ვერა' }],
  empty: 'არჩეულ თემებში სიტყვა ვერ მოიძებნა — აირჩიე სხვა თემებიც.',
  callHint: 'მსახიობს ზარში უყურებთ: ჩართეთ კამერა და ხმა. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
