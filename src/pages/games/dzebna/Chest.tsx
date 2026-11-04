import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Flag, KeyRound, RotateCcw, Trophy } from 'lucide-react';
import { huntBank } from '../../../data/dzebnaPools';
import { chestCheck, codeLabel, mmss, parseHuntCode, startOf, teamWords } from '../../../utils/dzebna';
import { LATIN_TO_GEORGIAN, LETTERS } from '../../../utils/sitqva';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { GeoKeyboard } from '../../../components/games/GeoKeyboard';
import { placeText, useNow } from '../rounds/parts';
import { TEAM_TINT } from '../rounds/teams';
import { useTsikheSounds } from '../tsikhe/Door';
import { Shape } from '../hangebi/Bank';
import { ChestArt } from './parts';
import { CHEST_KEY, writeJson, type ChestState } from './store';

// The chest (the teacher's phone in the yard, 2026-11-04): the clock since the start, every team's start and when it came, and
// the word a team brings typed in — the screen's letters or a keyboard. The team's own word opens the chest and its time is
// kept; the right letters in another order, or another word, are told apart. The answers fold is the teacher's only.

const secsOf = (ms: number) => Math.floor(ms / 1000);

export const HuntChest: React.FC<{ chest: ChestState; onChange: (c: ChestState) => void; onNew: () => void }> = ({ chest, onChange, onNew }) => {
  const conf = useMemo(() => parseHuntCode(chest.code), [chest.code]);
  const words = useMemo(() => (conf ? teamWords(conf, huntBank()) : []), [conf]);
  const now = useNow(!chest.ended);
  const sounds = useTsikheSounds();
  const [typed, setTyped] = useState<string[]>([]);
  const [say, setSay] = useState<{ text: string; good: boolean } | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [shake, setShake] = useState(0);
  const [keyOpen, setKeyOpen] = useState(false);
  const n = conf?.stations ?? 0;
  const set = (c: ChestState) => { onChange(c); writeJson(CHEST_KEY, c); };

  const check = () => {
    if (!conf) return;
    if (typed.length < n) { setSay({ text: `სიტყვას ${n} ასო აქვს`, good: false }); return; }
    const a = chestCheck(words, typed.join(''));
    if ('team' in a) {
      const t = a.team;
      if (chest.arrived[t] !== null) {
        setSay({ text: `გუნდი ${t + 1}-ის სკივრი უკვე ღიაა — ${mmss(secsOf(chest.arrived[t]!))}`, good: true });
      } else {
        const ms = Date.now() - chest.start;
        const arrived = chest.arrived.map((x, i) => (i === t ? ms : x));
        const all = arrived.slice(0, conf.teams).every(x => x !== null);
        set({ ...chest, arrived, ended: all });
        sounds.out();
        triggerHaptic(40);
        setOpened(t);
        setSay({ text: `გუნდი ${t + 1}-მა სკივრი გახსნა! ${mmss(secsOf(ms))}`, good: true });
      }
      setTyped([]);
      return;
    }
    sounds.wrong();
    triggerHaptic(40);
    setShake(s => s + 1);
    setSay({ text: 'near' in a ? 'ასოები სწორია, მაგრამ რიგი სხვაა — კიდევ სცადეთ!' : 'ასეთი სიტყვა არცერთ გუნდს არ აქვს', good: false });
  };
  const type = (ch: string) => { if (typed.length < n) { setTyped([...typed, ch]); setSay(null); } };
  const back = () => { setTyped(typed.slice(0, -1)); setSay(null); };
  // a computer's keyboard types too
  const keys = useRef({ type, back, check });
  keys.current = { type, back, check };
  useEffect(() => {
    if (chest.ended) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === 'Enter') { e.preventDefault(); keys.current.check(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); keys.current.back(); return; }
      const ch = e.key.length === 1 ? (LETTERS.includes(e.key) ? e.key : LATIN_TO_GEORGIAN[e.key]) : undefined;
      if (ch) { e.preventDefault(); keys.current.type(ch); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chest.ended]);
  useEffect(() => {
    if (opened === null) return;
    const t = window.setTimeout(() => setOpened(null), 2600);
    return () => window.clearTimeout(t);
  }, [opened]);

  if (!conf) return null;
  const teams = Array.from({ length: conf.teams }, (_, t) => t);
  const ranked = teams.filter(t => chest.arrived[t] !== null).sort((a, b) => chest.arrived[a]! - chest.arrived[b]!);
  const rank = (t: number) => ranked.indexOf(t);
  const elapsed = secsOf((chest.ended ? Math.max(0, ...ranked.map(t => chest.arrived[t]!)) : now - chest.start));

  const end = async () => {
    const ok = await askConfirm({ title: 'ძებნის დასრულება?', text: 'ვინც სკივრამდე ვერ მივიდა, ბოლოში ჩაიწერება.', ok: 'დასრულება' });
    if (ok) set({ ...chest, ended: true });
  };
  const again = async () => {
    if (!chest.ended && !(await askConfirm({ title: 'ახალი ძებნა?', text: 'ამ ძებნის სკივრი დაიხურება.', ok: 'ახალი ძებნა' }))) return;
    onNew();
  };

  return (
    <div className="space-y-3">
      <Card tone="paper" className="!p-4 space-y-3">
        <div className="flex items-center gap-3">
          <ChestArt open={opened !== null || chest.ended} className="w-16 h-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-serif-ge text-[18px] font-bold text-[#4a3426]">სკივრი</p>
            <p className="text-[12.5px] font-bold text-[#8a7560] tabular-nums">კოდი {codeLabel(chest.code)}</p>
          </div>
          <span className="inline-flex items-center rounded-full font-bold tabular-nums h-10 px-4 text-[18px] bg-[#7a2028] text-[#fbf6ec]" role="timer" aria-label={`ძებნა მიდის ${mmss(elapsed)}`}>{mmss(elapsed)}</span>
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {teams.map(t => {
            const at = chest.arrived[t];
            return (
              <li key={t} className={`flex items-center gap-2.5 rounded-2xl px-3 py-2 ring-1 ${at !== null ? 'bg-white ring-[#2f7d4f]/40' : 'bg-white ring-[#e8dcc8]'} ${opened === t ? 'samosi-pop' : ''}`}>
                <span className="w-8 h-8 shrink-0 rounded-full text-white text-[14px] font-bold flex items-center justify-center" style={{ background: TEAM_TINT[t] }}>{t + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold leading-tight text-[#4a3426]">გუნდი {t + 1}</p>
                  <p className="text-[12px] leading-tight text-[#8a7560]">იწყებს № {startOf(conf, t) + 1}-დან</p>
                </div>
                {at !== null
                  ? <span className="text-right"><span className="block text-[15px] font-bold tabular-nums text-[#2f7d4f]">{mmss(secsOf(at))}</span><span className="block text-[11.5px] font-bold text-[#8a7560]">{placeText(rank(t) + 1)}</span></span>
                  : <span className="text-[12.5px] font-bold text-[#a8998a]">{chest.ended ? 'ვერ მივიდა' : 'ეძებს…'}</span>}
              </li>
            );
          })}
        </ul>
      </Card>

      {!chest.ended ? (
        <Card className="!p-4 space-y-3">
          <div>
            <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">მოიტანეთ სიტყვა?</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">აკრიფეთ გუნდის სიტყვა — თუ სწორია, სკივრი გაიღება და დრო ჩაიწერება.</p>
          </div>
          <div key={shake} className={shake ? 'sg-shake' : ''}>
            <Shape shape={'_'.repeat(n)} letters={Array.from({ length: n }, (_, i) => typed[i] ?? null)} tone={say && !say.good ? 'wrong' : say?.good ? 'right' : 'plain'} />
          </div>
          <p className={`min-h-[1.25rem] text-center text-[14px] font-bold ${say?.good ? 'text-[#2f7d4f]' : 'text-[#b23a48]'}`} role="status" aria-live="polite">{say?.text ?? ''}</p>
          <GeoKeyboard marks={{}} onKey={type} onBack={back} onEnter={check} enterLabel="სკივრის გახსნა" />
        </Card>
      ) : (
        <Card className="!p-4 space-y-3">
          <p className="flex items-center gap-2 font-serif-ge text-[17px] font-bold text-[#4a3426]"><Trophy className="w-5 h-5 text-[#c9a227]" />ძებნა დასრულდა</p>
          <ol className="space-y-1.5">
            {[...ranked, ...teams.filter(t => chest.arrived[t] === null)].map((t, i) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="w-7 text-right font-bold tabular-nums text-[#8a7560]">{chest.arrived[t] !== null ? `${i + 1}.` : '—'}</span>
                <span className="w-6 h-6 rounded-full" style={{ background: TEAM_TINT[t] }} />
                <span className="flex-1 text-[15px] font-bold text-[#4a3426]">გუნდი {t + 1} <span className="font-normal text-[#8a7560]">· {words[t]?.word}</span></span>
                <span className="font-bold tabular-nums text-[#2f7d4f]">{chest.arrived[t] !== null ? mmss(secsOf(chest.arrived[t]!)) : ''}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="!p-3">
        <button
          type="button"
          onClick={() => { triggerHaptic(5); setKeyOpen(o => !o); }}
          aria-expanded={keyOpen}
          className="w-full flex items-center gap-2 h-10 px-1 text-left text-[13.5px] font-bold text-[#4a3426] cursor-pointer"
        >
          <KeyRound className="w-4 h-4 text-[#7a2028]" /><span className="flex-1">გუნდების სიტყვები (მხოლოდ თქვენთვის)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${keyOpen ? 'rotate-180' : ''}`} />
        </button>
        {keyOpen && (
          <ul className="mt-1 space-y-1 px-1 pb-1">
            {words.map((w, t) => (
              <li key={t} className="flex items-start gap-2 text-[13.5px] leading-snug text-[#4a3426]">
                <span className="w-4 h-4 mt-0.5 shrink-0 rounded-full" style={{ background: TEAM_TINT[t] }} />
                <p className="min-w-0"><span className="font-bold">გუნდი {t + 1}: {w.word}</span> <span className="text-[#8a7560]">· {w.hint}</span></p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {!chest.ended && <Btn kind="ghost" icon={<Flag />} onClick={() => { void end(); }} className="flex-1 min-w-[150px]">დასრულება</Btn>}
        <Btn kind={chest.ended ? 'primary' : 'ghost'} icon={<RotateCcw />} onClick={() => { void again(); }} className="flex-1 min-w-[150px]">ახალი ძებნა</Btn>
      </div>
    </div>
  );
};
