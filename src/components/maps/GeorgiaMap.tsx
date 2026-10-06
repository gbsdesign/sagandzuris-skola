import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus, ChevronDown, Headphones, Sparkles, FileText, Music, Lock, MapPin } from 'lucide-react';
import {
  FOLK_REGIONS,
  FolkRegion,
  FolkSong,
  songsInRegion,
  pendingSong,
  FOLK_SONGS,
  getFolkRegion,
  songVersionMedia,
  songDocUrl,
  soundcloudEmbedUrl,
} from '../../data/songsData';
import { GEORGIA_MAP_SHAPES, GEORGIA_MAP_SIZE } from '../../data/georgiaMapShapes';
import { ChantPlayer } from '../../pages/ChantDetailPage';
import { useAuth } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { askSignIn } from '../access/SignInPrompt';

interface GeorgiaMapProps {
  selectedChantVariants?: Record<string, any>;
  onToggleSong?: (songId: string, songTitle: string, regionCode: string, regionName: string) => void;
}

// Dark fills get light labels
const DARK_FILLS = new Set(['mtianeti', 'kalakuri']);

export const GeorgiaMap: React.FC<GeorgiaMapProps> = ({ selectedChantVariants = {}, onToggleSong }) => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const showOwnerOnly = isAdmin || isSuperAdmin;
  // a song picked in the chant search opens in its region
  const [region, setRegion] = useState<FolkRegion | null>(() => {
    const song = FOLK_SONGS.find(s => s.id === pendingSong.id);
    return song ? getFolkRegion(song.region) : null;
  });
  const [hovered, setHovered] = useState<string | null>(null);

  const openRegion = (r: FolkRegion) => {
    triggerHaptic(10);
    setRegion(r);
  };

  if (region) {
    return (
      <RegionPlaylist
        region={region}
        songs={songsInRegion(region.id, showOwnerOnly)}
        onBack={() => setRegion(null)}
        selectedChantVariants={selectedChantVariants}
        onToggleSong={onToggleSong}
      />
    );
  }

  const { width, height } = GEORGIA_MAP_SIZE;
  return (
    <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-200">
      {/* Map: every region is a button, like pieces of a wooden puzzle */}
      <div className="w-full rounded-3xl bg-gradient-to-br from-[#f7ecd9] via-[#f3e3c6] to-[#ead6b3] border border-[#e2c9a0] shadow-inner p-2 sm:p-4">
        <svg
          viewBox={`-12 -12 ${width + 24} ${height + 24}`}
          className="w-full h-auto select-none"
          role="group"
          aria-label="საქართველოს რუკა — აირჩიეთ კუთხე"
        >
          <defs>
            <filter id="piece-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#6b4423" floodOpacity="0.35" />
            </filter>
          </defs>
          {FOLK_REGIONS.map(r => {
            const shape = GEORGIA_MAP_SHAPES[r.id];
            const isHover = hovered === r.id;
            return (
              <path
                key={r.id}
                d={shape.d}
                fill={r.color}
                stroke="#fffaf0"
                strokeWidth={3}
                strokeLinejoin="round"
                filter="url(#piece-shadow)"
                role="button"
                tabIndex={0}
                aria-label={r.nameGe}
                onClick={() => openRegion(r)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRegion(r); } }}
                onPointerEnter={() => setHovered(r.id)}
                onPointerLeave={() => setHovered(null)}
                className="cursor-pointer outline-none transition-[transform,filter] duration-150 focus-visible:brightness-110"
                style={{
                  transform: isHover ? 'translateY(-4px)' : undefined,
                  filter: isHover ? 'url(#piece-shadow) brightness(1.07)' : undefined,
                }}
              />
            );
          })}
          {/* Labels on top, so they never block taps */}
          {FOLK_REGIONS.map(r => {
            const [x, y] = GEORGIA_MAP_SHAPES[r.id].label;
            const dark = DARK_FILLS.has(r.id);
            if (r.id === 'kalakuri') {
              return (
                <g key={r.id} pointerEvents="none">
                  <circle cx={x} cy={y} r={9} fill="#fffaf0" stroke="#85502c" strokeWidth={3} />
                  <text x={x + 14} y={y - 20} textAnchor="middle" className="font-black" fontSize={22} fill="#5c3a1e" stroke="#fffaf0" strokeWidth={5} paintOrder="stroke">
                    {r.nameGe}
                  </text>
                </g>
              );
            }
            // Double names ("მცხეთა-მთიანეთი") go on two lines
            const lines = r.nameGe.includes('-') ? r.nameGe.replace('-', '-\n').split('\n') : [r.nameGe];
            const lift = hovered === r.id ? 4 : 0;
            return (
              <text
                key={r.id}
                textAnchor="middle"
                pointerEvents="none"
                fontSize={lines.length > 1 ? 18 : 21}
                className="font-black"
                fill={dark ? '#fffaf0' : '#4a2f17'}
              >
                {lines.map((line, i) => (
                  <tspan key={i} x={x} y={y - lift + (i - (lines.length - 1) / 2) * 20} dominantBaseline="middle">
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
        </svg>
      </div>

      {/* The same regions as roomy buttons (easier to tap on a phone) */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FOLK_REGIONS.map(r => {
          const count = songsInRegion(r.id, showOwnerOnly).length;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => openRegion(r)}
              onPointerEnter={() => setHovered(r.id)}
              onPointerLeave={() => setHovered(null)}
              className={`min-h-11 px-3 py-2 rounded-xl border bg-white hover:bg-amber-50/60 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                hovered === r.id ? 'border-amber-400 shadow-sm' : 'border-slate-200/90'
              }`}
            >
              <span className="w-4 h-4 shrink-0 rounded-md border border-black/10" style={{ background: r.color }} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[13px] sm:text-sm font-bold text-slate-800 leading-tight break-words">{r.nameGe}</span>
                <span className={`text-[11px] font-semibold ${count ? 'text-amber-700' : 'text-slate-400'}`}>
                  {count ? `${count} სიმღერა` : 'ჯერ არ არის'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface RegionPlaylistProps {
  region: FolkRegion;
  songs: FolkSong[];
  onBack: () => void;
  selectedChantVariants: Record<string, any>;
  onToggleSong?: GeorgiaMapProps['onToggleSong'];
}

const RegionPlaylist: React.FC<RegionPlaylistProps> = ({ region, songs, onBack, selectedChantVariants, onToggleSong }) => {
  const [openId, setOpenId] = useState<string | null>(() => {
    const id = pendingSong.id;
    pendingSong.id = null;
    return songs.some(s => s.id === id) ? id : null;
  });
  // the song picked in the search may lie further down the region's list
  useEffect(() => {
    if (openId) document.getElementById(`song-${openId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
        <button
          type="button"
          onClick={() => { triggerHaptic(10); onBack(); }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>რუკაზე დაბრუნება</span>
        </button>
        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900">
          {songs.length} სიმღერა
        </span>
      </div>

      <div className="flex items-center gap-3 px-1">
        <span className="w-9 h-9 shrink-0 rounded-xl border border-black/10 shadow-xs" style={{ background: region.color }} />
        <h3 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">{region.nameGe}</h3>
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
            <div key={song.id} id={`song-${song.id}`} className="scroll-mt-4">
              <SongItem
                song={song}
                region={region}
                isOpen={openId === song.id}
                onToggleOpen={() => { triggerHaptic(10); setOpenId(id => (id === song.id ? null : song.id)); }}
                isSelected={Boolean(selectedChantVariants[song.id])}
                onToggleSelect={onToggleSong ? () => { triggerHaptic(15); onToggleSong(song.id, song.title, region.regionCode, region.nameGe); } : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface SongItemProps {
  song: FolkSong;
  region: FolkRegion;
  isOpen: boolean;
  onToggleOpen: () => void;
  isSelected: boolean;
  onToggleSelect?: () => void;
}

const SongItem: React.FC<SongItemProps> = ({ song, region, isOpen: open, onToggleOpen: toggle, isSelected, onToggleSelect: select }) => {
  const hasAudio = song.versions.length > 0;
  // guests see the song's name and place only: no recordings, performers or authors; opening asks to sign in
  const { user } = useAuth();
  const guest = !user;
  const isOpen = open && !guest;
  const onToggleOpen = guest ? () => askSignIn(`სიმღერა „${song.title}“`) : toggle;
  const onToggleSelect = guest ? undefined : select;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
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
            <span className="flex flex-wrap items-center gap-x-1 text-[11px] sm:text-xs font-semibold text-slate-500">
              <MapPin className="w-3 h-3 shrink-0 text-amber-700/70" />
              {[region.nameGe, song.municipality, song.area].filter(Boolean).join(' · ')}
            </span>
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

        {onToggleSelect && (
          <button
            type="button"
            onClick={onToggleSelect}
            className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isSelected ? 'bg-amber-600 text-white border-amber-700 shadow-2xs' : 'bg-white text-slate-400 hover:text-amber-800 border-slate-200'
            }`}
            title={isSelected ? 'ამოღება' : 'დამატება საგანძურის გზაზე'}
          >
            {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
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
              inline
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
