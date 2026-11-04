import React, { useEffect, useMemo, useState } from 'react';
import { Footprints, MapPin, RefreshCw, X } from 'lucide-react';
import { dzebnaPools, huntBank } from '../../../data/dzebnaPools';
import { huntTask, letterAt, nextFor, parseHuntCode, startOf, teamWords } from '../../../utils/dzebna';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { useNow } from '../rounds/parts';
import { TEAM_TINT } from '../rounds/teams';
import { useTsikheSounds } from '../tsikhe/Door';
import { ChestArt, KindPill, LetterPad, LetterTile, TaskNote, TaskView } from './parts';
import { TEAM_KEY, readTeam, writeJson, type TeamPhone } from './store';

// A station on a team's phone (the yard hunt, 2026-11-04): the card's QR code (or its code typed in) opens it. The team is
// picked once a hunt; the station's task follows — a wrong answer is struck and the team waits 15 seconds — and the right one
// gives the team's letter of this station and where the next card hides (the card's link carries it). With every letter found
// the team goes to the chest, the teacher's phone, with the word; a pad to try the letters' order is here, but only the chest
// says whether it is right. All of it stays on this phone.

const WAIT_MS = 15_000;

const TeamPick: React.FC<{ teams: number; stations: number; onPick: (t: number) => void }> = ({ teams, stations, onPick }) => (
  <Card className="!p-4 space-y-3">
    <div>
      <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">რომელი გუნდი ხართ?</p>
      <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">მასწავლებლისგან მიღებულ ფურცელზე წერია. ერთხელ აირჩევთ — ტელეფონი დაიმახსოვრებს.</p>
    </div>
    <ul className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: teams }, (_, t) => (
        <li key={t}>
          <button
            type="button"
            onClick={() => { triggerHaptic(10); onPick(t); }}
            className="w-full min-h-14 flex items-center gap-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 px-3 py-2 text-left cursor-pointer active:scale-[0.99]"
          >
            <span className="w-10 h-10 shrink-0 rounded-full text-white text-[17px] font-bold flex items-center justify-center" style={{ background: TEAM_TINT[t] }}>{t + 1}</span>
            <span className="min-w-0">
              <span className="block text-[15.5px] font-bold text-[#4a3426]">გუნდი {t + 1}</span>
              <span className="block text-[12.5px] text-[#8a7560]">იწყებს № {startOf({ stations, teams }, t) + 1} სადგურიდან</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  </Card>
);

export const HuntStation: React.FC<{ code: string; s: number; next: string; onClose: () => void }> = ({ code, s, next, onClose }) => {
  const conf = useMemo(() => parseHuntCode(code), [code]);
  const words = useMemo(() => (conf ? teamWords(conf, huntBank()) : []), [conf]);
  const task = useMemo(() => (conf ? huntTask(dzebnaPools(), conf, s) : null), [conf, s]);
  const sounds = useTsikheSounds();
  const [phone, setPhoneState] = useState<TeamPhone | null>(() => readTeam(code));
  const setPhone = (p: TeamPhone | null) => { setPhoneState(p); writeJson(TEAM_KEY, p); };
  const now = useNow(!!phone && phone.wait > Date.now());

  // the card's link tells where the next card hides: kept, shown once this station is solved
  useEffect(() => {
    if (!conf || !phone || !next) return;
    const k = String((s + 1) % conf.stations);
    if (phone.places[k] !== next) setPhone({ ...phone, places: { ...phone.places, [k]: next } });
  }, [phone?.team, next, s]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!conf || !task) {
    return (
      <Card className="!p-4 space-y-3">
        <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">ეს ბარათი ვერ გაიხსნა</p>
        <p className="text-[13.5px] leading-snug text-[#75685a]">კოდი ან სადგურის ნომერი არასწორია. შეამოწმეთ ბარათზე დაწერილი კოდი.</p>
        <Btn kind="ghost" onClick={onClose}>უკან</Btn>
      </Card>
    );
  }

  const pickTeam = (team: number) => {
    const base: TeamPhone = { code, team, found: [], struck: {}, wait: 0, places: {} };
    if (next) base.places[String((s + 1) % conf.stations)] = next;
    setPhone(base);
  };
  const otherTeam = async () => {
    const ok = await askConfirm({ title: 'სხვა გუნდი ხართ?', text: 'ამ ტელეფონზე ნაპოვნი ასოები წაიშლება.', ok: 'გუნდის შეცვლა' });
    if (ok) setPhone(null);
  };

  const head = (
    <div className="flex items-center gap-3">
      <span className="w-11 h-11 shrink-0 rounded-full bg-[#c9a227] text-white text-[20px] font-bold flex items-center justify-center shadow-[0_3px_0_#a3821b] tabular-nums">{s + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="font-serif-ge text-[17px] font-bold leading-tight text-[#4a3426]">სადგური № {s + 1}</p>
        <p className="text-[12.5px] text-[#8a7560]">საგანძურის ძებნა · {conf.stations} სადგური</p>
      </div>
      <button type="button" onClick={onClose} className="w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer" aria-label="დახურვა">
        <X className="w-5 h-5" />
      </button>
    </div>
  );

  if (!phone) return <div className="space-y-3"><Card className="!p-4">{head}</Card><TeamPick teams={conf.teams} stations={conf.stations} onPick={pickTeam} /></div>;

  const t = phone.team;
  const word = words[t]?.word ?? '';
  const solved = phone.found.includes(s);
  const struck = phone.struck[String(s)] ?? [];
  const waitLeft = Math.max(0, Math.ceil((phone.wait - now) / 1000));
  const letters = phone.found.map(x => letterAt(conf, t, word, x));
  const after = nextFor(conf, t, phone.found, s);
  const all = phone.found.length >= conf.stations;

  const pick = (i: number) => {
    if (solved || waitLeft > 0) return;
    if (i === task.right) {
      sounds.out();
      triggerHaptic(30);
      setPhone({ ...phone, found: [...phone.found, s] });
      return;
    }
    sounds.wrong();
    triggerHaptic(40);
    setPhone({ ...phone, struck: { ...phone.struck, [String(s)]: [...struck, i] }, wait: Date.now() + WAIT_MS });
  };

  return (
    <div className="space-y-3">
      <Card className="!p-4 space-y-3">
        {head}
        <div className="flex items-center gap-2.5 rounded-2xl px-3 py-2" style={{ background: `${TEAM_TINT[t]}14` }}>
          <span className="w-8 h-8 shrink-0 rounded-full text-white text-[14px] font-bold flex items-center justify-center" style={{ background: TEAM_TINT[t] }}>{t + 1}</span>
          <p className="min-w-0 flex-1 text-[14px] font-bold text-[#4a3426]">გუნდი {t + 1} · {phone.found.length} / {conf.stations} ასო</p>
          <button type="button" onClick={() => { void otherTeam(); }} className="h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-[12px] font-bold text-[#8a7560] hover:bg-white/70 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />სხვა გუნდი
          </button>
        </div>
        {letters.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="ნაპოვნი ასოები">
            {letters.map((ch, i) => (
              <span key={i} className="w-10 h-11 rounded-xl bg-[#c9a227] text-white shadow-[0_3px_0_#a3821b] flex items-center justify-center font-serif-ge text-[22px] font-bold">{ch}</span>
            ))}
            {Array.from({ length: conf.stations - letters.length }, (_, i) => (
              <span key={`e${i}`} className="w-10 h-11 rounded-xl border-2 border-dashed border-[#d9c9ae]" aria-hidden="true" />
            ))}
          </div>
        )}
      </Card>

      <Card tone="paper" className="!p-4 space-y-3">
        <KindPill kind={task.kind} />
        <TaskView task={task} struck={struck} onPick={pick} solved={solved} locked={waitLeft > 0} />
        {!solved && waitLeft > 0 && (
          <p className="text-center text-[14px] font-bold text-[#b23a48]" role="status" aria-live="polite">არა — მოიფიქრეთ და {waitLeft} წამში ისევ სცადეთ</p>
        )}
        {solved && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
              <LetterTile ch={letterAt(conf, t, word, s)} />
              <div className="min-w-0">
                <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">თქვენი ასო!</p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">დაიმახსოვრეთ — ტელეფონიც ინახავს.</p>
              </div>
            </div>
            <TaskNote task={task} />
          </div>
        )}
      </Card>

      {solved && !all && after !== null && (
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center"><Footprints className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-[#8a7560]">შემდეგი სადგური</p>
              <p className="font-serif-ge text-[19px] font-bold leading-tight text-[#4a3426]">№ {after + 1}</p>
              {phone.places[String(after)]
                ? <p className="mt-1 flex items-start gap-1.5 text-[15px] font-bold leading-snug text-[#7a2028]"><MapPin className="w-4 h-4 mt-0.5 shrink-0" />{phone.places[String(after)]}</p>
                : <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">სად არის — მასწავლებელი გეტყვით.</p>}
            </div>
          </div>
        </Card>
      )}

      {all && (
        <Card tone="paper" className="!p-4 space-y-3">
          <div className="flex items-center gap-3">
            <ChestArt className="w-16 h-16 shrink-0" />
            <div className="min-w-0">
              <p className="font-serif-ge text-[18px] font-bold text-[#4a3426]">ყველა ასო გაქვთ!</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-[#4a3426]">შეადგინეთ სიტყვა და მიიტანეთ სკივრთან — მასწავლებელთან.</p>
              <p className="mt-1 text-[13px] font-bold text-[#8a6416]">მინიშნება: {words[t]?.hint}</p>
            </div>
          </div>
          <p className="text-[12.5px] leading-snug text-[#8a7560]">აქ შეგიძლიათ ასოები სცადოთ სხვადასხვა რიგით — სწორია თუ არა, მხოლოდ სკივრი იტყვის.</p>
          <LetterPad letters={letters} />
        </Card>
      )}
    </div>
  );
};
