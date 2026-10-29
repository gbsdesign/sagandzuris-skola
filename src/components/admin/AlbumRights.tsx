import React, { useMemo, useState } from 'react';
import { ChevronDown, Disc3, Download, Headphones, Search, X } from 'lucide-react';
import { CENTRE_SONG_ALBUMS } from '../../data/centreSongs';
import { CENTRE_MTKMELI_ALBUMS } from '../../data/centreOther';
import { AlbumRight, AlbumRights, setEveryoneAlbum, setMemberAlbum, useEveryoneAlbums, useMemberAlbums } from '../../data/albumAccess';
import { matchScore, searchNormalize } from '../../utils/searchMatch';
import { triggerHaptic } from '../../utils/haptics';
import { FAIL } from './CentreDownload';
import { Fold } from './Fold';
import { changed } from './changed';

type Msg = (text: string, type: 'success' | 'error') => void;
type Kind = 'l' | 'd';

// Who hears (🎧) and who saves (⬇) each song album (data/albumAccess.ts). ⚙ „სკოლა“ → „ალბომები“ turns an album on for
// every member; a member's window → „ალბომები“ for that member alone (what everyone has shows there, locked). Staff
// have every album. A switch applies at once, with the undo bar and a line in the change log.

// the songs' albums, then the მთქმელი section's (data/centreOther.ts), marked so
const ALL = [...CENTRE_SONG_ALBUMS, ...CENTRE_MTKMELI_ALBUMS];
const MTKMELI = new Set(CENTRE_MTKMELI_ALBUMS.map(a => a[0]));
const NAMES = new Map(ALL.map(a => [a[0], searchNormalize(a[1])]));
const PAGE = 25;
const isOn = (r?: AlbumRight) => Boolean(r?.l || r?.d);
const KIND_WORD: Record<Kind, string> = { l: 'მოსმენა', d: 'ჩამოწერა' };

const RightBtn: React.FC<{ kind: Kind; on: boolean; locked: boolean; name: string; onClick: () => void }> = ({ kind, on, locked, name, onClick }) => {
  const Icon = kind === 'l' ? Headphones : Download;
  return (
    <button
      type="button"
      aria-pressed={on || locked}
      disabled={locked}
      onClick={() => { triggerHaptic(10); onClick(); }}
      title={locked ? `${KIND_WORD[kind]} — ყველა წევრს ჩართული აქვს` : KIND_WORD[kind]}
      aria-label={`${KIND_WORD[kind]}: ${name}`}
      className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default ${
        locked ? 'bg-[#e9d9b8] text-[#8a6418]'
          : on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_4px_10px_-6px_rgba(122,32,40,0.8)]'
          : 'bg-white ring-1 ring-[#e2d3bb] text-[#b3a48f] hover:text-[#7a2028] hover:ring-[#7a2028]/40'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );
};

/** The albums, each with 🎧 and ⬇; a filter field and „ჩართულები“ narrow it. */
const AlbumRightsList: React.FC<{
  rights: AlbumRights;
  inherited?: AlbumRights;
  onSet: (album: string, name: string, kind: Kind, on: boolean, before: AlbumRight) => void;
}> = ({ rights, inherited = {}, onSet }) => {
  const [query, setQuery] = useState('');
  const [onlyOn, setOnlyOn] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const onCount = ALL.filter(a => isOn(rights[a[0]])).length;
  const list = useMemo(() => {
    const q = searchNormalize(query);
    let l = ALL.filter(a => !onlyOn || isOn(rights[a[0]]) || isOn(inherited[a[0]]));
    if (q) {
      l = l.map(a => ({ a, s: matchScore(NAMES.get(a[0]) ?? '', q) }))
        .filter((x): x is { a: (typeof l)[number]; s: number } => x.s !== null)
        .sort((x, y) => x.s - y.s)
        .map(x => x.a);
    }
    return l;
  }, [query, onlyOn, rights, inherited]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0907c] pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
            placeholder="ალბომის ძებნა"
            aria-label="ალბომის ძებნა"
            className="w-full h-11 pl-9 pr-9 rounded-xl border border-[#e2d3bb] bg-white text-[15px] text-[#2a2017] outline-none focus:border-[#d9a55a] focus:shadow-[0_0_0_3px_rgba(180,98,14,0.12)] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="გასუფთავება"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#a0907c] hover:bg-[#f1e9dc] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          aria-pressed={onlyOn}
          onClick={() => { triggerHaptic(10); setOnlyOn(v => !v); setLimit(PAGE); }}
          className={`h-11 px-3.5 rounded-xl text-[13px] font-bold cursor-pointer transition ${onlyOn ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e2d3bb] text-[#4a3426] hover:ring-[#7a2028]/40'}`}
        >
          ჩართულები · {onCount}
        </button>
      </div>
      <p className="px-0.5 text-[12px] text-[#8a7a6a] leading-snug inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1"><Headphones className="w-3.5 h-3.5" />მოსმენა</span>
        <span className="inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" />ჩამოწერა</span>
      </p>
      {list.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-[#8a7a6a]">{onlyOn ? 'ჯერ არცერთი ალბომი არ არის ჩართული' : 'ასეთი ალბომი ვერ მოიძებნა'}</p>
      ) : (
        <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#efe5d4] overflow-hidden">
          {list.slice(0, limit).map(([id, name, count]) => {
            const r = rights[id] ?? {};
            const inh = inherited[id] ?? {};
            return (
              <li key={id} className="pl-3 pr-2 py-2 flex items-center gap-2">
                <span className="min-w-0 flex-1 py-1">
                  <span className="block text-[14px] font-semibold leading-snug text-[#2a2017] break-words">{name}</span>
                  <span className="block text-[12px] text-[#a0907c] tabular-nums">{count} ჩანაწერი{MTKMELI.has(id) && <span className="font-bold text-[#8a4b12]"> · მთქმელი</span>}</span>
                </span>
                {(['l', 'd'] as Kind[]).map(k => (
                  <RightBtn key={k} kind={k} name={name} on={Boolean(r[k])} locked={Boolean(inh[k])}
                    onClick={() => onSet(id, name, k, !r[k], { l: Boolean(r.l), d: Boolean(r.d) })} />
                ))}
              </li>
            );
          })}
        </ul>
      )}
      {list.length > limit && (
        <button type="button" onClick={() => { triggerHaptic(10); setLimit(l => l + PAGE * 4); }}
          className="self-center min-h-11 px-5 rounded-full bg-white ring-1 ring-[#e2d3bb] text-[14px] font-bold text-[#574739] inline-flex items-center gap-2 cursor-pointer hover:bg-[#fbf6ec]">
          კიდევ · სულ {list.length}
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const turned = (kind: Kind, on: boolean) => `${KIND_WORD[kind]} ${on ? 'ჩაირთო' : 'გამოირთო'}`;

/** ⚙ „სკოლა“ → „ალბომები“: an album for every member */
export const AlbumsFold: React.FC<{ onMessage: Msg }> = ({ onMessage }) => {
  const { rights } = useEveryoneAlbums();
  const n = ALL.filter(a => isOn(rights[a[0]])).length;
  return (
    <Fold
      icon={<Disc3 />}
      title="ალბომები"
      summary={n ? `ყველა წევრს ჩართული აქვს ${n} ალბომი` : 'წევრებს ჯერ არცერთი ალბომი არ უჩანთ'}
      info="აქ ჩართული ალბომი ყველა წევრს ეხსნება — მოსასმენად (ყურსასმენი), ჩამოსაწერად (ისარი) ან ორივესთვის. ცალკე წევრს — მის ფანჯარაში, „ალბომები“. ადმინები და მასწავლებლები ყველა ალბომს ხედავენ; წევრს ჩაურთველი ალბომი საერთოდ არ უჩანს — არც ალბომებში, არც სიმღერებში, არც მთქმელში."
    >
      <AlbumRightsList
        rights={rights}
        onSet={(album, name, kind, on, before) => {
          setEveryoneAlbum(album, { ...before, [kind]: on }).then(
            () => changed('right', `„${name}“ — ყველა წევრს ${turned(kind, on)}`, '', () => setEveryoneAlbum(album, before)),
            () => onMessage(FAIL, 'error'));
        }}
      />
    </Fold>
  );
};

/** The person's window → „ალბომები“: this member's own albums */
export const MemberAlbums: React.FC<{ uid: string; name: string; onMessage: Msg }> = ({ uid, name, onMessage }) => {
  const { rights } = useMemberAlbums(uid);
  const everyone = useEveryoneAlbums().rights;
  const [open, setOpen] = useState(false);
  const own = ALL.filter(a => isOn(rights[a[0]])).length;
  const shared = ALL.filter(a => isOn(everyone[a[0]])).length;
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { triggerHaptic(10); setOpen(o => !o); }}
        className="w-full min-h-12 flex items-center gap-3 text-left cursor-pointer"
      >
        <span className="w-9 h-9 shrink-0 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Disc3 className="w-[18px] h-[18px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-[#2a2017]">{own ? `ჩართულია ${own} ალბომი` : 'ალბომები არ აქვს ჩართული'}</span>
          {shared > 0 && <span className="block text-[13px] text-[#8a7a6a] leading-snug">+ {shared} ყველასთვის ჩართული (⚙ „სკოლა“)</span>}
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <AlbumRightsList
          rights={rights}
          inherited={everyone}
          onSet={(album, albumName, kind, on, before) => {
            setMemberAlbum(uid, album, { ...before, [kind]: on }).then(
              () => changed('right', `${name} — „${albumName}“ ${turned(kind, on)}`, uid, () => setMemberAlbum(uid, album, before)),
              () => onMessage(FAIL, 'error'));
          }}
        />
      )}
    </div>
  );
};
