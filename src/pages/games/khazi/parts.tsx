import React from 'react';
import {
  ArrowDownToLine, BookOpen, Castle, Check, Clapperboard, Drama, Feather, Flag, Flame, Globe, GraduationCap, Grape, Landmark, Map as MapIcon,
  MicVocal, Music, Newspaper, Printer, Rocket, ScrollText, Shield, Swords, TrainFront, TramFront, Trees, Trophy, X, Crown,
} from 'lucide-react';
import { DECK_LABEL, KHAZI_PICKS, PICK_LABEL, type KhaziCard, type KhaziIcon, type KhaziPick, type Placed } from '../../../utils/khazi';
import { Chip } from '../../../components/games/Chip';

// The pieces of „დროის ხაზი“ shared by the day's line, the endless game and the teams' screen: a card's icon, the decks'
// chips, the card in hand and the line itself — the cards in time order with a gap to tap between each two while a card waits.

const ICONS: Record<KhaziIcon, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  swords: Swords, crown: Crown, 'book-open': BookOpen, clapperboard: Clapperboard, music: Music, trophy: Trophy, 'graduation-cap': GraduationCap,
  globe: Globe, trees: Trees, feather: Feather, flag: Flag, 'train-front': TrainFront, printer: Printer, map: MapIcon, shield: Shield,
  rocket: Rocket, drama: Drama, newspaper: Newspaper, 'scroll-text': ScrollText, castle: Castle, grape: Grape, 'mic-vocal': MicVocal,
  landmark: Landmark, flame: Flame, 'tram-front': TramFront,
};
export const CardIcon: React.FC<{ icon: KhaziIcon; className?: string; style?: React.CSSProperties }> = ({ icon, className, style }) => {
  const I = ICONS[icon] ?? ScrollText;
  return <I className={className} style={style} aria-hidden="true" />;
};

/** each deck's own colour, on the card in hand and the line's rows */
export const DECK_TINT: Record<KhaziCard['deck'], string> = { istoria: '#7a2028', adamianebi: '#2b5f8a', kultura: '#4f8a3c', tsirva: '#8a6416' };

export const PickChips: React.FC<{ value: KhaziPick; onChange: (p: KhaziPick) => void; only?: KhaziPick[] }> = ({ value, onChange, only = KHAZI_PICKS }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label="ბარათები">
    {only.map(p => <Chip key={p} on={value === p} onClick={() => onChange(p)}>{PICK_LABEL[p]}</Chip>)}
  </div>
);

/** the card waiting for its place: its deck, icon and event — no year */
export const HandCard: React.FC<{ card: KhaziCard; hint?: React.ReactNode; big?: boolean }> = ({ card, hint, big }) => (
  <div className="rounded-2xl bg-white px-4 py-3" style={{ boxShadow: `inset 0 0 0 2px ${DECK_TINT[card.deck]}, 0 6px 18px -10px rgba(61,42,30,.45)` }}>
    <p className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: DECK_TINT[card.deck] }}>
      <CardIcon icon={card.icon} className="w-4 h-4" /> {DECK_LABEL[card.deck]}
    </p>
    <p className={`mt-1 font-serif-ge font-bold leading-snug text-[#2f2018] ${big ? 'text-[22px] lg:text-[26px]' : 'text-[17px]'}`}>{card.text}</p>
    {hint && <p className="mt-1.5 text-[13px] leading-snug text-[#75685a]">{hint}</p>}
  </div>
);

export type Reveal = { id: string; ok: boolean } | null;

/** a year in its column; a longer label (493–494) a size smaller so it keeps one line */
const labelSize = (label: string, big?: boolean) =>
  label.length > 5
    ? (big ? 'w-[86px] text-[17px] lg:w-[104px] lg:text-[21px]' : 'w-[72px] text-[14px]')
    : (big ? 'w-[86px] text-[22px] lg:w-[104px] lg:text-[28px]' : 'w-[72px] text-[18px]');

/**
 * The line: its cards in time order, each with its year; while `onGap` is given, a gap button before, between and after them.
 * `reveal` = the card just placed (green or red, its note shown); `tint` colours a team's cards on one screen.
 */
export const TimeLine: React.FC<{
  line: Placed[];
  card: (id: string) => KhaziCard | undefined;
  onGap?: (gap: number) => void;
  reveal?: Reveal;
  tint?: (team: number) => string;
  big?: boolean;
}> = ({ line, card, onGap, reveal = null, tint, big }) => {
  const gap = (i: number) => onGap && (
    <li key={`g${i}`}>
      <button
        type="button"
        onClick={() => onGap(i)}
        className={`w-full h-10 ${big ? 'lg:h-12 lg:text-[16px]' : ''} rounded-xl border-2 border-dashed border-[#d9c9ad] bg-[#fffdf8] text-[13.5px] font-bold text-[#8a6416] inline-flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#fbf2dc] hover:border-[#c9a24a] active:scale-[0.99] transition`}
        aria-label={i === 0 ? 'პირველზე ადრე' : i === line.length ? 'ბოლოს, ყველაზე გვიან' : `${i}-ე და ${i + 1}-ე ბარათს შორის`}
      >
        <ArrowDownToLine className="w-4 h-4" aria-hidden="true" /> აქ ჩასვი
      </button>
    </li>
  );
  return (
    <ol className={`space-y-1.5 ${big ? 'lg:space-y-2' : ''}`} aria-label="დროის ხაზი">
      {gap(0)}
      {line.map((p, i) => {
        const c = card(p.id);
        if (!c) return null;
        const shown = reveal?.id === p.id;
        const ring = shown ? (reveal!.ok ? 'ring-2 ring-[#2f7d4f] bg-[#eef7f0]' : 'ring-2 ring-[#c8504a] bg-[#fdf0ef]') : p.ok === false ? 'ring-1 ring-[#e9c3c0] bg-[#fdf7f6]' : 'ring-1 ring-[#e8dcc8] bg-white';
        const team = typeof p.team === 'number' && tint ? tint(p.team) : null;
        return (
          <React.Fragment key={p.id}>
            <li
              className={`relative flex items-center gap-3 rounded-2xl pl-2.5 pr-3 py-2 ${ring} ${shown ? 'animate-[pulse_1s_ease-in-out_1]' : ''}`}
              style={team ? { boxShadow: `inset 4px 0 0 ${team}` } : undefined}
            >
              <span
                className={`shrink-0 text-center font-bold tabular-nums leading-none ${labelSize(c.label, big)} ${p.ok === false ? 'text-[#b23a48]' : 'text-[#7a2028]'}`}
              >
                {c.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`flex items-start gap-1.5 leading-snug text-[#2f2018] ${big ? 'text-[16px] lg:text-[20px]' : 'text-[14.5px]'}`}>
                  <CardIcon icon={c.icon} className={`mt-[3px] w-4 h-4 shrink-0 ${big ? 'lg:mt-[5px] lg:w-5 lg:h-5' : ''}`} style={{ color: DECK_TINT[c.deck] }} />
                  <span>{c.text}</span>
                </span>
                {shown && c.note && <span className={`mt-1 block text-[13px] leading-snug text-[#5c4a3d] ${big ? 'lg:text-[15.5px]' : ''}`}>{c.note}</span>}
              </span>
              {p.ok === true && <Check className="w-5 h-5 shrink-0 text-[#2f7d4f]" aria-label="სწორად ჩასმული" />}
              {p.ok === false && <X className="w-5 h-5 shrink-0 text-[#c8504a]" aria-label="შეცდომით ჩასმული" />}
            </li>
            {gap(i + 1)}
          </React.Fragment>
        );
      })}
    </ol>
  );
};
