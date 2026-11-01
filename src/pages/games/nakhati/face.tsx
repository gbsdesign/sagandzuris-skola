import React, { useEffect, useRef } from 'react';
import { Brush, Check, Eye } from 'lucide-react';
import { NAKHATI_WORDS, nakhatiNote } from '../../../data/nakhatiWords';
import { drawNakhati, type NakhatiQ } from '../../../utils/nakhati';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { triggerHaptic } from '../../../utils/haptics';
import { InkPad, InkView, inkWidth } from '../../../components/games/Ink';
import { openQ, type RoundFace } from '../rounds/face';
import { FourReveal, LOOK, Letter, fourConfirm, fourName } from '../rounds/four';
import { DRAW_RULE, NakhatiOptions, ThemeTag } from './parts';
import { readSeen, readThemes, rememberSeen } from './store';

// „ნახატობანა“ in a class's room (the quick games' screens, 2026-11-01): the host is the artist — the word is on their phone
// only (`Secret`), they draw it on the pad (`Tool`), and the drawing reaches every phone about once a second (the round's
// `ink`, through the room's view: `edit`), drawn on there as if it were drawn now. Every player picks the word out of four
// of its theme — the quicker, the more. The one-phone game with teams is Table.tsx, the chat's riddle Riddle.tsx; the rules
// utils/nakhati.ts, the words data/nakhatiWords.ts.

const q$ = (q: PublicQ) => openQ<NakhatiQ>(q);
/** the host's drawing goes out at most this often (a room's view is one document: about a write a second) */
const SEND_MS = 1000;

/** the drawing, growing on a player's phone */
const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  if (who === 'host') return null;
  const o = q$(q);
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {o.theme && <ThemeTag theme={o.theme} />}
        {!o.ink && <span className="text-[12.5px] font-bold text-[#9a8b7b]">მხატვარი იწყებს…</span>}
      </div>
      <InkView ink={o.ink ?? ''} mode="grow" growMs={SEND_MS - 100} width={inkWidth(400)} label="მხატვრის ნახატი" />
    </section>
  );
};

/** the word, on the host's phone only */
const Secret: NonNullable<RoundFace['Secret']> = ({ q }) => {
  if (q.kind !== 'nakhati') return null;
  return (
    <section className="rounded-2xl bg-[#7a2028] text-white px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 shadow-[0_10px_24px_-14px_rgba(122,32,40,0.7)]">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#f0d9a0]"><Eye className="w-4 h-4" />მხოლოდ შენ ხედავ · დახატე</span>
      <span className="font-serif-ge text-[24px] font-bold leading-tight [overflow-wrap:anywhere]">{q.id}</span>
    </section>
  );
};

/** the host's pad: what is drawn goes out to every phone, at most once a second (and when a line ends, soon after) */
const Tool: NonNullable<RoundFace['Tool']> = ({ q, edit }) => {
  const round = useRef(q);
  round.current = q;
  const latest = useRef(q.kind === 'nakhati' ? q.ink ?? '' : '');
  const last = useRef(0);
  const timer = useRef<number | null>(null);
  const push = () => {
    timer.current = null;
    last.current = Date.now();
    const cur = round.current;
    if (cur.kind === 'nakhati' && (cur.ink ?? '') !== latest.current) edit({ ...cur, ink: latest.current } as RoundQ);
  };
  useEffect(() => () => { if (timer.current !== null) { window.clearTimeout(timer.current); push(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.kind !== 'nakhati') return null;
  const onChange = (ink: string) => {
    latest.current = ink;
    if (timer.current !== null) return;
    timer.current = window.setTimeout(push, Math.max(60, SEND_MS - (Date.now() - last.current)));
  };
  return (
    <section className="space-y-1.5">
      <InkPad initial={q.ink ?? ''} onChange={onChange} width={inkWidth(380)} />
      <p className="text-center text-[12px] leading-snug text-[#9a8b7b]">{DRAW_RULE}</p>
    </section>
  );
};

/** four words, two a row (the drawing above needs the room) */
const Pick: RoundFace['Pick'] = ({ q, pick, onPick }) => (
  <ul className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="პასუხები">
    {(q$(q).options ?? []).map((text, i) => {
      const on = pick === i;
      return (
        <li key={i}>
          <button
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => { triggerHaptic(8); onPick(i); }}
            className={`w-full h-full min-h-14 flex items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition-[background-color,transform] active:scale-[0.99] cursor-pointer ${on ? LOOK[i].on : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'}`}
          >
            <Letter i={i} size="sm" />
            <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{text}</span>
            {on && <Check className={`w-4.5 h-4.5 shrink-0 ${LOOK[i].ink}`} aria-hidden="true" />}
          </button>
        </li>
      );
    })}
  </ul>
);

/** the word, its note and the drawing whole */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.id) return null;
  const note = nakhatiNote(o.id);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-2.5">
      {o.theme && <ThemeTag theme={o.theme} />}
      <p className="font-serif-ge text-[24px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.id}</p>
      {note && <p className="text-[13.5px] leading-snug text-[#75685a]">{note}</p>}
      {o.ink && <InkView ink={o.ink} width="min(100%, 300px)" label={`ნახატი: ${o.id}`} />}
    </section>
  );
};

export const NAKHATI_FACE: RoundFace = {
  game: 'nakhati',
  title: 'ნახატობანა',
  Icon: Brush,
  intro: 'ერთი ხატავს, დანარჩენები ცნობენ: ხინკალი, ჩონგური, ჯიხვი, სვანური კოშკი, ნაცარქექია… ასოები და ციფრები არ შეიძლება — მხოლოდ ნახატი. ვინც მალე მიხვდება, მეტ ქულას იღებს.',
  online: 'ონლაინ: ოთახს მხატვარი ხსნის — სიტყვას მხოლოდ ის ხედავს და თავის ტელეფონზე ხატავს. ნახატი ყველას თავის ტელეფონზე ეხატება, როგორც იხატება, და ოთხი სიტყვიდან ერთს ირჩევენ: სწორი მაშინვე 1000 ქულაა, ბოლო წამს 500. სხვას თუ უნდა ხატვა, თავის ოთახს გახსნის.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი, კლასი გუნდებად. მხატვარი ტელეფონზე სიტყვას ნახავს და დაფაზე, ქაღალდზე ან თვითონ ეკრანზე ხატავს; გუნდი დროზე იცნობს. ყოველი წრის ბოლოს შეიძლება „ყველა ხატავს“: ყველა გუნდის მხატვარი ერთ სიტყვას ხატავს, ქულა პირველს.',
  hostLine: 'შენ იქნები მხატვარი: სიტყვას მხოლოდ შენ ხედავ და შენ ხატავ, ქულებს ვერ აგროვებ. კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; ვინც შემოვა, ის ცნობს (40-მდე).',
  draw: count => drawNakhati({ words: NAKHATI_WORDS, themes: readThemes(), count, seen: readSeen() }),
  remember: rounds => rememberSeen(rounds.flatMap(r => (r.kind === 'nakhati' ? [r.id] : []))),
  askHost: 'დახატე — ყველა თავის ტელეფონზე ხედავს.',
  askPlayer: 'რას ხატავს მხატვარი? მონიშნე.',
  askTeams: 'დახატე სიტყვა.',
  clipSeconds: 0,
  Ask,
  Secret,
  Tool,
  Options: NakhatiOptions,
  Pick,
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
  callHint: 'ნახატს ყველა თავის ტელეფონზე ხედავს — ზარი მხოლოდ სალაპარაკოდაა. პასუხს ხმამაღლა ნუ იტყვით.',
};
