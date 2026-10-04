import React, { memo, useCallback, useState } from 'react';
import { Check, ChevronDown, Headphones, Sparkles, X } from 'lucide-react';
import { ChantItem, ChantVariant, variantName, variantSublabel } from '../../data';
import { getChantMedia } from '../../data/chantMediaRegistry';
import { ChantDetailPage } from '../ChantDetailPage';
import { triggerHaptic } from '../../utils/haptics';

const SCHOOL_STYLES: Record<string, { name: string; text: string; on: string }> = {
  'გ.ს.': { name: 'გელათის სკოლა', text: 'text-amber-900', on: 'bg-amber-500 text-white border-amber-600' },
  'ქ.კ.': { name: 'ქართლ-კახური', text: 'text-sky-900', on: 'bg-sky-600 text-white border-sky-700' },
  'შ.ს.': { name: 'შემოქმედის სკოლა', text: 'text-emerald-900', on: 'bg-emerald-600 text-white border-emerald-700' },
};

// "გ.ს. გამშვ" / "გ.ს. №162" -> "გ.ს."
const schoolOf = (code: string) => code.trim().split(/\s+/)[0];

// Rows of the school grid: book versions (Gelati school vol. I, Kartli-Kakheti vol. III) are listed one by one,
// the other schools keep their "სადა" / "გამშვენებული" pair
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
  school: string;
  isOpen: boolean;
  isSelected: boolean;
  onOpen: (id: string) => void;
  onToggleSelect: (chant: ChantItem, v: ChantVariant) => void;
}> = ({ chant, variant, label, sublabel, school, isOpen, isSelected, onOpen, onToggleSelect }) => {
  const hasRecording = Boolean(getChantMedia(chant.id, variant.code));
  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          localStorage.setItem('selectedChantId', chant.id);
          localStorage.setItem('selectedVariantId', variant.id);
          onOpen(variant.id);
        }}
        className={`w-full ${sublabel ? 'min-h-11 py-1' : 'h-10'} px-1 rounded-lg border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
          isOpen
            ? `${SCHOOL_STYLES[school]?.on ?? 'bg-amber-500 text-white border-amber-600'} shadow-sm`
            : hasRecording
            ? 'bg-white text-slate-800 border-slate-300 hover:border-amber-400 hover:bg-amber-50/50'
            : 'bg-slate-50 text-slate-400 border-slate-200 border-dashed hover:text-slate-600'
        }`}
        title={hasRecording ? 'ჩანაწერი არის' : 'ჩანაწერი ჯერ არ არის'}
      >
        {hasRecording && <Headphones className="w-3.5 h-3.5 shrink-0" />}
        {label === 'გამშვენებული' ? (
          <>
            <span className="sm:hidden">გამშვ.</span>
            <span className="hidden sm:inline truncate">გამშვენებული</span>
          </>
        ) : sublabel ? (
          <span className="flex flex-col items-center leading-tight min-w-0">
            {label.endsWith(' გამშვენებული') ? (
              /* "162 გამშვენებული" does not fit a phone chip: shortened like the "გამშვ." slot above */
              <>
                <span className="sm:hidden text-center">{label.replace(/გამშვენებული$/, 'გამშვ.')}</span>
                <span className="hidden sm:inline text-center">{label}</span>
              </>
            ) : (
              <span className="text-center">{label}</span>
            )}
            <span className={`text-[9px] font-semibold ${isOpen ? 'opacity-80' : 'text-slate-400'}`}>{sublabel}</span>
          </span>
        ) : (
          <span className="truncate">{label}</span>
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
            : 'bg-white border-slate-300 text-transparent hover:border-amber-400'
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
}

export const ChantAccordionItem: React.FC<ChantAccordionItemProps> = memo(({
  chant,
  isExpanded,
  onToggleExpand,
  selectedChantVariants = {},
  onToggleVariant,
}) => {
  const selectedCount = chant?.variants?.filter((v) => Boolean(selectedChantVariants?.[v.id]))?.length || 0;
  // Only one variant's player is open at a time
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

  // Title without the trailing ";" of the book headings
  const displayTitle = (chant?.title || '').replace(/[;\s]+$/, '');
  // Sub-line: book page · number of book versions · recordings
  const bookVersions = chant?.variants?.filter(v => v.version !== undefined) ?? [];
  const firstPage = bookVersions.find(v => v.page)?.page;
  const recordingCount = chant?.variants?.filter(v => getChantMedia(chant.id, v.code)).length ?? 0;
  // a feast (სადღესასწაულო) or an occasion of მარხვანი / ზატიკი lists its own chants, not versions of one chant
  const isFeast = chant?.id?.startsWith('sd-');
  const isOccasion = isFeast || /^(mx|zt)-/.test(chant?.id ?? '');
  const meta = [
    firstPage && `გვ. ${firstPage}`,
    bookVersions.length > 1 && `${bookVersions.length} ${isOccasion ? 'საგალობელი' : 'ვერსია'}`,
  ].filter(Boolean) as string[];

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? 'bg-white border-amber-400/80 shadow-md ring-1 ring-amber-300/40'
          : 'bg-white/95 border-slate-200/90 shadow-xs hover:border-amber-300/80 hover:shadow-sm'
      }`}
    >
      {/* Chant Title Header (Tap to unfold variants) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          onToggleExpand();
        }}
        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none group hover:bg-slate-50/60"
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span
            className={`w-2 h-2 shrink-0 rounded-full transition-all ${
              isExpanded
                ? 'bg-amber-500 scale-125'
                : selectedCount > 0
                ? 'bg-emerald-500'
                : 'bg-slate-300 group-hover:bg-amber-400'
            }`}
          ></span>
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="font-bold text-slate-800 text-[15px] sm:text-[17px] leading-snug break-words group-hover:text-[#85502c] transition-colors">
              {displayTitle}
            </span>
            {(meta.length > 0 || recordingCount > 0) && (
              <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] sm:text-xs font-medium text-slate-400">
                {meta.join(' · ')}
                {recordingCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-700/80">
                    {meta.length > 0 && <span className="text-slate-300">·</span>}
                    <Headphones className="w-3 h-3" />
                    {recordingCount} ჩანაწერი
                  </span>
                )}
              </span>
            )}
          </div>
          {selectedCount > 0 && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
              {selectedCount} მონიშნულია
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isExpanded
                ? 'rotate-180 bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'
            }`}
          >
            <ChevronDown className="w-4 h-4 transition-transform duration-200" />
          </div>
        </div>
      </button>

      {/* Unfolded Variants */}
      {isExpanded && chant?.variants && (
        <div className="border-t border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-stone-50/50 p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
          <div className="text-[11px] font-semibold text-slate-500 px-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{isFeast ? 'დღესასწაულის საგალობლები (აირჩიეთ):' : isOccasion ? 'საგალობლები (აირჩიეთ):' : 'საგალობლის ვარიანტები (აირჩიეთ):'}</span>
          </div>

          {isBookChant ? (
            /* Book chants of one school: one button per version */
            <div className="rounded-xl bg-white border border-slate-200/80 p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {chant.variants.map(variant => (
                <VariantChip
                  key={variant.id}
                  chant={chant}
                  variant={variant}
                  label={variantName(variant) || variant.code}
                  sublabel={variantSublabel(variant)}
                  school={bookSchool}
                  isOpen={openVariantId === variant.id}
                  isSelected={Boolean(selectedChantVariants?.[variant.id])}
                  onOpen={handleOpenToggle}
                  onToggleSelect={onToggleVariant}
                />
              ))}
            </div>
          ) : (
          /* School × style grid: one row per school, "სადა" / "გამშვენებული" side by side */
          <div className="rounded-xl bg-white border border-slate-200/80 divide-y-2 divide-slate-300">
            {groupBySchool(chant.variants).map(({ school, plain, ornate, versions }) => (
              /* a row of book versions puts the school name above its buttons on phones, so the buttons get the full width */
              <div key={school} className={`flex gap-2 px-2.5 py-2 ${versions.length > 0 ? 'flex-col sm:flex-row sm:items-center gap-y-1.5' : 'items-center'}`}>
                <span className={`${versions.length > 0 ? 'px-0.5 sm:px-0' : 'w-[5rem]'} sm:w-32 shrink-0 text-[11px] sm:text-xs font-black leading-tight ${SCHOOL_STYLES[school]?.text ?? 'text-slate-700'}`}>
                  {SCHOOL_STYLES[school]?.name ?? school}
                  {(versions[0]?.book === 'karb' || versions[0]?.book === 'pat') && (
                    <span className="sm:block sm:mt-0.5 text-[10px] sm:text-[11px] font-bold opacity-70">
                      <span className="sm:hidden"> · </span>{versions[0].book === 'karb' ? 'კარბელაანთ კილო' : 'დ. პატარავა'}
                    </span>
                  )}
                </span>
                {versions.length > 0 ? (
                  /* versions printed in a book */
                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-2 py-0.5">
                    {versions.map(variant => (
                      <VariantChip
                        key={variant.id}
                        chant={chant}
                        variant={variant}
                        label={variantName(variant) || variant.code}
                        sublabel={variantSublabel(variant)}
                        school={school}
                        isOpen={openVariantId === variant.id}
                        isSelected={Boolean(selectedChantVariants?.[variant.id])}
                        onOpen={handleOpenToggle}
                        onToggleSelect={onToggleVariant}
                      />
                    ))}
                  </div>
                ) : [plain, ornate].map((variant, i) =>
                  variant ? (
                    <VariantChip
                      key={variant.id}
                      chant={chant}
                      variant={variant}
                      label={i === 0 ? 'სადა' : 'გამშვენებული'}
                      school={school}
                      isOpen={openVariantId === variant.id}
                      isSelected={Boolean(selectedChantVariants?.[variant.id])}
                      onOpen={handleOpenToggle}
                      onToggleSelect={onToggleVariant}
                    />
                  ) : (
                    <span key={i} className="flex-1" />
                  )
                )}
              </div>
            ))}
          </div>
          )}

          {/* Player of the chosen variant */}
          {openVariant && (
            <div className="rounded-xl border border-amber-300/80 bg-white shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-amber-100 bg-amber-50/50">
                <span className="text-xs font-black text-slate-700 truncate">
                  {SCHOOL_STYLES[schoolOf(openVariant.code)]?.name ?? openVariant.code}
                  {openVariant.version !== undefined ? (
                    <span className="font-bold text-amber-700">
                      {` · ${variantName(openVariant)}`}
                      {openVariant.page && ` (${variantSublabel(openVariant)})`}
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700"> · {openVariant.code.includes('გამშვ') ? 'გამშვენებული' : 'სადა'}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenToggle(openVariant.id)}
                  className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label="დახურვა"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-2 pb-2.5 pt-1.5">
                <ChantDetailPage key={openVariant.id} chantId={chant.id} variantId={openVariant.id} inline />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
