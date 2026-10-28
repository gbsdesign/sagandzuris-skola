import React, { useMemo } from 'react';
import { Music } from 'lucide-react';
import { Sheet } from '../../components/ui/kit';
import { useNotes } from '../../context/NotesContext';
import { toneName } from '../../utils/dayReadings';
import { toneChants } from '../../utils/toneChants';
import { triggerHaptic } from '../../utils/haptics';

// The tone on the reader's day card, opened: the Sunday chants of that tone in the books (utils/toneChants.ts), by
// service, the reader's own prokeimenon and alleluia first. A book's chip opens its notes page (with the synth).

export const ToneSheet: React.FC<{ tone: number | null; onClose: () => void }> = ({ tone, onClose }) => {
  const { openNotes } = useNotes();
  const groups = useMemo(() => (tone ? toneChants(tone) : []), [tone]);
  const open = (vid: string) => {
    triggerHaptic(10);
    // the sheet closes first: the notes page opens over the page, and „←“ comes back to it
    onClose();
    openNotes(vid, 'bookmark');
  };

  return (
    <Sheet open={tone !== null} onClose={onClose} title={tone ? `${toneName(tone)} · კვირის საგალობლები` : ''}>
      <p className="text-[14px] leading-relaxed text-[#6b5c4d] text-pretty">
        კვირის აღდგომის საგალობლები ამ ხმაზე. დააჭირე წიგნს — გაიხსნება ნოტები, სინთეზატორით.
      </p>
      {groups.map(g => (
        <section key={g.service} className="mt-4">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">
            {g.service}{g.hint && <span className="normal-case tracking-normal font-bold text-[#8a7a6a]"> · {g.hint}</span>}
          </p>
          <ul className="mt-1.5 space-y-2">
            {g.rows.map(r => (
              <li key={r.title} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
                <p className="text-[15px] font-bold leading-snug text-[#2a2017]">{r.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.versions.map(v => (
                    <button key={v.vid} type="button" onClick={() => open(v.vid)}
                      className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028] text-[13px] font-bold cursor-pointer transition active:scale-[0.97]">
                      <Music className="w-4 h-4 shrink-0" />
                      {v.book}{v.num ? ` №${v.num}` : ''}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-4 text-[13px] leading-snug text-[#8a7a6a]">
        კვირის შუა დღეებში ზოგ საგალობელს დღის წმიდანის ხმაზე გალობენ — იხილე დღის განგება.
      </p>
    </Sheet>
  );
};
