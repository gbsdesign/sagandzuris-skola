import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Grape, Play, RotateCcw, Users } from 'lucide-react';
import { useAuth } from '../../../context';
import { useManagedClasses, type SchoolClass } from '../../../hooks/useClasses';
import { useClassStudents } from '../../../hooks/useTeaching';
import { bell, chime, closeAudio, openAudio, tick, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { deedsOf, harvestOf, vineOf, yellowShare, type Vine } from '../../../utils/vazi';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card } from '../../../components/ui/kit';
import { VineArt } from './VineArt';
import { bunchLooks } from './Mine';
import { useToday, useVine } from './useVine';

// „ჩემი ვაზი“'s „ჰიბრიდული“ — „რთველი“: the teacher's phone or the projector shows every vine of a class on one screen and
// counts the season's bunches together, vine by vine; then the children share real grapes. Members' records are read the
// way the class page reads them (a teacher may read their members' students/{uid}); a member sees only how it goes.

const STEP_MS = 750;
const firstName = (s: string) => s.trim().split(/\s+/)[0] || s;

export interface HarvestVine { uid: string; name: string; vine: Vine | null; denied?: boolean }

const HarvestScreen: React.FC<{ cls: SchoolClass; onClose: () => void }> = ({ cls, onClose }) => {
  const records = useClassStudents(cls);
  const today = useToday();
  const vines = useMemo<HarvestVine[]>(() => cls.members.map(m => {
    const r = records[m.uid];
    return { uid: m.uid, name: firstName(m.name), vine: r?.data ? vineOf(deedsOf(r.data), today) : null, denied: !!r?.denied };
  }), [cls.members, records, today]);
  return <HarvestBoard title={`რთველი · ${cls.name}`} vines={vines} onClose={onClose} />;
};

/** the harvest's screen itself: the vines, the sum and the counting */
export const HarvestBoard: React.FC<{ title: string; vines: HarvestVine[]; onClose: () => void }> = ({ title, vines, onClose }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  const ready = vines.filter((v): v is typeof v & { vine: Vine } => !!v.vine);
  const { total } = harvestOf(ready);

  // „დავითვალოთ!“: one vine after another lights up and its bunches join the sum
  const [step, setStep] = useState<number | null>(null);
  const counting = step !== null && step < vines.length;
  const done = step !== null && step >= vines.length;
  useEffect(() => {
    if (step === null || step >= vines.length) return;
    const t = setTimeout(() => setStep(s => (s === null ? s : s + 1)), STEP_MS);
    const n = vines[step]?.vine?.seasonBunches ?? 0;
    if (n) chime(audio.current, Math.min(3, n)); else tick(audio.current);
    return () => clearTimeout(t);
  }, [step, vines]);
  useEffect(() => { if (done) { bell(audio.current); triggerHaptic(40); } }, [done]);
  const shown = step === null || done ? total : vines.slice(0, step + 1).reduce((n, v) => n + (v.vine?.seasonBunches ?? 0), 0);
  const start = () => { triggerHaptic(10); setStep(0); };

  return (
    <TableScreen
      title={title}
      onClose={onClose}
      footer={(
        <Btn size="lg" full icon={done ? <RotateCcw /> : <Play />} disabled={counting || !ready.length} onClick={start} className="!h-14 !text-[15.5px]">
          {counting ? 'ვითვლით…' : done ? 'კიდევ ერთხელ დავითვალოთ' : 'დავითვალოთ!'}
        </Btn>
      )}
    >
      <div className="py-2 space-y-4">
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-[#fbf6ec]/95 backdrop-blur-sm text-center">
          <p className="text-[13px] lg:text-[15px] text-[#75685a]">კლასის მტევნები წელს</p>
          <p className="font-serif-ge text-[46px] lg:text-[68px] font-bold leading-none text-[#4b2b5f] tabular-nums" aria-live="polite">{shown}</p>
          {done && (
            <p className="mt-1 text-[15px] lg:text-[18px] font-bold text-[#2f7d4f]">
              კლასმა {total} მტევანი მოისხა! ახლა ნამდვილი ყურძნის ჯერია.
            </p>
          )}
        </div>
        {!vines.length ? (
          <p className="text-center text-[14px] text-[#75685a]">კლასში ჯერ წევრები არ არიან.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {vines.map((v, i) => {
              const on = counting && i === step;
              return (
                <li
                  key={v.uid}
                  className={`rounded-2xl bg-white overflow-hidden transition duration-300 ${on ? 'ring-[3px] ring-[#7a2028] scale-[1.03] shadow-lg' : 'ring-1 ring-[#e8dcc8]'} ${counting && step !== null && i > step ? 'opacity-60' : ''}`}
                >
                  {v.vine ? (
                    <VineArt leaves={v.vine.recent} wood={v.vine.leaves} bunches={bunchLooks(v.vine)} yellow={yellowShare(v.vine.idle)} className="block w-full h-auto" label={`${v.name}: ${v.vine.seasonBunches} მტევანი`} />
                  ) : (
                    <div className="aspect-[360/280] grid place-items-center px-2 text-center text-[12.5px] text-[#9a8b7b] bg-[#fbf6ec]">{v.denied ? 'ვაზი ვერ ჩაიტვირთა' : 'იტვირთება…'}</div>
                  )}
                  <div className="px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[13.5px] lg:text-[15px] font-bold text-[#2f2018]">{v.name}</span>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[14px] lg:text-[16px] font-bold text-[#4b2b5f] tabular-nums">
                      <Grape className="w-4 h-4" aria-hidden="true" />{v.vine ? v.vine.seasonBunches : '–'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </TableScreen>
  );
};

export const VineHarvest: React.FC = () => {
  const { isTeacher } = useAuth();
  const { classes } = useManagedClasses();
  const { vine, member } = useVine();
  const [open, setOpen] = useState<SchoolClass | null>(null);
  if (open) return <HarvestScreen cls={open} onClose={() => setOpen(null)} />;
  return (
    <div className="space-y-4">
      <Card className="!p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#4b2b5f] text-white inline-flex items-center justify-center"><Grape className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">რთველი კლასში</p>
            <p className="text-[13px] leading-snug text-[#75685a]">ყველა ვაზი ერთ ეკრანზე — მტევნებს ერთად ვითვლით</p>
          </div>
        </div>
        <p className="text-[14px] leading-snug text-[#4a3426]">
          მასწავლებლის ტელეფონი ან პროექტორი კლასის ყველა ვაზს აჩვენებს და წლის მტევნებს ვაზ-ვაზ ითვლის. მერე ბავშვები ნამდვილ ყურძენს
          ინაწილებენ — ვისაც მეტი მტევანი აქვს, ის იწყებს.
        </p>
        {isTeacher ? (
          classes.length ? (
            <div className="space-y-2">
              <p className="text-[13px] font-bold text-[#7a2028] inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> აირჩიე კლასი</p>
              <div className="flex flex-wrap gap-1.5">
                {classes.map(c => <Chip key={c.id} on={false} onClick={() => { triggerHaptic(10); setOpen(c); }}>{c.name} · {c.members.length}</Chip>)}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#75685a]">შენ ჯერ კლასი არ გყავს — რთველი კლასის მასწავლებელს ეხსნება.</p>
          )
        ) : (
          <p className="text-[13.5px] leading-snug text-[#75685a]">
            რთველს მასწავლებელი ხსნის.{member ? ` შენს ვაზზე წელს ${vine.seasonBunches} მტევანია.` : ''}
          </p>
        )}
      </Card>
    </div>
  );
};
