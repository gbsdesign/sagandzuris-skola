import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus, ChevronDown, BookOpen, ExternalLink, Feather, ScrollText, BookText } from 'lucide-react';
import { FolkRegion } from '../../data/songsData';
import { MtkmeliAuthor, LiteraryWork, WorkKind, authorsInRegion } from '../../data/mtkmeliData';
import { RegionPuzzleMap } from './RegionPuzzleMap';
import { triggerHaptic } from '../../utils/haptics';
import { useAuth } from '../../context';
import { askSignIn } from '../access/SignInPrompt';

interface MtkmeliMapProps {
  selectedChantVariants?: Record<string, any>;
  onTogglePoem?: (poemId: string, poemTitle: string, author: string, regionCode: string, regionName: string) => void;
}

// On this map Tbilisi is a city, not the songs' "ქალაქური" category
const regionName = (r: FolkRegion) => (r.id === 'kalakuri' ? 'თბილისი' : r.nameGe);

const KIND_STYLE: Record<WorkKind, { icon: React.ReactNode; cls: string }> = {
  'ლექსი': { icon: <Feather className="w-3 h-3" />, cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  'პოემა': { icon: <ScrollText className="w-3 h-3" />, cls: 'bg-rose-100 text-rose-900 border-rose-300' },
  'თხრობა': { icon: <BookText className="w-3 h-3" />, cls: 'bg-sky-100 text-sky-900 border-sky-300' },
};

export const MtkmeliMap: React.FC<MtkmeliMapProps> = ({ selectedChantVariants = {}, onTogglePoem }) => {
  const [region, setRegion] = useState<FolkRegion | null>(null);

  if (!region) {
    return (
      <RegionPuzzleMap
        onSelect={r => { triggerHaptic(10); setRegion(r); }}
        count={id => authorsInRegion(id).length}
        countLabel={n => `${n} ავტორი`}
        regionName={regionName}
      />
    );
  }

  const authors = authorsInRegion(region.id);
  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
        <button
          type="button"
          onClick={() => { triggerHaptic(10); setRegion(null); }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>რუკაზე დაბრუნება</span>
        </button>
        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900">
          {authors.length} ავტორი
        </span>
      </div>

      <div className="flex items-center gap-3 px-1">
        <span className="w-9 h-9 shrink-0 rounded-xl border border-black/10 shadow-xs" style={{ background: region.color }} />
        <h3 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">{regionName(region)}</h3>
      </div>

      {authors.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-1.5 py-8 px-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
          <BookOpen className="w-6 h-6 text-slate-300" />
          <p className="text-sm font-bold text-slate-600">ამ კუთხის ავტორები ჯერ არ დამატებულა</p>
          <p className="text-xs text-slate-400">მალე დაემატება</p>
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
  const { user } = useAuth();
  const [openWorkId, setOpenWorkId] = useState<string | null>(null);
  const selectedCount = author.works.filter(w => selectedChantVariants[w.id]).length;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? 'bg-white border-amber-400/80 shadow-md ring-1 ring-amber-300/40'
          : 'bg-white/95 border-slate-200/90 shadow-xs hover:border-amber-300/80 hover:shadow-sm'
      }`}
    >
      <button
        type="button"
        onClick={() => { triggerHaptic(10); if (!user) askSignIn(`მთქმელი — ${author.name}`); else setIsOpen(o => !o); }}
        className="w-full px-4 py-3 flex items-center gap-3 text-left cursor-pointer select-none group"
      >
        <span className={`w-2 h-2 shrink-0 rounded-full transition-all ${isOpen ? 'bg-amber-500 scale-125' : selectedCount ? 'bg-emerald-500' : 'bg-slate-300 group-hover:bg-amber-400'}`} />
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="font-bold text-slate-800 text-[15px] sm:text-[17px] leading-snug group-hover:text-[#85502c] transition-colors">
            {author.name}
          </span>
          <span className="text-[11px] sm:text-xs font-medium text-slate-400">
            {author.years} · {author.works.length} ნაწარმოები
          </span>
        </span>
        {selectedCount > 0 && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
            {selectedCount} მონიშნულია
          </span>
        )}
        <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all ${isOpen ? 'rotate-180 bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'}`}>
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-stone-50/50 p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
          <p className="text-sm text-slate-600 leading-relaxed px-1">
            {author.about}{' '}
            <a href={author.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-bold text-amber-800 hover:underline">
              ბიოგრაფია <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <div className="flex flex-col gap-2">
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
  const kind = KIND_STYLE[work.kind];
  const { text, failed } = useWorkText(work, isOpen);
  return (
    <div className={`rounded-xl border bg-white transition-all ${isOpen ? 'border-amber-300 shadow-sm' : 'border-slate-200/80'}`}>
      <div className="flex items-center gap-2 pr-2">
        <button type="button" onClick={onToggleOpen} className="flex-1 min-w-0 px-3 py-2.5 flex flex-col items-start gap-1 text-left cursor-pointer">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-black ${kind.cls}`}>
              {kind.icon}
              {work.kind}
            </span>
            {work.hasText && <span className="text-[10px] font-semibold text-emerald-700">სრული ტექსტი</span>}
          </span>
          <span className="text-sm sm:text-[15px] font-bold text-slate-800 leading-snug">{work.title}</span>
        </button>
        {onToggleSelect && (
          <button
            type="button"
            onClick={onToggleSelect}
            className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isSelected ? 'bg-amber-600 text-white border-amber-700 shadow-2xs' : 'bg-white text-slate-400 hover:text-amber-800 border-slate-200'
            }`}
            title={isSelected ? 'ამოღება' : 'დამატება საგანძურის გზაზე'}
          >
            {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleOpen}
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${isOpen ? 'rotate-180 bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'}`}
          aria-label={isOpen ? 'დახურვა' : 'გახსნა'}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-amber-100 px-3 sm:px-4 py-3 space-y-3 animate-in fade-in duration-200">
          {work.note && <p className="text-[11px] font-semibold text-slate-400">{work.note}</p>}
          {work.hasText ? (
            text !== null ? (
              <p className="font-serif text-[15px] sm:text-base text-slate-800 whitespace-pre-line leading-relaxed">{text}</p>
            ) : failed ? (
              <p className="text-sm text-slate-500">ტექსტი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>
            ) : (
              <p className="text-sm text-slate-400">იტვირთება…</p>
            )
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">{work.description}</p>
          )}
          <a
            href={work.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-9 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-amber-700" />
            {work.link.label}
          </a>
        </div>
      )}
    </div>
  );
};
