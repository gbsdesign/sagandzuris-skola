import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Hand, Layers, Play, RotateCcw, ScanFace, SkipForward, Timer, Trophy, X } from 'lucide-react';
import { PANTO_CARDS, pantoTheme } from '../../../data/pantomimaCards';
import {
  PANTO_ROUNDS, PANTO_TURN_SECONDS, facingOf, newPantoTable, pantoOver, pantoScores, parsePantoTable, playTurn, readTilt, teamNow,
  toggleMark, turnPoints, wordAt, type PantoHow, type PantoMark, type PantoTable,
} from '../../../utils/pantomima';
import { buzz, chime, closeAudio, openAudio, tick, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Podium, Standings, TimerRing, useNow } from '../rounds/parts';
import { TEAM_TINT, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';
import { PantoOptions, ThemeTag, chosenWords } from './parts';
import { readTalk, readThemes, useThemes } from './store';
import { winLine } from '../rounds/winLine';

// „პანტომიმა“ on one phone (the hub's „ჰიბრიდული“, 2026-11-01): the class in teams, each team's turn a minute or two. Either
// the actor holds the phone and shows its word to their team (a tap: „გამოიცნეს“ or „გამოტოვება“), or the phone stands on
// the guesser's forehead, the screen out, and the team shows the words — a nod down is „გამოიცნო“, a nod up „გამოტოვება“
// (the phone's tilt; a tap on the screen's halves does the same). The turn's end rings, the list can be mended, the phone
// goes on; after the rounds the podium. Rules utils/pantomima.ts; the game is kept on this phone after every turn, ✕ only
// pauses.

const GAME_KEY = 'sg-pantomima-game';
const CONF_KEY = 'sg-pantomima-table';
const KNOWN = new Set(PANTO_CARDS.map(c => c.w));
const themeOf = (w: string) => PANTO_CARDS.find(c => c.w === w)?.theme ?? '';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { seconds: number; rounds: number; how: PantoHow }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    seconds: PANTO_TURN_SECONDS.includes(o.seconds as number) ? o.seconds! : PANTO_TURN_SECONDS[0],
    rounds: PANTO_ROUNDS.includes(o.rounds as number) ? o.rounds! : 2,
    how: o.how === 'forehead' ? 'forehead' : 'actor',
  };
};
const secs = (s: number) => (s === 60 ? '1 წუთი' : s === 120 ? '2 წუთი' : `${s} წამი`);

/** the phone's tilt, once allowed (iPhones ask in a tap) */
const askTilt = (): Promise<boolean> => {
  const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (!D) return Promise.resolve(false);
  if (typeof D.requestPermission === 'function') return D.requestPermission().then(r => r === 'granted').catch(() => false);
  return Promise.resolve(true);
};
/** a nod down or up while `on` (the phone must stand upright first) */
const useTilt = (on: boolean, onTilt: (t: 'down' | 'up') => void) => {
  const cb = useRef(onTilt);
  cb.current = onTilt;
  useEffect(() => {
    if (!on) return;
    let armed = false;
    const h = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      const r = readTilt(facingOf(e.beta, e.gamma), armed);
      armed = r.armed;
      if (r.tilt) cb.current(r.tilt);
    };
    window.addEventListener('deviceorientation', h);
    return () => window.removeEventListener('deviceorientation', h);
  }, [on]);
};

const Counts: React.FC<{ marks: PantoMark[]; light?: boolean }> = ({ marks, light }) => (
  <p className={`flex items-center gap-3 text-[15px] font-bold tabular-nums ${light ? 'text-white' : ''}`}>
    <span className={`inline-flex items-center gap-1 ${light ? '' : 'text-[#2f7d4f]'}`} aria-label="გამოიცნეს"><Check className="w-4 h-4" aria-hidden="true" />{marks.filter(m => m.ok).length}</span>
    <span className={`inline-flex items-center gap-1 ${light ? 'opacity-80' : 'text-[#8a4a2a]'}`} aria-label="გამოტოვება"><SkipForward className="w-4 h-4" aria-hidden="true" />{marks.filter(m => !m.ok).length}</span>
  </p>
);

const LEAD_MS = 3000;

/** the forehead: the whole screen to the team — the word huge, a nod or a tap on a half marks it */
const Forehead: React.FC<{
  word: string; t0: number; total: number; left: number; marks: PantoMark[]; flash: 'ok' | 'pass' | null; tiltOn: boolean;
  onMark: (ok: boolean) => void; onStop: () => void; audio: AudioRef;
}> = ({ word, t0, total, left, marks, flash, tiltOn, onMark, onStop, audio }) => {
  const now = useNow(true);
  const lead = Math.ceil((t0 - now) / 1000);
  const ticked = useRef(0);
  useEffect(() => {
    if (lead > 0 && lead <= 3 && ticked.current !== lead) { ticked.current = lead; tick(audio.current, false); triggerHaptic(10); }
  }, [lead, audio]);
  const ready = lead <= 0;
  useTilt(ready && !flash, t => onMark(t === 'down'));
  const t = pantoTheme(themeOf(word));
  const bg = flash === 'ok' ? 'bg-[#2f7d4f]' : flash === 'pass' ? 'bg-[#b8661c]' : 'bg-[#7a2028]';
  return (
    <div className={`fixed inset-0 z-[75] ${bg} text-white flex flex-col safe-top safe-bottom safe-x transition-colors duration-150 select-none`} role="dialog" aria-label="სიტყვა შუბლზე">
      <div className="h-1.5 bg-white/20 shrink-0"><div className="h-full bg-[#f0d9a0] transition-[width] duration-200" style={{ width: `${ready ? (left / total) * 100 : 100}%` }} /></div>
      <div className="flex items-center gap-3 px-3 h-12 shrink-0">
        <button type="button" onClick={onStop} aria-label="სვლის შეწყვეტა" className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer"><X className="w-5 h-5" /></button>
        <Counts marks={marks} light />
        <span className="ml-auto text-[17px] font-bold tabular-nums">{ready ? Math.ceil(left) : ''}</span>
      </div>
      {!ready ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="text-[18px] font-bold text-[#f0d9a0]">დაიდე შუბლზე, ეკრანით გუნდისკენ!</p>
          <p className="text-[96px] font-bold leading-none tabular-nums">{Math.max(1, lead)}</p>
          <p className="text-[14px] text-white/80">{tiltOn ? 'თავი დახარე — გამოიცანი · ზევით აიხედე — გამოტოვება' : 'გუნდი ეკრანის ნახევრებზე დააჭერს'}</p>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
            {flash ? (
              <p className="font-serif-ge text-[clamp(40px,min(11vw,22vh),96px)] font-bold leading-tight">{flash === 'ok' ? 'გამოიცანი!' : 'გამოტოვება'}</p>
            ) : (
              <>
                {t && <p className="text-[clamp(15px,3.2vw,22px)] font-bold text-[#f0d9a0]">{t.verb}</p>}
                <p className="font-serif-ge text-[clamp(40px,min(12vw,24vh),112px)] font-bold leading-[1.05] break-words max-w-full">{word}</p>
              </>
            )}
          </div>
          <div className="absolute inset-0 grid grid-cols-2">
            <button type="button" onClick={() => onMark(false)} disabled={!!flash} className="flex items-end justify-start p-4 text-[14px] font-bold text-white/75 cursor-pointer active:bg-white/10" aria-label="გამოტოვება">
              <span className="inline-flex items-center gap-1.5"><SkipForward className="w-5 h-5" aria-hidden="true" />გამოტოვება</span>
            </button>
            <button type="button" onClick={() => onMark(true)} disabled={!!flash} className="flex items-end justify-end p-4 text-[14px] font-bold text-white/75 cursor-pointer active:bg-white/10" aria-label="გამოიცნო">
              <span className="inline-flex items-center gap-1.5">გამოიცნო<Check className="w-5 h-5" aria-hidden="true" /></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

type Phase = 'ready' | 'play' | 'review' | 'board';

const TableGame: React.FC<{ g: PantoTable; setG: (g: PantoTable) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const scores = pantoScores(g);
  const team = teamNow(g);
  const over = pantoOver(g);
  const [phase, setPhase] = useState<Phase>(g.turns.length ? 'board' : 'ready');
  const [marks, setMarks] = useState<PantoMark[]>([]);
  const [t0, setT0] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'pass' | null>(null);
  const [tiltOn, setTiltOn] = useState(false);
  const forehead = g.how === 'forehead';
  const word = wordAt(g, marks.length);
  const shown = pantoTheme(themeOf(word));
  const lead = forehead ? LEAD_MS : 0;

  const left = useTurnClock(audio, t0 + lead, g.seconds, phase === 'play', () => { triggerHaptic(150); setFlash(null); setPhase('review'); });
  const go = () => {
    // the tilt is asked in the tap itself (iPhones allow it only so)
    if (forehead) void askTilt().then(setTiltOn);
    openAudio(audio);
    triggerHaptic(20);
    setMarks([]);
    setFlash(null);
    setT0(Date.now());
    setPhase('play');
  };
  const mark = (ok: boolean) => {
    if (phase !== 'play' || flash || Date.now() < t0 + lead) return;
    if (ok) { chime(audio.current, 1); triggerHaptic(25); } else { buzz(audio.current); triggerHaptic(12); }
    setMarks(ms => [...ms, { w: word, ok }]);
    if (forehead) { setFlash(ok ? 'ok' : 'pass'); window.setTimeout(() => setFlash(null), 700); }
  };
  const confirm = () => {
    triggerHaptic(10);
    setG(playTurn(g, marks));
    setMarks([]);
    setPhase('board');
  };
  const close = async () => {
    if (phase === 'play' || (phase === 'review' && marks.length)) {
      if (!(await askConfirm({ title: 'სვლა შეწყდეს?', text: 'ამ სვლის სიტყვები არ ჩაითვლება — ეს გუნდი თავიდან დაიწყებს.', ok: 'შეწყვეტა' }))) return;
    }
    setPhase(g.turns.length ? 'board' : 'ready');
    onClose();
  };

  const pts = turnPoints({ marks });
  const round = Math.floor(g.turns.length / g.names.length) + 1;
  const last = g.turns[g.turns.length - 1];
  const gained = last ? g.names.map((_, t) => (t === last.team ? turnPoints(last) : 0)) : null;
  const rule = g.talk ? 'სიტყვებითაც შეიძლება, ოღონდ თვითონ სიტყვა და მისი ნაწილი არა.' : 'მხოლოდ სხეულით — არც სიტყვა, არც ხმა.';

  if (over && phase === 'board') {
    const best = Math.max(...scores);
    const winners = g.names.filter((_, t) => scores[t] === best);
    return (
      <TableScreen
        title="პანტომიმა · შედეგები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto space-y-5 py-4 w-full max-w-2xl mx-auto">
          {best > 0 && <Trophy className="w-10 h-10 mx-auto text-[#b8860b]" aria-hidden="true" />}
          <Podium names={g.names} scores={scores} />
          <p className="text-center text-[15px] font-bold text-[#4a3426]">
            {winLine(winners, best, n => `გაიმარჯვა „${n}“-მა`)} · {g.rounds} წრე
          </p>
          <Standings names={g.names} scores={scores} />
        </div>
      </TableScreen>
    );
  }

  const footer =
    phase === 'ready' ? <Btn size="lg" full icon={<Play />} onClick={go} className="!h-14 !text-[16px]">წავედით!</Btn>
    : phase === 'play' && !forehead ? (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => mark(false)} className="h-16 rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#8a4a2a] font-bold text-[14px] flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] cursor-pointer">
          <SkipForward className="w-6 h-6" /> გამოტოვება
        </button>
        <button type="button" onClick={() => mark(true)} className="h-16 rounded-2xl bg-[#2f7d4f] text-white font-bold text-[15px] flex flex-col items-center justify-center gap-0.5 shadow-[0_6px_16px_-8px_rgba(47,125,79,0.9)] active:scale-[0.97] cursor-pointer">
          <Check className="w-6 h-6" /> გამოიცნეს
        </button>
      </div>
    )
    : phase === 'review' ? <Btn size="lg" full icon={<Check />} onClick={confirm} className="!h-14 !text-[15.5px]">დადასტურება · {pts} ქულა</Btn>
    : phase === 'board' ? <Btn size="lg" full icon={<ChevronRight />} onClick={() => { triggerHaptic(10); setPhase('ready'); }} className="!h-14 !text-[15.5px]">შემდეგი: {g.names[team]}</Btn>
    : undefined;

  return (
    <TableScreen
      title={`პანტომიმა · ${phase === 'board' ? `წრე ${Math.min(round, g.rounds)}/${g.rounds}` : g.names[team]}`}
      onClose={() => { void close(); }}
      right={<span className="px-1 text-[12px] tabular-nums text-[#9a8b7b]">{secs(g.seconds)}</span>}
      footer={footer}
    >
      {phase === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
          <p className="text-[13px] font-bold text-[#9a8b7b]">ჯერია · წრე {round}/{g.rounds}</p>
          <p className="font-serif-ge text-[36px] font-bold leading-tight break-words max-w-full" style={{ color: TEAM_TINT[team] }}>{g.names[team]}</p>
          <p className="text-[13px] tabular-nums text-[#75685a]">ქულა: {scores[team]}</p>
          <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-[#75685a]">
            {forehead
              ? `გამომცნობმა ტელეფონი შუბლზე დაიდოს, ეკრანით გუნდისკენ; გუნდი აჩვენებს. გამოიცნო — თავი დახაროს, გამოტოვება — ზევით აიხედოს. ${rule}`
              : `მსახიობმა აიღოს ტელეფონი, სიტყვა მხოლოდ თვითონ ნახოს და გუნდს აჩვენოს. ${rule}`}
            {' '}{secs(g.seconds).replace(/ი$/, 'ის')} ბოლოს ზარი დარეკავს.
          </p>
        </div>
      )}

      {phase === 'play' && !forehead && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <TimerRing left={left} total={g.seconds} size="sm" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <ThemeTag theme={themeOf(word)} />
              <Counts marks={marks} />
            </div>
          </div>
          <div className="flex-1 min-h-[180px] rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] flex flex-col items-center justify-center gap-1 px-5 py-8 text-center">
            {shown && <p className="text-[15px] sm:text-[17px] font-bold" style={{ color: shown.color }}>{shown.verb}</p>}
            <p className="font-serif-ge text-[40px] sm:text-[48px] lg:text-[56px] font-bold leading-tight text-[#4a3426] break-words max-w-full">{word}</p>
          </div>
          <p className="text-center text-[12.5px] leading-snug text-[#9a8b7b]">{rule}</p>
        </div>
      )}
      {phase === 'play' && forehead && (
        <Forehead word={word} t0={t0 + lead} total={g.seconds} left={left} marks={marks} flash={flash} tiltOn={tiltOn} onMark={mark} onStop={() => { void close(); }} audio={audio} />
      )}

      {phase === 'review' && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          <div className="text-center">
            <p className="text-[13px] font-bold text-[#9a8b7b]">დრო ამოიწურა</p>
            <p className="font-serif-ge text-[28px] font-bold leading-tight" style={{ color: TEAM_TINT[team] }}>{g.names[team]}: {pts} ქულა</p>
            <p className="mt-1 text-[12.5px] text-[#9a8b7b]">შეცდომით მოინიშნა? შეეხე სიტყვას და შეიცვლება.</p>
          </div>
          {marks.length ? (
            <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden divide-y divide-[#f1e8d9]">
              {marks.map((m, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(5); setMarks(ms => toggleMark(ms, i)); }}
                    className="w-full flex items-center gap-3 px-3 min-h-12 py-2 text-left cursor-pointer hover:bg-[#fbf6ec]"
                  >
                    <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${m.ok ? 'bg-[#2f7d4f]/10 text-[#2f7d4f]' : 'bg-[#8a4a2a]/10 text-[#8a4a2a]'}`} aria-hidden="true">
                      {m.ok ? <Check className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] text-[#4a3426]">{m.w}</span>
                    <span className={`shrink-0 text-[12.5px] font-bold ${m.ok ? 'text-[#2f7d4f]' : 'text-[#8a4a2a]'}`}>{m.ok ? 'გამოიცნეს' : 'გამოტოვება'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-center text-[13px] text-[#9a8b7b]">ამ სვლაში სიტყვა არ მონიშნულა.</p>}
        </div>
      )}

      {phase === 'board' && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          <Standings names={g.names} scores={scores} gained={gained} />
          <p className="text-center text-[12.5px] leading-snug text-[#9a8b7b]">{g.rounds} წრე — ყოველ გუნდს {g.rounds} სვლა აქვს. გამოტოვება ქულას არ აკლებს.</p>
        </div>
      )}
    </TableScreen>
  );
};

export const PantomimaTable: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const themes = useThemes();
  const [game, setGameState] = useState<PantoTable | null>(() => {
    const g = parsePantoTable(load(GAME_KEY), KNOWN);
    return g && !pantoOver(g) ? g : null;
  });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: PantoTable | null) => { setGameState(g); save(GAME_KEY, g); }, []);

  const deal = (names: string[], c: Conf) =>
    newPantoTable(names, { seconds: c.seconds, rounds: c.rounds, how: c.how, talk: readTalk() }, chosenWords(readThemes()).map(x => x.w));
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(deal(teamNames(conf), conf));
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names, { ...conf, seconds: game.seconds, rounds: game.rounds, how: game.how })); };
  const size = chosenWords(themes).length;

  if (open && game) return <TableGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  const paused = game ? pantoScores(game) : [];
  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · {game.rounds} წრე</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((nm, t) => `${nm} ${paused[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">ვის უჭირავს ტელეფონი?</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="ვის უჭირავს ტელეფონი">
            {([
              { id: 'actor', Icon: Hand, title: 'მსახიობს', text: 'სიტყვას ხედავს და გუნდს აჩვენებს' },
              { id: 'forehead', Icon: ScanFace, title: 'შუბლზე', text: 'გამომცნობს უდევს, გუნდი აჩვენებს' },
            ] as const).map(o => {
              const on = conf.how === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => { triggerHaptic(6); setConf({ ...conf, how: o.id }); }}
                  className={`min-h-[84px] rounded-2xl px-3 py-2.5 text-left flex flex-col gap-1 cursor-pointer transition-[background-color] ${on ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'}`}
                >
                  <span className="inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[#4a3426]"><o.Icon className="w-5 h-5 text-[#7a2028]" aria-hidden="true" />{o.title}</span>
                  <span className="text-[12.5px] leading-snug text-[#75685a]">{o.text}</span>
                </button>
              );
            })}
          </div>
        </div>
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> სვლის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სვლის დრო">
            {PANTO_TURN_SECONDS.map(s => <Chip key={s} on={conf.seconds === s} onClick={() => setConf({ ...conf, seconds: s })}>{secs(s)}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Layers className="w-4 h-4 text-[#7a2028]" /> წრეები</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="წრეები">
            {PANTO_ROUNDS.map(r => <Chip key={r} on={conf.rounds === r} onClick={() => setConf({ ...conf, rounds: r })}>{r} წრე</Chip>)}
          </div>
        </div>
        <PantoOptions />
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} disabled={!size} className="!h-14 !text-[15.5px]">დაწყება · {size} სიტყვა</Btn>
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">სიტყვები Claude-მა შეარჩია სკოლისთვის — მასწავლებელს ჯერ არ შეუმოწმებია.</p>
    </div>
  );
};
