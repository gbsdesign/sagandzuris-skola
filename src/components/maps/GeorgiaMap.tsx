import React, { useEffect, useState } from 'react';
import { ChevronDown, Headphones, Sparkles, FileText, Music, Lock, MapPin } from 'lucide-react';
import {
  FOLK_SONGS,
  FOLK_REGIONS,
  FolkRegion,
  FolkSong,
  songsInRegion,
  getFolkRegion,
  songVersionMedia,
  songDocUrl,
  soundcloudEmbedUrl,
} from '../../data/songsData';
import { RegionPuzzleMap, RegionLocator } from './RegionPuzzleMap';
import { AddToListButton } from '../ui/AddToListButton';
import { ChantPlayer } from '../ChantPlayer';
import { useAuth, useNavigation } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { askSignIn } from '../access/SignInPrompt';
import { useOpenRequest } from '../../utils/searchOpen';

interface GeorgiaMapProps {
  selectedChantVariants?: Record<string, any>;
  onToggleSong?: (songId: string, songTitle: string, regionCode: string, regionName: string) => void;
}

// songs with a recording come first in a region's list
const hasRecording = (s: FolkSong) => s.versions.length > 0 || Boolean(s.soundcloud);

export const GeorgiaMap: React.FC<GeorgiaMapProps> = ({ selectedChantVariants = {}, onToggleSong }) => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const showOwnerOnly = isAdmin || isSuperAdmin;
  // the open region is a history step: the top bar's "back" (and the phone's) returns to the map
  const { mapItem, openMapItem } = useNavigation();
  const region = FOLK_REGIONS.find(r => r.id === mapItem) ?? null;
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

  if (region) {
    const songs = songsInRegion(region.id, showOwnerOnly);
    return (
      <RegionPlaylist
        key={`${region.id}:${found || ''}`}
        region={region}
        initialOpenId={found}
        songs={[...songs].sort((x, y) => Number(hasRecording(y)) - Number(hasRecording(x)))}
        selectedChantVariants={selectedChantVariants}
        onToggleSong={onToggleSong}
      />
    );
  }

  return (
    <RegionPuzzleMap
      onSelect={r => openMapItem(r.id)}
      count={id => songsInRegion(id, showOwnerOnly).length}
      countLabel={n => `${n} სიმღერა`}
    />
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
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? null);
  // the song picked in the search comes into view
  useEffect(() => {
    if (initialOpenId) document.getElementById(`song-${initialOpenId}`)?.scrollIntoView({ block: 'start' });
  }, [initialOpenId]);

  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      {/* where the region is: a small map with it lit */}
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-amber-200/60">
        <RegionLocator region={region} className="w-28 sm:w-32 h-auto shrink-0" />
        <div className="min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">{region.nameGe}</h3>
          <span className="text-xs font-bold text-amber-800">{songs.length} სიმღერა</span>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-1.5 py-8 px-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
          <Music className="w-6 h-6 text-slate-300" />
          <p className="text-sm font-bold text-slate-600">ამ კუთხის სიმღერები ჯერ არ დამატებულა</p>
          <p className="text-xs text-slate-400">მალე დაემატება</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {songs.map(song => (
            <SongItem
              key={song.id}
              id={`song-${song.id}`}
              song={song}
              region={region}
              isOpen={openId === song.id}
              onToggleOpen={() => { triggerHaptic(10); setOpenId(id => (id === song.id ? null : song.id)); }}
              isSelected={Boolean(selectedChantVariants[song.id])}
              onToggleSelect={onToggleSong ? () => { triggerHaptic(15); onToggleSong(song.id, song.title, region.regionCode, region.nameGe); } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SongItemProps {
  id?: string;
  song: FolkSong;
  region: FolkRegion;
  isOpen: boolean;
  onToggleOpen: () => void;
  isSelected: boolean;
  onToggleSelect?: () => void;
}

const SongItem: React.FC<SongItemProps> = ({ id, song, region, isOpen: open, onToggleOpen: toggle, isSelected, onToggleSelect: select }) => {
  const hasAudio = song.versions.length > 0;
  // guests see the song's name and place only: no recordings, performers or authors; opening asks to sign in
  const { user } = useAuth();
  const guest = !user;
  const isOpen = open && !guest;
  const onToggleOpen = guest ? () => askSignIn(`სიმღერა „${song.title}“`) : toggle;
  const onToggleSelect = guest ? undefined : select;
  // the region is the page's title already: only the municipality and village here
  const place = [song.municipality, song.area].filter(Boolean).join(' · ');

  return (
    <div
      id={id}
      className={`scroll-mt-3 rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? 'bg-white border-amber-400/80 shadow-md ring-1 ring-amber-300/40'
          : 'bg-white/95 border-slate-200/90 shadow-xs hover:border-amber-300/80 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex-1 min-w-0 px-4 py-3 flex items-center gap-3 text-left cursor-pointer select-none group"
        >
          <span
            className={`w-2 h-2 shrink-0 rounded-full transition-all ${
              isOpen ? 'bg-amber-500 scale-125' : isSelected ? 'bg-emerald-500' : 'bg-slate-300 group-hover:bg-amber-400'
            }`}
          />
          <span className="min-w-0 flex flex-col gap-0.5">
            <span className="font-bold text-slate-800 text-[15px] sm:text-[17px] leading-snug break-words group-hover:text-[#85502c] transition-colors">
              {song.title}
            </span>
            {place && (
              <span className="flex flex-wrap items-center gap-x-1 text-[11px] sm:text-xs font-semibold text-slate-500">
                <MapPin className="w-3 h-3 shrink-0 text-amber-700/70" />
                {place}
              </span>
            )}
            {!guest && <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] sm:text-xs font-medium text-slate-400">
              {song.ownerOnly && (
                <span className="inline-flex items-center gap-1 text-purple-700">
                  <Lock className="w-3 h-3" /> მხოლოდ თქვენ ხედავთ ·
                </span>
              )}
              {hasAudio ? (
                <span className="inline-flex items-center gap-1 text-amber-700/80">
                  <Headphones className="w-3 h-3" />
                  {song.versions.length} ჩანაწერი
                </span>
              ) : song.soundcloud ? (
                <span className="inline-flex items-center gap-1 text-amber-700/80">
                  <Headphones className="w-3 h-3" />
                  SoundCloud
                </span>
              ) : (
                <span>ჩანაწერი ჯერ არ არის</span>
              )}
            </span>}
          </span>
        </button>

        {onToggleSelect && <AddToListButton isSelected={isSelected} onToggle={onToggleSelect} />}
        <button
          type="button"
          onClick={onToggleOpen}
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isOpen ? 'rotate-180 bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
          aria-label={guest ? 'შესვლა საჭიროა' : isOpen ? 'დახურვა' : 'გახსნა'}
        >
          {guest ? <Lock className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && <SongBody song={song} region={region} />}
    </div>
  );
};

// the unfolded part of a song: recording picker, player (with notes & lyrics), SoundCloud, lyrics, documents.
// Also used by the "საგანძურის გზა" list.
export const SongBody: React.FC<{ song: FolkSong; region: FolkRegion }> = ({ song, region }) => {
  const [versionIdx, setVersionIdx] = useState(0);
  const version = song.versions[versionIdx];
  return (
      <div className="border-t border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-stone-50/50 p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
        {song.versions.length > 1 && (
          <>
            <div className="text-[11px] font-semibold text-slate-500 px-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ჩანაწერები (აირჩიეთ):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {song.versions.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { triggerHaptic(10); setVersionIdx(i); }}
                  className={`min-h-9 px-3 py-1.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    i === versionIdx
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </>
        )}

        {version ? (
          <div className="rounded-xl border border-amber-300/80 bg-white shadow-sm px-2 pb-2.5 pt-2">
            <ChantPlayer
              key={`${song.id}-${versionIdx}`}
              media={songVersionMedia(song, version)}
              title={song.title}
              subtitle={`${region.nameGe} · ${version.label}`}
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
        {!version && song.lyrics && (
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
