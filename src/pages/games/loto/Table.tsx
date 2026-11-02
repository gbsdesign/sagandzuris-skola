import React, { useState } from 'react';
import { Check, ChevronRight, Download, Eye, EyeOff, Flag, Gem, PenLine, Play, Printer, RotateCcw, Trophy, Undo2, X } from 'lucide-react';
import {
  CARD_SIZE, KIT_CARDS, LOTO_CLIP, addWin, checkKitCard, checkNames, newLotoTable, parseLotoTable, tableNext, tableOver, tablePlayed,
  undoWin, type LotoDeck, type LotoTable,
} from '../../../utils/loto';
import { kitNames, kitPieces } from '../../../data/lotoKit';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { useMine } from '../../../components/games/useMine';
import { Hint } from '../samshvilde/parts';
import { SnippetBox } from '../rounds/parts';
import { useSnippet, type Clip } from '../rounds/useSnippet';
import { LotoCard } from './Card';
import { Treasure } from './face';
import { DECK_HINT, DECK_LABEL, makeDeck, openDecks } from './decks';
import { TABLE_CONF, TABLE_GAME, loadKey, save } from './store';

// „საგალობო ლოტო“ on one phone (the hybrid): the teacher's phone plays the pieces through its speaker, the children mark paper
// cards with beans — the printed kit's thirty (over its twenty chants, the same cards as on paper: utils/loto.ts kitCards) or
// cards they write themselves, nine names of the deck in a 3 × 3 grid. Whoever calls „საგანძური!“ is checked here: a printed
// card by its number, an own card by the names the child reads out. The game stays on this phone (✕ only pauses).

const PDF = '/games/print/sagalobo-loto.pdf';
type Cards = LotoTable['cards'];
interface Conf { cards: Cards; deck: LotoDeck }
const readConf = (): Conf => {
  const o = (loadKey(TABLE_CONF) ?? {}) as Partial<Conf>;
  return { cards: o.cards === 'own' ? 'own' : 'print', deck: o.deck === 'songs' || o.deck === 'regions' ? o.deck : 'chants' };
};
const clipOf = (t: LotoTable, i: number): Clip | null => {
  const p = t.pieces[i];
  if (!p) return null;
  if (p.book && p.num) return { score: { book: p.book, num: p.num }, voices: 0, seconds: LOTO_CLIP };
  return p.url ? { url: p.url, from: p.from ?? 0.2, seconds: LOTO_CLIP } : null;
};
const placeWord = (n: number) => (n === 1 ? 'პირველი' : `მე-${n}`);

/** a call: a printed card's number, or the names a child reads out */
const CallCheck: React.FC<{ t: LotoTable; onWin: (label: string, lines: number) => void; onBack: () => void }> = ({ t, onWin, onBack }) => {
  const [no, setNo] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [who, setWho] = useState('');
  const played = new Set(tablePlayed(t));
  if (t.cards === 'print') {
    const res = no ? checkKitCard(t, no) : null;
    return (
      <div className="space-y-3.5">
        <p className="font-serif-ge text-[19px] font-bold text-[#4a3426]">რომელი ბარათია?</p>
        <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="ბარათის ნომერი">
          {Array.from({ length: KIT_CARDS }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              aria-pressed={no === n}
              onClick={() => { setNo(n); triggerHaptic(8); }}
              className={`h-11 rounded-2xl text-[15px] font-bold tabular-nums cursor-pointer ${no === n ? 'bg-[#7a2028] text-white' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:bg-[#7a2028]/[0.05]'}`}
            >{n}</button>
          ))}
        </div>
        {res && (
          <>
            {res.lines > 0 ? <Treasure sub={`ბარათი №${no} · ${res.lines > 1 ? `${res.lines} ხაზი` : 'ხაზი შეკრულია'}`} /> : (
              <p className="rounded-3xl bg-[#4a3426] px-4 py-3.5 font-serif-ge text-[18px] font-bold leading-snug text-[#fbf6ec]" role="status">
                ჯერ არა — №{no} ბარათზე ხაზი არ არის ({res.marked.length} / {CARD_SIZE} ჟღერდა)
              </p>
            )}
            <LotoCard names={t.names} card={res.card} marked={res.marked} lines={res.cells} label={`ბარათი №${no}`} />
            <Hint className="text-center">მწვანე — უკვე ჟღერდა. შეადარე ბავშვის ლობიოს მარცვლებს.</Hint>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="ghost" size="lg" full onClick={onBack} className="!h-13">უკან</Btn>
          <Btn size="lg" full disabled={!res || res.lines < 1} onClick={() => res && no && onWin(`ბარათი №${no}`, res.lines)} icon={<Flag />} className="!h-13">ჩაწერა</Btn>
        </div>
      </div>
    );
  }
  const res = checkNames(t, picked);
  return (
    <div className="space-y-3.5">
      <div>
        <p className="font-serif-ge text-[19px] font-bold text-[#4a3426]">რომელი სახელებია ხაზში?</p>
        <p className="mt-0.5 text-[13px] text-[#75685a]">ბავშვი კითხულობს, შენ ნიშნავ — სამი ერთ რიგში, სვეტში ან დიაგონალზე.</p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="სახელები">
        {t.names.map((name, i) => {
          const on = picked.includes(i);
          const tone = !on ? 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8]' : played.has(i) ? 'bg-[#2f7d4f] text-white' : 'bg-[#b4443a] text-white';
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(p => (on ? p.filter(x => x !== i) : [...p, i]))}
              className={`min-h-[40px] rounded-full px-3.5 py-1.5 text-[14px] font-bold leading-tight cursor-pointer ${tone}`}
            >
              {on && (played.has(i) ? <Check className="mr-1 inline h-4 w-4 align-[-3px]" /> : <X className="mr-1 inline h-4 w-4 align-[-3px]" />)}{name}
            </button>
          );
        })}
      </div>
      {picked.length > 0 && (
        res.ok ? <Treasure sub="ყველა მონიშნული უკვე ჟღერდა" /> : (
          <p className="rounded-3xl bg-[#4a3426] px-4 py-3.5 text-[15px] font-bold leading-snug text-[#fbf6ec]" role="status">
            {res.missing.length ? `ჯერ არ ჟღერდა: ${res.missing.map(i => `„${t.names[i]}“`).join(', ')}` : 'ხაზისთვის სამი სახელია საჭირო'}
          </p>
        )
      )}
      {res.ok && (
        <label className="block space-y-1.5">
          <span className="text-[13.5px] font-bold text-[#4a3426]">ვინ შეკრა? (არ არის აუცილებელი)</span>
          <input
            value={who}
            onChange={e => setWho(e.target.value.slice(0, 40))}
            placeholder="სახელი"
            className="h-12 w-full rounded-2xl bg-white px-4 text-[16px] text-[#4a3426] ring-1 ring-[#e8dcc8] outline-none focus:ring-2 focus:ring-[#7a2028]/40"
          />
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" full onClick={onBack} className="!h-13">უკან</Btn>
        <Btn size="lg" full disabled={!res.ok} onClick={() => onWin(who.trim() || `${placeWord(t.wins.length + 1)} ხაზი`, 1)} icon={<Flag />} className="!h-13">ჩაწერა</Btn>
      </div>
    </div>
  );
};

const TableGame: React.FC<{ t: LotoTable; set: (t: LotoTable | null) => void; onClose: () => void }> = ({ t, set, onClose }) => {
  const snippet = useSnippet(LOTO_CLIP);
  const [filling, setFilling] = useState(t.cards === 'own' && t.at === 0);
  const [shown, setShown] = useState(false);
  const [checking, setChecking] = useState(false);
  const [ended, setEnded] = useState(false);
  const played = tablePlayed(t);
  const now = played.length ? played[played.length - 1] : null;
  const clip = now !== null ? clipOf(t, now) : null;
  const over = tableOver(t);

  const next = () => {
    if (over) return;
    snippet.unlock();
    const n = tableNext(t);
    set(n);
    setShown(false);
    const c = clipOf(n, n.order[n.at - 1]);
    if (c) snippet.play(c); else snippet.stop();
    triggerHaptic(10);
  };
  const tapClip = () => {
    if (!clip) return;
    if (snippet.state === 'play' || snippet.state === 'load') snippet.stop(); else snippet.play(clip);
  };
  const close = () => { snippet.stop(); onClose(); };
  const finish = async () => {
    if (!over && !(await askConfirm({ title: 'თამაში დავასრულოთ?', text: 'დარჩენილი ნაწყვეტები აღარ დაიკვრება.', ok: 'დასრულება' }))) return;
    snippet.stop();
    setEnded(true);
  };

  if (ended) {
    return (
      <TableScreen
        title="საგალობო ლოტო"
        onClose={close}
        footer={<div className="mx-auto w-full max-w-[600px]"><Btn size="lg" full onClick={() => set(null)} icon={<RotateCcw />} className="!h-14 !text-[16px]">ახალი თამაში</Btn></div>}
      >
        <div className="mx-auto w-full max-w-[600px] py-2 space-y-4">
          <div className="text-center">
            <Trophy className="mx-auto h-9 w-9 text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">თამაში დასრულდა</p>
            <Hint>{played.length} ნაწყვეტი ჟღერდა · {t.wins.length ? `${t.wins.length} საგანძური` : 'ხაზი ვერავინ შეკრა'}</Hint>
          </div>
          {t.wins.length > 0 && (
            <ol className="space-y-1.5">
              {t.wins.map((w, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-[#e8dcc8]">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${i === 0 ? 'bg-[#e2b93b] text-[#3b2a10]' : 'bg-[#4a3426]/10 text-[#4a3426]'}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 text-[15px] font-bold text-[#4a3426] [overflow-wrap:anywhere]">{w.label}</span>
                  <span className="shrink-0 text-[12.5px] font-bold text-[#75685a]">ნაწყვეტი {w.at}</span>
                </li>
              ))}
            </ol>
          )}
          <PlayedList t={t} open />
        </div>
      </TableScreen>
    );
  }

  if (filling) {
    return (
      <TableScreen
        title="საგალობო ლოტო"
        onClose={close}
        footer={<div className="mx-auto w-full max-w-[600px]"><Btn size="lg" full onClick={() => setFilling(false)} icon={<ChevronRight />} className="!h-14 !text-[16px]">ყველამ შეავსო</Btn></div>}
      >
        <div className="mx-auto w-full max-w-[600px] py-2 space-y-3.5">
          <div>
            <p className="font-serif-ge text-[20px] font-bold leading-snug text-[#4a3426]">ბარათის შევსება</p>
            <p className="mt-1 text-[14px] leading-snug text-[#75685a]">
              ყველამ ფურცელზე 3 × 3 ბადე დახაზოს და ამ სიიდან ნებისმიერი ცხრა სახელი ჩაწეროს — ვისაც როგორ უნდა.
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {t.names.map((name, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2 ring-1 ring-[#e8dcc8]">
                <span className="w-6 shrink-0 text-right text-[13px] font-bold tabular-nums text-[#9a8b7b]">{i + 1}</span>
                <span className="min-w-0 font-serif-ge text-[16px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{name}</span>
              </li>
            ))}
          </ol>
        </div>
      </TableScreen>
    );
  }

  if (checking) {
    return (
      <TableScreen title="საგანძური! — შემოწმება" onClose={close}>
        <div className="mx-auto w-full max-w-[600px] py-2">
          <CallCheck
            t={t}
            onBack={() => setChecking(false)}
            onWin={(label, lines) => { set(addWin(t, label, lines)); setChecking(false); triggerHaptic(20); }}
          />
        </div>
      </TableScreen>
    );
  }

  return (
    <TableScreen
      title="საგალობო ლოტო"
      onClose={close}
      footer={(
        <div className="mx-auto w-full max-w-[600px] grid grid-cols-[auto_1fr] gap-2">
          <Btn kind="ghost" size="lg" onClick={() => setChecking(true)} disabled={!played.length} icon={<Gem />} className="!h-14 !px-4 !text-[15px] !text-[#8a6d12]">საგანძური!</Btn>
          {over
            ? <Btn size="lg" full onClick={finish} icon={<Trophy />} className="!h-14 !text-[16px]">შედეგები</Btn>
            : <Btn size="lg" full onClick={next} icon={played.length ? <ChevronRight /> : <Play />} className="!h-14 !text-[16px]">{played.length ? 'შემდეგი ნაწყვეტი' : 'პირველი ნაწყვეტი'}</Btn>}
        </div>
      )}
    >
      <div className="mx-auto w-full max-w-[600px] py-2 space-y-3.5">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[13.5px] font-bold tabular-nums text-[#75685a]">
            ნაწყვეტი {played.length} / {t.order.length} · {t.cards === 'print' ? `დაბეჭდილი ბარათები 1–${KIT_CARDS}` : DECK_LABEL[t.deck]}
          </p>
          {!over && <button type="button" onClick={finish} className="h-9 rounded-full px-3 text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">დასრულება</button>}
        </div>
        {now === null ? (
          <div className="rounded-3xl bg-white px-4 py-5 text-center ring-1 ring-[#e8dcc8]">
            <p className="font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426]">ხმა აუწიე და დაიწყე</p>
            <p className="mt-1 text-[13.5px] leading-snug text-[#75685a]">ნაწყვეტი ერთხელ ჟღერს ({LOTO_CLIP} წამი), საჭიროებისას — კიდევ ერთხელ. ბავშვები თავის ბარათზე ნიშნავენ.</p>
          </div>
        ) : (
          <>
            {clip && <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} note="ტელეფონის დინამიკით — ხმა აუწიე" />}
            <button
              type="button"
              onClick={() => setShown(v => !v)}
              aria-pressed={shown}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-3xl bg-white px-4 py-3 text-left ring-1 ring-[#e8dcc8] cursor-pointer hover:bg-[#4a3426]/[0.03]"
            >
              {shown ? <EyeOff className="h-5 w-5 shrink-0 text-[#75685a]" /> : <Eye className="h-5 w-5 shrink-0 text-[#75685a]" />}
              {shown
                ? <span className="min-w-0 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{t.names[now]}{t.pieces[now]?.song ? <span className="text-[14px] text-[#75685a]"> · „{t.pieces[now].song}“</span> : null}</span>
                : <span className="text-[14.5px] font-bold text-[#4a3426]">რა ჟღერს? <span className="font-normal text-[#75685a]">— მხოლოდ შენ ნახავ; გინდა, თქვი, გინდა — არა</span></span>}
            </button>
          </>
        )}
        {t.wins.length > 0 && (
          <section className="rounded-3xl bg-[#e2b93b]/15 px-4 py-3 ring-1 ring-[#e2b93b]/40">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 text-[13.5px] font-bold text-[#6f5610]">საგანძური: {t.wins.map((w, i) => `${i + 1}. ${w.label}`).join(' · ')}</p>
              <button type="button" onClick={() => set(undoWin(t))} aria-label="ბოლო ჩანაწერის გაუქმება" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6f5610] hover:bg-[#6f5610]/10 cursor-pointer"><Undo2 className="h-4 w-4" /></button>
            </div>
          </section>
        )}
        <PlayedList t={t} />
        <Hint>ვინც ხაზს შეკრავს, დაიძახებს „საგანძური!“ — დააჭირე და მისი ბარათი შეამოწმე. თამაში შეგიძლია გააგრძელო მეორე და მესამე ხაზამდე.</Hint>
      </div>
    </TableScreen>
  );
};

/** what has sounded, in order (folded while playing) */
const PlayedList: React.FC<{ t: LotoTable; open?: boolean }> = ({ t, open }) => {
  const played = tablePlayed(t);
  if (!played.length) return null;
  return (
    <details open={open} className="group rounded-3xl bg-white ring-1 ring-[#e8dcc8]">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[14px] font-bold text-[#4a3426]">
        <span className="min-w-0 flex-1">ჟღერდა · {played.length}</span>
        <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <ol className="space-y-1 px-4 pb-3">
        {played.map((i, k) => (
          <li key={i} className="flex items-baseline gap-2.5 text-[14px] leading-snug text-[#4a3426]">
            <span className="w-5 shrink-0 text-right text-[12.5px] font-bold tabular-nums text-[#9a8b7b]">{k + 1}</span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{t.names[i]}</span>
          </li>
        ))}
      </ol>
    </details>
  );
};

export const LotoTableGame: React.FC = () => {
  const { program } = useMine();
  const [conf, setConfState] = useState<Conf>(readConf);
  const setConf = (c: Conf) => { setConfState(c); save(TABLE_CONF, c); };
  const [game, setGameState] = useState<LotoTable | null>(() => parseLotoTable(loadKey(TABLE_GAME)));
  const [playing, setPlaying] = useState(false);
  const [empty, setEmpty] = useState(false);
  const setGame = (t: LotoTable | null) => { setGameState(t); save(TABLE_GAME, t); if (!t) setPlaying(false); };
  const open = openDecks();
  const deck = open.includes(conf.deck) ? conf.deck : 'chants';

  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში?', text: 'დაწყებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    const d = conf.cards === 'print' ? { names: kitNames(), pieces: kitPieces() } : makeDeck(deck, 16, program);
    const t = d ? newLotoTable(conf.cards, conf.cards === 'print' ? 'chants' : deck, d.names, d.pieces) : null;
    if (!t) { setEmpty(true); return; }
    setEmpty(false);
    setGame(t);
    setPlaying(true);
  };

  if (game && playing) return <TableGame t={game} set={setGame} onClose={() => setPlaying(false)} />;

  const choice = (id: Cards, title: string, sub: string, Icon: typeof Printer) => (
    <button
      type="button"
      role="radio"
      aria-checked={conf.cards === id}
      onClick={() => setConf({ ...conf, cards: id })}
      className={`flex w-full items-start gap-3 rounded-3xl px-4 py-3.5 text-left cursor-pointer ${conf.cards === id ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#4a3426]/[0.03]'}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${conf.cards === id ? 'text-[#7a2028]' : 'text-[#9a8b7b]'}`} />
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-[#4a3426]">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#75685a]">{sub}</span>
      </span>
    </button>
  );

  return (
    <Card className="!p-4 sm:!p-5 space-y-4">
      <div>
        <p className="font-serif-ge text-[18px] font-bold text-[#4a3426]">ერთი ტელეფონი, ქაღალდის ბარათები</p>
        <p className="mt-1.5 text-[13px] leading-snug text-[#75685a]">
          ტელეფონი ნაწყვეტებს დინამიკით უკრავს, ბავშვები ბარათზე ლობიოს მარცვლით ნიშნავენ. ვინც ხაზს შეკრავს, დაიძახებს „საგანძური!“ — ტელეფონი
          მის ბარათს შეამოწმებს.
        </p>
      </div>
      <div className="space-y-2" role="radiogroup" aria-label="ბარათები">
        {choice('print', 'დაბეჭდილი ბარათები', `${KIT_CARDS} ბარათი, ოცი საგალობელი — ამობეჭდე ერთხელ, ითამაშე ბევრჯერ.`, Printer)}
        {choice('own', 'საკუთარი ბარათები', 'ყველა თავად ხაზავს 3 × 3 ბადეს და ეკრანზე ნაჩვენები სიიდან ცხრა სახელს წერს.', PenLine)}
      </div>
      {conf.cards === 'print' ? (
        <a href={PDF} download className="flex min-h-[48px] items-center gap-2.5 rounded-2xl bg-[#4a3426]/[0.06] px-4 py-2.5 text-[14px] font-bold text-[#4a3426] hover:bg-[#4a3426]/[0.1]">
          <Download className="h-4 w-4 shrink-0" />ბარათების PDF (ორმხრივად ამოსაბეჭდი)
        </a>
      ) : (
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">რა ჟღერს</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="რა ჟღერს">
            {open.map(d => <Chip key={d} on={deck === d} onClick={() => setConf({ ...conf, deck: d })}>{DECK_LABEL[d]}</Chip>)}
          </div>
          <p className="text-[12.5px] leading-snug text-[#9a8b7b]">{DECK_HINT[deck]}</p>
        </div>
      )}
      {empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-2.5 text-[13px] font-bold text-amber-900">ამ ბარათისთვის ნაწყვეტები ვერ მოიძებნა.</p>}
      {game ? (
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="ghost" size="lg" full onClick={start} icon={<RotateCcw />} className="!h-14 !text-[15px]">ახალი</Btn>
          <Btn size="lg" full onClick={() => setPlaying(true)} icon={<Play />} className="!h-14 !text-[15.5px]">გაგრძელება</Btn>
        </div>
      ) : (
        <Btn size="lg" full onClick={start} icon={<Play />} className="!h-14 !text-[16px]">დაწყება</Btn>
      )}
      {game && <Hint>დაწყებული: {game.cards === 'print' ? 'დაბეჭდილი ბარათები' : DECK_LABEL[game.deck]} · ჟღერდა {game.at} / {game.order.length}</Hint>}
    </Card>
  );
};
