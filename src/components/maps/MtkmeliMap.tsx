import React, { useEffect, useState } from 'react';
import { ChevronDown, BookOpen, ExternalLink, Feather, ScrollText, BookText } from 'lucide-react';
import { FOLK_REGIONS, FolkRegion } from '../../data/songsData';
import { MtkmeliAuthor, LiteraryWork, WorkKind, authorsInRegion } from '../../data/mtkmeliData';
import { RegionPuzzleMap, RegionLocator } from './RegionPuzzleMap';
import { AddToListButton } from '../ui/AddToListButton';
import { triggerHaptic } from '../../utils/haptics';
import { useNavigation } from '../../context';
import { askSignIn } from '../access/SignInPrompt';
import { useAccess } from '../../hooks/useAccess';

interface MtkmeliMapProps {
  selectedChantVariants?: Record<string, any>;
  onTogglePoem?: (poemId: string, poemTitle: string, author: string, regionCode: string, regionName: string) => void;
}

// On this map Tbilisi is a city, not the songs' "ქალაქური" category
const regionName = (r: FolkRegion) => (r.id === 'kalakuri' ? 'თბილისი' : r.nameGe);

// one calm chip for every kind; the icon still tells a poem from a story
const KIND_ICON: Record<WorkKind, React.ReactNode> = {
  'ლექსი': <Feather className="w-3 h-3" />,
  'პოემა': <ScrollText className="w-3 h-3" />,
  'თხრობა': <BookText className="w-3 h-3" />,
};

export const MtkmeliMap: React.FC<MtkmeliMapProps> = ({ selectedChantVariants = {}, onTogglePoem }) => {
  // the open region is a history step: the top bar's "back" (and the phone's) returns to the map
  const { mapItem, openMapItem } = useNavigation();
  const region = FOLK_REGIONS.find(r => r.id === mapItem) ?? null;

  if (!region) {
    return (
      <RegionPuzzleMap
        onSelect={r => openMapItem(r.id)}
        count={id => authorsInRegion(id).length}
        countLabel={n => `${n} ავტორი`}
        regionName={regionName}
        title="მთქმელი საქართველო"
      />
    );
  }

  const authors = authorsInRegion(region.id);
  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      {/* where the region is: a small map with it lit */}
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
        <RegionLocator region={region} className="w-28 sm:w-32 h-auto shrink-0" />
        <div className="min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">{regionName(region)}</h3>
          <span className="text-xs font-bold text-[#8a4b12]">{authors.length} ავტორი</span>
        </div>
      </div>

      {authors.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-1.5 py-8 px-3 rounded-2xl bg-[#faf6ef] border border-dashed border-[#d6c8b1]">
          <BookOpen className="w-6 h-6 text-[#cdbfa9]" />
          <p className="text-sm font-bold text-[#574739]">ამ კუთხის ავტორები ჯერ არ დამატებულა</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {authors.map(author => (
            <AuthorItem
              key={author.id}
              author={author}
              region={region}
              selectedChantVariants={selectedChantVariants}
              onTogglePoem={onTogglePoem}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface AuthorItemProps {
  author: MtkmeliAuthor;
  region: FolkRegion;
  selectedChantVariants: Record<string, any>;
  onTogglePoem?: MtkmeliMapProps['onTogglePoem'];
}

const AuthorItem: React.FC<AuthorItemProps> = ({ author, region, selectedChantVariants, onTogglePoem }) => {
  const [isOpen, setIsOpen] = useState(false);
  // guests see the authors' names only; opening one asks to sign in
  // (a member a superadmin has not let in yet counts as a guest)
  const { member } = useAccess();
  const [openWorkId, setOpenWorkId] = useState<string | null>(null);
  const selectedCount = author.works.filter(w => selectedChantVariants[w.id]).length;

  return (
    <div
      className={`rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300 overflow-hidden ${
        isOpen
          ? 'border-[#efd6a6] shadow-[0_12px_26px_-18px_rgba(133,80,44,0.55)]'
          : 'border-[#e4d8c4] shadow-[0_1px_2px_rgba(42,32,23,0.05)] hover:border-[#d6c8b1] hover:shadow-[0_10px_22px_-18px_rgba(42,32,23,0.5)]'
      }`}
    >
      <button
        type="button"
        onClick={() => { triggerHaptic(10); if (!member) askSignIn(`მთქმელი — ${author.name}`); else setIsOpen(o => !o); }}
        aria-expanded={isOpen}
        className="w-full pl-3.5 pr-2.5 py-3 flex items-center gap-3 text-left cursor-pointer select-none group"
      >
        <span className={`w-2 h-2 shrink-0 rounded-full transition-all ${isOpen ? 'bg-[#f59e0b] scale-125' : selectedCount ? 'bg-emerald-500' : 'bg-[#cdbfa9] group-hover:bg-[#e0a54a]'}`} />
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="font-bold text-[#2a2017] text-[17px] leading-snug group-hover:text-[#7a2028] transition-colors">
            {author.name}
          </span>
          <span className="text-[11.5px] sm:text-xs font-semibold text-[#8c7c6b]">
            {author.years} · {author.works.length} ნაწარმოები
          </span>
        </span>
        {selectedCount > 0 && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[11.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {selectedCount} მონიშნულია
          </span>
        )}
        <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all ${isOpen ? 'rotate-180 bg-[#fcf1df] text-[#b4620e]' : 'bg-[#f1e9dc] text-[#8c7c6b] group-hover:text-[#7a2028]'}`}>
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-[#e4d8c4] animate-in fade-in duration-200">
          <p className="px-4 py-3 text-sm text-[#574739] leading-relaxed">
            {author.about}{' '}
            <a href={author.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-bold text-[#8a4b12] hover:underline">
              ბიოგრაფია <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <div className="border-t border-[#efe5d4] divide-y divide-[#efe5d4]">
            {author.works.map(work => (
              <WorkItem
                key={work.id}
                work={work}
                isOpen={openWorkId === work.id}
                onToggleOpen={() => { triggerHaptic(10); setOpenWorkId(id => (id === work.id ? null : work.id)); }}
                isSelected={Boolean(selectedChantVariants[work.id])}
                onToggleSelect={onTogglePoem ? () => { triggerHaptic(15); onTogglePoem(work.id, work.title, author.name, region.regionCode, regionName(region)); } : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface WorkItemProps {
  work: LiteraryWork;
  isOpen: boolean;
  onToggleOpen: () => void;
  isSelected: boolean;
  onToggleSelect?: () => void;
}

// a work's full text lives in public/mtkmeli/<id>.json and is fetched when the work is opened
const useWorkText = (work: LiteraryWork, open: boolean) => {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open || !work.hasText || text !== null) return;
    let alive = true;
    setFailed(false);
    fetch(`/mtkmeli/${work.id}.json`)
      .then(r => r.json())
      .then((d: { text: string }) => alive && setText(d.text))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [open, work.hasText, work.id, text]);
  return { text, failed };
};

const WorkItem: React.FC<WorkItemProps> = ({ work, isOpen, onToggleOpen, isSelected, onToggleSelect }) => {

  const { text, failed } = useWorkText(work, isOpen);
  return (
    <div className={`transition-colors ${isOpen ? 'bg-[#fffdf8]' : ''}`}>
      <div className="flex items-center gap-2 pr-2.5">
        <button type="button" onClick={onToggleOpen} aria-expanded={isOpen} className="flex-1 min-w-0 pl-4 pr-1 py-2.5 flex flex-col items-start gap-1 text-left cursor-pointer group">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#f6ecda] text-[#8a5a2a] text-[11.5px] font-bold">
              {KIND_ICON[work.kind]}
              {work.kind}
            </span>
            {work.hasText && <span className="text-[11.5px] font-semibold text-[#b4620e]">სრული ტექსტი</span>}
          </span>
          <span className="text-[15px] font-bold text-[#2a2017] leading-snug group-hover:text-[#7a2028] transition-colors">{work.title}</span>
        </button>
        {onToggleSelect && <AddToListButton isSelected={isSelected} onToggle={onToggleSelect} />}
        <button
          type="button"
          onClick={onToggleOpen}
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${isOpen ? 'rotate-180 bg-[#fcf1df] text-[#b4620e]' : 'bg-[#f1e9dc] text-[#8c7c6b] hover:text-[#7a2028]'}`}
          aria-label={isOpen ? 'დახურვა' : 'გახსნა'}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="px-4 pt-1 pb-4 space-y-3 animate-in fade-in duration-200">
          {work.note && <p className="text-[11.5px] font-semibold text-[#8c7c6b]">{work.note}</p>}
          {work.hasText ? (
            text !== null ? (
              <p className="font-serif text-[15px] sm:text-base text-[#2a2017] whitespace-pre-line leading-relaxed">{text}</p>
            ) : failed ? (
              <p className="text-sm text-[#8c7c6b]">ტექსტი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>
            ) : (
              <p className="text-sm text-[#8c7c6b]">იტვირთება…</p>
            )
          ) : (
            <p className="text-sm text-[#574739] leading-relaxed">{work.description}</p>
          )}
          <a
            href={work.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-9 px-3 py-1.5 rounded-xl border border-[#e4d8c4] bg-white hover:bg-[#fcf1df] hover:border-[#efd6a6] text-xs font-bold text-[#4a3426] inline-flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[#b4620e]" />
            {work.link.label}
          </a>
        </div>
      )}
    </div>
  );
};
