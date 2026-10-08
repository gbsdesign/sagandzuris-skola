import React, { useState } from 'react';
import { BookOpen, Ear, Music, Shuffle } from 'lucide-react';
import { SIGHT_READING } from '../../data/abituriProgram';
import { useNotes } from '../../context/NotesContext';
import { useAbituriProgress } from '../../hooks/useAbituriProgress';
import { triggerHaptic } from '../../utils/haptics';
import { Drill } from './drills/Trainer';
import { CARD, SectionHead } from './shared';

// I round practice: „მოკლე მოტივის გამეორება“ (a motif played, the student sings it back, then sees the notes) and
// „ფურცლიდან კითხვა“ (a short Gelati chant of vol. I outside the program, opened on its notes page).

const BTN = 'shrink-0 inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full text-[13px] font-bold cursor-pointer';
const MAIN = `${BTN} bg-[#7a2028] text-[#fbf6ec] hover:bg-[#5e1820]`;
const PLAIN = `${BTN} bg-[#fbf6ec] text-[#4a3426] ring-1 ring-[#e8dcc8] hover:text-[#7a2028]`;

export const RoundOnePractice: React.FC = () => {
  const progress = useAbituriProgress();
  const { openNotes } = useNotes();
  const [motif, setMotif] = useState(false);
  const [pick, setPick] = useState<number | null>(null);

  const another = () => {
    triggerHaptic(10);
    setPick(p => {
      let i = Math.floor(Math.random() * SIGHT_READING.length);
      if (i === p) i = (i + 1) % SIGHT_READING.length;
      return i;
    });
  };
  const chant = pick == null ? null : SIGHT_READING[pick];

  return (
    <section className="mb-7">
      <SectionHead title="ვარჯიში" sub="მოტივის გამეორება და ფურცლიდან კითხვა" />
      <div className={`${CARD} divide-y divide-[#efe5d4]`}>
        <div className="flex items-center gap-3 p-3.5 sm:p-4">
          <span className="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028]"><Ear className="w-[18px] h-[18px]" /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-serif-ge text-[15.5px] font-bold leading-snug text-[#2a2017]">მოტივის გამეორება</span>
            <span className="block text-[12.5px] font-semibold leading-snug text-[#8a7a6a]">მოუსმინე, გაიმეორე ხმით, მერე ნახე ნოტები</span>
          </span>
          <button type="button" onClick={() => { triggerHaptic(10); setMotif(m => !m); }} className={motif ? PLAIN : MAIN} aria-expanded={motif}>
            {motif ? 'დახურვა' : 'დაწყება'}
          </button>
        </div>

        <div className="p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <span className="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028]"><BookOpen className="w-[18px] h-[18px]" /></span>
            <span className="flex-1 min-w-0">
              <span className="block font-serif-ge text-[15.5px] font-bold leading-snug text-[#2a2017]">ფურცლიდან კითხვა</span>
              <span className="block text-[12.5px] font-semibold leading-snug text-[#8a7a6a]">გელათის I ტომის მოკლე საგალობელი — პროგრამის გარეშე</span>
            </span>
            {!chant && <button type="button" onClick={another} className={MAIN}><Shuffle className="w-4 h-4" /> აირჩიე</button>}
          </div>
          {chant && (
            <div className="mt-3 sm:ml-12">
              <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#2a2017]">{chant.title}</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-[#8a7a6a]">გელათის სკოლა, I ტომი, №{chant.num} · {chant.service}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#4a3426]">
                ჯერ შეხედე ზომას, ნიშნებს და პირველ ბგერას; იმღერე შენი ხმა ნოტებიდან და მხოლოდ მერე ჩართე სინთეზატორი — შესამოწმებლად.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { triggerHaptic(10); openNotes(chant.vid, 'list'); }} className={MAIN}>
                  <Music className="w-4 h-4" /> ნოტების გახსნა
                </button>
                <button type="button" onClick={another} className={PLAIN}><Shuffle className="w-4 h-4" /> სხვა საგალობელი</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {motif && <div className="mt-3"><Drill kind="motif" progress={progress} onClose={() => setMotif(false)} /></div>}
    </section>
  );
};
