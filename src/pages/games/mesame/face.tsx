import React, { useEffect, useState } from 'react';
import { Headphones, Layers3, Loader2, Mic, RotateCcw, Square } from 'lucide-react';
import { knownChants } from '../../../data/chantGamePool';
import { rememberChants } from '../../../utils/chantRounds';
import { singingSupported } from '../../../utils/singCapture';
import { TRIO_ROUNDS, drawTrio, placeOf, type TrioQ } from '../../../utils/trio';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { Btn, Pill } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { openQ, type RoundFace } from '../rounds/face';
import { Answer, Reveal } from '../turniri/face';
import { pctTone } from '../turniri/Sing';
import { Lane, hintOf } from './Lane';
import { VOICE_LABELS, sectionOf, trioVoices, useChantScore } from './plan';
import { readConf, readSeen, saveConf, saveSeen } from './store';
import { SILENT, useTrioTake } from './useTrioTake';

// „მესამე ხმა“ in a class's room (the quick games' screens): three rounds, a chant's opening each; every player picks
// their voice and sings it on their own phone in earphones while the phone sings the other two — the share sung right is
// the round's points. A take may be sung again before it is sent; the notes not sung count as missed. Alone: Solo.tsx;
// one phone with a speaker: Table.tsx.

const q$ = (q: PublicQ) => openQ<TrioQ>(q);

const Ask: NonNullable<RoundFace['Ask']> = ({ q }) => {
  const o = q$(q);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
      {o.service && <Pill>{o.service}</Pill>}
      <p className="mt-2.5 font-serif-ge text-[21px] sm:text-[22px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.title}</p>
      <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a]">
        <Headphones className="w-4 h-4 shrink-0 mt-px text-[#7a2028]" />
        დასაწყისი — ყურსასმენით: ტელეფონი ორ ხმას გალობს, მესამეს შენ
      </p>
    </section>
  );
};

/** a player's take of the round: their voice, the opening sung with the other two, the share sung right */
const Round: React.FC<{ q: PublicQ; onScore: (pct: number | null) => void }> = ({ q, onScore }) => {
  const o = q$(q);
  const [voice, setVoice] = useState(() => readConf().voice);
  const { loaded, failed } = useChantScore(o.book, o.num);
  const v = Math.min(voice, trioVoices(loaded) - 1);
  const section = loaded ? sectionOf(loaded, v, false) : null;
  const take = useTrioTake();
  const r = take.result;
  useEffect(() => { if (r) onScore(r.pct); }, [r]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!singingSupported()) {
    return <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-[13.5px] font-bold leading-snug text-amber-900">ამ ბრაუზერში მიკროფონი არ მუშაობს — სცადე Chrome ან Safari.</p>;
  }
  const busy = take.state === 'count' || take.state === 'sing';
  const pick = (n: number) => {
    if (busy || take.state === 'score' || n === v) return;
    setVoice(n);
    saveConf({ ...readConf(), voice: n });
    // the take was of the other voice
    if (r) { take.reset(); onScore(null); }
  };
  const begin = () => {
    if (!loaded || !section?.notes.length) return;
    if (r) onScore(null);
    void take.start({ score: loaded.score, voice: v, from: section.from, to: section.to, speed: 1, guide: false, notes: section.notes, strict: true });
  };
  const live = take.live();
  const frames = r ? r.frames : (live?.frames ?? []).map(f => ({ t: f.t / 1000, midi: f.midi }));
  const place = r ? placeOf(section?.from ?? 0, r.delay, 1) : live?.place ?? (() => -1e9);
  const hint = take.state === 'sing' && section ? hintOf(section.notes, frames, place) : null;

  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 space-y-3.5">
      <div className="space-y-2">
        <p className="text-[13px] font-bold text-[#75685a]">შენი ხმა</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="შენი ხმა">
          {VOICE_LABELS.slice(0, trioVoices(loaded)).map((label, n) => <Chip key={n} on={v === n} disabled={busy} onClick={() => pick(n)}>{label}</Chip>)}
        </div>
      </div>
      {failed ? (
        <p className="text-[13.5px] font-bold leading-snug text-[#b3261e]">ნოტები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>
      ) : !section ? (
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-[#75685a]"><Loader2 className="w-4 h-4 animate-spin" />ნოტები იტვირთება…</p>
      ) : !section.notes.length ? (
        <p className="text-[13.5px] font-bold text-[#a0703c]">ამ ხმას დასაწყისში ნოტები არ აქვს — სხვა ხმა აირჩიე.</p>
      ) : (
        <>
          {(busy || r) && (
            <div className="relative rounded-2xl ring-1 ring-[#efe5d4] overflow-hidden">
              <Lane notes={section.notes} now={r ? null : take.state === 'sing' ? take.now : section.from} speed={1} frames={frames} place={place}
                credits={r?.credits} height={150} />
              {take.state === 'count' && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/60" aria-live="assertive">
                  <span key={take.count} className="font-serif-ge text-[56px] font-bold leading-none text-[#7a2028] animate-[samosi-pop_0.45s_ease-out]">{take.count}</span>
                </span>
              )}
            </div>
          )}
          {take.state === 'sing' && (
            <p className={`text-center text-[14px] font-bold ${hint === 'ok' ? 'text-[#2f7d4f]' : hint ? 'text-[#a0703c]' : 'text-[#75685a]'}`} role="status">
              {hint === 'ok' ? 'ზუსტად!' : hint === 'up' ? '↑ უფრო მაღლა' : hint === 'down' ? '↓ უფრო დაბლა' : 'იმღერე შენი ხმა'}
            </p>
          )}
          {take.state === 'score' && <p className="flex items-center gap-2 text-[13.5px] font-bold text-[#75685a]"><Loader2 className="w-4 h-4 animate-spin" />ვითვლი…</p>}
          {r && take.state === 'done' && (
            <>
              <p className={`text-center font-serif-ge text-[40px] font-bold leading-none tabular-nums ${pctTone(r.pct)}`} role="status">{r.pct}%</p>
              {r.frames.every(f => f.midi === null) && <p className="text-center text-[13.5px] font-bold leading-snug text-[#b3261e]">{SILENT}</p>}
            </>
          )}
          {!busy && take.state !== 'score' && !r && (
            <p className="flex items-start gap-2 text-[13px] leading-snug text-[#75685a]">
              <Headphones className="w-5 h-5 shrink-0 text-[#7a2028]" />
              ყურსასმენი გაიკეთე. ჯერ შენი პირველი ნოტი ჟღერს, 3-2-1 — და იწყება.
            </p>
          )}
        </>
      )}
      {take.problem && <p className="text-[13px] font-bold leading-snug text-[#b3261e]" role="alert">{take.problem}</p>}
      {busy ? (
        <Btn full kind="ghost" icon={<Square />} onClick={take.stop} className="!h-12">{take.state === 'count' ? 'გაუქმება' : 'დასრულება'}</Btn>
      ) : (
        <Btn full onClick={begin} disabled={!section?.notes.length || take.state === 'score'} icon={r ? <RotateCcw /> : <Mic />} className="!h-12">
          {r ? 'თავიდან' : 'დაწყება'}
        </Btn>
      )}
    </section>
  );
};

export const TRIO_FACE: RoundFace = {
  game: 'mesame',
  store: 'sg-mesame-room',
  title: 'მესამე ხმა',
  Icon: Layers3,
  intro: 'ქართული გალობა სამხმიანია. ტელეფონი საგალობლის ორ ხმას გალობს, მესამეს შენ ამბობ — I, II ან III; ეკრანზე ჩანს, სწორად მიჰყვები თუ არა, ბოლოს კი სამივე ხმა ერთად ისმის.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ მღერის. სამი რაუნდი, სამი საგალობლის დასაწყისი: ყველა თავის ტელეფონზე, ყურსასმენით მღერის თავის ხმას, ტელეფონი დანარჩენ ორს გალობს და ითვლის, რამდენი იმღერე სწორად — ეს შენი ქულაა. გაგზავნამდე თავიდან ცდაც შეიძლება.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი დინამიკით ერთ ან ორ ხმას გალობს, დანარჩენს კლასი ცოცხლად. ეკრანზე წიგნის სტრიქონი ჩანს, ტელეფონი ოთახს იწერს — ჩანაწერს მოისმენთ და კლასის ჩატში გაგზავნით.',
  draw: (count, program) => drawTrio(knownChants(program), count, readSeen()),
  remember: (rounds: RoundQ[]) => saveSeen(rememberChants(readSeen(), rounds.filter((r): r is TrioQ => r.kind === 'mesame').map(r => r.id))),
  askHost: 'მოთამაშეები თავის ტელეფონზე მღერიან.',
  askPlayer: 'ყურსასმენით იმღერე შენი ხმა.',
  askTeams: 'იმღერეთ.',
  clipSeconds: 0,
  fixedRounds: TRIO_ROUNDS,
  Ask,
  Pick: ({ q, onPick }) => <Round q={q} onScore={onPick} />,
  pickName: (_, pick) => `${pick}%`,
  confirm: (_, pick) => (pick === null ? 'ჯერ იმღერე' : `გაგზავნა · ${pick}%`),
  Reveal,
  Answer,
  verdict: (_, pick) => {
    if (pick === null) return { tone: 'none', text: 'ამ რაუნდში არ იმღერე' };
    if (pick >= 80) return { tone: 'right', text: `სამხმიანი! ${pick}%` };
    if (pick >= 50) return { tone: 'near', text: `კარგია! ${pick}%` };
    return { tone: 'wrong', text: `${pick}% — შემდეგ ჯერზე უკეთ` };
  },
  marks: [],
  empty: 'საგალობლები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. სიმღერისას ზარის ხმა დაუწიე — ყურსასმენში ტელეფონის ორი ხმა უნდა გესმოდეს.',
};
