import React, { useEffect, useState } from 'react';
import { Hand, Moon, Sun, ThumbsDown, ThumbsUp, Timer } from 'lucide-react';
import {
  SPIES_COUNT, checkAnswer, holder, inPlay, isSpy, live, markAsks, stepReady, stepsOf, targetsOf, toggleMark,
  type Marks, type NightActs, type RoleId, type SamGame, type StepId,
} from '../../../utils/samshvilde';
import { Btn } from '../../../components/ui/kit';
import { TableScreen } from '../../../components/games/TableScreen';
import type { AudioRef } from '../../../utils/gameSounds';
import { Foot, Hint, NameGrid, Ring, Words, useCountdown } from './parts';

// The night (the host alone looks; everybody's eyes are closed): the words of each step, then the names to point at.
// A role that is out keeps its words and its pause, so nobody learns who is gone. The first night every role wakes once
// to be known — with the printed cards the host marks here who woke up.

type Act = 'piper' | 'spies' | 'healer' | 'check';
const ACTS: StepId[] = ['piper', 'spies', 'healer', 'check'];
const MEET: Partial<Record<StepId, RoleId[]>> = { meetSpies: ['spy', 'boss'], meetWarden: ['warden', 'guard'], meetHealer: ['healer'], meetElder: ['elder'], meetPiper: ['piper'] };
const WAKES: Record<Act, RoleId[]> = { piper: ['piper'], spies: ['spy', 'boss'], healer: ['healer'], check: ['warden', 'guard'] };
const CALL: Partial<Record<StepId, string>> = { meetHealer: 'მკურნალო', meetElder: 'უხუცესო', meetPiper: 'მესტვირევ' };
const ROLE_LABEL: Partial<Record<RoleId, string>> = { spy: 'ჯაშუში', boss: 'თავკაცი', warden: 'ციხისთავი', guard: 'მეციხოვნე', healer: 'მკურნალი', elder: 'უხუცესი', piper: 'მესტვირე' };
const PICK_LABEL: Record<Act, string> = { piper: 'ვის აძინებს?', spies: 'ვინ მიჰყავთ?', healer: 'ვის იცავს?', check: 'ვის ამოწმებს?' };

/** what the host says at a step, and when its role goes back to sleep */
const wordsOf = (g: SamGame, step: StepId): { say: string; close?: string } => {
  const pair = g.roles.includes('guard');
  const w = pair ? 'ციხისთავო და მეციხოვნევ' : 'ციხისთავო';
  switch (step) {
    case 'dusk': return { say: 'ღამე დგება სამშვილდეში. ყველა თვალს ხუჭავს, თავს ხრის.' };
    case 'meetSpies': return { say: 'ჯაშუშებო, გაიღვიძეთ და ერთმანეთი გაიცანით. ამ ღამეს არავინ მიგყავთ.', close: 'ჯაშუშებო, დაიძინეთ.' };
    case 'meetWarden': return pair ? { say: `${w}, გაიღვიძეთ, რომ გაგიცნოთ.`, close: `${w}, დაიძინეთ.` } : { say: `${w}, გაიღვიძე, რომ გაგიცნო.`, close: `${w}, დაიძინე.` };
    case 'piper': return { say: 'მესტვირევ, გაიღვიძე. ვის აძინებ ამ ღამეს?', close: 'მესტვირევ, დაიძინე.' };
    case 'spies': return { say: 'ჯაშუშებო, გაიღვიძეთ. ვინ მიგყავთ ტყვედ? ერთზე შეთანხმდით — ვითვლი ათამდე.', close: 'ჯაშუშებო, დაიძინეთ.' };
    case 'healer': return { say: 'მკურნალო, გაიღვიძე. რომელ სახლს იცავ ლამპრით?', close: 'მკურნალო, დაიძინე.' };
    case 'check': return pair ? { say: `${w}, გაიღვიძეთ. ვის ამოწმებთ?`, close: `${w}, დაიძინეთ.` } : { say: `${w}, გაიღვიძე. ვის ამოწმებ?`, close: `${w}, დაიძინე.` };
    default: return { say: `${CALL[step]}, გაიღვიძე, რომ გაგიცნო.`, close: `${CALL[step]}, დაიძინე.` };
  }
};

/** who holds the step's roles, for the host's eyes */
const WhoWakes: React.FC<{ g: SamGame; roles: RoleId[] }> = ({ g, roles }) => {
  const rows = roles.flatMap(r => g.players.flatMap((p, i) => (p.role === r && inPlay(g, i) ? [{ r, name: p.name }] : [])));
  if (!rows.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {rows.map((x, k) => (
        <li key={k} className="inline-flex items-center gap-1.5 min-h-9 px-3 py-1 rounded-full bg-white/[0.08] ring-1 ring-white/15 text-[14px] font-bold text-[#f5ecdc]">
          <span className="text-[12px] font-normal text-[#e2c27a]">{ROLE_LABEL[x.r]}</span>{x.name}
        </li>
      ))}
    </ul>
  );
};

/** the step of a role that is out: the same words, the same pause */
const Pause: React.FC = () => {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(t); }, []);
  return (
    <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 px-4 py-3">
      <Hint dark>ეს როლი თამაშში აღარაა. თქვი იგივე სიტყვები და დაიცადე, თითქოს იღვიძებს — ასე ვერავინ მიხვდება, ვინ წავიდა.</Hint>
      <div className="mt-2.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-[#e2c27a]/70" style={{ width: on ? '100%' : '0%', transition: 'width 8s linear' }} />
      </div>
    </div>
  );
};

/** the host's ten, while the spies agree */
const SpiesCount: React.FC<{ audio: AudioRef; boss: boolean }> = ({ audio, boss }) => {
  const count = useCountdown(SPIES_COUNT, audio, false);
  return (
    <div className="flex items-center gap-3">
      <Ring left={count.left} total={SPIES_COUNT} dark size="md" />
      <div className="min-w-0 flex-1 space-y-2">
        <Btn kind="light" size="sm" icon={<Timer />} onClick={() => (count.started ? count.reset() : count.start())}>{count.started ? 'თავიდან' : 'ათამდე'}</Btn>
        <Hint dark>{boss ? 'თუ ვერ შეთანხმდნენ, თავკაცი წყვეტს.' : 'თუ ვერ შეთანხმდნენ, ამ ღამეს არავინ მიჰყავთ.'}</Hint>
      </div>
    </div>
  );
};

/** what the piper's tune changes tonight — the host still wakes the role as usual and says nothing */
const sleptNote = (g: SamGame, act: Act, acts: NightActs): string | null => {
  if (acts.piper === undefined) return null;
  if (act === 'healer' && acts.piper === holder(g, 'healer')) return 'მესტვირემ მკურნალი ჩააძინა: ამ ღამეს მისი დაცვა არ ჩაითვლება. გააღვიძე ჩვეულებრივად და არაფერი უთხრა.';
  const spies = live(g).filter(i => isSpy(g.players[i].role));
  if (act === 'spies' && spies.length === 1 && spies[0] === acts.piper) return 'მესტვირემ ერთადერთი ჯაშუში ჩააძინა: ამ ღამეს გატაცება არ ჩაითვლება. გააღვიძე ჩვეულებრივად და არაფერი უთხრა.';
  return null;
};

const ANSWER = {
  spy: { Icon: ThumbsUp, text: 'დაუქნიე თავი — ჯაშუშია', tone: 'bg-[#e2c27a] text-[#241f36]' },
  no: { Icon: ThumbsDown, text: 'გააქნიე თავი — არა', tone: 'bg-white/[0.1] text-[#f5ecdc] ring-1 ring-white/20' },
  none: { Icon: Hand, text: 'ხელი აიფარე თვალებზე: ამ ღამეს პასუხი არ არის', tone: 'bg-white/[0.1] text-[#f5ecdc] ring-1 ring-white/20' },
};

export const NightScreen: React.FC<{
  g: SamGame; audio: AudioRef; right: React.ReactNode; onBack?: () => void; onClose: () => void;
  onChange: (patch: { acts?: NightActs; marks?: Marks }) => void; onNext: () => void;
}> = ({ g, audio, right, onBack, onClose, onChange, onNext }) => {
  const ph = g.phase;
  if (ph.kind !== 'night') return null;
  const steps = stepsOf(g, ph.n);
  const step = steps[ph.step];
  const last = ph.step === steps.length - 1;
  const { say, close } = wordsOf(g, step);
  const ready = stepReady(g, step, ph.n, ph.acts, ph.marks);
  const asks = markAsks(g, step, ph.marks);
  const act = ACTS.includes(step) ? (step as Act) : null;
  const targets = act ? targetsOf(g, act, ph.n) : [];
  const chosen = act ? ph.acts[act] : undefined;
  const pick = (v: number | null) => { if (act) onChange({ acts: { ...ph.acts, [act]: chosen === v ? undefined : v } }); };
  const answer = act === 'check' && typeof chosen === 'number' ? checkAnswer(g, ph.acts) : null;
  const note = act ? sleptNote(g, act, ph.acts) : null;
  const meet = MEET[step];

  const markLabel = (key: keyof Marks, picked: number, need: number) =>
    key === 'spies' ? `ვინ გაიღვიძა? მონიშნე ყველა ჯაშუში${g.roles.includes('boss') ? ', თავკაციც' : ''} · ${picked} / ${need}`
      : key === 'boss' ? 'რომელია თავკაცი? სთხოვე, ხელი ასწიოს'
      : key === 'warden' && g.roles.includes('guard') ? 'რომელია ციხისთავი? სთხოვე, ხელი ასწიოს'
      : key === 'guard' ? 'მეორე — მეციხოვნე'
      : 'ვინ გაიღვიძა?';

  return (
    <TableScreen
      tone="night"
      title={<span className="inline-flex items-center gap-2"><Moon className="w-4 h-4 text-[#e2c27a]" />{ph.n === 1 ? 'პირველი ღამე · გაცნობა' : `ღამე ${ph.n}`}</span>}
      right={right}
      onClose={onClose}
      footer={
        <Foot dark onBack={onBack}>
          <Btn kind="light" size="lg" full disabled={!ready} onClick={onNext} icon={last ? <Sun /> : undefined} className="!h-14 !text-[16px]">
            {last ? 'დილა' : 'შემდეგი'}
          </Btn>
        </Foot>
      }
    >
      <div className="py-2 space-y-4">
        <div className="flex items-center justify-center gap-1.5" role="img" aria-label={`ნაბიჯი ${ph.step + 1} / ${steps.length}`}>
          {steps.map((s, i) => <span key={s} className={`h-1.5 rounded-full transition-all ${i === ph.step ? 'w-6 bg-[#e2c27a]' : i < ph.step ? 'w-1.5 bg-[#e2c27a]/60' : 'w-1.5 bg-white/20'}`} />)}
        </div>

        {step === 'dusk' && ph.n === 1 && g.deal === 'phone' && (
          <p className="rounded-2xl bg-[#e2c27a] px-4 py-3 text-center text-[15px] font-bold leading-snug text-[#241f36]">ყველამ ნახა თავისი როლი. ტელეფონი ახლა მემატიანეს გადაეცით.</p>
        )}

        <Words dark>„{say}“</Words>

        {step === 'dusk' && <Hint dark>დაელოდე, სანამ ყველა თვალს დახუჭავს და თავს დახრის. თუ დისკი გაქვს, მთვარის მხარეს მოაბრუნე.</Hint>}

        {meet && g.deal === 'phone' && (
          <div className="space-y-2">
            <WhoWakes g={g} roles={meet} />
            <Hint dark>{step === 'meetSpies' ? 'დაელოდე, სანამ ერთმანეთს გაიცნობენ.' : 'შეხედე და დაიმახსოვრე.'}</Hint>
          </div>
        )}

        {asks.map(a => (
          <NameGrid key={a.key} dark players={g.players} ids={a.from} picked={a.picked} label={markLabel(a.key, a.picked.length, a.need)} onPick={i => onChange({ marks: toggleMark(ph.marks, a, i) })} />
        ))}

        {act && targets.length > 0 && (
          <>
            <WhoWakes g={g} roles={WAKES[act]} />
            {note && <p className="rounded-2xl bg-[#e2c27a]/[0.12] ring-1 ring-[#e2c27a]/30 px-4 py-3 text-[13.5px] font-bold leading-snug text-[#e2c27a]">{note}</p>}
            {act === 'spies' && <SpiesCount key={ph.n} audio={audio} boss={inPlay(g, holder(g, 'boss'))} />}
            <NameGrid dark players={g.players} ids={targets} picked={typeof chosen === 'number' ? [chosen] : []} onPick={i => pick(i)} label={PICK_LABEL[act]} />
            {act === 'spies' && (
              <button
                type="button"
                aria-pressed={chosen === null}
                onClick={() => pick(null)}
                className={`w-full h-12 rounded-2xl text-[14px] font-bold cursor-pointer transition ${chosen === null ? 'bg-[#e2c27a] text-[#241f36]' : 'text-[#e2c27a] ring-1 ring-[#e2c27a]/50 hover:bg-white/[0.06]'}`}
              >
                ვერ შეთანხმდნენ
              </button>
            )}
            {answer && (() => {
              const A = ANSWER[answer];
              return (
                <div className={`rounded-2xl px-4 py-4 flex items-center gap-3 ${A.tone}`} role="status">
                  <A.Icon className="w-8 h-8 shrink-0" />
                  <p className="font-serif-ge text-[19px] font-bold leading-snug">{A.text}</p>
                </div>
              );
            })()}
            {act === 'piper' && <Hint dark>ზედიზედ ერთსა და იმავეს არა, თავის თავს არა.</Hint>}
            {act === 'healer' && <Hint dark>თავისი სახლიც შეუძლია, ოღონდ ზედიზედ ერთსა და იმავეს არა.</Hint>}
          </>
        )}

        {act && targets.length === 0 && <Pause key={`${ph.n}-${ph.step}`} />}

        {close && <Hint dark>მერე: <span className="font-serif-ge font-bold text-[#f5ecdc]">„{close}“</span></Hint>}
      </div>
    </TableScreen>
  );
};

export default NightScreen;
