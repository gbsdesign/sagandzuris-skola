import React, { useState } from 'react';
import { Flag, Play, RotateCcw, Trophy, X } from 'lucide-react';
import { TABU_CARDS } from '../../../data/tabuCards';
import { JO_CARDS, joClues, joGuess, joNext, joOver, joPass, joScore, joVerdict, newJoRun, parseJoRun, type JoRun } from '../../../utils/minishneba';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { ThemeChip, WordField } from '../tabu/parts';
import { JoDots, Notes, RESULT_TEXT, Verdict, type Note } from './parts';
import { Steps } from '../../../components/games/HowTo';

// „ერთი მინიშნება“ alone (the hub's „ონლაინ“, 2026-11-01): thirteen words; for each, five players' clues — the „ნუ იტყვი!“
// card's forbidden words — with the most telling one or two struck as the same, as at a real table. One try a word: right
// is a point, a wrong word loses the next card too, „არ ვიცი“ only this one. The game on the way, the best and the cards met
// lately stay on the device.

const RUN_KEY = 'sg-minishneba-run';
const SEEN_KEY = 'sg-minishneba-seen';
const BEST_KEY = 'sg-minishneba-best';
const readJson = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeJson = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readSeen = (): number[] => { const v = readJson(SEEN_KEY); return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : []; };
const readBest = (): number | null => { const v = readJson(BEST_KEY); return Number.isInteger(v) ? (v as number) : null; };
const cardOf = (run: JoRun, i: number) => TABU_CARDS.find(c => c.id === run.rounds[i]?.card);

export const MinishnebaSolo: React.FC = () => {
  const [run, setRunState] = useState<JoRun | null>(() => parseJoRun(readJson(RUN_KEY)));
  const setRun = (r: JoRun | null) => { setRunState(r); writeJson(RUN_KEY, r); };
  const [best, setBest] = useState(readBest);

  const start = () => {
    triggerHaptic(10);
    const r = newJoRun(Math.floor(Math.random() * 2 ** 31), readSeen());
    writeJson(SEEN_KEY, [...readSeen().filter(id => !r.rounds.some(x => x.card === id)), ...r.rounds.map(x => x.card)].slice(-120));
    setRun(r);
    window.scrollTo({ top: 0 });
  };
  const finish = (r: JoRun) => {
    const s = joScore(r);
    if (best === null || s > best) { setBest(s); writeJson(BEST_KEY, s); }
  };
  const quit = async () => {
    if (run && !joOver(run) && !(await askConfirm({ title: 'თამაში შეწყდეს?', text: 'ეს თამაში არ ჩაითვლება.', ok: 'შეწყვეტა' }))) return;
    setRun(null);
  };

  if (!run) {
    return (
      <div className="space-y-4">
        <Card className="!p-4 space-y-3">
          <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">ცამეტი სიტყვა, ერთი ცდა თითოზე</p>
          <Steps steps={[
            'ხუთმა მოთამაშემ ერთსა და იმავე სიტყვაზე თითო მინიშნება დაწერა — ერთნაირები წაიშალა, როგორც ნამდვილ თამაშში.',
            'დარჩენილი მინიშნებებით გამოიცანი სიტყვა: ერთი ცდა გაქვს.',
            'სწორია — ქულა. არასწორი პასუხი შემდეგ ბარათსაც წაიღებს, ამიტომ თუ არ იცი, ჯობია „არ ვიცი“.',
          ]} />
          <Btn size="lg" full icon={<Play />} onClick={start} className="!h-12">დაწყება{best !== null ? ` · რეკორდი ${best}/${JO_CARDS}` : ''}</Btn>
        </Card>
        <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
          მინიშნებები „ნუ იტყვი!“-ს ბარათებიდანაა — Claude-მა დაწერა სკოლისთვის, მასწავლებელს ჯერ არ შეუმოწმებია.
        </p>
      </div>
    );
  }

  const score = joScore(run);
  if (joOver(run)) {
    return (
      <div className="space-y-4">
        <Card tone="paper" className="!p-4 space-y-3">
          <p className="font-serif-ge text-[20px] font-bold text-[#7a2028] flex items-center gap-2"><Trophy className="w-5 h-5" /> {score}/{JO_CARDS}</p>
          <p className="text-[15px] font-bold text-[#4a3426]">{joVerdict(score)}</p>
          <JoDots res={run.res} n={run.rounds.length} />
          {best !== null && <p className="text-[13px] text-[#75685a]">{score >= best ? 'ახალი რეკორდი!' : `რეკორდი: ${best}/${JO_CARDS}`}</p>}
          <ul className="space-y-1" aria-label="სიტყვები">
            {run.rounds.map((_, i) => {
              const c = cardOf(run, i);
              const r = run.res[i];
              return (
                <li key={i} className="flex items-center gap-2 text-[14px] text-[#4a3426]">
                  <span className="w-6 text-right tabular-nums text-[#9a8b7b]">{i + 1}</span>
                  <b className="min-w-0 flex-1">{c?.w}</b>
                  <span className={`text-[12.5px] font-bold ${r === 'right' ? 'text-[#2f7d4f]' : r === 'wrong' ? 'text-[#b23a48]' : 'text-[#9a8b7b]'}`}>{r ? RESULT_TEXT[r] : ''}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Btn icon={<RotateCcw />} onClick={start} className="flex-1 min-w-[150px]">თავიდან</Btn>
            <Btn kind="ghost" onClick={() => setRun(null)} className="flex-1 min-w-[150px]">დახურვა</Btn>
          </div>
        </Card>
      </div>
    );
  }

  const card = cardOf(run, run.at);
  const { word, shown, struck } = joClues(run, run.at);
  const res = run.res[run.at];
  const notes: Note[] = [
    ...shown.map(text => ({ text, fate: 'ok' as const })),
    ...(card ? card.no.slice(card.no.length - struck) : []).map(text => ({ text, fate: 'same' as const })),
  ];
  const next = () => {
    const after = joNext(run);
    if (joOver(after)) finish(after);
    setRun(after);
    window.scrollTo({ top: 0 });
  };
  return (
    <div className="space-y-3">
      <Card className="!p-4 space-y-2.5">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 font-serif-ge text-[16px] font-bold text-[#4a3426]">
            ბარათი {run.at + 1}/{run.rounds.length} <span className="font-sans text-[13px] font-normal text-[#75685a]">· ქულა <b className="text-[#2f7d4f]">{score}</b>{best !== null ? ` · რეკორდი ${best}` : ''}</span>
          </p>
          <button type="button" onClick={() => { void quit(); }} className="w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer" aria-label="თამაშის დასრულება">
            <X className="w-5 h-5" />
          </button>
        </div>
        <JoDots res={run.res} n={run.rounds.length} at={run.at} />
      </Card>

      <div className="flex items-center justify-between gap-2">
        {card && <ThemeChip theme={card.theme} />}
        {!res && <Btn kind="ghost" size="sm" icon={<Flag />} onClick={() => setRun(joPass(run))}>არ ვიცი</Btn>}
      </div>
      <Notes notes={notes} open={!!res} />

      {res ? (
        <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-2 pb-3 bg-[#fbf6ec]/95 backdrop-blur-sm border-t border-[#e8dcc8]/70 space-y-2">
          <Verdict res={res} word={word} guess={run.guess} last={run.at + 1 >= run.rounds.length} />
          <Btn size="lg" full icon={<Play />} onClick={next} className="!h-12">{joOver(joNext(run)) ? 'შედეგი' : 'შემდეგი ბარათი'}</Btn>
        </div>
      ) : (
        <WordField key={run.at} placeholder="რა სიტყვაა? ერთი ცდა" enterLabel="გამოცნობა" onSubmit={w => { triggerHaptic(15); setRun(joGuess(run, w)); }} />
      )}
    </div>
  );
};
