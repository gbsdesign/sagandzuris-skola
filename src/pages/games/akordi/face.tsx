import React, { useSyncExternalStore } from 'react';
import { Piano } from 'lucide-react';
import { CHORD_POOL } from '../../../data/chordPool';
import {
  AKORDI_LEVELS, AKORDI_MARKS, AKORDI_TOP, BASIC_KINDS, CHORD_KINDS, akordiDemo, akordiNotes, chordKey, drawAkordiRounds, kindById, kindLabel,
  kindOfChord, rememberChords, type AkordiLevel, type AkordiQ,
} from '../../../utils/akordi';
import { noteName } from '../../../utils/pearls';
import { OTKHI_LETTERS } from '../../../utils/otkhi';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { openQ, type RoundFace } from '../rounds/face';
import { FourPick, FourReveal, OptionList, fourConfirm, fourName } from '../rounds/four';
import { StepRow } from '../rounds/steps';
import { PlayDot, useSampler } from '../rounds/samples';

// „ქართული აკორდი“ (2026-11-01, like Perfect Ear) over the quick games' screens: a real chord of the app's chants and songs on
// the synthesizer — all three voices at once, then voice by voice from the bass up — and four kinds to name it by
// (rounds/four.tsx). Rules utils/akordi.ts, the chords data/chordPool.ts (scripts/build-chord-pool.mjs). Under the tabs a guide:
// every kind with a chord to hear.

const q$ = (q: PublicQ) => openQ<AkordiQ>(q);

// kept on this phone: the level, and the chords asked lately
const STEM = 'sg-akordi';
const SEEN = `${STEM}-seen`;
const LEVEL = `${STEM}-level`;
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const readSeen = (): string[] => { const v = load(SEEN); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; };

let level: AkordiLevel | null = null;
const subs = new Set<() => void>();
const readLevel = (): AkordiLevel => (level ??= AKORDI_LEVELS.find(k => k === load(LEVEL)) ?? 'basic');
const setLevel = (k: AkordiLevel) => {
  level = k;
  try { localStorage.setItem(LEVEL, JSON.stringify(k)); } catch { /* private mode */ }
  subs.forEach(f => f());
};
const useLevel = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, readLevel);

const LEVEL_LABEL: Record<AkordiLevel, string> = { basic: 'საწყისი', all: 'ყველა' };
const LEVEL_COUNT: Record<AkordiLevel, number> = { basic: BASIC_KINDS.length, all: CHORD_KINDS.length };

/** the level: the lobby's choice (the host's) and the one-phone setup's */
const Levels: React.FC = () => {
  const on = useLevel();
  return (
    <div className="space-y-2">
      <p className="text-[13.5px] font-bold text-[#4a3426]">დონე</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="დონე">
        {AKORDI_LEVELS.map(k => (
          <Chip key={k} on={on === k} onClick={() => setLevel(k)}>
            {LEVEL_LABEL[k]}
            <span className={`ml-1 tabular-nums ${on === k ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{LEVEL_COUNT[k]} აკორდი</span>
          </Chip>
        ))}
      </div>
      <p className="text-[12.5px] leading-snug text-[#75685a]">
        {on === 'basic'
          ? 'ოთხი ყველაზე მკაფიო აკორდი — პასუხები ყოველთვის ეს ოთხია: 1-1-1, 1-5-8, 1-3-5, 1-5-7.'
          : 'ცხრავე აკორდი — ყოველ რაუნდში ოთხი მათგანიდან ირჩევ.'}
      </p>
    </div>
  );
};

const STEP_NAMES = ['ერთად', 'ხმა-ხმად'];

const Ask: NonNullable<RoundFace['Ask']> = ({ q, who, step }) => (
  <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
    <p className="font-serif-ge text-[20px] sm:text-[22px] font-bold leading-snug text-[#4a3426]">რომელი აკორდია?</p>
    <StepRow
      names={STEP_NAMES}
      worth={who === 'teams' ? AKORDI_MARKS.slice(0, 2).map(m => `${m.points} ქულა`) : AKORDI_TOP.map(p => `${p}-მდე`)}
      step={step}
    />
    {who !== 'player' && <OptionList q={q} className="mt-3.5" />}
  </section>
);

const VOICE_WORDS = ['მთქმელი', 'მოძახილი', 'ბანი'];

/** the chord: its kind, what it sounds like, its notes, the piece it is from */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.notes || o.right === undefined) return null;
  const kind = kindById(kindOfChord(o.notes) ?? '');
  const major = kind?.id === 'triad' ? (o.notes[1] - o.notes[2] === 4 ? 'მაჟორული' : 'მინორული') : null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      <Pill>{major ? `${kind?.steps} · ${major}` : kind?.steps ?? 'აკორდი'}</Pill>
      <p className="mt-2 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426]">{kind?.name ?? o.options?.[o.right]}</p>
      {kind && <p className="mt-1 text-[13.5px] leading-snug text-[#4a3426]">{kind.hint}</p>}
      <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="ნოტები">
        {o.notes.map((m, i) => (
          <li key={i} className="h-8 px-2.5 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] inline-flex items-center gap-1.5 text-[12.5px]">
            <span className="text-[#75685a]">{VOICE_WORDS[i]}</span><b className="text-[#4a3426]">{noteName(m)}</b>
          </li>
        ))}
      </ul>
      {o.title && <p className="mt-2.5 text-[13px] leading-snug text-[#75685a]">აღებულია: <b className="text-[#4a3426]">{o.title}</b>{o.ref ? ` · ${o.ref}` : ''}</p>}
    </section>
  );
};

/** the guide under the tabs: every kind with a chord of it to hear — at once, then voice by voice */
const Guide: React.FC = () => {
  const s = useSampler(8);
  const on = useLevel();
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 sm:px-5">
      <h2 className="font-serif-ge text-[17px] font-bold text-[#4a3426]">აკორდების ცნობარი</h2>
      <p className="mt-1 text-[13px] leading-snug text-[#75685a]">მოუსმინე თითოს: ჯერ სამივე ხმა ერთად ჟღერს, მერე ბანიდან ზემოთ, ხმა-ხმად. ციფრები ბანიდან ითვლება: 1-5-8 — ბანი, მისი კვინტა და ოქტავა.</p>
      <ul className="mt-3 divide-y divide-[#efe5d4]">
        {CHORD_KINDS.map((k, i) => {
          const sample = CHORD_POOL.find(c => c[0] === k.id);
          const basic = BASIC_KINDS.includes(k.id);
          return (
            <li key={k.id} className="flex items-start gap-3 py-2.5">
              {sample
                ? <PlayDot busy={s.isOn(i)} load={s.isLoading(i)} label={`${kindLabel(k)} — მოსმენა`} onTap={() => s.tap(i, { notes: akordiDemo([sample[1], sample[2], sample[3]]) })} size="sm" />
                : <span className="w-10 h-10 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-bold leading-snug text-[#4a3426]">
                  <span className="tabular-nums text-[#7a2028]">{k.steps}</span> · {k.name}
                  {on === 'basic' && basic && <span className="ml-1.5 align-middle"><Pill tone="muted">საწყისი</Pill></span>}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{k.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const at = (step: number) => (step >= 2 ? 1 : 0);

export const AKORDI_FACE: RoundFace = {
  game: 'akordi',
  title: 'ქართული აკორდი',
  Icon: Piano,
  intro: 'საგალობლისა და ხალხური სიმღერის ნამდვილი აკორდი, წიგნის ნოტებიდან, სინთეზატორზე ჟღერს: ჯერ სამივე ხმა ერთად, მერე ბანიდან ზემოთ, ხმა-ხმად. ოთხი პასუხიდან სწორი უნდა აირჩიო — 1-5-8, 1-3-5, 1-5-7… რაც ადრე მიხვდები, მით მეტი ქულა. ქვემოთ ცნობარია: ცხრავე აკორდი მოსასმენად.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. აკორდი ყველას თავის ტელეფონზე ჟღერს — სახლიდანაც (ერთ ოთახში მხოლოდ წამყვანისაზე). პასუხს რაუნდში ერთხელ ნიშნავ: ერთად ჟღერისას მიხვდები — 1000-მდე ქულაა, ხმა-ხმად — 500-მდე.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. წამყვანი აკორდს რთავს და ოთხ პასუხს კითხულობს; გუნდი ფურცელზე ასოს წერს და ნიშნავს, როდის მიხვდა (1 — ერთად, 2 — ხმა-ხმად). მერე ტელეფონი სწორს აჩენს და წამყვანი თითო გუნდს უნიშნავს; ქულებს ტელეფონი ითვლის.',
  draw: count => drawAkordiRounds(CHORD_POOL, count, readLevel(), readSeen()),
  remember: (rounds: RoundQ[]) => {
    const keys = rounds.filter((r): r is AkordiQ => r.kind === 'akordi').flatMap(r => {
      const k = kindOfChord(r.notes);
      return k ? [chordKey(k, r.notes)] : [];
    });
    try { localStorage.setItem(SEEN, JSON.stringify(rememberChords(readSeen(), keys))); } catch { /* private mode */ }
  },
  askHost: 'მოთამაშეები პასუხს თავის ტელეფონზე ნიშნავენ.',
  askPlayer: 'მოისმინე და მონიშნე, რომელი აკორდია.',
  askTeams: 'წაიკითხე პასუხები. გუნდები ასოს და ნაბიჯს წერენ.',
  clip: (q, step) => { const o = q$(q); return o.notes ? { notes: akordiNotes(o.notes, step) } : null; },
  clipSeconds: 5,
  nextLabel: 'ხმა-ხმად',
  Ask,
  Options: Levels,
  Extra: Guide,
  Pick: FourPick,
  pickName: fourName,
  confirm: fourConfirm,
  Reveal: FourReveal,
  Answer,
  verdict: (q, pick, step) => {
    const o = q$(q);
    if (pick === null || o.right === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    if (pick === o.right) return { tone: 'right', text: step ? `სწორია! ${at(step) ? 'ხმა-ხმად' : 'ერთად ჟღერისას'} მიხვდი` : 'სწორია!' };
    return { tone: 'wrong', text: `არა — სწორი იყო ${OTKHI_LETTERS[o.right]}` };
  },
  marks: AKORDI_MARKS,
  empty: 'აკორდები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
