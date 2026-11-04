import React, { useState } from 'react';
import { Eye, MessageCircle, RefreshCw } from 'lucide-react';
import { WORD_CATEGORIES } from '../../../data/amikhseniWords';
import { drawAmikhseni, swapAmikhseni, type AmikQ } from '../../../utils/amikhseniRounds';
import type { PublicQ } from '../../../utils/roundGames';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { openQ, type RoundFace } from '../rounds/face';
import { AmikThemes, ThemeTag } from './parts';
import { readConf, readSeen, rememberSeen } from './store';

// „ამიხსენი“ online (2026-11-04) over the quick games' screens (pages/games/rounds/): a class's room, the host is the
// explainer — the word is on their phone only (`Secret`) and they explain it in the room's call without saying it; every
// player writes the word on their own phone, one try, the quicker the more (utils/amikhseniRounds.ts). A word the host does
// not know is swapped for another of its theme before anybody answers (`Tool`). The one-phone game of teams is Table.tsx.

const q$ = (q: PublicQ) => openQ<AmikQ>(q);

/** the round under the clock: everybody sees the theme */
const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  if (who === 'host') {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] leading-snug text-[#75685a]">
        მოთამაშეებს მხოლოდ თემა უჩანს: {o.theme && <ThemeTag theme={o.theme} />}
      </p>
    );
  }
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-3.5 space-y-2">
      {o.theme && <ThemeTag theme={o.theme} big />}
      <p className="font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426]">რა სიტყვას გიხსნის?</p>
      <p className="text-[12.5px] leading-snug text-[#75685a]">უსმინე ამხსნელს ზარში. დაწერე ერთი სიტყვა: რამდენიმე ერთად არ ჩაითვლება.</p>
    </section>
  );
};

/** the word, on the host's phone only */
const Secret: NonNullable<RoundFace['Secret']> = ({ q }) => {
  if (q.kind !== 'amikhseni') return null;
  return (
    <section className="rounded-3xl bg-[#7a2028] text-white px-4 py-4 text-center shadow-[0_10px_24px_-14px_rgba(122,32,40,0.7)]">
      <p className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#f0d9a0]"><Eye className="w-4 h-4" />მხოლოდ შენ ხედავ</p>
      <p className="mt-1 font-serif-ge text-[32px] sm:text-[40px] font-bold leading-tight [overflow-wrap:anywhere]">{q.id}</p>
      <p className="mt-1.5 text-[12.5px] leading-snug text-white/80">ნუ იტყვი თვითონ სიტყვას და მის ნაწილს.</p>
    </section>
  );
};

/** „სხვა სიტყვა“: before anybody answers, the host may take another word of the same theme (the clock goes on) */
const Tool: NonNullable<RoundFace['Tool']> = ({ q, edit, answered }) => {
  const [none, setNone] = useState(false);
  if (q.kind !== 'amikhseni' || answered > 0) return null;
  const swap = () => {
    const next = swapAmikhseni({ cats: WORD_CATEGORIES, q, seen: readSeen() });
    if (!next) { setNone(true); return; }
    triggerHaptic(10);
    rememberSeen([next.id]);
    edit(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Btn kind="ghost" onClick={swap} disabled={none} icon={<RefreshCw />}>სხვა სიტყვა</Btn>
      <span className="text-[12.5px] leading-snug text-[#9a8b7b]">{none ? 'ამ თემაში სხვა სიტყვა აღარ არის.' : 'არ იცი ეს სიტყვა? სანამ ვინმე უპასუხებს. დრო არ ჩერდება.'}</span>
    </div>
  );
};

/** the word, big, with its theme */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.id) return null;
  return (
    <section className="rounded-3xl bg-[#7a2028]/[0.06] ring-1 ring-[#7a2028]/20 px-4 py-4 sm:px-5 space-y-2">
      <p className="text-[12px] font-bold text-[#9a8b7b]">სიტყვა იყო</p>
      <p className="font-serif-ge text-[26px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{o.id}</p>
      {o.theme && <ThemeTag theme={o.theme} />}
    </section>
  );
};

export const AMIK_FACE: RoundFace = {
  game: 'amikhseni',
  // `sg-amikhseni` holds the one-phone game's settings
  store: 'sg-amikhseni-klasi',
  title: 'ამიხსენი',
  Icon: MessageCircle,
  intro: 'სიტყვა სხვა სიტყვებით უნდა ახსნა: ჩონგური, ხორუმი, ჩურჩხელა, ვეფხისტყაოსანი. თვითონ სიტყვას და მის ნაწილს ვერ იტყვი. თხუთმეტი თემა: გალობა და სიმღერა, კუთხეები, სამზარეულო, ბუნება, დიდი ქართველები, კინო, სპორტი, ისტორია…',
  online: 'ონლაინ: ოთახს ამხსნელი ხსნის, თვითონ არ თამაშობს. სიტყვა მხოლოდ მის ტელეფონზე ჩანს, სხვებს მხოლოდ თემა. ამხსნელი თამაშის ზარში ხსნის, დანარჩენები სახლიდანაც უსმენენ და სიტყვას თავის ტელეფონზე წერენ, ერთხელ: სწორი მაშინვე 1000 ქულაა, ბოლო წამს 500.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი, კლასი გუნდებად. ამხსნელს ტელეფონი ხელში უჭირავს და თავის გუნდს წუთში რაც შეიძლება მეტ სიტყვას უხსნის: გამოიცნეს — ქულა, გამოტოვება — მინუსი. ზარის მერე ტელეფონი შემდეგ გუნდს გადაეცემა.',
  draw: count => drawAmikhseni({ cats: WORD_CATEGORIES, chosen: readConf().settings.categories, count, seen: readSeen() }),
  remember: rounds => rememberSeen(rounds.flatMap(r => (r.kind === 'amikhseni' ? [r.id] : []))),
  askHost: 'აუხსენი სიტყვა ზარში. მოთამაშეები მას თავის ტელეფონზე წერენ.',
  askPlayer: 'უსმინე და დაწერე სიტყვა.',
  askTeams: 'აუხსენი სიტყვა შენს გუნდს.',
  clipSeconds: 0,
  Ask,
  Secret,
  Tool,
  hostLine: 'შენ იქნები ამხსნელი: სიტყვას მხოლოდ შენ ხედავ და ზარში ხსნი, ქულებს ვერ აგროვებ. კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; ვინც შემოვა, ის ცნობს (40-მდე).',
  Options: AmikThemes,
  typed: { placeholder: 'მაგ.: ჩონგური' },
  // answered in words: the shared screens give the field, the verdict and everybody's answers
  Pick: () => null,
  pickName: () => '',
  confirm: () => 'პასუხის გაგზავნა',
  Reveal: () => null,
  Answer,
  verdict: () => ({ tone: 'none', text: '' }),
  marks: [{ points: 1, label: 'სწორი' }, { points: 0, label: 'ვერა' }],
  empty: 'არჩეულ თემებში სიტყვა ვერ მოიძებნა — აირჩიე სხვა თემებიც.',
  callHint: 'ამხსნელს ზარში უსმენთ: ჩართეთ ხმა. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას წერს.',
};
