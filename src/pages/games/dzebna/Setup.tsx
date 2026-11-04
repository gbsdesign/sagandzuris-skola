import React, { useMemo, useState } from 'react';
import { ChevronDown, Dices, FileDown, KeyRound, Loader2 } from 'lucide-react';
import { dzebnaPools, huntBank } from '../../../data/dzebnaPools';
import {
  KIND_LABEL, MAX_STATIONS, MAX_TEAMS, MIN_STATIONS, PLACE_MAX, TASK_KINDS, codeLabel, huntCode, huntTask, startOf, teamWords,
} from '../../../utils/dzebna';
import { saveBlob } from '../../../utils/chantSynth';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, Card } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { TEAM_TINT } from '../rounds/teams';
import { KindPill } from './parts';
import { newSeed, readSetup, writeJson, SETUP_KEY, type Setup } from './store';

const PLACE_EXAMPLES = ['ბიბლიოთეკის კართან', 'სპორტდარბაზის კედელზე', 'დიდ კაკლის ხესთან', 'მესამე სართულის ფანჯარასთან', 'სასადილოს მაგიდის ქვეშ', 'ეზოს სკამის უკან', 'კიბის ქვეშ', 'მუსიკის ოთახის კართან'];

// The yard hunt's setup (the teacher's phone, 2026-11-04): how many stations and teams, which kinds of tasks, where each card
// will hide (optional — a card's link then tells a team where the next one is), the hunt's code; the stations' tasks with their
// answers to look over; the cards' PDF; and the start, which opens the chest.

const KIND_ABOUT: Record<typeof TASK_KINDS[number], string> = {
  quiz: 'ოთხი პასუხიდან ერთი', region: 'ადგილი და მისი კუთხე', year: 'სამი მოვლენიდან ყველაზე ადრეული',
  old: 'სიტყვა ძველი ასოებით', chant: 'საგალობლის დასაწყისი სინთეზატორზე',
};

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <p className="text-[13px] font-bold text-[#4a3426]">{label}{hint && <span className="font-normal text-[#8a7560]"> · {hint}</span>}</p>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

export const HuntSetup: React.FC<{ onStart: (s: Setup) => void }> = ({ onStart }) => {
  const [setup, setState] = useState<Setup>(readSetup);
  const set = (s: Partial<Setup>) => { const next = { ...setup, ...s }; setState(next); writeJson(SETUP_KEY, next); };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const code = huntCode(setup);
  const pools = dzebnaPools();
  const tasks = useMemo(() => Array.from({ length: setup.stations }, (_, s) => huntTask(pools, setup, s)), [code]); // eslint-disable-line react-hooks/exhaustive-deps
  const words = useMemo(() => teamWords(setup, huntBank()), [setup.seed, setup.stations, setup.teams]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = tasks.every(Boolean) && words.length === setup.teams;

  const toggleKind = (k: typeof TASK_KINDS[number]) => {
    const kinds = setup.kinds.includes(k) ? setup.kinds.filter(x => x !== k) : TASK_KINDS.filter(x => x === k || setup.kinds.includes(x));
    if (kinds.length) set({ kinds });
  };
  const print = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { huntPdf } = await import('./cards');
      const blob = await huntPdf({ conf: setup, code, words, tasks, places: setup.places.slice(0, setup.stations), origin: window.location.origin });
      saveBlob(blob, `საგანძურის ძებნა ${codeLabel(code)}.pdf`);
    } catch (err) {
      console.warn(err);
      setError('PDF ვერ შეიქმნა — სცადე თავიდან');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <Card className="!p-4 space-y-4">
        <div>
          <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">ძებნის მომზადება</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#5a4a3c]">
            დაბეჭდეთ სადგურების ბარათები და დამალეთ ეზოში ან სკოლაში. თითო გუნდს სჭირდება კამერიანი ტელეფონი, სადაც აპში შესულია;
            თქვენი ტელეფონი სკივრი იქნება. ყველაფერს ერთი კოდი ინახავს — ტელეფონები ერთმანეთს არაფერს უგზავნიან.
          </p>
        </div>
        <Row label="სადგურები">
          {Array.from({ length: MAX_STATIONS - MIN_STATIONS + 1 }, (_, i) => MIN_STATIONS + i).map(n => (
            <Chip key={n} on={setup.stations === n} onClick={() => set({ stations: n })}>{n}</Chip>
          ))}
        </Row>
        <Row label="გუნდები" hint="თითოს თავისი სიტყვა აქვს">
          {Array.from({ length: MAX_TEAMS }, (_, i) => i + 1).map(n => (
            <Chip key={n} on={setup.teams === n} onClick={() => set({ teams: n })}>{n}</Chip>
          ))}
        </Row>
        <Row label="დავალებები">
          {TASK_KINDS.map(k => (
            <Chip key={k} on={setup.kinds.includes(k)} onClick={() => toggleKind(k)}>{KIND_LABEL[k]}</Chip>
          ))}
        </Row>
        <p className="-mt-2 text-[12.5px] leading-snug text-[#8a7560]">
          {setup.kinds.map(k => `${KIND_LABEL[k]}: ${KIND_ABOUT[k]}`).join(' · ')}.
          {setup.kinds.includes('chant') && ' „მოისმინე“ ინტერნეტს და ხმას საჭიროებს.'}
        </p>
      </Card>

      <Card className="!p-4 space-y-3">
        <div>
          <p className="font-serif-ge text-[15.5px] font-bold text-[#4a3426]">სად დამალავთ? <span className="font-normal text-[13px] text-[#8a7560]">არასავალდებულო</span></p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">
            ჩაწერილი ადგილი ბარათის QR კოდში ჩაიდება: დავალების ამოხსნის შემდეგ გუნდი ნახავს, სად არის შემდეგი სადგური. ცარიელს
            თქვენ ეტყვით.
          </p>
        </div>
        <ol className="space-y-2">
          {Array.from({ length: setup.stations }, (_, s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="w-9 h-9 shrink-0 rounded-full bg-[#c9a227] text-white font-bold flex items-center justify-center tabular-nums">{s + 1}</span>
              <input
                value={setup.places[s] ?? ''}
                maxLength={PLACE_MAX}
                onChange={e => set({ places: setup.places.map((p, i) => (i === s ? e.target.value.slice(0, PLACE_MAX) : p)) })}
                placeholder={`მაგ.: ${PLACE_EXAMPLES[s % PLACE_EXAMPLES.length]}`}
                aria-label={`№ ${s + 1} სადგურის ადგილი`}
                className="min-w-0 flex-1 h-11 rounded-xl bg-white ring-1 ring-[#e8dcc8] px-3 text-[15px] text-[#4a3426] placeholder:text-[#b3a594] focus:outline-none focus:ring-2 focus:ring-[#7a2028]/40"
              />
            </li>
          ))}
        </ol>
      </Card>

      <Card tone="paper" className="!p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-[#8a7560]">ძებნის კოდი</p>
            <p className="font-bold tabular-nums tracking-wide text-[26px] leading-tight text-[#7a2028]">{codeLabel(code)}</p>
          </div>
          <Btn kind="ghost" size="sm" icon={<Dices />} onClick={() => set({ seed: newSeed() })}>სხვა დავალებები</Btn>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="გუნდები">
          {Array.from({ length: setup.teams }, (_, t) => (
            <li key={t} className="inline-flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[12.5px] font-bold text-[#4a3426]">
              <span className="w-5 h-5 rounded-full" style={{ background: TEAM_TINT[t] }} />გუნდი {t + 1} · № {startOf(setup, t) + 1}-დან
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => { triggerHaptic(5); setOpen(o => !o); }}
          aria-expanded={open}
          className="w-full flex items-center gap-2 h-11 px-3 rounded-xl bg-white ring-1 ring-[#e8dcc8] text-left text-[13.5px] font-bold text-[#4a3426] cursor-pointer"
        >
          <KeyRound className="w-4 h-4 text-[#7a2028]" /><span className="flex-1">დავალებები და პასუხები (მხოლოდ თქვენთვის)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="space-y-2">
            <ol className="space-y-1.5">
              {tasks.map((t, s) => t && (
                <li key={s} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-[#c9a227] text-white text-[13px] font-bold flex items-center justify-center tabular-nums">{s + 1}</span>
                    <KindPill kind={t.kind} />
                  </div>
                  <p className="text-[13.5px] leading-snug text-[#4a3426]">{t.ask}{t.old ? ` (${t.old.script === 'asomtavruli' ? 'ასომთავრული' : 'ნუსხური'})` : ''}</p>
                  <p className="text-[13px] font-bold text-[#2f7d4f]">{t.options[t.right]}</p>
                </li>
              ))}
            </ol>
            <ul className="space-y-1">
              {words.map((w, t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] leading-snug text-[#4a3426]">
                  <span className="w-4 h-4 mt-0.5 shrink-0 rounded-full" style={{ background: TEAM_TINT[t] }} />
                  <p className="min-w-0"><span className="font-bold">გუნდი {t + 1}: {w.word}</span> <span className="text-[#8a7560]">· {w.hint}</span></p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {error && <p className="px-1 text-[13.5px] font-bold text-[#b23a48]" role="alert">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        <Btn kind="ghost" size="lg" icon={busy ? <Loader2 className="animate-spin" /> : <FileDown />} onClick={() => { void print(); }} disabled={!ready || busy} className="sm:flex-1">
          {busy ? 'მზადდება…' : 'ბარათები (PDF)'}
        </Btn>
        <Btn size="lg" icon={<KeyRound />} onClick={() => onStart(setup)} disabled={!ready} className="sm:flex-1">ძებნის დაწყება</Btn>
      </div>
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        PDF-ში: სადგურების ბარათები (ოთხი ფურცელზე), გუნდების ფურცლები — საიდან იწყებენ — და თქვენი გასაღები პასუხებით.
      </p>
    </div>
  );
};
