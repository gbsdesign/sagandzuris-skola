import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, BookText, ChevronDown, ExternalLink, Feather, Mic, ScrollText } from 'lucide-react';
import { Card, Dot, Note, Press, Row, Rows, Small, TopBar, cx, FOCUS } from '../../../components/ui2';
import type { FolkRegion } from '../../../data/songsData';
import { authorsInRegion, type LiteraryWork, type MtkmeliAuthor, type WorkKind } from '../../../data/mtkmeliData';
import { CENTRE_RECITERS } from '../../../data/centreOther';
import { isFolkGroup, useReciters } from '../../../components/maps/Reciters';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useAccess } from '../../../hooks/useAccess';
import { useAlbumPlayer } from '../../../utils/useAlbumPlayer';
import { triggerHaptic } from '../../../utils/haptics';
import { AutoRound, Page } from './parts';
import { TakeLine } from './takes';

// „მთქმელი“ of a region in the new look (boards x-kutkhe's „მთქმელი“, x-meleqseebi): the poets as rows — a tap unfolds who
// they were and their works, a work unfolds its text (or what it is) with ⏬ and its link, 🔖 puts it in my list —, then one
// row „მელექსეები“ that opens the voices of the disc „ლექსის თქმა მწადის ერთისა“ (only for whoever may hear that album).

const KIND_ICON: Record<WorkKind, React.ReactNode> = { 'ლექსი': <Feather />, 'პოემა': <ScrollText />, 'თხრობა': <BookText /> };
/** on these lists Tbilisi is a city, not the songs' „ქალაქური“ */
export const poetRegionName = (r: FolkRegion) => (r.id === 'kalakuri' ? 'თბილისი' : r.nameGe);

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

type Toggle = (poemId: string, poemTitle: string, author: string, regionCode: string, regionName: string) => void;

const Work: React.FC<{ work: MtkmeliAuthor['works'][number]; author: MtkmeliAuthor; region: FolkRegion; selected: boolean; onToggle?: Toggle }> = ({
  work, author, region, selected, onToggle,
}) => {
  const [open, setOpen] = useState(false);
  const { text, failed } = useWorkText(work, open);
  const textRef = useRef<HTMLParagraphElement>(null);
  return (
    <div>
      <div className="flex items-center">
        <Row
          lead={<span className="ml-4 flex shrink-0"><Dot icon={KIND_ICON[work.kind]} size={30} color="soft" /></span>}
          title={work.title}
          sub={[work.kind, work.hasText && 'სრული ტექსტი'].filter(Boolean).join(' · ')}
          wrap
          aria-expanded={open}
          onClick={() => { triggerHaptic(10); setOpen(o => !o); }}
          className="min-w-0 flex-1"
          right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />}
        />
        {onToggle && (
          <Press
            aria-pressed={selected}
            aria-label={selected ? `„${work.title}“ — სიიდან ამოღება` : `„${work.title}“ — ჩემს სიაში`}
            title={selected ? 'ჩემს სიაშია' : 'ჩემს სიაში დამატება'}
            onClick={() => { triggerHaptic(15); onToggle(work.id, work.title, author.name, region.regionCode, poetRegionName(region)); }}
            className={cx('mr-2 flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 [&_svg]:size-5', FOCUS)}
          >
            {selected ? <BookmarkCheck aria-hidden="true" className="text-leaf" /> : <Bookmark aria-hidden="true" className="text-mut" />}
          </Press>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-2.5 pt-1 pr-4 pb-4 pl-[60px]">
          {work.note && <Small bold={false}>{work.note}</Small>}
          {work.hasText ? (
            text !== null ? <p ref={textRef} className="font-serif-ge text-body leading-relaxed whitespace-pre-line text-ink">{text}</p>
              : <Note className="px-0">{failed ? 'ტექსტი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.' : 'იტვირთება…'}</Note>
          ) : <p className="text-body leading-relaxed text-ink">{work.description}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {text && <AutoRound source={() => textRef.current} label="ავტომატური კითხვა" />}
            <a href={work.link.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-tap items-center gap-1.5 rounded-full bg-sea-tint px-4 text-meta font-bold text-sea">
              <ExternalLink aria-hidden="true" className="size-4" />{work.link.label}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const Author: React.FC<{ author: MtkmeliAuthor; region: FolkRegion; selected: Record<string, unknown>; onToggle?: Toggle }> = ({
  author, region, selected, onToggle,
}) => {
  const [open, setOpen] = useState(false);
  const { member } = useAccess();
  const picked = author.works.filter(w => selected[w.id]).length;
  return (
    <>
      <Row
        lead={<Dot icon={<Feather />} />}
        title={author.name}
        sub={[author.years, `${author.works.length} ნაწარმოები`, picked && `${picked} სიაშია`].filter(Boolean).join(' · ')}
        wrap
        aria-expanded={open}
        onClick={() => { triggerHaptic(10); if (!member) askSignIn(`მთქმელი — ${author.name}`); else setOpen(o => !o); }}
        right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />}
      />
      {open && (
        <div className="flex flex-col divide-y divide-line bg-page/40">
          <p className="px-4 py-3 text-meta leading-relaxed text-ink">
            {author.about}{' '}
            <a href={author.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-bold text-sea">
              ბიოგრაფია <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          </p>
          {author.works.map(w => <Work key={w.id} work={w} author={author} region={region} selected={!!selected[w.id]} onToggle={onToggle} />)}
        </div>
      )}
    </>
  );
};

/** a region's poets, then „მელექსეები“ */
export const PoetsList: React.FC<{ region: FolkRegion; selected: Record<string, unknown>; onToggle?: Toggle; onReciters: () => void }> = ({
  region, selected, onToggle, onReciters,
}) => {
  const authors = authorsInRegion(region.id);
  const voices = useReciters().filter(r => r[2] === region.id);
  const named = voices.filter(r => !isFolkGroup(r)).length;
  if (!authors.length && !voices.length) return <Note className="py-8 text-center">ამ კუთხის ავტორები ჯერ არ დამატებულა</Note>;
  return (
    <>
      {authors.length > 0 && (
        <Rows>{authors.map(a => <Author key={a.id} author={a} region={region} selected={selected} onToggle={onToggle} />)}</Rows>
      )}
      {voices.length > 0 && (
        <Rows>
          <Row
            lead={<Dot icon={<Mic />} />}
            title="მელექსეები"
            sub={`${named ? `${named} მელექსე · ` : ''}ალბომიდან „ლექსის თქმა მწადის ერთისა“`}
            wrap
            onClick={() => { triggerHaptic(10); onReciters(); }}
          />
        </Rows>
      )}
    </>
  );
};

type Reciter = (typeof CENTRE_RECITERS)[number];

/** a voice with several poems: its row unfolds them */
const ReciterGroup: React.FC<{ r: Reciter; player: ReturnType<typeof useAlbumPlayer> }> = ({ r, player }) => {
  const [, name, , area, poems] = r;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row
        lead={<Dot icon={isFolkGroup(r) ? <Feather /> : <Mic />} />}
        title={name}
        sub={`${poems.length} ლექსი${area ? ` · ${area}` : ''}`}
        aria-expanded={open}
        onClick={() => { triggerHaptic(10); player.stop(); setOpen(o => !o); }}
        right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />}
      />
      {open && poems.map(([id, title, note]) => <TakeLine key={id} id={id} title={title} note={note} player={player} />)}
    </>
  );
};

/** „მელექსეები“ (x-meleqseebi): the disc's voices of one region; a voice with one poem plays from its row */
export const RecitersScreen: React.FC<{ region: FolkRegion; onBack: () => void }> = ({ region, onBack }) => {
  const player = useAlbumPlayer();
  const voices = useReciters().filter(r => r[2] === region.id);
  return (
    <Page>
      <TopBar title="მელექსეები" sub={`${poetRegionName(region)} · პოეტები თავიანთ ლექსებს ამბობენ`} onBack={onBack} />
      <Card>
        <div className="text-meta font-semibold text-mut">ალბომიდან</div>
        <div className="text-head font-bold">„ლექსის თქმა მწადის ერთისა“</div>
      </Card>
      {voices.length ? (
        <Rows>
          {voices.map(r => r[4].length === 1
            ? <TakeLine key={r[0]} id={r[4][0][0]} title={r[1]} note={[r[4][0][1], r[3]].filter(Boolean).join(' · ')} player={player} />
            : <ReciterGroup key={r[0]} r={r} player={player} />)}
        </Rows>
      ) : (
        <Note className="py-8 text-center">ამ ალბომის მოსმენა შენთვის ჯერ არ არის ჩართული.</Note>
      )}
      <Note>ლექსების ტექსტები აქ არ ჩანს: პოეტები XX საუკუნისანი არიან.</Note>
    </Page>
  );
};
