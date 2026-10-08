import React, { useState } from 'react';
import { ChevronDown, CirclePlay, ExternalLink, Headphones, History, Music, X } from 'lucide-react';
import { ChantPlayer } from '../../components/ChantPlayer';
import { askSignIn } from '../../components/access/SignInPrompt';
import { useNotes } from '../../context/NotesContext';
import { triggerHaptic } from '../../utils/haptics';
import {
  BOYS_SONGS, BOYS_SONGS_2025, CHANTS, GIRLS_SONGS, UNIVERSITY_PAGE, type ProgramItem,
} from '../../data/abituriProgram';
import { songVid } from '../../data/songBookChants';
import { CARD, Pill, SectionHead, hasVoices, takeMedia, useCanListen } from './shared';
import { RoundOnePractice } from './RoundOnePractice';

// I exam — chant and song: the three 2026 lists, each piece with its recordings (voice by voice), notes and links

const LISTS = [
  { id: 'chant', label: 'გალობა', items: CHANTS, title: 'წირვის სადა კილოს საგალობლები', sub: 'I და III ტომი · ბიჭები და გოგონები' },
  { id: 'boys', label: 'ბიჭები - სიმღერა', items: BOYS_SONGS, title: 'ქართული ხალხური სიმღერა', sub: 'ვაჟების პროგრამა · 2026' },
  { id: 'girls', label: 'გოგონები - სიმღერა', items: GIRLS_SONGS, title: 'ქართული ხალხური სიმღერა', sub: 'გოგონების პროგრამა · 2026' },
] as const;
type ListId = typeof LISTS[number]['id'];

const LIST_KEY = 'abituriList';

export const ProgramTab: React.FC = () => {
  const [listId, setListId] = useState<ListId>(() => {
    try {
      const saved = localStorage.getItem(LIST_KEY);
      return (LISTS.some(l => l.id === saved) ? saved : 'chant') as ListId;
    } catch { return 'chant'; }
  });
  // one player open at a time
  const [open, setOpen] = useState<string | null>(null);
  const [showOld, setShowOld] = useState(false);
  const list = LISTS.find(l => l.id === listId)!;

  const pick = (id: ListId) => {
    triggerHaptic(10);
    setListId(id);
    setOpen(null);
    try { localStorage.setItem(LIST_KEY, id); } catch { /* ignore */ }
  };

  return (
    <div>
      <RoundOnePractice />
      <div role="tablist" aria-label="პროგრამა" className="grid grid-cols-3 gap-1 sm:w-fit sm:mx-auto mb-5 rounded-[20px] sm:rounded-full bg-white/80 ring-1 ring-[#e8dcc8] p-1">
        {LISTS.map(l => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={listId === l.id}
            onClick={() => pick(l.id)}
            className={`inline-flex items-center justify-center gap-1.5 min-h-12 sm:min-h-10 px-2 sm:px-5 rounded-2xl sm:rounded-full text-[14px] leading-tight text-center font-bold transition-all cursor-pointer select-none active:scale-[0.97] ${
              listId === l.id
                ? 'bg-[#2a2017] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(42,32,23,0.7)]'
                : 'text-[#4a3426] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.04]'
            }`}
          >
            {/* "ბიჭები - სიმღერა": on a phone the two words stand on two lines, never broken elsewhere */}
            <span className="flex flex-wrap justify-center gap-x-1">
              {l.label.split(' - ').map((w, k, all) => (
                <span key={w} className="whitespace-nowrap">{w}{k < all.length - 1 ? ' -' : ''}</span>
              ))}
            </span>
            <span className={`max-sm:hidden text-[11px] font-black tabular-nums rounded-full px-1.5 py-0.5 ${listId === l.id ? 'bg-white/15' : 'bg-[#f3ead9] text-[#8a7a6a]'}`}>{l.items.length}</span>
          </button>
        ))}
      </div>

      <SectionHead
        title={list.title}
        sub={list.sub}
        extra={<Pill href={UNIVERSITY_PAGE} icon={<ExternalLink className="w-4 h-4" />}>პროგრამა</Pill>}
      />

      <ol className="space-y-3">
        {list.items.map((item, i) => {
          const key = `${listId}-${i}`;
          return <ProgramCard key={key} n={i + 1} item={item} active={activeOf(open, key)} onActive={w => setOpen(w ? `${key}|${w}` : null)} />;
        })}
      </ol>

      {listId === 'boys' && (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => { triggerHaptic(10); setShowOld(v => !v); }}
            aria-expanded={showOld}
            className="w-full flex items-center gap-3 min-h-12 px-4 rounded-2xl bg-[#f6efe2] ring-1 ring-[#e8dcc8] text-left cursor-pointer hover:ring-[#7a2028]/25 transition-all"
          >
            <History className="w-5 h-5 shrink-0 text-[#8a7a6a]" />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-bold text-[#4a3426]">2025 წლის პროგრამიდან</span>
              <span className="block text-xs font-semibold text-[#8a7a6a]">2026-ში შეიცვალა — ჩანაწერები და ნოტები აქ რჩება</span>
            </span>
            <ChevronDown className={`w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform ${showOld ? 'rotate-180' : ''}`} />
          </button>
          {showOld && (
            <ol className="mt-3 space-y-3">
              {BOYS_SONGS_2025.map((item, i) => {
                const key = `old-${i}`;
                return <ProgramCard key={key} item={item} active={activeOf(open, key)} onActive={w => setOpen(w ? `${key}|${w}` : null)} />;
              })}
            </ol>
          )}
        </section>
      )}
    </div>
  );
};

// what is open in a card: 'rec' (the recordings) or a link's url (its embedded player)
const activeOf = (open: string | null, key: string) => (open?.startsWith(`${key}|`) ? open.slice(key.length + 1) : null);

// audiomack and YouTube links play inside the card (their embedded players), the page stays open
const embedOf = (url: string): { src: string; video?: boolean } | null => {
  const am = /audiomack\.com\/([^/]+)\/song\/([^/?#]+)/.exec(url);
  if (am) return { src: `https://audiomack.com/embed/song/${am[1]}/${am[2]}` };
  const yt = /(?:youtu\.be\/|[?&]v=)([\w-]{11})/.exec(url);
  if (yt) return { src: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0&playsinline=1`, video: true };
  return null;
};

const ProgramCard: React.FC<{ n?: number; item: ProgramItem; active: string | null; onActive: (what: string | null) => void }> = ({ n, item, active, onActive }) => {
  const open = active === 'rec';
  const onToggle = () => onActive(open ? null : 'rec');
  const embedUrl = active && active !== 'rec' ? active : null;
  const embed = embedUrl ? embedOf(embedUrl) : null;
  const canListen = useCanListen();
  const { openNotes } = useNotes();
  const [takeIdx, setTakeIdx] = useState(0);
  const takes = item.takes ?? [];
  const take = takes[Math.min(takeIdx, takes.length - 1)];
  // chants open their book version; program songs their own notes (songBookChants.ts)
  const notesVid = item.vid ?? (item.notes ? songVid(item.notes) : undefined);

  const listen = () => {
    triggerHaptic(10);
    if (!canListen) { askSignIn('ჩანაწერები'); return; }
    onToggle();
  };

  return (
    <li className={`${CARD} px-3.5 py-3.5 sm:px-4 ${active ? 'ring-[#7a2028]/25' : ''}`}>
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 grid place-items-center w-9 h-9 rounded-full font-serif-ge text-[15px] font-bold tabular-nums ${
            n ? 'bg-[#7a2028]/[0.07] text-[#7a2028]' : 'bg-[#f3ead9] text-[#8a7a6a]'
          }`}
          aria-hidden
        >
          {n ?? '·'}
        </span>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-serif-ge text-[16px] sm:text-[17px] font-bold leading-snug text-[#2a2017]">{item.title}</h3>
            {item.isNew && (
              <span className="text-[11px] font-black uppercase tracking-wide rounded-full px-2 py-0.5 bg-[#e9f2e1] text-[#3d6a2a] ring-1 ring-[#3d6a2a]/15">ახალი</span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] font-semibold text-[#8a7a6a] leading-snug">{item.sub}</p>
          {item.book && <p className="mt-0.5 text-[12px] font-semibold text-[#a08f7c] leading-snug">{item.book}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:pl-12">
        {takes.length > 0 && (
          <Pill tone={open ? 'active' : 'main'} icon={<Headphones className="w-4 h-4" />} onClick={listen}>
            {open ? 'დახურვა' : take && hasVoices(take) ? 'მოსმენა · ხმებით' : 'მოსმენა'}
          </Pill>
        )}
        {notesVid && (
          <Pill icon={<Music className="w-4 h-4" />} onClick={() => { triggerHaptic(10); openNotes(notesVid, 'list'); }}>
            ნოტები
          </Pill>
        )}
        {item.links?.map(l => (embedOf(l.url) ? (
          <Pill
            key={l.url}
            tone={embedUrl === l.url ? 'active' : takes.length ? 'plain' : 'main'}
            icon={embedUrl === l.url ? <X className="w-4 h-4" /> : <CirclePlay className="w-4 h-4" />}
            onClick={() => { triggerHaptic(10); onActive(embedUrl === l.url ? null : l.url); }}
          >
            {embedUrl === l.url ? 'დახურვა' : l.label}
          </Pill>
        ) : (
          <Pill key={l.url} href={l.url} icon={<ExternalLink className="w-4 h-4" />}>{l.label}</Pill>
        )))}
      </div>

      {!takes.length && !notesVid && !item.links?.length && (
        <p className="mt-2 sm:pl-12 text-[13px] text-[#8a7a6a]">ჩანაწერი ჯერ არ გვაქვს</p>
      )}

      {embed && (
        <div className={`mt-3 sm:ml-12 rounded-2xl overflow-hidden ${embed.video ? 'bg-black aspect-video' : 'bg-white ring-1 ring-[#efd6a6]'}`}>
          <iframe
            title={`${item.title} — ${embed.video ? 'YouTube' : 'audiomack'}`}
            src={embed.src}
            className={`block w-full border-0 ${embed.video ? 'h-full' : 'h-[252px]'}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            scrolling="no"
          />
        </div>
      )}

      {open && take && (
        <div className="mt-3 sm:ml-12 rounded-2xl border border-[#efd6a6] bg-[#fffdf8] px-2 pb-2.5 pt-2">
          {takes.length > 1 && (
            <div className="flex flex-wrap gap-1.5 px-1 pb-2" role="tablist" aria-label="ჩანაწერი">
              {takes.map((t, k) => (
                <button
                  key={t.label}
                  type="button"
                  role="tab"
                  aria-selected={k === takeIdx}
                  onClick={() => { triggerHaptic(10); setTakeIdx(k); }}
                  className={`min-h-9 px-3 rounded-full text-[12.5px] font-bold transition-all cursor-pointer ${
                    k === takeIdx ? 'bg-[#2a2017] text-[#fbf6ec]' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:text-[#7a2028]'
                  }`}
                >
                  {t.label}{hasVoices(t) ? ' · ხმებით' : ''}
                </button>
              ))}
            </div>
          )}
          <ChantPlayer
            key={`${item.title}-${takeIdx}`}
            media={takeMedia(`abituri:${item.title}:${takeIdx}`, item.title, take)}
            title={item.title}
            subtitle={`${item.sub} · ${take.label}`}
            hideNotesButton
          />
        </div>
      )}
    </li>
  );
};
