import React from 'react';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useAllLearning } from '../../hooks/useLearning';
import { parseSongPiece, reviewsDue } from '../../utils/learn';
import { requestLearn } from '../../utils/learnOpen';
import { requestOpen } from '../../utils/searchOpen';
import { georgiaToday } from '../../utils/psalter';
import { triggerHaptic } from '../../utils/haptics';
import { openSongPage } from '../maps/SongPage';
import { pieceTitle } from '../learn/LearnReview';

// The home page's line of the learning mode: what waits for its review today (1, 3 and 7 days after a part was
// learned). A row opens that chant or song straight in its learning mode. Members only; nothing due — no line.

export const LearnDue: React.FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const { openNotes } = useNotes();
  const all = useAllLearning(user?.uid);
  const due = reviewsDue(all || undefined, georgiaToday());
  if (!due.length) return null;
  const parts = due.reduce((n, d) => n + d.parts.length, 0);

  const open = (piece: string) => {
    triggerHaptic(10);
    requestLearn(piece);
    const song = parseSongPiece(piece);
    if (!song) { openNotes(piece, 'list'); return; }
    // the songs' map, then the song's page over it (the map listens once it is on screen)
    requestOpen('simghera', song.songId);
    navigateTo('simghera');
    window.setTimeout(() => openSongPage(song.songId, song.take), 350);
  };

  return (
    <section className={`w-full max-w-md text-left rounded-2xl bg-white/85 ring-1 ring-[#e8dcc8] shadow-[0_8px_18px_-14px_rgba(122,32,40,0.6)] overflow-hidden sg-in ${className || ''}`}>
      <p className="px-3.5 pt-3 pb-1.5 flex items-center gap-2 text-[13.5px] font-extrabold text-[#7a2028]">
        <GraduationCap className="w-[18px] h-[18px] shrink-0" />
        დღეს გასამეორებელი · {parts} ნაწილი
      </p>
      <ul className="divide-y divide-[#f1e8d9]">
        {due.slice(0, 3).map(d => (
          <li key={d.piece}>
            <button type="button" onClick={() => open(d.piece)}
              className="w-full min-h-12 px-3.5 py-2 flex items-center gap-2.5 text-left cursor-pointer hover:bg-[#fbf6ec] active:bg-[#f5ecdc] transition-colors">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold text-[#2a2017]">{pieceTitle(d.piece)}</span>
                <span className="block text-[12px] text-[#8c7c6b]">{d.parts.map(p => p + 1).join(', ')} {d.parts.length === 1 ? 'ნაწილი' : 'ნაწილები'}</span>
              </span>
              <ChevronRight className="w-5 h-5 shrink-0 text-[#b08a4a]" />
            </button>
          </li>
        ))}
      </ul>
      {due.length > 3 && <p className="px-3.5 pb-2.5 pt-1 text-[12px] font-semibold text-[#8c7c6b]">და კიდევ {due.length - 3}</p>}
    </section>
  );
};
