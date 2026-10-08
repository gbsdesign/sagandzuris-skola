import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { FOLK_SONGS, type FolkRegionId } from '../../data/songsData';
import { useAuth } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { UNIVERSITY_PAGE } from '../../data/abituriProgram';

// Shared bits of the "აბიტურიენტს" page

export const CARD = 'rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)]';

export { takeMedia, hasVoices } from '../../data/programMedia';

export const driveFile = (id: string) => `https://drive.google.com/file/d/${id}/view`;
export const driveFolder = (id: string) => `https://drive.google.com/drive/folders/${id}`;

// the song in the songs archive (its page lists more performers)
export const findSong = (ref?: [title: string, region: FolkRegionId, area?: string]) =>
  ref ? FOLK_SONGS.find(s => s.title === ref[0] && s.region === ref[1] && (s.area ?? undefined) === ref[2]) : undefined;

// recordings follow the app's rule: signed-in members who were given them (guests see names only)
export const useCanListen = () => {
  const { user } = useAuth();
  const access = useAccess();
  return Boolean(user) && access.can('recordings');
};

// a roomy pill: a button or an outside link
type PillProps = {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'main' | 'plain' | 'active';
  href?: string;
  onClick?: () => void;
  title?: string;
};
export const Pill: React.FC<PillProps> = ({ icon, children, tone = 'plain', href, onClick, title }) => {
  const cls = `inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-full text-[13px] font-bold leading-tight transition-all cursor-pointer select-none active:scale-[0.97] ${
    tone === 'main'
      ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)] hover:bg-[#5e1820]'
      : tone === 'active'
      ? 'bg-[#5e1820] text-[#fbf6ec] ring-2 ring-[#7a2028]/25'
      : 'bg-[#fbf6ec] text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 hover:text-[#7a2028]'
  }`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} title={title}>
        {icon}
        <span>{children}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} title={title}>
      {icon}
      <span>{children}</span>
    </button>
  );
};

export const SectionHead: React.FC<{ title: string; sub?: string; extra?: React.ReactNode }> = ({ title, sub, extra }) => (
  <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-1 mb-3">
    <div className="min-w-0">
      <h2 className="font-serif-ge text-lg sm:text-xl font-bold leading-tight text-[#2a2017]">{title}</h2>
      {sub && <p className="mt-0.5 text-[13px] font-semibold text-[#8a7a6a]">{sub}</p>}
    </div>
    {extra}
  </div>
);

// The university changes its rules every year — shown at the top of the page and on the admission tab
export const UpdateNotice: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div role="note" className={`flex items-start gap-3 rounded-2xl bg-[#fdf4e3] ring-1 ring-[#e9c98f] px-4 py-3.5 sm:px-5 sm:py-4 text-left ${className}`}>
    <TriangleAlert className="w-6 h-6 shrink-0 mt-0.5 text-[#b7791f]" />
    <p className="text-[16px] leading-relaxed text-[#4a3826] text-pretty">
      აქ დადებული ინფორმაცია, პროგრამა და ჩანაწერები შეიძლება განახლებას საჭიროებდეს — გალობის უნივერსიტეტი
      წესებს ყოველ წელს ცვლის. ამიტომ შეამოწმეთ{' '}
      <a href={UNIVERSITY_PAGE} target="_blank" rel="noopener noreferrer" className="font-bold text-[#7a2028] underline underline-offset-2 decoration-[#7a2028]/40 hover:decoration-[#7a2028]">
        უნივერსიტეტის ვებგვერდი
      </a>
      , განსაკუთრებით მარტის დასაწყისში.
    </p>
  </div>
);
