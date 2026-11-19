import React, { useEffect, useState } from 'react';
import { BookOpen, Check as CheckIcon, ChevronDown, CirclePlay, Ear, ExternalLink, Headphones, History, Music, Shuffle, X } from 'lucide-react';
import {
  Bar, Button, Card, CheckButton, Chips, Dot, Duo, H2, Note, Press, Row, Rows, Seg, Sheet, Small, ToggleRow, TopBar, cx, FOCUS_IN,
} from '../../../components/ui2';
import { ChantPlayer } from '../../../components/ChantPlayer';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useNavigation } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import {
  BOYS_SONGS, BOYS_SONGS_2025, CHANTS, GIRLS_SONGS, SIGHT_READING, UNIVERSITY_PAGE, type ProgramItem,
} from '../../../data/abituriProgram';
import { songVid } from '../../../data/songBookChants';
import type { AbituriProgressApi, AbituriWho } from '../../../hooks/useAbituriProgress';
import { triggerHaptic } from '../../../utils/haptics';
import { Drill } from '../../abituri/drills/Trainer';
import { hasVoices, takeMedia, useCanListen } from '../../abituri/shared';
import { Page, scrollToId, takePendingFocus } from './parts';

// x-abituri-gamotsda — the I exam in the new look: „გალობა · სიმღერა“ as a switch, the list's name with „ვიცი N / M“, then a
// piece a line (name, school and volume, the round „ვიცი“). A tap opens the piece's window: the notes and the recordings by
// voices (the old card's three buttons). „ვარჯიში“ (the motif, sight-reading) is one line under the list — its own screen.
// The lists, the „ვიცი“ marks and the boys / girls choice are the old tab's (pages/abituri/ProgramTab.tsx).

const SONGS: Record<AbituriWho, { items: ProgramItem[]; sub: string; other: string }> = {
  boys: { items: BOYS_SONGS, sub: 'ვაჟების პროგრამა · 2026', other: 'გოგონების' },
  girls: { items: GIRLS_SONGS, sub: 'გოგონების პროგრამა · 2026', other: 'ვაჟების' },
};
const OTHER: Record<AbituriWho, AbituriWho> = { boys: 'girls', girls: 'boys' };
type ListId = 'chant' | 'song';
const LIST_KEY = 'abituriList';

/** „I ტომი, №158 · გვ. 215–217“ → „I ტომი №158“ */
const shortBook = (book?: string) => book?.split(' · ')[0].replace(', ', ' ');
const subOf = (item: ProgramItem) => [item.isNew ? 'ახალი' : null, item.sub, shortBook(item.book)].filter(Boolean).join(' · ');

// audiomack and YouTube links play inside the window (their embedded players)
const embedOf = (url: string): { src: string; video?: boolean } | null => {
  const am = /audiomack\.com\/([^/]+)\/song\/([^/?#]+)/.exec(url);
  if (am) return { src: `https://audiomack.com/embed/song/${am[1]}/${am[2]}` };
  const yt = /(?:youtu\.be\/|[?&]v=)([\w-]{11})/.exec(url);
  if (yt) return { src: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0&playsinline=1`, video: true };
  return null;
};

type Open = { item: ProgramItem; key?: string } | null;

/** a piece's window: its notes, the recordings by voices, the links, and „ვიცი“ */
const PieceSheet: React.FC<{ open: Open; known: boolean; onKnown?: () => void; onClose: () => void }> = ({ open, known, onKnown, onClose }) => {
  const canListen = useCanListen();
  const { openNotes } = useNotes();
  const [takeIdx, setTakeIdx] = useState(0);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const item = open?.item;
  useEffect(() => { setTakeIdx(0); setEmbedUrl(null); }, [item?.title]);
  if (!item) return <Sheet open={false} title="" onClose={onClose}>{null}</Sheet>;
  const takes = item.takes ?? [];
  const take = takes[Math.min(takeIdx, takes.length - 1)];
  const notesVid = item.vid ?? (item.notes ? songVid(item.notes) : undefined);
  const embed = embedUrl ? embedOf(embedUrl) : null;
  const listenAsk = () => askSignIn('ჩანაწერები');

  return (
    <Sheet open title={item.title} onClose={onClose}>
      <Note>{[item.isNew ? 'ახალი 2026-ში' : null, item.sub, item.book].filter(Boolean).join(' · ')}</Note>
      {(notesVid || onKnown) && (
        <Rows>
          {notesVid && (
            <Row lead={<Dot icon={<Music />} />} title="ნოტები" sub="ხმებით, სინთეზატორით"
              onClick={() => { triggerHaptic(10); onClose(); openNotes(notesVid, 'list'); }} />
          )}
          {onKnown && <ToggleRow lead={<Dot icon={<CheckIcon />} color={known ? 'wine' : 'tint'} />} title="ვიცი" sub="ჩაითვლება „ჩემ მომზადებაში“" on={known} onChange={onKnown} />}
        </Rows>
      )}

      {takes.length > 0 && (canListen ? (
        <>
          {takes.length > 1 && (
            <Chips label="ჩანაწერი" value={String(Math.min(takeIdx, takes.length - 1))} onChange={v => setTakeIdx(Number(v))}
              items={takes.map((t, k) => ({ id: String(k), label: `${t.label}${hasVoices(t) ? ' · ხმებით' : ''}` }))} />
          )}
          {take && (
            <ChantPlayer
              key={`${item.title}-${takeIdx}`}
              media={takeMedia(`abituri:${item.title}:${takeIdx}`, item.title, take)}
              title={item.title}
              subtitle={`${item.sub} · ${take.label}`}
              hideNotesButton
            />
          )}
        </>
      ) : (
        <Rows>
          <Row lead={<Dot icon={<Headphones />} />} title={take && hasVoices(take) ? 'მოსმენა · ხმებით' : 'მოსმენა'} sub="ჩანაწერები შესულებს ესმით" onClick={listenAsk} />
        </Rows>
      ))}

      {item.links && item.links.length > 0 && (
        <Rows>
          {item.links.map(l => (embedOf(l.url) ? (
            <Row key={l.url} lead={<Dot icon={embedUrl === l.url ? <X /> : <CirclePlay />} />} title={embedUrl === l.url ? 'დახურვა' : l.label}
              aria-expanded={embedUrl === l.url}
              onClick={() => { if (!canListen) { listenAsk(); return; } setEmbedUrl(embedUrl === l.url ? null : l.url); }} right={null} />
          ) : (
            <Row key={l.url} lead={<Dot icon={<ExternalLink />} />} title={l.label} href={l.url} target="_blank" right={null} />
          )))}
        </Rows>
      )}
      {embed && (
        <div className={cx('shrink-0 overflow-hidden rounded-tile', embed.video ? 'aspect-video bg-ink' : 'bg-surf')}>
          <iframe
            title={`${item.title} — ${embed.video ? 'YouTube' : 'audiomack'}`}
            src={embed.src}
            className={cx('block w-full border-0', embed.video ? 'h-full' : 'h-[252px]')}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
      {!takes.length && !notesVid && !item.links?.length && <Note>ჩანაწერი ჯერ არ გვაქვს.</Note>}
    </Sheet>
  );
};

/** a piece a line: its number, name and book, the round „ვიცი“ at the end (none for a list that is not mine) */
const PieceRow: React.FC<{ n?: number; id?: string; item: ProgramItem; known?: boolean; onKnown?: () => void; onOpen: () => void }> = ({
  n, id, item, known, onKnown, onOpen,
}) => (
  <div id={id} className="flex min-h-row scroll-mt-24 items-center gap-1 pr-1.5">
    <Press onClick={onOpen} className={cx('flex min-h-row min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 pl-4 text-left text-ink active:bg-soft', FOCUS_IN)}>
      <span aria-hidden="true" className="w-5 shrink-0 text-center text-body font-bold text-mut tabular-nums">{n ?? '·'}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lead leading-snug font-bold wrap-break-word">{item.title}</span>
        <span className="text-meta text-mut wrap-break-word">{subOf(item)}</span>
      </span>
    </Press>
    {onKnown && <CheckButton on={!!known} onChange={() => { triggerHaptic(12); onKnown(); }} label={known ? `${item.title} — ვიცი, მოხსნა` : `${item.title} — ვიცი`} />}
  </div>
);

/** a folded list under mine (the other program, the 2025 songs) */
const Fold: React.FC<{ open: boolean; onToggle: () => void; title: string; sub: string }> = ({ open, onToggle, title, sub }) => (
  <Rows>
    <Row lead={<Dot icon={<History />} color="soft" />} title={title} sub={sub} wrap aria-expanded={open} onClick={onToggle}
      right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />} />
  </Rows>
);

export const ProgramScreen: React.FC<{ api: AbituriProgressApi }> = ({ api }) => {
  const { handleGoBack, openMapItem } = useNavigation();
  const { progress, togglePiece, setWho } = api;
  const who = progress.who;
  const [listId, setListId] = useState<ListId>(() => {
    try { return localStorage.getItem(LIST_KEY) === 'song' ? 'song' : 'chant'; } catch { return 'chant'; }
  });
  const [open, setOpen] = useState<Open>(null);
  const [showOld, setShowOld] = useState(false);
  const [showOther, setShowOther] = useState(false);

  const pick = (id: ListId) => {
    setListId(id);
    try { localStorage.setItem(LIST_KEY, id); } catch { /* ignore */ }
  };

  // „ჩემი მომზადება“'s step: the right list (and the other list's fold), then the piece comes into view
  useEffect(() => {
    const id = takePendingFocus();
    if (!id?.startsWith('piece-')) return;
    const list = id.slice('piece-'.length).split(':')[0];
    if (list === 'chant') pick('chant');
    else { pick('song'); if (who && list !== who) setShowOther(true); }
    scrollToId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const known = (key: string) => progress.pieces.includes(key);
  const knownOf = (list: string, items: ProgramItem[]) => items.filter(it => known(`${list}:${it.title}`)).length;
  const mine = who ? SONGS[who] : null;
  const other = who ? OTHER[who] : null;
  const row = (list: string, item: ProgramItem, n?: number) => {
    const key = `${list}:${item.title}`;
    return (
      <PieceRow key={`${key}-${n ?? item.sub}`} n={n} item={item} id={n ? `piece-${key}` : undefined}
        known={n ? known(key) : undefined} onKnown={n ? () => togglePiece(key) : undefined}
        onOpen={() => { triggerHaptic(8); setOpen({ item, key: n ? key : undefined }); }} />
    );
  };
  const head = (title: string, k: number, all: number, sub?: string) => (
    <Card pad="sm" className="flex flex-col gap-2 px-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-body leading-snug font-bold wrap-break-word">{title}</h2>
          {sub && <span className="text-meta text-mut">{sub}</span>}
        </div>
        <Small tone="wine" className="tabular-nums">ვიცი {k} / {all}</Small>
      </div>
      <Bar value={all ? k / all : 0} h={5} label={`ვიცი ${k} / ${all}`} />
    </Card>
  );

  return (
    <Page>
      <TopBar title="I გამოცდა" sub="გალობა-სიმღერა" onBack={handleGoBack} />
      <Seg label="სია" value={listId} onChange={pick}
        items={[
          { id: 'chant', label: `გალობა · ${CHANTS.length}` },
          { id: 'song', label: mine ? `სიმღერა · ${mine.items.length}` : 'სიმღერა' },
        ]} />

      {listId === 'chant' ? (
        <>
          {head('წირვის სადა კილოს საგალობლები', knownOf('chant', CHANTS), CHANTS.length)}
          <Rows aria-label="საგალობლები">{CHANTS.map((item, i) => row('chant', item, i + 1))}</Rows>
        </>
      ) : !who || !mine || !other ? (
        <Card className="flex flex-col gap-3">
          <H2 flush sub="ვაჟებსა და გოგონებს სხვადასხვა პროგრამა აქვთ">რომელი სიმღერები ისწავლო?</H2>
          <Duo>
            <Button size="md" onClick={() => setWho('boys')}>ვაჟების</Button>
            <Button size="md" onClick={() => setWho('girls')}>გოგონების</Button>
          </Duo>
        </Card>
      ) : (
        <>
          {head('ქართული ხალხური სიმღერა', knownOf(who, mine.items), mine.items.length, mine.sub)}
          <Rows aria-label="სიმღერები">{mine.items.map((item, i) => row(who, item, i + 1))}</Rows>

          <Fold open={showOther} onToggle={() => setShowOther(v => !v)} title={`${mine.other} პროგრამა`} sub="სხვა სია — თუ შეცდომით აირჩიე, აქვე შეცვლი" />
          {showOther && (
            <>
              <Button kind="soft" size="md" className="self-start" icon={<CheckIcon aria-hidden="true" />}
                onClick={() => { setWho(other); setShowOther(false); }}>
                ეს არის ჩემი სია
              </Button>
              <Rows>{SONGS[other].items.map(item => row(other, item))}</Rows>
            </>
          )}
          {who === 'boys' && (
            <>
              <Fold open={showOld} onToggle={() => setShowOld(v => !v)} title="2025 წლის პროგრამიდან" sub="2026-ში შეიცვალა — ჩანაწერები და ნოტები აქ რჩება" />
              {showOld && <Rows>{BOYS_SONGS_2025.map(item => row('old', item))}</Rows>}
            </>
          )}
        </>
      )}

      <Rows>
        <Row lead={<Dot icon={<Ear />} />} title="ვარჯიში" sub="მოტივი · ფურცლიდან კითხვა" onClick={() => openMapItem('program/practice')} />
      </Rows>
      <a href={UNIVERSITY_PAGE} target="_blank" rel="noopener noreferrer"
        className={cx('inline-flex min-h-tap shrink-0 items-center gap-1.5 self-start rounded-full px-2 text-meta font-bold text-wine', FOCUS_IN)}>
        <ExternalLink aria-hidden="true" className="size-4" />უნივერსიტეტის პროგრამა
      </a>

      <PieceSheet open={open} known={!!open?.key && known(open.key)}
        onKnown={open?.key ? () => togglePiece(open.key!) : undefined} onClose={() => setOpen(null)} />
    </Page>
  );
};

/** „ვარჯიში“ of the I exam: the motif sung back, and a short chant read from the notes (the old RoundOnePractice) */
export const PracticeScreen: React.FC<{ api: AbituriProgressApi }> = ({ api }) => {
  const { handleGoBack } = useNavigation();
  const { openNotes } = useNotes();
  const [motif, setMotif] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const another = () => {
    triggerHaptic(10);
    setPick(p => {
      let i = Math.floor(Math.random() * SIGHT_READING.length);
      if (i === p) i = (i + 1) % SIGHT_READING.length;
      return i;
    });
  };
  const chant = pick == null ? null : SIGHT_READING[pick];

  return (
    <Page>
      <TopBar title="ვარჯიში" sub="I გამოცდა · მოტივი და ფურცლიდან კითხვა" onBack={handleGoBack} />
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Dot icon={<Ear />} size={40} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-lead leading-snug font-bold">მოტივის გამეორება</span>
            <span className="text-meta text-mut">მოუსმინე, გაიმეორე ხმით, მერე ნახე ნოტები</span>
          </span>
        </div>
        <Button kind={motif ? 'soft' : 'primary'} size="md" aria-expanded={motif} onClick={() => setMotif(m => !m)}>
          {motif ? 'დახურვა' : 'დაწყება'}
        </Button>
      </Card>
      {motif && <Drill kind="motif" progress={api} onClose={() => setMotif(false)} />}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Dot icon={<BookOpen />} size={40} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-lead leading-snug font-bold">ფურცლიდან კითხვა</span>
            <span className="text-meta text-mut">გელათის I ტომის მოკლე საგალობელი — პროგრამის გარეშე</span>
          </span>
        </div>
        {chant ? (
          <>
            <div className="flex flex-col gap-0.5 rounded-tile bg-page px-4 py-3">
              <span className="font-serif-ge text-head leading-snug font-bold">{chant.title}</span>
              <span className="text-meta text-mut">გელათის სკოლა, I ტომი, №{chant.num} · {chant.service}</span>
              <p className="mt-1.5 text-body leading-relaxed text-ink">
                ჯერ შეხედე ზომას, ნიშნებს და პირველ ბგერას; იმღერე შენი ხმა ნოტებიდან და მხოლოდ მერე ჩართე სინთეზატორი — შესამოწმებლად.
              </p>
            </div>
            <Duo>
              <Button size="md" icon={<Music aria-hidden="true" />} onClick={() => openNotes(chant.vid, 'list')}>ნოტები</Button>
              <Button kind="soft" size="md" icon={<Shuffle aria-hidden="true" />} onClick={another}>სხვა</Button>
            </Duo>
          </>
        ) : (
          <Button size="md" icon={<Shuffle aria-hidden="true" />} onClick={another}>აირჩიე საგალობელი</Button>
        )}
      </Card>
    </Page>
  );
};
