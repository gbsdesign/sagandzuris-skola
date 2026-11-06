import React, { useState } from 'react';
import { Check, ChevronDown, CirclePlay, ExternalLink, Headphones, History, Music, X } from 'lucide-react';
import { Tabs } from '../../components/ui/kit';
import { ChantPlayer } from '../../components/ChantPlayer';
import { askSignIn } from '../../components/access/SignInPrompt';
import { useNotes } from '../../context/NotesContext';
import { triggerHaptic } from '../../utils/haptics';
import {
  BOYS_SONGS, BOYS_SONGS_2025, CHANTS, GIRLS_SONGS, UNIVERSITY_PAGE, type ProgramItem,
} from '../../data/abituriProgram';
import { songVid } from '../../data/songBookChants';
import type { AbituriProgressApi, AbituriWho } from '../../hooks/useAbituriProgress';
import { CARD, Pill, SectionHead, hasVoices, takeMedia, useCanListen, useFocus, type Focus } from './shared';
import { RoundOnePractice } from './RoundOnePractice';
import { WhoPicker } from './MyPrep';

// I exam — chant and song. Two lists since 2026-11-06 (the user: „ღილაკები დამღლელი“): the chants and *my* songs
// (boys or girls, asked once — `progress.who`; the other list folds under mine). A piece has one main button
// „მოსმენა“, the rest (notes, links) in a quiet second row, and a round ✓ „ვიცი“ that counts in „ჩემი მომზადება“.

const SONGS: Record<AbituriWho, { items: ProgramItem[]; sub: string; other: string }> = {
  boys: { items: BOYS_SONGS, sub: 'ვაჟების პროგრამა · 2026', other: 'გოგონების' },
  girls: { items: GIRLS_SONGS, sub: 'გოგონების პროგრამა · 2026', other: 'ვაჟების' },
};
const OTHER: Record<AbituriWho, AbituriWho> = { boys: 'girls', girls: 'boys' };
type ListId = 'chant' | 'song';

const LIST_KEY = 'abituriList';

export const ProgramTab: React.FC<{ api: AbituriProgressApi; focus?: Focus }> = ({ api, focus }) => {
  const { progress, togglePiece, setWho } = api;
  const who = progress.who;
  const [listId, setListId] = useState<ListId>(() => {
    try { return localStorage.getItem(LIST_KEY) === 'song' ? 'song' : 'chant'; } catch { return 'chant'; }
  });
  // one player open at a time
  const [open, setOpen] = useState<string | null>(null);
  const [showOld, setShowOld] = useState(false);
  const [showOther, setShowOther] = useState(false);

  const pick = (id: ListId) => {
    triggerHaptic(10);
    setListId(id);
    setOpen(null);
    try { localStorage.setItem(LIST_KEY, id); } catch { /* ignore */ }
  };

  // a tap on the top card: open the right list (and the other list's fold) before scrolling
  useFocus(focus, id => {
    if (!id.startsWith('piece-')) return;
    const list = id.slice('piece-'.length).split(':')[0];
    if (list === 'chant') setListId('chant');
    else { setListId('song'); if (who && list !== who) setShowOther(true); }
  });

  const known = (key: string) => progress.pieces.includes(key);
  const card = (list: string, item: ProgramItem, i: number, n?: number) => {
    const key = `${list}:${item.title}`;
    return (
      <ProgramCard
        key={key}
        n={n}
        item={item}
        id={n ? `piece-${key}` : undefined}
        known={n ? known(key) : undefined}
        onKnown={n ? () => { triggerHaptic(12); togglePiece(key); } : undefined}
        active={activeOf(open, `${list}-${i}`)}
        onActive={w => setOpen(w ? `${list}-${i}|${w}` : null)}
      />
    );
  };
  const knownOf = (list: string, items: ProgramItem[]) => items.filter(it => known(`${list}:${it.title}`)).length;
  const mine = who ? SONGS[who] : null;
  const other = who ? OTHER[who] : null;

  return (
    <div>
      <div className="mb-5">
        <Tabs
          cols={2}
          value={listId}
          onChange={pick}
          items={[
            { id: 'chant', label: 'გალობა', count: CHANTS.length },
            { id: 'song', label: 'სიმღერა', count: mine?.items.length },
          ]}
        />
      </div>

      {listId === 'chant' ? (
        <>
          <SectionHead
            title="წირვის სადა კილოს საგალობლები"
            sub={`I და III ტომი · ვიცი ${knownOf('chant', CHANTS)} / ${CHANTS.length}`}
            extra={<Pill href={UNIVERSITY_PAGE} icon={<ExternalLink className="w-4 h-4" />}>პროგრამა</Pill>}
          />
          <ol className="space-y-3">{CHANTS.map((item, i) => card('chant', item, i, i + 1))}</ol>
        </>
      ) : !who || !mine || !other ? (
        <WhoPicker onPick={setWho} />
      ) : (
        <>
          <SectionHead
            title="ქართული ხალხური სიმღერა"
            sub={`${mine.sub} · ვიცი ${knownOf(who, mine.items)} / ${mine.items.length}`}
            extra={<Pill href={UNIVERSITY_PAGE} icon={<ExternalLink className="w-4 h-4" />}>პროგრამა</Pill>}
          />
          <ol className="space-y-3">{mine.items.map((item, i) => card(who, item, i, i + 1))}</ol>

          {/* the other list, folded: to look at, or to make it mine */}
          <section className="mt-6">
            <Fold
              open={showOther}
              onToggle={() => setShowOther(v => !v)}
              title={`${mine.other} პროგრამა`}
              sub="სხვა სია — თუ შეცდომით აირჩიე, აქვე შეცვლი"
            />
            {showOther && (
              <>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(10); setWho(other); setShowOther(false); }}
                  className="mt-3 inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426] hover:text-[#7a2028] cursor-pointer"
                >
                  <Check className="w-4 h-4" /> ეს არის ჩემი სია
                </button>
                <ol className="mt-3 space-y-3">{SONGS[other].items.map((item, i) => card(other, item, i))}</ol>
              </>
            )}
          </section>

          {who === 'boys' && (
            <section className="mt-6">
              <Fold open={showOld} onToggle={() => setShowOld(v => !v)} title="2025 წლის პროგრამიდან" sub="2026-ში შეიცვალა — ჩანაწერები და ნოტები აქ რჩება" />
              {showOld && <ol className="mt-3 space-y-3">{BOYS_SONGS_2025.map((item, i) => card('old', item, i))}</ol>}
            </section>
          )}
        </>
      )}

      {/* practice for the first round, after the program itself */}
      <RoundOnePractice />
    </div>
  );
};

const Fold: React.FC<{ open: boolean; onToggle: () => void; title: string; sub: string }> = ({ open, onToggle, title, sub }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(10); onToggle(); }}
    aria-expanded={open}
    className="w-full flex items-center gap-3 min-h-12 px-4 rounded-2xl bg-[#f6efe2] ring-1 ring-[#e8dcc8] text-left cursor-pointer hover:ring-[#7a2028]/25 transition-all"
  >
    <History className="w-5 h-5 shrink-0 text-[#8a7a6a]" />
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-bold text-[#4a3426]">{title}</span>
      <span className="block text-xs font-semibold text-[#8a7a6a]">{sub}</span>
    </span>
    <ChevronDown className={`w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
);

// a quiet second-row button: no ring, no fill — the card's one main button stays the loud one
const Quiet: React.FC<{ icon: React.ReactNode; children: React.ReactNode; href?: string; onClick?: () => void }> = ({ icon, children, href, onClick }) => {
  const cls = 'inline-flex items-center gap-1.5 min-h-10 px-2.5 rounded-full text-[13px] font-bold text-[#6b5c4d] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.05] cursor-pointer select-none';
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{icon}<span>{children}</span></a>
    : <button type="button" onClick={onClick} className={cls}>{icon}<span>{children}</span></button>;
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

const ProgramCard: React.FC<{
  n?: number; id?: string; item: ProgramItem; known?: boolean; onKnown?: () => void; active: string | null; onActive: (what: string | null) => void;
}> = ({ n, id, item, known, onKnown, active, onActive }) => {
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
    <li id={id} className={`${CARD} px-3.5 py-3.5 sm:px-4 scroll-mt-24 ${active ? 'ring-[#7a2028]/25' : known ? 'ring-[#2f6b43]/25' : ''}`}>
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 grid place-items-center w-9 h-9 rounded-full font-serif-ge text-[15px] font-bold tabular-nums ${
            known ? 'bg-[#2f6b43] text-white' : n ? 'bg-[#7a2028]/[0.07] text-[#7a2028]' : 'bg-[#f3ead9] text-[#8a7a6a]'
          }`}
          aria-hidden
        >
          {known ? <Check className="w-5 h-5" /> : n ?? '·'}
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
        {onKnown && (
          <button
            type="button"
            onClick={onKnown}
            aria-pressed={known}
            title={known ? 'ვიცი — მოხსნა' : 'ვიცი'}
            className={`shrink-0 inline-flex items-center gap-1 min-h-9 px-3 rounded-full text-[12.5px] font-bold cursor-pointer transition-colors ${
              known ? 'bg-[#2f6b43] text-white' : 'bg-[#edf6ef] text-[#24563a] ring-1 ring-[#7fb893] hover:bg-[#e2f0e5]'
            }`}
          >
            <Check className="w-4 h-4" /> {known ? 'ვიცი' : 'ვიცი?'}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:pl-12">
        {takes.length > 0 && (
          <Pill tone={open ? 'active' : 'main'} icon={<Headphones className="w-4 h-4" />} onClick={listen}>
            {open ? 'დახურვა' : take && hasVoices(take) ? 'მოსმენა · ხმებით' : 'მოსმენა'}
          </Pill>
        )}
        {notesVid && (
          <Quiet icon={<Music className="w-4 h-4" />} onClick={() => { triggerHaptic(10); openNotes(notesVid, 'list'); }}>
            ნოტები
          </Quiet>
        )}
        {item.links?.map(l => (embedOf(l.url) ? (
          <Pill
            key={l.url}
            tone={embedUrl === l.url ? 'active' : takes.length ? 'plain' : 'main'}
            icon={embedUrl === l.url ? <X className="w-4 h-4" /> : <CirclePlay className="w-4 h-4" />}
            onClick={() => {
              triggerHaptic(10);
              if (!canListen) { askSignIn('ჩანაწერები'); return; }
              onActive(embedUrl === l.url ? null : l.url);
            }}
          >
            {embedUrl === l.url ? 'დახურვა' : l.label}
          </Pill>
        ) : (
          <Quiet key={l.url} href={l.url} icon={<ExternalLink className="w-4 h-4" />}>{l.label}</Quiet>
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
