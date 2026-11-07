import React, { useMemo } from 'react';
import { Check, ChevronRight, ExternalLink, Gamepad2, Music2 } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import type { OpenSpec } from '../../../data/masteryDrills';
import { knownChants } from '../../../data/chantGamePool';
import { SIGHT_READING } from '../../../data/abituriProgram';
import { useMyClasses } from '../../../hooks/useClasses';
import { learnPieceOf, useOpenLearning } from '../../learn/openLearning';
import { LearnDue } from '../../home/LearnDue';
import { findVersion } from '../../../data/chantLookup';
import { chantName } from '../../../utils/pearls';
import { useManeraPractice } from '../../../utils/maneraPractice';
import { georgiaToday } from '../../../utils/psalter';
import { Btn } from '../../ui/kit';
import { useFinish } from './shared';

// The exercises done elsewhere in the app: a chant learned in the learning mode on the path's voice, a game, a chant's notes
// to read unknown, the reviews due. The sheet closes as the place opens; „შევასრულე“ ticks the day (a self-ticked one counts
// as passed on the path).

const VOICE_LINE = { '1': 'I ხმა · მთქმელი', '2': 'II ხმა · მოძახილი', '3': 'III ხმა · ბანი' } as const;

/** „შევასრულე“ / „წავიკითხე“ — today's tick */
export const DoneButton: React.FC<{ drillId: string; label?: string }> = ({ drillId, label = 'შევასრულე' }) => {
  const { finish } = useFinish(drillId);
  const { doneToday } = useManeraPractice();
  return doneToday(drillId)
    ? <p className="flex items-center justify-center gap-1.5 text-[14px] font-bold text-emerald-700"><Check className="w-4 h-4" /> დღეს შესრულებულია</p>
    : <Btn full size="lg" icon={<Check />} onClick={() => finish(null)}>{label}</Btn>;
};

const Row: React.FC<{ title: string; sub?: string; onClick: () => void; icon?: React.ReactNode }> = ({ title, sub, onClick, icon }) => (
  <button type="button" onClick={onClick}
    className="w-full min-h-12 flex items-center gap-3 px-3 py-2 text-left rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 cursor-pointer active:scale-[0.99] transition">
    <span className="w-9 h-9 shrink-0 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center">{icon ?? <Music2 className="w-4 h-4" />}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-bold leading-snug text-[#2a2017]">{title}</span>
      {sub && <span className="block text-[12px] text-[#8a7a6a]">{sub}</span>}
    </span>
    <ChevronRight className="w-4 h-4 shrink-0 text-[#b3a594]" />
  </button>
);

/** the class's program first, then the well-known chants — each with a learning mode */
const useLearnable = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  return useMemo(() => {
    const out: { piece: string; title: string; sub: string }[] = [];
    const seen = new Set<string>();
    const add = (id: string, sub: string) => {
      const piece = learnPieceOf(id);
      if (!piece || seen.has(piece)) return;
      const info = findVersion(id);
      if (!info) return;
      seen.add(piece);
      out.push({ piece, title: chantName(info.chant.title), sub });
    };
    classes.forEach(c => c.program.forEach(p => p.id && add(p.id, `${c.name} · სასწავლო პროგრამა`)));
    knownChants().slice(0, 12).forEach(k => add(k.id, k.service));
    return out.slice(0, 14);
  }, [classes]);
};

export const OpenRun: React.FC<{ drillId: string; spec: OpenSpec; onClose: (then?: () => void) => void }> = ({ drillId, spec, onClose }) => {
  const learnable = useLearnable();
  const openLearning = useOpenLearning();
  const { navigateTo, openMapItem } = useNavigation();
  const { openNotes } = useNotes();
  const sight = useMemo(() => {
    const day = Math.floor(Date.parse(georgiaToday()) / 86400000);
    return [0, 1, 2].map(k => SIGHT_READING[(day * 3 + k) % SIGHT_READING.length]);
  }, []);

  return (
    <div className="space-y-4 sg-in">
      {spec.kind === 'learn' && (
        <>
          <p className="text-[14px] leading-relaxed text-[#4a3426]">აირჩიე საგალობელი — „სწავლა“ გაიხსნება შენს ხმაზე: <b>{VOICE_LINE[spec.voice]}</b>. ისწავლე ფრაზა-ფრაზა, მერე დაბრუნდი და მონიშნე.</p>
          <div className="space-y-2">
            {learnable.map(c => <Row key={c.piece} title={c.title} sub={c.sub} onClick={() => onClose(() => openLearning(c.piece, spec.voice))} />)}
          </div>
        </>
      )}
      {spec.kind === 'game' && (
        <>
          <p className="text-[14px] leading-relaxed text-[#4a3426]">ეს სავარჯიშო თამაშ „{spec.name}“-შია: ტელეფონი ორ ხმას გალობს, შენ — მესამეს. იმღერე სამივე ხმა რიგრიგობით.</p>
          <Btn full kind="soft" icon={<Gamepad2 />} onClick={() => onClose(() => { navigateTo('games'); openMapItem(spec.item); })}>„{spec.name}“ — გახსნა</Btn>
        </>
      )}
      {spec.kind === 'sight' && (
        <>
          <p className="text-[14px] leading-relaxed text-[#4a3426]">დღის სამი უცნობი საგალობელი. გახსენი ნოტები, ჯერ თვალით წაიკითხე, მერე იმღერე შენი ხმა და ბოლოს სინთეზატორით შეამოწმე.</p>
          <div className="space-y-2">
            {sight.map(c => <Row key={c.vid} title={c.title} sub={`${c.service} · გ.ს. №${c.num}`} icon={<ExternalLink className="w-4 h-4" />} onClick={() => onClose(() => openNotes(c.vid, 'list'))} />)}
          </div>
        </>
      )}
      {spec.kind === 'review' && (
        <>
          <p className="text-[14px] leading-relaxed text-[#4a3426]">ნასწავლი საგალობლები, რომელთა გამეორების დღეც დადგა:</p>
          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] overflow-hidden">
            <LearnDue onOpen={go => onClose(go)} />
          </div>
          <p className="text-[12.5px] text-[#8a7a6a]">სია ცარიელია? დღეს გასამეორებელი არაფერია — ესეც შესრულებაა.</p>
        </>
      )}
      <DoneButton drillId={drillId} />
    </div>
  );
};
