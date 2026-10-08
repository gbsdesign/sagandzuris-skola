import React, { memo, useCallback, useEffect, useState } from 'react';
import { BookmarkCheck, Check, ChevronDown, CircleCheck, Headphones, Plus, X } from 'lucide-react';
import { ChantItem, ChantVariant, isChantGroup, variantLines } from '../../data';
import { useNotes } from '../../context/NotesContext';
import { canOpenNotes } from '../../data/chantLookup';
import { isOffline, onOfflineChange } from '../../utils/offlineNotes';
import { triggerHaptic } from '../../utils/haptics';
import { toggleSynthPreview } from '../../utils/listPreview';
import { PreviewButton } from '../../components/PreviewButton';

// warm paper palette of the notes pages: cream ground, white cards with a sand line
const SCHOOL_STYLES: Record<string, { name: string; text: string }> = {
  'გ.ს.': { name: 'გელათის სკოლა', text: 'text-[#78350f]' },
  'ქ.კ.': { name: 'ქართლ-კახური', text: 'text-[#0c4a6e]' },
  'შ.ს.': { name: 'შემოქმედის სკოლა', text: 'text-[#064e3b]' },
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
  const { openNotes, liturgy } = useNotes();
  const regent = liturgy.role === 'teacher';
  const progIdx = regent ? (liturgy.program?.items.indexOf(variant.id) ?? -1) : -1;
  return (
    <div className="relative min-w-0">
      {/* the teacher's mark: + adds the version to today's service, then shows its number there */}
      {regent && hasNotes && (
        <button
          type="button"
          onClick={() => { triggerHaptic(12); liturgy.toggle(variant.id); }}
          className={`absolute -top-[7px] left-1.5 z-[1] w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black tabular-nums transition-all duration-200 cursor-pointer active:scale-90 ${
            progIdx >= 0
              ? 'bg-[#7a2028] text-white shadow-[0_3px_8px_-3px_rgba(122,32,40,0.8)] animate-[orn-in_0.4s_cubic-bezier(0.3,1.7,0.5,1)_both]'
              : 'bg-white text-[#7a2028] shadow-[inset_0_0_0_1.5px_#7a2028] hover:bg-[#f5e8e5]'
          }`}
          title={progIdx >= 0 ? `დღევანდელ წირვაშია, №${progIdx + 1}. ამოღება` : 'დღევანდელ წირვაში დამატება'}
          aria-label={progIdx >= 0 ? `დღევანდელ წირვაშია, №${progIdx + 1}. ამოღება` : 'დღევანდელ წირვაში დამატება'}
        >
          {progIdx >= 0 ? progIdx + 1 : <Plus className="w-3 h-3 stroke-[3]" />}
        </button>
      )}
      {/* a quick listen on the synthesizer, without opening the notes */}
      {hasNotes && (
        <PreviewButton
          id={variant.id}
          onToggle={() => toggleSynthPreview(variant.id, variant.bookNums![0], variant.book)}
          label="სინთეზატორით მოსმენა"
          className="-bottom-[7px] left-1.5"
        />
      )}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          if (hasNotes) openNotes(variant.id, 'list');
          else onOpen(variant.id);
        }}
        className={`w-full ${sublabel ? 'min-h-12 py-1.5' : 'h-11'} px-1.5 rounded-[10px] border text-[11.5px] sm:text-xs font-bold flex items-center justify-center gap-1 text-center leading-tight transition-all duration-150 cursor-pointer active:scale-[0.97] ${
          isOpen
            ? 'bg-[#fcf1df] text-[#2a2017] border-[#e8b866] border-dashed'
            : hasNotes
            ? 'bg-white text-[#2a2017] border-[#e2d3bb] shadow-[0_1px_0_rgba(133,80,44,0.06)] hover:border-[#d9a55a] hover:shadow-[0_0_0_3px_rgba(180,98,14,0.12)]'
            : 'bg-[#faf6ef] text-[#b8aa97] border-[#e4d8c4] border-dashed hover:text-[#8c7c6b]'
        }`}
        title={hasNotes ? (hasRecording ? 'ნოტები და ჩანაწერი' : 'ნოტები') : 'ნოტები ჯერ არ არის'}
      >
        {label === 'გამშვენებული' ? (
          <span className="inline-flex items-center gap-1">
            {hasRecording && <Headphones className="w-3.5 h-3.5 shrink-0 text-[#b4620e]" />}
            <span className="sm:hidden">გამშვ.</span>
            <span className="hidden sm:inline truncate">გამშვენებული</span>
          </span>
        ) : sublabel ? (
          <span className="flex flex-col items-center gap-px min-w-0">
            <span className="inline-flex items-center gap-1">
              {hasRecording && <Headphones className="w-3.5 h-3.5 shrink-0 text-[#b4620e]" />}
              <span>{label}</span>
            </span>
            <span className="text-[10.5px] font-semibold text-[#a0907c]">{sublabel}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 truncate">
            {hasRecording && <Headphones className="w-3.5 h-3.5 shrink-0 text-[#b4620e]" />}
            {label}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          triggerHaptic(15);
          onToggleSelect(chant, variant);
        }}
        className={`absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all cursor-pointer ${
          isSelected
            ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
            : 'bg-white border-[#dccbb0] text-transparent hover:border-[#d9a55a]'
        }`}
        title={isSelected ? 'მონიშვნის მოხსნა' : 'დამოუკიდებელ სამუშაოში დამატება'}
        aria-label={isSelected ? 'მონიშვნის მოხსნა' : 'დამოუკიდებელ სამუშაოში დამატება'}
      >
        <Check className="w-3 h-3 stroke-[3]" />
      </button>
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
  // მწუხრი / ცისკარი: every variant is a book version; one school -> a plain grid, Gelati + Kartli-Kakheti -> school rows
  const bookSchool = schoolOf(chant?.variants?.[0]?.code || '');
  const isBookChant = Boolean(
    chant?.variants?.length && chant.variants.every(v => v.version !== undefined && schoolOf(v.code) === bookSchool)
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
  const bookVersions = chant?.variants?.filter(v => v.version !== undefined) ?? [];
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

  // a book version: "I ტომი · ამინ · გვ. 229" over "კერესელიძე · №165"
  const bookChip = (variant: ChantVariant) => {
    const { top, sub } = variantLines(chant.id, chant.title, variant);
    // a wrapped line keeps "I ტომი" and "გვ. 229" whole
    return chip(variant, top.replace(/ (?=ტომი)|(?<=გვ\.) /g, ' '), sub || undefined);
  };

  const chip = (variant: ChantVariant, label: string, sublabel?: string) => (
    <VariantChip
      key={variant.id}
      chant={chant}
      variant={variant}
      label={label}
      sublabel={sublabel}
      isOpen={openVariantId === variant.id}
      isSelected={Boolean(selectedChantVariants?.[variant.id])}
      hasRecording={recorded.has(`${chant.id}|${variant.code}`)}
      onOpen={handleOpenToggle}
      onToggleSelect={onToggleVariant}
    />
  );

  return (
    <div
      className={`rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300 overflow-hidden ${
        isExpanded
          ? 'border-[#efd6a6] shadow-[0_12px_26px_-18px_rgba(133,80,44,0.55)]'
          : 'border-[#e4d8c4] shadow-[0_1px_2px_rgba(42,32,23,0.05)] hover:border-[#d6c8b1] hover:shadow-[0_10px_22px_-18px_rgba(42,32,23,0.5)]'
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
        <div className="border-t border-[#e4d8c4] bg-[#faf6ef] px-3 pt-3.5 pb-3 sm:px-4 flex flex-col gap-2.5 animate-[galoba-unfold_0.32s_cubic-bezier(0.2,0.8,0.2,1)_both]">
          {isOccasion && (
            <p className="px-1 text-[11.5px] font-semibold text-[#8c7c6b]">
              {isFeast ? 'დღესასწაულის საგალობლები' : 'საგალობლები'}
              {chant.model && <span className="font-medium"> · „{chant.model}“</span>}
            </p>
          )}

          {isBookChant ? (
            /* Book chants of one school: one button per version */
            <div className="rounded-xl bg-white border border-[#e4d8c4] px-3 pt-3.5 pb-3.5 grid grid-cols-2 sm:grid-cols-3 gap-x-2.5 gap-y-4">
              {chant.variants.map(bookChip)}
            </div>
          ) : (
            /* one block per school, its name above its buttons */
            <div className="rounded-xl bg-white border border-[#e4d8c4] divide-y-2 divide-[#d6c8b1]">
              {groupBySchool(chant.variants).map(({ school, plain, ornate, versions }) => (
                <div key={school} className="px-3 pt-2.5 pb-3.5 flex flex-col gap-2.5">
                  <span className={`text-[11.5px] sm:text-[12.5px] font-extrabold leading-tight ${SCHOOL_STYLES[school]?.text ?? 'text-[#574739]'}`}>
                    {SCHOOL_STYLES[school]?.name ?? school}
                    {(versions[0]?.book === 'karb' || versions[0]?.book === 'pat') && (
                      <span className="font-bold opacity-70"> · {versions[0].book === 'karb' ? 'კარბელაანთ კილო' : 'დ. პატარავა'}</span>
                    )}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2.5 gap-y-4">
                    {versions.length > 0
                      ? versions.map(bookChip)
                      : [plain, ornate].map((variant, i) => (variant ? chip(variant, i === 0 ? 'სადა' : 'გამშვენებული') : null))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {openVariant && (
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
