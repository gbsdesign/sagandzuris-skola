import { usePlacements } from '../../data/placements';
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Headphones, Sparkles, FileText, Music, Lock, MapPin, Search, X, TextAlignStart } from 'lucide-react';
import {
  FOLK_SONGS,
  FOLK_REGIONS,
  FOLK_EXTRA_REGIONS,
  FOLK_SUB_AREAS,
  FolkRegion,
  FolkSong,
  songsInRegion,
  getFolkRegion,
  songDocUrl,
  soundcloudEmbedUrl,
  songRecordingCount,
} from '../../data/songsData';
import { RegionPuzzleMap, RegionLocator } from './RegionPuzzleMap';
import { SongPage, openSongPage, songTakes } from './SongPage';
import { AddToListButton } from '../ui/AddToListButton';
import { ChantPlayer } from '../ChantPlayer';
import { useAuth, useNavigation } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { askSignIn } from '../access/SignInPrompt';
import { useAccess } from '../../hooks/useAccess';
import { useOpenRequest } from '../../utils/searchOpen';
import { matchScore, searchNormalize } from '../../utils/searchMatch';
import { toggleAudioPreview } from '../../utils/listPreview';
import { PreviewButton } from '../PreviewButton';

interface GeorgiaMapProps {
  selectedChantVariants?: Record<string, any>;
  onToggleSong?: (songId: string, songTitle: string, regionCode: string, regionName: string) => void;
}

// songs with a recording come first in a region's list
const hasRecording = (s: FolkSong) => songRecordingCount(s) > 0 || Boolean(s.soundcloud);
const byRecordings = (a: FolkSong, b: FolkSong) => Number(hasRecording(b)) - Number(hasRecording(a));

// what the songs' search looks through: title, place, genre and (for members) the performers
const searchText = (s: FolkSong, withPerformers: boolean) => searchNormalize([
  s.title, getFolkRegion(s.region).nameGe, s.area, s.municipality, s.genre,
  ...(withPerformers ? [...s.versions.map(v => v.label), ...(s.recs ?? []).map(r => r.who)] : []),
].filter(Boolean).join(' · '));

const useSongSearch = (songs: FolkSong[], query: string, withPerformers: boolean) => {
  const texts = useMemo(() => songs.map(s => searchText(s, withPerformers)), [songs, withPerformers]);
  return useMemo(() => {
    const q = searchNormalize(query);
    if (!q) return null;
    const titleQ = (s: FolkSong) => matchScore(searchNormalize(s.title), q);
    return songs
      .map((s, i) => {
        const t = titleQ(s);
        const any = matchScore(texts[i], q);
        return { s, score: t !== null ? t : any !== null ? any + 10 : null };
      })
      .filter((x): x is { s: FolkSong; score: number } => x.score !== null)
      .sort((a, b) => a.score - b.score || byRecordings(a.s, b.s) || a.s.title.localeCompare(b.s.title, 'ka'))
      .map(x => x.s);
  }, [songs, texts, query]);
};

export const GeorgiaMap: React.FC<GeorgiaMapProps> = ({ selectedChantVariants = {}, onToggleSong }) => {
  const { isOwner } = useAuth();
  const showOwnerOnly = isOwner;
  const placed = usePlacements(); // a recording moved from the app: the lists follow
  const member = useAccess().member;
  // the open region is a history step: the top bar's "back" (and the phone's) returns to the map
  const { mapItem, openMapItem } = useNavigation();
  const region = [...FOLK_REGIONS, ...FOLK_EXTRA_REGIONS].find(r => r.id === mapItem) ?? null;
  // a song picked in the search: its region's list, with the song open
  const [found, setFound] = useState<string | null>(null);
  useOpenRequest('simghera', id => {
    const song = FOLK_SONGS.find(s => s.id === id);
    if (!song) return;
    openMapItem(getFolkRegion(song.region).id);
    setFound(id);
  });
  useEffect(() => {
    if (!mapItem) setFound(null);
  }, [mapItem]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allSongs = useMemo(() => FOLK_SONGS.filter(s => showOwnerOnly || !s.ownerOnly), [showOwnerOnly, placed]);
  const [query, setQuery] = useState('');
  const results = useSongSearch(allSongs, query, member);

  return (
    <>
      {region ? (
        <RegionPlaylist
          key={`${region.id}:${found || ''}`}
          region={region}
          initialOpenId={found}
          songs={[...songsInRegion(region.id, showOwnerOnly)].sort(byRecordings)}
          selectedChantVariants={selectedChantVariants}
          onToggleSong={onToggleSong}
        />
      ) : (
        <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
          <SongSearchField
            value={query}
            onChange={setQuery}
            placeholder={member ? 'სიმღერა ან შემსრულებელი' : 'სიმღერის ძებნა'}
          />
          {results ? (
            <SongList
              songs={results.slice(0, 80)}
              total={results.length}
              showRegion
              selectedChantVariants={selectedChantVariants}
              onToggleSong={onToggleSong}
              empty="ასეთი სიმღერა ვერ მოიძებნა"
            />
          ) : (
            <RegionPuzzleMap
              onSelect={r => openMapItem(r.id)}
              count={id => songsInRegion(id, showOwnerOnly).length}
              countLabel={n => `${n} სიმღერა`}
              extraRegions={FOLK_EXTRA_REGIONS}
            />
          )}
        </div>
      )}
      <SongPage />
    </>
  );
};

const SongSearchField: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <label className="relative block">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#a0907c] pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full h-12 pl-11 pr-11 rounded-2xl border border-[#e4d8c4] bg-white text-[16px] text-[#2a2017] placeholder:text-[#b8aa97] shadow-[0_1px_2px_rgba(42,32,23,0.05)] outline-none focus:border-[#d9a55a] focus:shadow-[0_0_0_3px_rgba(180,98,14,0.12)] transition [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#a0907c] hover:bg-[#f1e9dc] hover:text-[#574739] cursor-pointer"
        aria-label="გასუფთავება"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </label>
);

interface SongListProps {
  songs: FolkSong[];
  total?: number;
  initialOpenId?: string | null;
  showRegion?: boolean;
  selectedChantVariants: Record<string, any>;
  onToggleSong?: GeorgiaMapProps['onToggleSong'];
  empty: string;
}

const SongList: React.FC<SongListProps> = ({ songs, total = songs.length, initialOpenId, showRegion, selectedChantVariants, onToggleSong, empty }) => {
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? null);
  // the song picked in the search comes into view
  useEffect(() => {
    if (initialOpenId) document.getElementById(`song-${initialOpenId}`)?.scrollIntoView({ block: 'start' });
  }, [initialOpenId]);

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-1.5 py-8 px-3 rounded-2xl bg-white border border-dashed border-[#d6c8b1]">
        <Music className="w-6 h-6 text-[#cdbfa9]" />
        <p className="text-sm font-bold text-[#574739]">{empty}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {songs.map(song => {
        const region = getFolkRegion(song.region);
        return (
          <SongItem
            key={song.id}
            id={`song-${song.id}`}
            song={song}
            showRegion={showRegion}
            isOpen={openId === song.id}
            onToggleOpen={() => { triggerHaptic(10); setOpenId(id => (id === song.id ? null : song.id)); }}
            isSelected={Boolean(selectedChantVariants[song.id])}
            onToggleSelect={onToggleSong ? () => { triggerHaptic(15); onToggleSong(song.id, song.title, region.regionCode, region.nameGe); } : undefined}
          />
        );
      })}
      {total > songs.length && (
        <p className="px-1 text-center text-[12px] font-semibold text-[#a0907c]">ნაჩვენებია {songs.length} / {total} — დააზუსტეთ ძებნა</p>
      )}
    </div>
  );
};

interface RegionPlaylistProps {
  region: FolkRegion;
  initialOpenId?: string | null;
  songs: FolkSong[];
  selectedChantVariants: Record<string, any>;
  onToggleSong?: GeorgiaMapProps['onToggleSong'];
}

const RegionPlaylist: React.FC<RegionPlaylistProps> = ({ region, initialOpenId, songs, selectedChantVariants, onToggleSong }) => {
  const member = useAccess().member;
  // sub-areas of the region (ხევი, ხევსურეთი…) narrow the list
  const areas = useMemo(() => FOLK_SUB_AREAS.filter(a => songs.some(s => s.area === a)), [songs]);
  const [area, setArea] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const inArea = useMemo(() => (area ? songs.filter(s => s.area === area) : songs), [songs, area]);
  const found = useSongSearch(inArea, query, member);
  const shown = found ?? inArea;

  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      {/* where the region is: a small map with it lit */}
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
        <RegionLocator region={region} className="w-28 sm:w-32 h-auto shrink-0" />
        <div className="min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">{region.nameGe}</h3>
          <span className="text-xs font-bold text-[#b4620e]">{songs.length} სიმღერა</span>
        </div>
      </div>

      {songs.length > 8 && (
        <SongSearchField value={query} onChange={setQuery} placeholder={`ძებნა: ${region.nameGe}`} />
      )}

      {areas.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="ქვეკუთხე">
          {[null, ...areas].map(a => {
            const on = area === a;
            const n = a ? songs.filter(s => s.area === a).length : songs.length;
            return (
              <button
                key={a ?? 'all'}
                type="button"
                onClick={() => { triggerHaptic(8); setArea(a); }}
                aria-pressed={on}
                className={`min-h-10 px-3.5 rounded-full border text-[13px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97] ${
                  on ? 'bg-[#2a2017] text-white border-[#2a2017]' : 'bg-white text-[#574739] border-[#e2d3bb] hover:border-[#d9a55a]'
                }`}
              >
                {a ?? 'ყველა'}
                <span className={`text-[11px] font-semibold ${on ? 'text-white/70' : 'text-[#a0907c]'}`}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {songs.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-1.5 py-8 px-3 rounded-2xl bg-white border border-dashed border-[#d6c8b1]">
          <Music className="w-6 h-6 text-[#cdbfa9]" />
          <p className="text-sm font-bold text-[#574739]">ამ კუთხის სიმღერები ჯერ არ დამატებულა</p>
          <p className="text-xs text-[#a0907c]">მალე დაემატება</p>
        </div>
      ) : (
        <SongList
          key={`${area ?? ''}`}
          songs={shown}
          initialOpenId={initialOpenId}
          selectedChantVariants={selectedChantVariants}
          onToggleSong={onToggleSong}
          empty="ასეთი სიმღერა ვერ მოიძებნა"
        />
      )}
    </div>
  );
};

interface SongItemProps {
  id?: string;
  song: FolkSong;
  showRegion?: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  isSelected: boolean;
  onToggleSelect?: () => void;
}

// A song in the list, the way a chant is listed on the chant page: tap to unfold its recordings, one button
// per performer; a button opens the song's page (player, download, words).
const SongItem: React.FC<SongItemProps> = ({ id, song, showRegion, isOpen: open, onToggleOpen: toggle, isSelected, onToggleSelect: select }) => {
  const count = songRecordingCount(song);
  // guests see the song's name and place only: no recordings, performers or authors; opening asks to sign in
  // (a member a superadmin has not let in yet counts as a guest)
  const guest = !useAccess().member;
  const isOpen = open && !guest;
  const onToggleOpen = guest ? () => askSignIn(`სიმღერა „${song.title}“`) : toggle;
  const onToggleSelect = guest ? undefined : select;
  const place = [showRegion && getFolkRegion(song.region).nameGe, song.area, song.municipality].filter(Boolean).join(' · ');
  const takes = isOpen ? songTakes(song) : [];

  return (
    <div
      id={id}
      className={`scroll-mt-3 rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300 overflow-hidden ${
        isOpen
          ? 'border-[#efd6a6] shadow-[0_12px_26px_-18px_rgba(133,80,44,0.55)]'
          : 'border-[#e4d8c4] shadow-[0_1px_2px_rgba(42,32,23,0.05)] hover:border-[#d6c8b1] hover:shadow-[0_10px_22px_-18px_rgba(42,32,23,0.5)]'
      }`}
    >
      <div className="flex items-center gap-2 pr-2.5">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="flex-1 min-w-0 px-3.5 py-3 flex items-center gap-3 text-left cursor-pointer select-none group"
        >
          <span
            className={`w-2 h-2 shrink-0 rounded-full transition-all duration-300 ${
              isOpen ? 'bg-[#f59e0b] scale-125' : isSelected ? 'bg-emerald-500' : 'bg-[#cdbfa9] group-hover:bg-[#e0a54a]'
            }`}
          />
          <span className="min-w-0 flex flex-col gap-0.5">
            <span className="font-bold text-[#2a2017] text-[17px] leading-snug break-words group-hover:text-[#7a2028] transition-colors">
              {song.title}
            </span>
            {(place || song.genre) && (
              <span className="flex flex-wrap items-center gap-x-1 text-[11.5px] font-semibold text-[#8c7c6b]">
                {place && <MapPin className="w-3 h-3 shrink-0 text-[#b4620e]/70" />}
                {[place, song.genre].filter(Boolean).join(' · ')}
              </span>
            )}
            {!guest && (
              <span className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] font-medium text-[#8c7c6b]">
                {song.ownerOnly && (
                  <span className="inline-flex items-center gap-1 text-purple-700">
                    <Lock className="w-3 h-3" /> მხოლოდ თქვენ ხედავთ ·
                  </span>
                )}
                {count > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#b4620e]">
                    <Headphones className="w-3 h-3" />
                    {count} ჩანაწერი
                  </span>
                ) : song.soundcloud ? (
                  <span className="inline-flex items-center gap-1 text-[#b4620e]">
                    <Headphones className="w-3 h-3" />
                    SoundCloud
                  </span>
                ) : (
                  <span>ჩანაწერი ჯერ არ არის</span>
                )}
              </span>
            )}
          </span>
        </button>

        {onToggleSelect && <AddToListButton isSelected={isSelected} onToggle={onToggleSelect} />}
        <button
          type="button"
          onClick={onToggleOpen}
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
            isOpen ? 'rotate-180 bg-[#fcf1df] text-[#b4620e]' : 'bg-[#f1e9dc] text-[#8c7c6b] hover:text-[#7a2028]'
          }`}
          aria-label={guest ? 'შესვლა საჭიროა' : isOpen ? 'დახურვა' : 'გახსნა'}
        >
          {guest ? <Lock className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* its recordings: one button per performer, like a chant's versions */}
      {isOpen && (
        <div className="border-t border-[#e4d8c4] bg-[#faf6ef] px-3 pt-3.5 pb-3 sm:px-4 flex flex-col gap-2.5 animate-[galoba-unfold_0.32s_cubic-bezier(0.2,0.8,0.2,1)_both]">
          {takes.length > 0 ? (
            <>
              <p className="px-1 text-[11.5px] font-semibold text-[#8c7c6b]">შესრულებები — აირჩიეთ მოსასმენად</p>
              <div className="rounded-xl bg-white border border-[#e4d8c4] px-3 pt-3.5 pb-3.5 grid grid-cols-2 sm:grid-cols-3 gap-x-2.5 gap-y-4">
                {takes.map((t, i) => {
                  const url = t.media.tracks[3] || t.media.tracks.find(Boolean);
                  return (
                  <div key={i} className="relative min-w-0">
                  {/* a quick listen to this performance, without opening the song's page */}
                  {url && (
                    <PreviewButton
                      id={`${song.id}~${i}`}
                      onToggle={() => toggleAudioPreview(`${song.id}~${i}`, url)}
                      label="მოსმენა"
                      className="-bottom-[7px] left-1.5"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(10); openSongPage(song.id, i); }}
                    className="w-full min-h-12 py-1.5 px-1.5 rounded-[10px] border text-[11.5px] sm:text-xs font-bold flex flex-col items-center justify-center gap-px text-center leading-tight transition-all duration-150 cursor-pointer active:scale-[0.97] bg-white text-[#2a2017] border-[#e2d3bb] shadow-[0_1px_0_rgba(133,80,44,0.06)] hover:border-[#d9a55a] hover:shadow-[0_0_0_3px_rgba(180,98,14,0.12)]"
                  >
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <Headphones className="w-3.5 h-3.5 shrink-0 text-[#b4620e]" />
                      <span className="break-words">{t.label}</span>
                    </span>
                    {t.sub && <span className="text-[9.5px] font-semibold text-[#a0907c]">{t.sub}</span>}
                  </button>
                  </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white border border-dashed border-[#d6c8b1]">
              <span className="text-xs font-semibold text-[#8c7c6b]">
                {song.soundcloud ? 'ჩანაწერი SoundCloud-ზეა' : song.pendingWma ? 'ჩანაწერი მზადდება' : 'ამ სიმღერის ჩანაწერი ჯერ არ არის'}
              </span>
              <button
                type="button"
                onClick={() => { triggerHaptic(10); openSongPage(song.id, 0); }}
                className="min-h-9 px-3 shrink-0 rounded-full bg-[#fcf1df] border border-[#efd6a6] text-[12px] font-bold text-[#8a4b12] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <TextAlignStart className="w-3.5 h-3.5" /> გახსნა
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// the unfolded part of a song inside the "საგანძურის გზა" list: recording picker, player (with notes & lyrics),
// SoundCloud, lyrics, documents
export const SongBody: React.FC<{ song: FolkSong; region: FolkRegion }> = ({ song, region }) => {
  const [takeIdx, setTakeIdx] = useState(0);
  const takes = songTakes(song);
  const take = takes[takeIdx];
  return (
      <div className="border-t border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-stone-50/50 p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
        {takes.length > 1 && (
          <>
            <div className="text-[11px] font-semibold text-slate-500 px-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ჩანაწერები (აირჩიეთ):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {takes.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { triggerHaptic(10); setTakeIdx(i); }}
                  className={`min-h-9 px-3 py-1.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    i === takeIdx
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  {t.label}{t.sub ? ` · ${t.sub}` : ''}
                </button>
              ))}
            </div>
          </>
        )}

        {take ? (
          <div className="rounded-xl border border-amber-300/80 bg-white shadow-sm px-2 pb-2.5 pt-2">
            <ChantPlayer
              key={`${song.id}-${takeIdx}`}
              media={take.media}
              title={song.title}
              subtitle={`${region.nameGe} · ${take.label}`}
            />
          </div>
        ) : song.soundcloud ? (
          <div className="rounded-xl border border-amber-300/80 bg-white shadow-sm overflow-hidden">
            <iframe
              title={song.title}
              src={soundcloudEmbedUrl(song.soundcloud)}
              className="block w-full h-[166px] border-0"
              allow="autoplay"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-1.5 py-5 px-3 rounded-xl bg-white border border-dashed border-slate-200">
            <Music className="w-6 h-6 text-slate-300" />
            <p className="text-xs font-bold text-slate-600">
              {song.pendingWma ? 'ჩანაწერი მზადდება' : 'ამ სიმღერის ჩანაწერი ჯერ არ არის დამატებული'}
            </p>
            <p className="text-[11px] text-slate-400">მალე დაემატება</p>
          </div>
        )}

        {/* Lyrics without a player (with a player they're in its notes & lyrics panel) */}
        {!take && song.lyrics && (
          <div className="rounded-xl bg-white border border-slate-200/80 p-3">
            <p className="text-[11px] font-black text-amber-900 mb-1.5">ტექსტი</p>
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{song.lyrics}</p>
          </div>
        )}

        {song.docs && song.docs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {song.docs.map(doc => (
              <a
                key={doc.id}
                href={songDocUrl(doc)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-9 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-amber-700" />
                {doc.name}
              </a>
            ))}
          </div>
        )}
      </div>
  );
};
