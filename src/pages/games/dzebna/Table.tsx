import React, { useMemo, useState } from 'react';
import { Camera, KeyRound, Map as MapIcon, QrCode, Users } from 'lucide-react';
import { huntBank } from '../../../data/dzebnaPools';
import { MAX_TEAMS, huntCode, letterAt, parseHuntCode, teamWords } from '../../../utils/dzebna';
import { Btn, Card } from '../../../components/ui/kit';
import { TEAM_TINT } from '../rounds/teams';
import { HuntSetup } from './Setup';
import { HuntChest } from './Chest';
import { ChestArt, LetterPad } from './parts';
import { CHEST_KEY, TEAM_KEY, readChest, readJson, readTeam, writeJson, type ChestState, type Setup } from './store';

// „საგანძურის ძებნა“ in the yard (the hub's „ჰიბრიდული“, 2026-11-04): the teacher sets the hunt up, prints the cards and keeps
// the chest on their phone; a team opens a station with its phone's camera (the card's QR code) or by the code typed in here.

type View = 'home' | 'setup' | 'chest';

/** the team's letters so far on this phone (a hunt under way), with the pad once they are all found */
const MyLetters: React.FC = () => {
  const raw = readJson(TEAM_KEY) as { code?: unknown } | null;
  const code = typeof raw?.code === 'string' ? raw.code : '';
  const conf = useMemo(() => parseHuntCode(code), [code]);
  const phone = conf ? readTeam(code) : null;
  if (!conf || !phone || phone.team >= Math.min(conf.teams, MAX_TEAMS) || !phone.found.length) return null;
  const w = teamWords(conf, huntBank())[phone.team];
  if (!w) return null;
  const letters = phone.found.map(s => letterAt(conf, phone.team, w.word, s));
  const all = letters.length >= conf.stations;
  return (
    <Card className="!p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 shrink-0 rounded-full text-white text-[14px] font-bold flex items-center justify-center" style={{ background: TEAM_TINT[phone.team] }}>{phone.team + 1}</span>
        <p className="min-w-0 flex-1 text-[14.5px] font-bold text-[#4a3426]">ჩვენი ასოები · {letters.length} / {conf.stations}</p>
      </div>
      {all ? (
        <>
          <p className="text-[13.5px] leading-snug text-[#4a3426]">ყველა ასო გაქვთ — შეადგინეთ სიტყვა და მიიტანეთ სკივრთან. <span className="font-bold text-[#8a6416]">მინიშნება: {w.hint}</span></p>
          <LetterPad letters={letters} />
        </>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {letters.map((ch, i) => <span key={i} className="w-10 h-11 rounded-xl bg-[#c9a227] text-white flex items-center justify-center font-serif-ge text-[22px] font-bold shadow-[0_3px_0_#a3821b]">{ch}</span>)}
        </div>
      )}
    </Card>
  );
};

/** a station opened by its code and number (when a camera can't read the card) */
const OpenByCode: React.FC<{ onOpen: (code: string, s: number) => void }> = ({ onOpen }) => {
  const [code, setCode] = useState('');
  const [num, setNum] = useState('');
  const [bad, setBad] = useState<string | null>(null);
  const open = () => {
    const c = parseHuntCode(code);
    const s = Number(num) - 1;
    if (!c) { setBad('კოდი არასწორია — ბარათზე რვა ციფრია'); return; }
    if (!Number.isInteger(s) || s < 0 || s >= c.stations) { setBad(`სადგურის ნომერი 1-დან ${c.stations}-მდეა`); return; }
    setBad(null);
    onOpen(code.replace(/\D/g, ''), s);
  };
  const field = 'h-12 rounded-xl bg-white ring-1 ring-[#e8dcc8] px-3 text-[18px] font-bold tabular-nums text-[#4a3426] placeholder:font-normal placeholder:text-[#b3a594] focus:outline-none focus:ring-2 focus:ring-[#7a2028]/40';
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => { setCode(e.target.value.replace(/[^\d ]/g, '').slice(0, 9)); setBad(null); }}
          inputMode="numeric"
          placeholder="კოდი"
          aria-label="ძებნის კოდი"
          className={`${field} min-w-0 flex-1 tracking-wider`}
        />
        <input
          value={num}
          onChange={e => { setNum(e.target.value.replace(/\D/g, '').slice(0, 1)); setBad(null); }}
          inputMode="numeric"
          placeholder="№"
          aria-label="სადგურის ნომერი"
          className={`${field} w-20 text-center`}
        />
      </div>
      {bad && <p className="text-[13px] font-bold text-[#b23a48]" role="alert">{bad}</p>}
      <Btn kind="ghost" full icon={<KeyRound />} onClick={open}>სადგურის გახსნა</Btn>
    </div>
  );
};

export const DzebnaTable: React.FC<{ onStation: (code: string, s: number) => void }> = ({ onStation }) => {
  const [chest, setChestState] = useState<ChestState | null>(readChest);
  const [view, setView] = useState<View>(() => (readChest() ? 'chest' : 'home'));
  const start = (s: Setup) => {
    const c: ChestState = { code: huntCode(s), places: s.places.slice(0, s.stations), start: Date.now(), arrived: Array(MAX_TEAMS).fill(null), ended: false };
    setChestState(c);
    writeJson(CHEST_KEY, c);
    setView('chest');
    window.scrollTo({ top: 0 });
  };
  const fresh = () => { setChestState(null); writeJson(CHEST_KEY, null); setView('setup'); window.scrollTo({ top: 0 }); };

  if (view === 'chest' && chest) return <HuntChest chest={chest} onChange={setChestState} onNew={fresh} />;
  if (view === 'setup') return (
    <div className="space-y-3">
      <button type="button" onClick={() => setView('home')} className="h-9 px-3 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">← უკან</button>
      <HuntSetup onStart={start} />
    </div>
  );

  return (
    <div className="space-y-3">
      <Card className="!p-4 space-y-3">
        <div className="flex items-center gap-3">
          <ChestArt className="w-14 h-14 shrink-0" />
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">ძებნა ეზოში</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">2–6 გუნდი · 4–8 სადგური · 20–40 წუთი</p>
          </div>
        </div>
        <ol className="space-y-2 text-[13.5px] leading-snug text-[#4a3426]">
          {[
            [MapIcon, 'მასწავლებელი ბარათებს ბეჭდავს და ეზოში ან სკოლაში მალავს.'],
            [Camera, 'გუნდი ბარათს ტელეფონის კამერით ასკანერებს და დავალებას ხსნის.'],
            [QrCode, 'სწორი პასუხი — ერთი ასო და მინიშნება, სად არის შემდეგი ბარათი.'],
            [Users, 'ყველა ასოთი გუნდი თავის სიტყვას ადგენს და მასწავლებლის ტელეფონზე — სკივრში — კრეფს. ვინ პირველი?'],
          ].map(([Ic, text], i) => {
            const I = Ic as typeof MapIcon;
            return (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-8 h-8 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><I className="w-4 h-4" /></span>
                <span className="pt-1">{text as string}</span>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card tone="paper" className="!p-4 space-y-3">
        <div>
          <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">მასწავლებელს</p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">აირჩიეთ სადგურები, გუნდები და დავალებები, ჩამოტვირთეთ ბარათები და დაიწყეთ.</p>
        </div>
        {chest
          ? <Btn full icon={<KeyRound />} onClick={() => setView('chest')}>სკივრის გახსნა</Btn>
          : <Btn full icon={<MapIcon />} onClick={() => setView('setup')}>ძებნის მომზადება</Btn>}
      </Card>

      <Card className="!p-4 space-y-3">
        <div>
          <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">გუნდს</p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">
            ბარათის QR კოდი ტელეფონის კამერით დაასკანერეთ — სადგური თავისით გაიხსნება. ვერ ასკანერებთ? აკრიფეთ ბარათზე დაწერილი
            კოდი და სადგურის ნომერი.
          </p>
        </div>
        <OpenByCode onOpen={onStation} />
      </Card>

      <MyLetters />
    </div>
  );
};
