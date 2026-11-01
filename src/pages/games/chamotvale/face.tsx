import React, { useEffect, useRef, useState } from 'react';
import { Check, ListOrdered, Users } from 'lucide-react';
import { CHAMO_LISTS } from '../../../data/chamotvaleLists';
import {
  CHAMO_MARKS, CHAMO_TOPICS, countOf, drawChamotvale, foundOf, maskOf, tryName, type ChamotvaleQ,
} from '../../../utils/chamotvale';
import type { PublicQ } from '../../../utils/roundGames';
import { Chip } from '../../../components/games/Chip';
import { openQ, type RoundFace } from '../rounds/face';
import { CountLine, FillMap, Slots, type SlotState } from './Board';
import { Entry } from './Entry';
import { readSeen, rememberPlayed, topics } from './store';

// „ჩამოთვალე!“ in a class's room (the quick games' screens): every phone gets the same list against the same clock and types
// it on its own; the whole list goes in by itself, else the members found go in as the time runs out (`autoSend`,
// `sendLate`). The reveal shows the list with how many named each member. Alone and the teams on one phone are Solo.tsx and
// Teams.tsx; the rules utils/chamotvale.ts.

const q$ = (q: PublicQ) => openQ<ChamotvaleQ>(q);
const sizeOf = (q: PublicQ) => q$(q).items?.length ?? 0;

const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  if (!o.items) return null;
  return (
    <div className="rounded-2xl bg-[#7a2028]/[0.06] px-3.5 py-2.5">
      <p className="flex items-start gap-2 font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">
        <ListOrdered className="w-5 h-5 shrink-0 mt-0.5 text-[#7a2028]" />{o.title} · {o.items.length}
      </p>
      <p className="mt-1 text-[12.5px] leading-snug text-[#75685a]">
        {who === 'player' ? o.note ?? 'ჩამოთვალე ყველა, სანამ დრო გავა.' : 'მოთამაშეები სიას თავის ტელეფონზე წერენ.'}
      </p>
    </div>
  );
};

const Playing: React.FC<{ q: ChamotvaleQ; onPick: (p: number | null) => void }> = ({ q, onPick }) => {
  const [found, setFound] = useState(() => q.items.map(() => false));
  const [fresh, setFresh] = useState<number | null>(null);
  const sent = useRef<number | null>(null);
  useEffect(() => {
    const m = found.some(Boolean) ? maskOf(found) : null;
    if (m !== sent.current) { sent.current = m; onPick(m); }
  }, [found, onPick]);
  useEffect(() => {
    if (fresh === null) return;
    const t = window.setTimeout(() => setFresh(null), 900);
    return () => window.clearTimeout(t);
  }, [fresh]);
  const onTry = (text: string, enter: boolean) => {
    const t = tryName(q, found, text, enter);
    if (t.kind === 'found') {
      setFound(f => { const n = f.slice(); n[t.item] = true; return n; });
      setFresh(t.item);
    }
    return t;
  };
  const state = (i: number): SlotState => (found[i] ? 'found' : 'empty');
  const got = found.filter(Boolean).length;
  return (
    <div className="space-y-3">
      <CountLine found={got} n={q.items.length} />
      <Entry items={q.items} onTry={onTry}>
        {got === q.items.length && <p className="text-center text-[14px] font-bold text-[#2f7d4f]" role="status">მთელი სია! პასუხი იგზავნება…</p>}
        {q.map && <FillMap state={state} />}
        <Slots items={q.items} state={state} fresh={fresh} />
      </Entry>
    </div>
  );
};

const Pick: RoundFace['Pick'] = ({ q, onPick }) => {
  const o = q$(q);
  if (!o.items) return null;
  return <Playing key={o.id} q={o as ChamotvaleQ} onPick={onPick} />;
};

const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.items) return null;
  return <Slots items={o.items} state={() => 'shown'} />;
};

/** how many named each member; mine green, the ones I missed red */
const Reveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const o = q$(q);
  const n = sizeOf(q);
  if (!o.items || !n) return null;
  const masks = (picks ?? []).flatMap(p => (p === null ? [] : [foundOf(p, n)]));
  const counts = o.items.map((_, i) => masks.filter(m => m[i]).length);
  const my = mine === undefined ? null : foundOf(mine ?? 0, n);
  const whole = masks.filter(m => m.every(Boolean)).length;
  const state = (i: number): SlotState => (my ? (my[i] ? 'found' : 'missed') : 'shown');
  const hardest = picks && masks.length ? o.items.map((it, i) => ({ it, c: counts[i] })).sort((a, b) => a.c - b.c)[0] : null;
  return (
    <section className="space-y-2.5">
      {picks && (
        <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-1.5">
          <p className="flex items-center gap-2 text-[14.5px] font-bold text-[#24603d]"><Check className="w-5 h-5 shrink-0" />მთელი სია: {whole} / {picks.length}</p>
          {hardest && <p className="text-[13.5px] font-bold text-[#8f2735]">ყველაზე ძნელი: {hardest.it.name} — {hardest.c} / {picks.length}</p>}
        </div>
      )}
      {o.map && <FillMap state={state} />}
      <Slots
        items={o.items}
        state={state}
        badge={picks ? i => (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 text-[11px] font-bold tabular-nums ${my && my[i] ? 'bg-white/25 text-white' : 'bg-[#4a3426]/[0.08] text-[#4a3426]'}`}>
            <Users className="w-3 h-3" />{counts[i]}
          </span>
        ) : undefined}
      />
    </section>
  );
};

/** the lobby's and the one-phone setup's choice: the lists' topics (none = all) */
const Options: React.FC = () => {
  const on = topics.use();
  const flip = (id: typeof CHAMO_TOPICS[number]['id']) => topics.set(on.includes(id) ? on.filter(x => x !== id) : [...on, id]);
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-bold text-[#4a3426]">თემები</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="თემები">
        <Chip on={!on.length} onClick={() => topics.set([])}>ყველა</Chip>
        {CHAMO_TOPICS.map(t => <Chip key={t.id} on={on.includes(t.id)} onClick={() => flip(t.id)}>{t.label}</Chip>)}
      </div>
    </div>
  );
};

export const CHAMO_FACE: RoundFace = {
  game: 'chamotvale',
  title: 'ჩამოთვალე!',
  Icon: ListOrdered,
  intro: 'დროზე უნდა ჩამოთვალო სიის ყველა წევრი: 12 მოციქული, რუკის 13 კუთხე, ლარის ბანკნოტების სახეები, მზის სისტემის პლანეტები… სახელი თავისით ჩაიწერება, როცა ბოლომდე დაწერ, ერთ-ორ ასოს შეცდომას აპი გაპატიებს; ბოლოს გამორჩენილებს ნახავ.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. ყველას ერთი და იგივე სია აქვს, ყველა თავის ტელეფონზე წერს. ყოველი ნაპოვნი 100 ქულაა; ვინც მთელ სიას ჩამოთვლის, 400-მდე ქულას იღებს დამატებით — მით მეტს, რაც უფრო სწრაფად.',
  hybrid: 'ჰიბრიდული: ტელეფონი ცარიელ სიას და საათს კლასს აჩვენებს, 2–6 გუნდი რიგრიგობით ასახელებს, მასწავლებელი წერს. სწორი სახელი გუნდის ფერს იღებს; ვინც ვეღარ გაიხსენებს, სვლა შემდეგზე გადადის.',
  draw: count => drawChamotvale({ lists: CHAMO_LISTS, count, topics: topics.read(), seen: readSeen() }),
  remember: rounds => rememberPlayed(rounds.flatMap(r => (r.kind === 'chamotvale' ? [r.id] : []))),
  askHost: 'მოთამაშეები სიას თავის ტელეფონზე წერენ.',
  askPlayer: 'ჩამოთვალე ყველა.',
  askTeams: 'ჩამოთვალეთ.',
  clipSeconds: 0,
  autoSend: (q, pick) => countOf(pick, sizeOf(q)) >= sizeOf(q),
  sendLate: true,
  Ask,
  Options,
  Pick,
  pickName: (q, pick) => `${countOf(pick, sizeOf(q))} / ${sizeOf(q)}`,
  confirm: (q, pick) => (pick === null ? 'ჩაწერე ერთი მაინც' : `გაგზავნა · ${countOf(pick, sizeOf(q))} / ${sizeOf(q)}`),
  Reveal,
  Answer,
  verdict: (q, pick) => {
    const n = sizeOf(q);
    if (pick === null) return { tone: 'none', text: 'ვერაფერი ჩაწერე' };
    const got = countOf(pick, n);
    if (got >= n) return { tone: 'right', text: 'მთელი სია!' };
    return { tone: 'near', text: `${got} / ${n}` };
  },
  marks: CHAMO_MARKS,
  empty: 'სიები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. წერის დროს მიკროფონი გამორთეთ — ერთმანეთს არ უკარნახოთ!',
};
