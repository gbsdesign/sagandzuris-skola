import React, { useCallback, useState } from 'react';
import { Eye, Hash, Play, RotateCcw, ScrollText, Trophy } from 'lucide-react';
import {
  OLD_SCRIPTS, READ_ROUNDS, markRead, newReadTeams, nextRead, parseReadTeams, readOver, readPoints, readRanking, readScores,
  readShown, type ReadScript, type ReadTeams, type ReadWhat,
} from '../../../utils/anbani';
import { ALPHABET, LETTER_NAMES, SCRIPT_LABEL, toScript } from '../../../utils/oldScripts';
import { triggerHaptic } from '../../../utils/haptics';
import { anbaniLines, anbaniWords } from '../../../data/anbaniWords';
import { Chip } from '../../../components/games/Chip';
import { TableScreen } from '../../../components/games/TableScreen';
import { KeyStrip } from '../../../components/games/KeyStrip';
import { Btn, Card, askConfirm, useWide } from '../../../components/ui/kit';
import { TEAM_TINT, TeamChips, TeamsEditor, readTeams, teamNames, type TeamsConf } from '../rounds/teams';
import { HowTo } from '../../../components/games/HowTo';

// „სამი დამწერლობა“ before one screen (the hub's „ჰიბრიდული“, 2026-11-01): „სწრაფი კითხვა“ — an old letter, word or line on
// the screen (a TV or the teacher's phone), the teams read it aloud, the host taps who read it first; then the answer opens.
// A letter or a word is a point, a line two. The game is kept on this device after every step, ✕ only pauses.

const GAME_KEY = 'sg-anbani-teams';
const CONF_KEY = 'sg-anbani-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { what: ReadWhat; script: ReadScript; rounds: number; key: boolean }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    what: o.what === 'words' || o.what === 'lines' ? o.what : 'letters',
    script: o.script === 'nuskhuri' || o.script === 'both' ? o.script : 'asomtavruli',
    rounds: READ_ROUNDS.includes(Number(o.rounds)) ? Number(o.rounds) : 10,
    key: o.key !== false,
  };
};
const WHAT_LABEL: Record<ReadWhat, string> = { letters: 'ასოები', words: 'სიტყვები', lines: 'სტრიქონები' };
const SCRIPT_CHOICE: { id: ReadScript; label: string }[] = [...OLD_SCRIPTS.map(s => ({ id: s as ReadScript, label: SCRIPT_LABEL[s] })), { id: 'both', label: 'ორივე' }];

/** the old alphabet with today's letters under it, for those who still need it */
const ReadGame: React.FC<{ g: ReadTeams; setG: (g: ReadTeams) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const wide = useWide();
  const scores = readScores(g);
  if (readOver(g)) {
    const rank = readRanking(g);
    const first = rank.filter(r => r.place === 1);
    return (
      <TableScreen
        title="სწრაფი კითხვა · შედეგები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto w-full max-w-md mx-auto space-y-4 py-4">
          <div className="text-center">
            <Trophy className="mx-auto w-10 h-10 text-[#c9a227]" aria-hidden="true" />
            <p className="mt-2 font-serif-ge text-[22px] font-bold text-[#7a2028] leading-tight">{first.length > 1 ? `ფრეა: ${first.map(r => r.name).join(', ')}` : `გაიმარჯვა „${first[0]?.name}“`}</p>
          </div>
          <ol className="space-y-1.5">
            {rank.map(r => (
              <li key={r.i} className="flex items-center gap-3 min-h-12 rounded-2xl px-3 bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]">
                <span className="w-7 shrink-0 text-center text-[14px] font-bold tabular-nums text-[#a0703c]">{r.place}</span>
                <span className="w-3 h-3 shrink-0 rounded-full" style={{ background: TEAM_TINT[r.i] }} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight [overflow-wrap:anywhere]">{r.name}</span>
                <span className="shrink-0 text-[16px] font-bold tabular-nums">{r.points}</span>
              </li>
            ))}
          </ol>
        </div>
      </TableScreen>
    );
  }

  const item = g.items[g.at];
  const shown = readShown(g);
  const mark = shown ? g.log[g.at] : null;
  const text = toScript(item.text, item.script);
  // a TV or a computer before the class: everything larger, as far as the screen's height allows
  const size = g.what === 'letters' ? (wide ? 'min(230px, 26dvh)' : 'min(150px, 20dvh)') : g.what === 'words' ? (wide ? 'min(92px, 11dvh)' : '56px') : wide ? 'min(46px, 6dvh)' : '30px';
  const lead = g.what === 'letters' ? 'leading-none' : g.what === 'words' ? 'leading-tight' : 'leading-snug';
  const tap = (team: number | null) => { triggerHaptic(team === null ? 10 : 25); setG(markRead(g, team)); };

  return (
    <TableScreen
      title={`სწრაფი კითხვა · ${g.at + 1} / ${g.items.length}`}
      onClose={onClose}
      footer={(
        <div className="w-full max-w-3xl mx-auto space-y-2">
          <p className="text-center text-[13px] font-bold text-[#75685a]">{shown ? 'სხვა გუნდზე შეხებით ნიშანი შეიცვლება' : `ვინ წაიკითხა პირველმა? (+${readPoints(g.what)})`}</p>
          <div className={`grid gap-2 ${g.teams.length + 1 <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {g.teams.map((n, t) => (
              <button
                key={t}
                type="button"
                onClick={() => tap(t)}
                className={`min-h-12 rounded-2xl px-2 text-[14px] font-bold leading-tight text-white cursor-pointer active:scale-[0.97] [overflow-wrap:anywhere] ${shown && mark !== t ? 'opacity-35' : ''} ${mark === t ? 'ring-4 ring-[#c9a227]' : ''}`}
                style={{ background: TEAM_TINT[t] }}
              >
                {n}
              </button>
            ))}
            <button type="button" onClick={() => tap(null)} className={`min-h-12 rounded-2xl px-2 text-[14px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#75685a] cursor-pointer ${mark === -1 ? 'ring-4 ring-[#c9a227]' : ''}`}>ვერავინ</button>
          </div>
          {shown && <Btn size="lg" full onClick={() => { triggerHaptic(10); setG(nextRead(g)); }} className="!h-14 !text-[15.5px]">{g.at + 1 < g.items.length ? 'შემდეგი' : 'შედეგები'}</Btn>}
        </div>
      )}
    >
      <div className={`my-auto w-full mx-auto flex flex-col items-center py-2 ${wide ? 'max-w-4xl gap-5' : 'max-w-3xl gap-4'}`}>
        <span className="h-8 px-3 rounded-full bg-[#f3ece0] text-[12.5px] font-bold text-[#7a2028] inline-flex items-center">{SCRIPT_LABEL[item.script]}</span>
        <p className={`font-serif-ge text-center text-[#7a2028] [overflow-wrap:anywhere] ${lead}`} style={{ fontSize: size }}>{text}</p>
        <div className="min-h-[56px] flex flex-col items-center justify-center" role="status" aria-live="polite">
          {shown && (
            <p className="samosi-pop text-center text-[#2f7d4f] font-bold leading-snug">
              <span className={g.what === 'lines' ? (wide ? 'text-[30px]' : 'text-[20px]') : wide ? 'text-[44px]' : 'text-[30px]'}>{item.text}</span>
              {g.what === 'letters' && <span className={`block text-[#4a3426] ${wide ? 'text-[20px]' : 'text-[15px]'}`}>„{LETTER_NAMES[ALPHABET.indexOf(item.text)]}“</span>}
            </p>
          )}
        </div>
        {g.key && <KeyStrip script={item.script} big={wide} />}
        <TeamChips names={g.teams} scores={scores} />
      </div>
    </TableScreen>
  );
};

export const AnbaniTable: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<ReadTeams | null>(() => { const g = parseReadTeams(load(GAME_KEY)); return g && !readOver(g) ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: ReadTeams | null) => { setGameState(g); save(GAME_KEY, g && !readOver(g) ? g : null); }, []);

  const deal = (c: Conf) => newReadTeams({ teams: teamNames(c), script: c.script, what: c.what, rounds: c.rounds, key: c.key }, { pool: anbaniWords(), lines: anbaniLines() }, (Math.floor(Math.random() * 2 ** 31)) || 1);
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(deal(conf));
    setOpen(true);
  };
  const again = () => setGame(deal({ ...conf, ...(game ? { what: game.what, script: game.script, key: game.key } : {}) }));

  if (open && game) return <ReadGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: {WHAT_LABEL[game.what]} · {game.at + (readShown(game) ? 1 : 0)} / {game.items.length}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.teams.map((n, t) => `${n} ${readScores(game)[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <HowTo id="anbani-table" steps={[
        'ეკრანზე ძველი ასო, სიტყვა ან სტრიქონი ჩნდება.',
        'გუნდები ხმამაღლა კითხულობენ. ვინც პირველი წაიკითხავს სწორად, მასწავლებელი იმ გუნდს ეხება და პასუხი იხსნება.',
        'ასო და სიტყვა ერთი ქულაა, სტრიქონი — ორი.',
        'დასაწყისში ანბანის გასაღები ეკრანზე დატოვეთ, მერე დამალეთ. ტელეფონი ტელევიზორზეც შეგიძლიათ გამოიტანოთ.',
      ]} />
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><ScrollText className="w-4 h-4 text-[#7a2028]" /> რას კითხულობენ</p>
          <div className="flex flex-wrap gap-1.5">
            {(['letters', 'words', 'lines'] as ReadWhat[]).map(w => <Chip key={w} on={conf.what === w} onClick={() => setConf({ ...conf, what: w })}>{WHAT_LABEL[w]}</Chip>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SCRIPT_CHOICE.map(s => <Chip key={s.id} on={conf.script === s.id} onClick={() => setConf({ ...conf, script: s.id })}>{s.label}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Hash className="w-4 h-4 text-[#7a2028]" /> რამდენი</p>
          <div className="flex flex-wrap gap-1.5">
            {READ_ROUNDS.map(n => <Chip key={n} on={conf.rounds === n} onClick={() => setConf({ ...conf, rounds: n })}>{n}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Eye className="w-4 h-4 text-[#7a2028]" /> ანბანის გასაღები ეკრანზე</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={conf.key} onClick={() => setConf({ ...conf, key: true })}>ჩანს</Chip>
            <Chip on={!conf.key} onClick={() => setConf({ ...conf, key: false })}>არ ჩანს</Chip>
          </div>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
    </div>
  );
};
