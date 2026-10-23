import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, CircleCheck, Headphones, X } from 'lucide-react';
import { ChantItem, ChantVariant, isChantGroup, variantLines } from '../../data';
import { useNotes } from '../../context/NotesContext';
import { canOpenNotes } from '../../data/chantLookup';
import { isOffline, onOfflineChange } from '../../utils/offlineNotes';
import { triggerHaptic } from '../../utils/haptics';
import { previewProgress, toggleSynthPreview, usePreview } from '../../utils/listPreview';
import { PreviewButton } from '../../components/PreviewButton';
import { chantRecordingMedia, chantRecordings, isRecordingVersion } from '../../data/chantRecordings';
import { ChantPlayer } from '../../components/ChantPlayer';

// warm paper palette of the notes pages: cream ground, white cards with a sand line
const SCHOOL_STYLES: Record<string, { name: string; short: string; text: string }> = {
  'გ.ს.': { name: 'გელათის სკოლა', short: 'გელათური', text: 'text-[#78350f]' },
  'ქ.კ.': { name: 'ქართლ-კახური', short: 'ქართლ-კახური', text: 'text-[#0c4a6e]' },
  'შ.ს.': { name: 'შემოქმედის სკოლა', short: 'გურული', text: 'text-[#064e3b]' },
};

// The start of a version's notes (all voices of its first phrase, with the words): a small picture cut from the book
// page without the Latin words under the bass, public/notes/<book>/i/NNN.webp (cut by a script outside the repo);
// a version without one just shows none.
const incipitUrl = (v: ChantVariant) =>
  v.bookNums?.length ? `/notes/${v.book || 'book'}/i/${String(v.bookNums[0]).padStart(3, '0')}.webp` : '';
const missingIncipits = new Set<string>();

// It fills the card from edge to edge at a fixed shape, as tall as a narrow card allows; what does not fit fades out
// on the right, where the ▶ sits.
// Until the picture has come, its place glows softly; then it fades in.
const Incipit: React.FC<{ src: string; onClick: () => void; onMissing: () => void; play: React.ReactNode }> = ({ src, onClick, onMissing, play }) => {
  const [ready, setReady] = useState(false);
  return (
    <div className={`relative mt-auto aspect-[1.7] lg:aspect-[2.3] border-t border-[#f3ece0] overflow-hidden transition-colors duration-500 ${ready ? '' : 'bg-[#f7f1e7] animate-pulse'}`}>
      <button type="button" onClick={onClick} tabIndex={-1} aria-hidden className="block w-full h-full pl-1.5 pt-1 cursor-pointer">
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false}
          onLoad={() => setReady(true)}
          onError={() => { missingIncipits.add(src); onMissing(); }}
          className={`block w-full h-full object-cover object-left mix-blend-multiply pointer-events-none select-none transition-opacity duration-500 [mask-image:linear-gradient(to_right,#000_72%,transparent_98%)] ${ready ? 'opacity-100' : 'opacity-0'}`} />
      </button>
      <span className="absolute right-1 top-1/2 -translate-y-1/2">{play}</span>
    </div>
  );
};

/** While the ▶ plays, a thin line along the card's bottom edge fills up; it lies over the card, so nothing moves. */
const PlayLine: React.FC<{ id: string }> = ({ id }) => {
  const phase = usePreview(id);
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    const step = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${previewProgress(id)})`;
      raf = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(raf);
  }, [phase, id]);
  if (!phase) return null;
  return (
    <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-[#b4620e]/15 pointer-events-none">
      <span ref={bar} className="block h-full origin-left rounded-r-full bg-[#b4620e]" style={{ transform: 'scaleX(0)' }} />
    </span>
  );
};

// "გ.ს. გამშვ" / "გ.ს. №162" -> "გ.ს."
const schoolOf = (code: string) => code.trim().split(/\s+/)[0];

// Rows of the school grid: book versions are listed one by one, the other schools keep their "სადა" / "გამშვენებული" pair
const groupBySchool = (variants: ChantVariant[]) => {
  const rows: { school: string; plain?: ChantVariant; ornate?: ChantVariant; versions: ChantVariant[] }[] = [];
  for (const v of variants) {
    const school = schoolOf(v.code || '');
    let row = rows.find(r => r.school === school);
    if (!row) rows.push((row = { school, versions: [] }));
    if (v.version !== undefined) row.versions.push(v);
    else if ((v.code || '').includes('გამშვ')) row.ornate = v;
    else row.plain = v;
  }
  return rows;
};

const VariantChip: React.FC<{
  chant: ChantItem;
  variant: ChantVariant;
  label: string;
  sublabel?: string;
  isOpen: boolean;
  isSelected: boolean;
  hasRecording: boolean;
  onOpen: (id: string) => void;
  onToggleSelect: (chant: ChantItem, v: ChantVariant) => void;
}> = ({ chant, variant, label, sublabel, isOpen, isSelected, hasRecording, onOpen, onToggleSelect }) => {
  const hasNotes = canOpenNotes(chant, variant);
  // a version that is only another choir's recording: a normal button, it plays below the buttons
  const playable = hasNotes || (isRecordingVersion(variant.id) && hasRecording);
  // the teacher adds a version to the service from its notes page („მსახურება“ in the top bar), not from here
  const { openNotes } = useNotes();
  // "I ტომი · №162" strong; the page goes to the quieter line under it: "გვ. 225 · ხუნდაძე"
  const parts = label.split(' · ');
  // (under a tome's heading the tome is gone and the page stays up: "№162 · გვ. 225")
  const pageAt = parts.length > 1 && parts[0].includes('ტომი') ? parts.findIndex(p => p.startsWith('გვ.')) : -1;
  const head = pageAt >= 0 ? parts.filter((_, i) => i !== pageAt) : parts;
  const under = [pageAt >= 0 && parts[pageAt], sublabel].filter(Boolean).join(' · ');
  // kept on the phone („ჩამოწერა“): a small green mark beside the recording's
  const [offline, setOffline] = useState(() => isOffline(variant.id));
  useEffect(() => onOfflineChange(() => setOffline(isOffline(variant.id))), [variant.id]);
  const open = () => {
    triggerHaptic(10);
    if (hasNotes) openNotes(variant.id, 'list');
    else onOpen(variant.id);
  };
  // the picture of the notes' start, while it is there; the ▶ sits on it, otherwise under the bookmark on the right
  const pic = hasNotes ? incipitUrl(variant) : '';
  const [hasPic, setHasPic] = useState(!!pic && !missingIncipits.has(pic));
  /* a quick listen on the synthesizer, without opening the notes */
  const play = hasNotes && (
    <PreviewButton
      id={variant.id}
      onToggle={() => toggleSynthPreview(variant.id, variant.bookNums![0], variant.book)}
      label="სინთეზატორით მოსმენა"
      inline
    />
  );
  return (
    <div
      className={`relative min-w-0 flex flex-col rounded-xl overflow-hidden transition-[transform,box-shadow,background-color] duration-150 active:scale-[0.98] ${
        isOpen
          ? 'bg-[#fcf1df] ring-1 ring-[#e8b866]'
          : playable
          ? 'bg-white shadow-[0_1px_2px_rgba(74,52,38,0.07),0_6px_16px_-10px_rgba(74,52,38,0.28)] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(74,52,38,0.08),0_14px_26px_-14px_rgba(74,52,38,0.45)]'
          : 'bg-transparent border border-dashed border-[#e4d8c4]'
      }`}
    >
      <div className="flex items-start">
      <button
        type="button"
        onClick={open}
        className={`flex-1 min-w-0 ${hasPic ? 'min-h-10' : 'min-h-12'} pl-2.5 pr-1 pt-2 pb-1.5 text-left leading-snug cursor-pointer ${playable ? 'text-[#2a2017]' : 'text-[#b8aa97]'}`}
        title={hasNotes ? (hasRecording ? 'ნოტები და ჩანაწერი' : 'ნოტები') : playable ? 'ჩანაწერი (ნოტები არ არის)' : 'ნოტები ჯერ არ არის'}
      >
        <span className="block text-[13.5px] font-bold">
          {label === 'გამშვენებული' ? (
            <>
              <span className="sm:hidden">გამშვ.</span>
              <span className="hidden sm:inline">გამშვენებული</span>
            </>
          ) : head.map((p, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="font-normal text-[#d0c2ac]"> · </span>}
              <span className={p.length <= 14 ? 'whitespace-nowrap' : ''}>{p}</span>
            </React.Fragment>
          ))}
        </span>
        {(under || hasRecording || offline) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[11.5px] text-[#9a8a76]">
            {under && <span className="min-w-0">{under}</span>}
            {hasRecording && <Headphones className="w-3.5 h-3.5 shrink-0 text-[#b4620e]" aria-label="ჩანაწერი" />}
            {offline && <CircleCheck className="w-3.5 h-3.5 shrink-0 text-[#2f7a4f]" aria-label="ჩამოწერილია" />}
          </span>
        )}
      </button>
      <div className="shrink-0 flex flex-col items-center">
        {/* my list (independent work): the same bookmark as „ჩემი სია“ on the notes page */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            onToggleSelect(chant, variant);
          }}
          className="w-9 h-9 flex items-center justify-center cursor-pointer active:scale-90 group/sel"
          title={isSelected ? 'ჩემი სიიდან ამოღება' : 'ჩემს სიაში დამატება'}
          aria-label={isSelected ? 'ჩემი სიიდან ამოღება' : 'ჩემს სიაში დამატება'}
          aria-pressed={isSelected}
        >
          {isSelected
            ? <BookmarkCheck className="w-[18px] h-[18px] text-emerald-700 fill-emerald-100" />
            : <Bookmark className="w-[18px] h-[18px] text-[#cdbb9f] group-hover/sel:text-[#b4620e] transition-colors" />}
        </button>
        {!hasPic && play && <span className="pb-1.5">{play}</span>}
      </div>
      </div>
      {hasPic && <Incipit src={pic} onClick={open} onMissing={() => setHasPic(false)} play={play} />}
      {hasNotes && <PlayLine id={variant.id} />}
    </div>
  );
};

interface ChantAccordionItemProps {
  chant: ChantItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedChantVariants: Record<string, any>;
  onToggleVariant: (chant: ChantItem, v: ChantVariant) => void;
  /** "chantId|code" of every version with a recording, made once for the whole list */
  recorded: ReadonlySet<string>;
}

export const ChantAccordionItem: React.FC<ChantAccordionItemProps> = memo(({
  chant,
  isExpanded,
  onToggleExpand,
  selectedChantVariants = {},
  onToggleVariant,
  recorded,
}) => {
  const selectedCount = chant?.variants?.filter((v) => Boolean(selectedChantVariants?.[v.id]))?.length || 0;
  // a version without notes shows a short notice instead of a page
  const [openVariantId, setOpenVariantId] = useState<string | null>(null);
  const handleOpenToggle = useCallback((id: string) => {
    setOpenVariantId(prev => (prev === id ? null : id));
  }, []);
  const openVariant = chant?.variants?.find(v => v.id === openVariantId);
  const openRecs = openVariant ? chantRecordings(openVariant.id) : [];
  const variants = (chant?.variants ?? []).filter(v => !isRecordingVersion(v.id) || chantRecordings(v.id).length > 0);
  // the schools' switch: the first school is shown until another is picked
  const schoolRows = groupBySchool(variants);
  const [school, setSchool] = useState<string | null>(null);
  const shownSchool = schoolRows.some(r => r.school === school) ? school : schoolRows[0]?.school;
  // მწუხრი / ცისკარი: every variant is a book version; one school -> a plain grid, Gelati + Kartli-Kakheti -> school rows
  const bookSchool = schoolOf(chant?.variants?.[0]?.code || '');
  const isBookChant = Boolean(
    variants.length && variants.every(v => v.version !== undefined && schoolOf(v.code) === bookSchool)
  );

  // versions kept on the phone ("ჩამოწერა")
  const openable = (chant?.variants ?? []).filter(v => canOpenNotes(chant, v));
  const [savedCount, setSavedCount] = useState(() => openable.filter(v => isOffline(v.id)).length);
  useEffect(() => onOfflineChange(() => setSavedCount(openable.filter(v => isOffline(v.id)).length)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chant]);

  // Title without the trailing ";" of the book headings
  const displayTitle = (chant?.title || '').replace(/[;\s]+$/, '');
  // Sub-line: book page · number of book versions · recordings · kept offline
  const bookVersions = chant?.variants?.filter(v => v.version !== undefined && !isRecordingVersion(v.id)) ?? [];
  const firstPage = bookVersions.find(v => v.page)?.page;
  const recordingCount = chant?.variants?.filter(v => recorded.has(`${chant.id}|${v.code}`)).length ?? 0;
  // a feast (სადღესასწაულო), an occasion of მარხვანი / ზატიკი, a group of მომიხსენენი or დასადებლები, a tone of
  // ძლისპირები or a canon of კატაბასიები lists its own chants, not versions of one chant
  const isFeast = chant?.id?.startsWith('sd-');
  const isOccasion = isChantGroup(chant?.id);
  const meta = [
    firstPage && `გვ. ${firstPage}`,
    bookVersions.length > 1 && `${bookVersions.length} ${isOccasion ? 'საგალობელი' : 'ვერსია'}`,
  ].filter(Boolean) as string[];

  // a book version: "I ტომი · №165 · გვ. 229" over "კერესელიძე" (the chant's name is its title above)
  // a recording-only version: the hymn or the chant over its performer; `book` names the book on the button
  // itself when its row does not
  // under a tome's heading (`noTome`) the button leaves the tome out: "№162 · გვ. 225"
  const bookChip = (variant: ChantVariant, book?: string, noTome = false) => {
    const { top: full, sub } = variantLines(chant.id, chant.title, variant).card;
    const top = noTome ? full.split(' · ').filter(p => !p.includes('ტომი')).join(' · ') || full : full;
    // a wrapped line keeps "I ტომი" and "გვ. 229" whole
    return chip(variant, top.replace(/ (?=ტომი)|(?<=გვ\.) /g, ' '), [book, sub].filter(Boolean).join(' · ') || undefined);
  };

  // the versions stand under small tome headings („I ტომი“, „V ტომი“), four in a row on a wide screen
  const tomeOf = (v: ChantVariant) => variantLines(chant.id, chant.title, v).card.top.split(' · ').find(p => p.includes('ტომი')) || '';
  const versionGrid = (list: ChantVariant[], bookOf?: (v: ChantVariant) => string | undefined) => {
    const groups: { tome: string; items: ChantVariant[] }[] = [];
    for (const v of list) {
      const tome = tomeOf(v);
      const last = groups[groups.length - 1];
      if (last && last.tome === tome) last.items.push(v);
      else groups.push({ tome, items: [v] });
    }
    return (
      <div className="flex flex-col gap-2.5">
        {groups.map((g, i) => (
          <section key={i} className="flex flex-col gap-1.5">
            {g.tome && <h4 className="px-1 text-[12px] font-bold text-[#8c7c6b]">{g.tome}</h4>}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{g.items.map(v => bookChip(v, bookOf?.(v), !!g.tome))}</div>
          </section>
        ))}
      </div>
    );
  };

  const chip = (variant: ChantVariant, label: string, sublabel?: string) => (
    <VariantChip
      key={variant.id}
      chant={chant}
      variant={variant}
      label={label}
      sublabel={sublabel ?? (isRecordingVersion(variant.id) ? variant.source : undefined)}
      isOpen={openVariantId === variant.id}
      isSelected={Boolean(selectedChantVariants?.[variant.id])}
      hasRecording={recorded.has(`${chant.id}|${variant.code}`)}
      onOpen={handleOpenToggle}
      onToggleSelect={onToggleVariant}
    />
  );

  return (
    <div
      className={`rounded-2xl border border-transparent bg-white transition-[box-shadow] duration-300 overflow-hidden ${
        isExpanded
          ? 'shadow-[0_2px_4px_rgba(74,52,38,0.06),0_18px_36px_-20px_rgba(133,80,44,0.55)]'
          : 'shadow-[0_1px_2px_rgba(74,52,38,0.06),0_8px_20px_-14px_rgba(74,52,38,0.35)] hover:shadow-[0_2px_4px_rgba(74,52,38,0.07),0_14px_28px_-16px_rgba(74,52,38,0.45)]'
      }`}
    >
      {/* Chant title (tap to unfold its versions) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          onToggleExpand();
        }}
        aria-expanded={isExpanded}
        className="w-full px-3.5 py-3 max-[359px]:px-3 flex items-center justify-between gap-3 max-[359px]:gap-2 text-left cursor-pointer select-none group"
      >
        <div className="flex-1 min-w-0 flex items-center gap-3 max-[359px]:gap-2">
          <span
            className={`w-2 h-2 shrink-0 rounded-full transition-all duration-300 ${
              isExpanded
                ? 'bg-[#f59e0b] scale-125'
                : selectedCount > 0
                ? 'bg-emerald-500'
                : 'bg-[#cdbfa9] group-hover:bg-[#e0a54a]'
            }`}
          />
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="font-bold text-[#2a2017] text-[17px] leading-snug break-words group-hover:text-[#7a2028] transition-colors">
              {displayTitle}
            </span>
            {(meta.length > 0 || recordingCount > 0 || savedCount > 0 || selectedCount > 0) && (
              <span className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] font-medium text-[#8c7c6b]">
                {meta.join(' · ')}
                {recordingCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[#b4620e]">
                    {meta.length > 0 && <span className="text-[#cdbfa9]">·</span>}
                    <Headphones className="w-3 h-3" />
                    {recordingCount} ჩანაწერი
                  </span>
                )}
                {savedCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[#2f7a4f]">
                    <span className="text-[#cdbfa9]">·</span>
                    <CircleCheck className="w-3 h-3" />
                    {savedCount === openable.length ? 'ჩამოწერილია' : `${savedCount} ჩამოწერილი`}
                  </span>
                )}
                {/* versions picked for my independent work: a quiet note in the same line, not a badge */}
                {selectedCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    {(meta.length > 0 || recordingCount > 0 || savedCount > 0) && <span className="text-[#cdbfa9]">·</span>}
                    <BookmarkCheck className="w-3 h-3" />
                    {selectedCount} მონიშნული
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <span
          className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${
            isExpanded ? 'rotate-180 bg-[#fcf1df] text-[#b4620e]' : 'bg-[#f1e9dc] text-[#8c7c6b] group-hover:text-[#7a2028]'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>

      {/* Its versions */}
      {isExpanded && chant?.variants && (
        <div className={`border-t border-[#f1e8d9] bg-[#faf6ef] px-3 pt-3.5 pb-3 sm:px-4 flex flex-col gap-2.5 animate-[galoba-unfold_0.32s_cubic-bezier(0.2,0.8,0.2,1)_both]`}>
          {isOccasion && (
            <p className="px-1 text-[11.5px] font-semibold text-[#8c7c6b]">
              {isFeast ? 'დღესასწაულის საგალობლები' : 'საგალობლები'}
              {chant.model && <span className="font-medium"> · „{chant.model}“</span>}
            </p>
          )}

          {isBookChant ? (
            /* Book chants of one school: one button per version */
            versionGrid(variants)
          ) : (
            /* a switch of the schools on top; the chosen school's buttons below */
            <div className="flex flex-col gap-2.5">
              {schoolRows.length > 1 && (
                <div role="tablist" aria-label="სკოლა" className="flex flex-wrap gap-1 p-1 rounded-[22px] bg-[#efe6d6]">
                  {schoolRows.map(({ school, plain, ornate, versions }) => {
                    const on = school === shownSchool;
                    const count = versions.length || [plain, ornate].filter(Boolean).length;
                    return (
                      <button key={school} type="button" role="tab" aria-selected={on}
                        onClick={() => { triggerHaptic(8); setSchool(school); }}
                        className={`flex-auto h-9 px-2 min-[420px]:px-2.5 sm:px-3.5 rounded-full text-[13px] font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          on ? `bg-white shadow-[0_2px_6px_-2px_rgba(74,52,38,0.3)] ${SCHOOL_STYLES[school]?.text ?? 'text-[#574739]'}` : 'text-[#8c7c6b] hover:text-[#4a3426]'
                        }`}>
                        {SCHOOL_STYLES[school]?.short ?? school}
                        <span className={`max-[419px]:hidden text-[10.5px] font-semibold tabular-nums ${on ? 'opacity-60' : 'text-[#b3a594]'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {schoolRows.filter(r => schoolRows.length === 1 || r.school === shownSchool).map(({ school, plain, ornate, versions }) => (
                <div key={school} className="flex flex-col gap-2">
                  <span className={`px-1 text-[12px] font-bold tracking-wide leading-tight ${SCHOOL_STYLES[school]?.text ?? 'text-[#574739]'} ${schoolRows.length > 1 && !((versions[0]?.book === 'karb' || versions[0]?.book === 'pat') && versions.every(v => v.book === versions[0].book)) ? 'hidden' : ''}`}>
                    {schoolRows.length === 1 && (SCHOOL_STYLES[school]?.name ?? school)}
                    {/* the book's name heads the row only when every button is from it (not with other choirs' recordings) */}
                    {(versions[0]?.book === 'karb' || versions[0]?.book === 'pat') && versions.every(v => v.book === versions[0].book) && (
                      <span className="font-bold opacity-70">{schoolRows.length === 1 && ' · '}{versions[0].book === 'karb' ? 'კარბელაანთ კილო' : 'დ. პატარავა'}</span>
                    )}
                  </span>
                  {versions.length > 0
                    ? versionGrid(versions,
                        // in a row with recordings the book's name moves onto its own buttons
                        variant => (variant.book === 'pat' && versions.some(v => v.book !== 'pat') ? 'დ. პატარავა' : undefined))
                    : (
                      <div className="grid grid-cols-2 gap-2">
                        {[plain, ornate].map((variant, i) => (variant ? chip(variant, i === 0 ? 'სადა' : 'გამშვენებული') : null))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {openVariant && openRecs.length > 0 && (
            <div className="rounded-xl border border-[#efd6a6] bg-white px-2 pb-2.5 pt-2 animate-[galoba-unfold_0.25s_ease_both]">
              <div className="flex items-center justify-between gap-2 px-2 pt-0.5 pb-1">
                <span className="min-w-0 text-[12.5px] font-extrabold text-[#7a2028] break-words">
                  {[openVariant.source !== 'ჩანაწერი' && openVariant.version, openRecs[0].who].filter(Boolean).join(' · ')}
                  <span className="font-semibold text-[#a0907c]"> · ნოტები აპში ჯერ არ არის</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenToggle(openVariant.id)}
                  className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#b8aa97] hover:bg-[#f1e9dc] hover:text-[#574739] transition-colors cursor-pointer"
                  aria-label="დახურვა"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ChantPlayer
                key={openVariant.id}
                media={chantRecordingMedia(openRecs[0], displayTitle)}
                title={displayTitle}
                subtitle={openRecs[0].who}
                hideNotesButton
              />
            </div>
          )}

          {openVariant && openRecs.length === 0 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white border border-dashed border-[#d6c8b1] animate-[galoba-unfold_0.25s_ease_both]">
              <span className="text-xs font-semibold text-[#8c7c6b]">
                {SCHOOL_STYLES[schoolOf(openVariant.code)]?.name ?? openVariant.code} · ამ ვერსიის ნოტები და ჩანაწერი ჯერ არ არის
              </span>
              <button
                type="button"
                onClick={() => handleOpenToggle(openVariant.id)}
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[#b8aa97] hover:bg-[#f1e9dc] hover:text-[#574739] transition-colors cursor-pointer"
                aria-label="დახურვა"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
