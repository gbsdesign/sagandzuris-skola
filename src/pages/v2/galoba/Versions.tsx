import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, CircleCheck, Headphones, ListPlus, LoaderCircle, Play, Square, X } from 'lucide-react';
import { ChantItem, ChantVariant, isChantGroup, variantLines } from '../../../data';
import { useChants } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { canOpenNotes } from '../../../data/chantLookup';
import { chantRecordingMedia, chantRecordings, isRecordingVersion } from '../../../data/chantRecordings';
import { isOffline, onOfflineChange } from '../../../utils/offlineNotes';
import { triggerHaptic } from '../../../utils/haptics';
import { previewProgress, toggleSynthPreview, usePreview } from '../../../utils/listPreview';
import { ChantPlayer } from '../../../components/ChantPlayer';
import { Button } from '../../../components/ui2';
import { cx } from '../../../components/ui2/cx';
import { SCHOOL_STYLES, groupBySchool, incipitUrl, missingIncipits, schoolOf } from '../../galoba/ChantAccordionItem';

/** How many cards a school shows before „კიდევ N ვერსია“. */
const FIRST = 4;

/** The synth preview ▶ — the old PreviewButton's logic (usePreview + toggleSynthPreview), drawn as the kit's wine round. */
const PlayBtn: React.FC<{ id: string; onToggle: () => void; className?: string }> = ({ id, onToggle, className }) => {
  const phase = usePreview(id);
  const on = phase !== null;
  const text = on ? 'გაჩერება' : 'სინთეზატორით მოსმენა';
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); triggerHaptic(12); onToggle(); }}
      title={text}
      aria-label={text}
      aria-pressed={on}
      className={cx(
        'relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-wine text-white shadow-lift transition active:scale-90',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
        className,
      )}
    >
      {phase === 'loading' ? <LoaderCircle className="size-[18px] animate-spin" /> : phase === 'playing' ? <Square className="size-3.5 fill-current" /> : <Play className="size-[18px] translate-x-px fill-current" />}
    </button>
  );
};

/** While the ▶ plays, a thin line along the card's bottom edge fills up. */
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
    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-wine/15">
      <span ref={bar} className="block h-full origin-left rounded-r-full bg-wine" style={{ transform: 'scaleX(0)' }} />
    </span>
  );
};

/** The notes' first lines on a white tile; the ▶ sits on its bottom right. Until the picture has come the place glows. */
const Picture: React.FC<{ src: string; onClick: () => void; onMissing: () => void; play: React.ReactNode }> = ({ src, onClick, onMissing, play }) => {
  const [ready, setReady] = useState(false);
  return (
    <div className={cx('relative m-1.5 mb-0 aspect-[1.6] overflow-hidden rounded-field bg-surf transition-colors duration-500', !ready && 'animate-pulse bg-soft')}>
      <button type="button" onClick={onClick} tabIndex={-1} aria-hidden className="block size-full cursor-pointer">
        <img
          src={src} alt="" loading="lazy" decoding="async" draggable={false}
          onLoad={() => setReady(true)}
          onError={() => { missingIncipits.add(src); onMissing(); }}
          className={cx('pointer-events-none block size-full object-cover object-left-top mix-blend-multiply transition-opacity duration-500 select-none', ready ? 'opacity-100' : 'opacity-0')}
        />
      </button>
      <span className="absolute right-1.5 bottom-1.5">{play}</span>
    </div>
  );
};

const VersionCard: React.FC<{
  chant: ChantItem;
  variant: ChantVariant;
  label: string;
  sublabel?: string;
  isOpen: boolean;
  isSelected: boolean;
  hasRecording: boolean;
  wide: boolean;
  onOpen: (id: string) => void;
  onToggleSelect: (chant: ChantItem, v: ChantVariant) => void;
}> = ({ chant, variant, label, sublabel, isOpen, isSelected, hasRecording, wide, onOpen, onToggleSelect }) => {
  const hasNotes = canOpenNotes(chant, variant);
  // a version that is only another choir's recording: it plays under the cards
  const recOnly = !hasNotes && isRecordingVersion(variant.id) && hasRecording;
  const playable = hasNotes || recOnly;
  // the teacher's „+“ under the bookmark puts a version into the service being composed
  const { openNotes, liturgy } = useNotes();
  const progAt = liturgy.role === 'teacher' && hasNotes ? (liturgy.program?.items.indexOf(variant.id) ?? -1) : null;
  // "I ტომი · №162" bold; the page goes to the grey line under it: "გვ. 225 · ხუნდაძე"
  const parts = label.split(' · ');
  const pageAt = parts.length > 1 && parts[0].includes('ტომი') ? parts.findIndex(p => p.startsWith('გვ.')) : -1;
  // a recording of the chant itself would repeat the chant's name: its performer heads the card, „ჩანაწერი“ under it
  const who = recOnly && label === chant.title.replace(/[;\s]+$/, '') ? chantRecordings(variant.id)[0]?.who || variant.version : undefined;
  const head = who ? [who] : pageAt >= 0 ? parts.filter((_, i) => i !== pageAt) : parts;
  const under = who ? 'ჩანაწერი' : [pageAt >= 0 && parts[pageAt], sublabel].filter(Boolean).join(' · ');
  // kept on the phone
  const [offline, setOffline] = useState(() => isOffline(variant.id));
  useEffect(() => onOfflineChange(() => setOffline(isOffline(variant.id))), [variant.id]);
  const open = () => {
    triggerHaptic(10);
    if (hasNotes) openNotes(variant.id, 'list');
    else onOpen(variant.id);
  };
  const pic = hasNotes ? incipitUrl(variant) : '';
  const [hasPic, setHasPic] = useState(!!pic && !missingIncipits.has(pic));
  const play = hasNotes && (
    <PlayBtn id={variant.id} onToggle={() => toggleSynthPreview(variant.id, variant.bookNums![0], variant.book)} />
  );
  const bookmark = (
    <button
      type="button"
      onClick={() => { triggerHaptic(15); onToggleSelect(chant, variant); }}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full transition active:scale-90"
      title={isSelected ? 'ჩემი სიიდან ამოღება' : 'ჩემს სიაში დამატება'}
      aria-label={isSelected ? 'ჩემი სიიდან ამოღება' : 'ჩემს სიაში დამატება'}
      aria-pressed={isSelected}
    >
      {isSelected ? <BookmarkCheck className="size-5 text-leaf" strokeWidth={2} /> : <Bookmark className="size-5 text-mut" strokeWidth={2} />}
    </button>
  );
  const program = progAt !== null && (
    <button
      type="button"
      onClick={() => { triggerHaptic(12); liturgy.toggle(variant.id); }}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full transition active:scale-90"
      title={progAt >= 0 ? `წირვაშია, №${progAt + 1}. ამოღება` : 'წირვაში დამატება'}
      aria-label={progAt >= 0 ? `წირვიდან ამოღება (№${progAt + 1})` : 'წირვაში დამატება'}
      aria-pressed={progAt >= 0}
    >
      {progAt >= 0 ? <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-wine px-1 text-cap font-bold text-white tabular-nums">{progAt + 1}</span> : <ListPlus className="size-5 text-mut" strokeWidth={2} />}
    </button>
  );
  const recPlay = recOnly && (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); open(); }}
      className={cx(
        'relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-90',
        isOpen ? 'bg-wine text-white' : 'bg-tint text-wine',
      )}
      title={isOpen ? 'ჩანაწერის დახურვა' : 'ჩანაწერის მოსმენა'}
      aria-label={isOpen ? 'ჩანაწერის დახურვა' : 'ჩანაწერის მოსმენა'}
      aria-expanded={isOpen}
    >
      <Play className="size-[18px] translate-x-px fill-current" />
    </button>
  );
  return (
    <div
      className={cx(
        'relative flex min-w-0 flex-col overflow-hidden rounded-tile transition-transform active:scale-[0.985]',
        recOnly && 'col-span-2',
        !playable ? 'border border-dashed border-dim bg-transparent' : wide ? 'bg-surf' : 'bg-page',
        isOpen && 'ring-2 ring-wine',
      )}
    >
      {hasPic && <Picture src={pic} onClick={open} onMissing={() => setHasPic(false)} play={play} />}
      <div className={cx('flex gap-1 pr-1 pl-3', recOnly ? 'items-center py-2 pl-2' : 'items-start py-2', hasPic && 'pt-2.5')}>
        {recPlay}
        <button
          type="button"
          onClick={open}
          className={cx('min-h-10 min-w-0 flex-1 cursor-pointer text-left leading-snug', recOnly && 'pl-1', playable ? 'text-ink' : 'text-faint')}
          title={hasNotes ? (hasRecording ? 'ნოტები და ჩანაწერი' : 'ნოტები') : playable ? 'ჩანაწერი (ნოტები არ არის)' : 'ნოტები ჯერ არ არის'}
        >
          <span className="block text-body font-bold">
            {label === 'გამშვენებული' ? 'გამშვენებული' : head.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="font-normal text-mut"> · </span>}
                <span className={p.length <= 14 ? 'whitespace-nowrap' : ''}>{p}</span>
              </React.Fragment>
            ))}
          </span>
          {(under || hasRecording || offline) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-meta text-mut">
              {under && <span className="min-w-0">{under}</span>}
              {hasRecording && !who && <Headphones className="size-3.5 shrink-0 text-gold" aria-label="ჩანაწერი" />}
              {offline && <CircleCheck className="size-3.5 shrink-0 text-leaf" aria-label="ჩამოწერილია" />}
            </span>
          )}
        </button>
        <div className="flex shrink-0 flex-col items-center">
          {bookmark}
          {program}
          {!hasPic && play && <span className="pb-1">{play}</span>}
        </div>
      </div>
      {hasNotes && <PlayLine id={variant.id} />}
    </div>
  );
};

/** x-versiebi / x-desk-sia — one chant's versions: school chips, big cards, „კიდევ N ვერსია“. */
export const Versions: React.FC<{
  chant: ChantItem;
  /** "chantId|code" of every version with a recording, made once for the whole list */
  recorded: ReadonlySet<string>;
  /** the computer's right panel (4 cards a row) instead of the phone's fold (2 a row) */
  wide?: boolean;
}> = ({ chant, recorded, wide = false }) => {
  const { selectedChantVariants = {}, toggleVariantSelection } = useChants();
  // a version without notes shows a short notice instead of a page
  const [openVariantId, setOpenVariantId] = useState<string | null>(null);
  const handleOpenToggle = useCallback((id: string) => setOpenVariantId(prev => (prev === id ? null : id)), []);
  const [school, setSchool] = useState<string | null>(null);
  const [more, setMore] = useState<ReadonlySet<string>>(new Set());
  // another chant: everything starts anew
  useEffect(() => { setOpenVariantId(null); setSchool(null); setMore(new Set()); }, [chant.id]);

  const onToggleVariant = useCallback((c: ChantItem, v: ChantVariant) => toggleVariantSelection?.(c, v), [toggleVariantSelection]);

  const openVariant = chant.variants?.find(v => v.id === openVariantId);
  const openRecs = openVariant ? chantRecordings(openVariant.id) : [];
  const variants = useMemo(
    () => (chant.variants ?? []).filter(v => !isRecordingVersion(v.id) || chantRecordings(v.id).length > 0),
    [chant],
  );
  const schoolRows = groupBySchool(variants);
  const shownSchool = schoolRows.some(r => r.school === school) ? school : schoolRows[0]?.school;
  // მწუხრი / ცისკარი: every variant is a book version of one school -> one plain grid
  const bookSchool = schoolOf(chant.variants?.[0]?.code || '');
  const isBookChant = Boolean(variants.length && variants.every(v => v.version !== undefined && schoolOf(v.code) === bookSchool));
  const displayTitle = (chant.title || '').replace(/[;\s]+$/, '');
  const isOccasion = isChantGroup(chant.id);
  const isFeast = chant.id.startsWith('sd-');

  const card = (variant: ChantVariant, label: string, sublabel?: string) => (
    <VersionCard
      key={variant.id}
      chant={chant}
      variant={variant}
      label={label}
      sublabel={sublabel ?? (isRecordingVersion(variant.id) ? variant.source : undefined)}
      isOpen={openVariantId === variant.id}
      isSelected={Boolean(selectedChantVariants?.[variant.id])}
      hasRecording={recorded.has(`${chant.id}|${variant.code}`)}
      wide={wide}
      onOpen={handleOpenToggle}
      onToggleSelect={onToggleVariant}
    />
  );
  const bookCard = (variant: ChantVariant, book?: string) => {
    const { top, sub } = variantLines(chant.id, chant.title, variant).card;
    // a wrapped line keeps "I ტომი" and "გვ. 229" whole
    return card(variant, top.replace(/ (?=ტომი)|(?<=გვ\.) /g, ' '), [book, sub].filter(Boolean).join(' · ') || undefined);
  };

  const grid = (key: string, list: ChantVariant[], bookOf?: (v: ChantVariant) => string | undefined) => {
    const showAll = more.has(key);
    const shown = showAll ? list : list.slice(0, FIRST);
    const rest = list.length - shown.length;
    return (
      <div className="flex flex-col gap-2.5">
        <div className={cx('grid gap-2.5', wide ? 'grid-cols-3 xl:grid-cols-4' : 'grid-cols-2')}>{shown.map(v => bookCard(v, bookOf?.(v)))}</div>
        {rest > 0 && (
          <Button kind="ghost" size="md" full icon={<ChevronDown />} onClick={() => setMore(prev => new Set(prev).add(key))} className={wide ? 'bg-surf' : 'bg-page'}>
            {`კიდევ ${rest} ვერსია`}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {isOccasion && (
        <p className="px-1 text-meta font-semibold text-mut">
          {isFeast ? 'დღესასწაულის საგალობლები' : 'საგალობლები'}
          {chant.model && <span className="font-medium"> · „{chant.model}“</span>}
        </p>
      )}

      {isBookChant ? (
        grid('all', variants)
      ) : (
        <div className="flex flex-col gap-3">
          {schoolRows.length > 1 && (
            <div role="tablist" aria-label="სკოლა" className="flex h-[52px] shrink-0 gap-1 overflow-x-auto rounded-full bg-track p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {schoolRows.map(({ school: sc, plain, ornate, versions }) => {
                const on = sc === shownSchool;
                const count = versions.length || [plain, ornate].filter(Boolean).length;
                const withRec = [plain, ornate, ...versions].some(v => v && recorded.has(`${chant.id}|${v.code}`));
                return (
                  <button
                    key={sc}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => { triggerHaptic(8); setSchool(sc); }}
                    className={cx(
                      'flex h-tap flex-auto shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-2 text-cap whitespace-nowrap transition min-[420px]:px-3 min-[420px]:text-meta',
                      on ? 'bg-surf font-bold text-wine shadow-knob' : 'font-semibold text-mut active:bg-ink/5',
                    )}
                  >
                    <span>{SCHOOL_STYLES[sc]?.short ?? sc}</span>
                    {withRec && <Headphones className="size-3 shrink-0 text-gold" aria-label="ჩანაწერით" />}
                    <span className="shrink-0 tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          {schoolRows.filter(r => schoolRows.length === 1 || r.school === shownSchool).map(({ school: sc, plain, ornate, versions }) => {
            // the book's name heads the row only when every button is from it (not with other choirs' recordings)
            const bookName = (versions[0]?.book === 'karb' || versions[0]?.book === 'pat') && versions.every(v => v.book === versions[0].book)
              ? (versions[0].book === 'karb' ? 'კარბელაანთ კილო' : 'დ. პატარავა')
              : '';
            const showHead = schoolRows.length === 1 || !!bookName;
            return (
              <div key={sc} className="flex flex-col gap-2">
                {showHead && (
                  <span className="px-1 text-meta leading-tight font-bold text-mut">
                    {schoolRows.length === 1 && (SCHOOL_STYLES[sc]?.name ?? sc)}
                    {bookName && <span>{schoolRows.length === 1 && ' · '}{bookName}</span>}
                  </span>
                )}
                {versions.length > 0
                  ? grid(sc, versions,
                      // in a row with recordings the book's name moves onto its own buttons
                      v => (v.book === 'pat' && versions.some(x => x.book !== 'pat') ? 'დ. პატარავა' : undefined))
                  : (
                    <div className={cx('grid gap-2.5', wide ? 'grid-cols-3 xl:grid-cols-4' : 'grid-cols-2')}>
                      {[plain, ornate].map((v, i) => (v ? card(v, i === 0 ? 'სადა' : 'გამშვენებული') : null))}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {openVariant && openRecs.length > 0 && (
        <div className="sg-in rounded-tile bg-surf px-2 pt-2 pb-2.5">
          <div className="flex items-center justify-between gap-2 px-2 pt-0.5 pb-1">
            <span className="min-w-0 text-body font-bold break-words text-wine">
              {[openVariant.source !== 'ჩანაწერი' && openVariant.version, openRecs[0].who].filter(Boolean).join(' · ')}
            </span>
            <button
              type="button"
              onClick={() => handleOpenToggle(openVariant.id)}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-mut transition active:bg-soft"
              aria-label="დახურვა"
            >
              <X className="size-[18px]" />
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
        <div className="sg-in flex items-center justify-between gap-2 rounded-tile border border-dashed border-dim bg-surf px-3 py-2">
          <span className="min-w-0 text-meta font-semibold text-mut">
            {SCHOOL_STYLES[schoolOf(openVariant.code)]?.name ?? openVariant.code} · ამ ვერსიის ნოტები და ჩანაწერი ჯერ არ არის
          </span>
          <button
            type="button"
            onClick={() => handleOpenToggle(openVariant.id)}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-mut transition active:bg-soft"
            aria-label="დახურვა"
          >
            <X className="size-[18px]" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Versions;
