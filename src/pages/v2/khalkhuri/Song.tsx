import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft, Bookmark, Check, CloudDownload, Download, FileText, GraduationCap, LoaderCircle,
  MoreHorizontal, Music, Share2, TextAlignStart,
} from 'lucide-react';
import { useChants } from '../../../context';
import {
  Card, Dot, Note, Num, Row, Rows, RoundButton, SectionLabel, Sheet, Small, ToggleRow, TopBar,
} from '../../../components/ui2';
import { songDocUrl, soundcloudEmbedUrl, type FolkRegion, type FolkSong } from '../../../data/songsData';
import { TakePlayer, openSongPage, type SongTake } from '../../../components/maps/SongPage';
import { SongWords } from '../../../components/maps/SongWords';
import { useTakeTools } from '../../../components/maps/TakeTools';
import { addressOf } from '../../../utils/pageAddress';
import { triggerHaptic } from '../../../utils/haptics';

// A folk song's page in the new look (board x-simghera): the bar (the song, where it is from, ⋯), the recording playing on
// its own card (a seek line with its times, ‹ ▶ ›; ‹ › move between the recordings), the recordings numbered, then the
// words and „ისწავლე ხმა-ხმად“ (the
// learning mode). ⬇ MP3, ☁ offline, sharing, „ჩემს სიაში“ and an admin's „გადატანა“ live in ⋯. The page itself — its history
// step, the learning mode, the move — is components/maps/SongPage.tsx's.

export const SongScreenV2: React.FC<{
  song: FolkSong;
  region: FolkRegion;
  takes: SongTake[];
  takeIdx: number;
  words: { text: string; source?: string } | null;
  scroller: () => HTMLElement | null;
  learning: boolean;
  onLearn: () => void;
  onMove?: () => void;
  onClose: () => void;
}> = ({ song, region, takes, takeIdx, words, scroller, learning, onLearn, onMove, onClose }) => {
  const take = takes[takeIdx];
  const [more, setMore] = useState(false);
  const [showWords, setShowWords] = useState(false);
  useEffect(() => { setShowWords(false); }, [song.id]);
  const go = (i: number) => { triggerHaptic(10); openSongPage(song.id, i); };
  const place = [region.nameGe, song.area, song.municipality].filter(Boolean).join(' · ');
  const canLearn = !!take && !take.embed && take.media.tracks.some(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-10">
      <TopBar
        title={song.title}
        sub={`${place} · ${song.genre ? `${song.genre} სიმღერა` : 'ხალხური სიმღერა'}`}
        onBack={onClose}
        right={<RoundButton label="მეტი" onClick={() => { triggerHaptic(8); setMore(true); }}><MoreHorizontal aria-hidden="true" /></RoundButton>}
      />

      {/* the recording playing */}
      {take ? (
        <Card className="flex flex-col gap-3.5 p-[18px]">
          <div className="min-w-0">
            <div className="text-meta text-mut">ახლა უკრავს</div>
            <div className="mt-0.5 text-head leading-tight font-bold wrap-break-word">{take.label}{take.sub ? <span className="font-semibold text-mut"> · {take.sub}</span> : null}</div>
          </div>
          {/* the school's player drawn as ‹ ▶ › with its times (components/ChantPlayer.tsx layout 'v2'); ‹ › = the recordings */}
          <TakePlayer
            key={`${song.id}-${takeIdx}`}
            take={take}
            title={song.title}
            subtitle={`${region.nameGe} · ${take.label}`}
            hideNotesButton
            pauseToken={learning ? 1 : 0}
            v2
            steps={takes.length > 1 ? {
              prev: takeIdx > 0 ? () => go(takeIdx - 1) : undefined,
              next: takeIdx < takes.length - 1 ? () => go(takeIdx + 1) : undefined,
            } : undefined}
          />
        </Card>
      ) : song.soundcloud ? (
        <Card pad="none">
          <iframe title={song.title} src={soundcloudEmbedUrl(song.soundcloud)} className="block h-[166px] w-full border-0" allow="autoplay" loading="lazy" />
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-1.5 py-6 text-center">
          <Music aria-hidden="true" className="size-6 text-faint" />
          <p className="text-body font-bold text-mut">{song.pendingWma ? 'ჩანაწერი მზადდება' : 'ამ სიმღერის ჩანაწერი ჯერ არ არის'}</p>
        </Card>
      )}

      {takes.length > 1 && (
        <>
          <SectionLabel label={`ჩანაწერები · ${takes.length}`} className="mt-1" />
          <Rows>
            {takes.map((t, i) => (
              <Row key={i} lead={<Num n={i + 1} on={i === takeIdx} />} title={t.label} sub={t.sub} wrap
                aria-current={i === takeIdx ? 'true' : undefined} onClick={() => go(i)} />
            ))}
          </Rows>
        </>
      )}

      <Rows>
        <Row lead={<Dot icon={<TextAlignStart />} />} title="სიმღერის ტექსტი" sub={words || showWords ? undefined : 'ჯერ არ დამატებულა'}
          aria-expanded={showWords} onClick={() => { triggerHaptic(10); setShowWords(v => !v); }} />
        {canLearn && (
          <Row lead={<Dot icon={<GraduationCap />} />} title="ისწავლე ხმა-ხმად" sub="ნაწილ-ნაწილ: მოსმენა წრეზე, ნელა, შენი სიმღერა" wrap
            onClick={() => { triggerHaptic(10); onLearn(); }} />
        )}
        {(song.docs ?? []).map(doc => (
          <Row key={doc.id} lead={<Dot icon={<FileText />} />} title={doc.name} wrap href={songDocUrl(doc)} target="_blank" />
        ))}
      </Rows>

      {/* the words (written in the app first, then found ones); ✎ for the allowed, ⏬ reads them by themselves */}
      {showWords && <div className="sg-in"><SongWords songId={song.id} words={words} scroller={scroller} /></div>}

      <MoreSheet open={more} onClose={() => setMore(false)} song={song} region={region} take={take} onMove={onMove} />
    </div>
  );
};

/** ⋯: the recording's ⬇ and ☁, sharing, „ჩემს სიაში“, an admin's move */
const MoreSheet: React.FC<{ open: boolean; onClose: () => void; song: FolkSong; region: FolkRegion; take?: SongTake; onMove?: () => void }> = ({
  open, onClose, song, region, take, onMove,
}) => {
  const tools = useTakeTools(take, song.title);
  const { selectedChantVariants, handleToggleSong } = useChants();
  const [said, setSaid] = useState<string | null>(null);
  const share = async () => {
    triggerHaptic(10);
    const url = `${location.origin}${addressOf({ page: 'simghera', service: null, classId: null, prayerId: null, mapItem: region.id })}`;
    const text = `„${song.title}“ — ${region.nameGe} · ხალხური სიმღერა`;
    try {
      if (navigator.share) { await navigator.share({ title: song.title, text, url }); return; }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setSaid('დაკოპირდა');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setSaid('ვერ გაზიარდა');
    }
  };
  const inList = !!selectedChantVariants[song.id];
  return (
    <Sheet open={open} title={song.title} onClose={onClose}>
      {take && tools.usable && (
        <>
          <SectionLabel label={`ჩანაწერი · ${take.label}`} />
          <Rows>
            {tools.canSave && (
              <Row lead={<Dot icon={tools.busy === 'mp3' ? <LoaderCircle className="animate-spin" /> : <Download />} />} title="MP3-ის ჩამოტვირთვა"
                sub={tools.failed ? 'ვერ მოხერხდა — სცადე თავიდან' : undefined} disabled={tools.busy !== null} onClick={tools.mp3} />
            )}
            {tools.offline && (
              <Row lead={<Dot icon={tools.busy === 'cloud' ? <LoaderCircle className="animate-spin" /> : tools.kept ? <Check /> : <CloudDownload />} color={tools.kept ? 'leaf' : 'tint'} />}
                title={tools.kept ? 'ოფლაინ შენახულია' : 'ოფლაინ შენახვა'} sub={tools.kept ? 'შეეხე, რომ მოიხსნას' : 'ინტერნეტის გარეშე მოსასმენად'}
                disabled={tools.busy !== null} onClick={tools.cloud} />
            )}
          </Rows>
        </>
      )}
      <SectionLabel label="სიმღერა" />
      <Rows>
        <Row lead={<Dot icon={<Share2 />} />} title="გაზიარება" right={said ? <Small tone={said === 'დაკოპირდა' ? 'leaf' : 'danger'}>{said}</Small> : undefined} onClick={share} />
        <ToggleRow lead={<Dot icon={<Bookmark />} />} title="ჩემს სიაში" sub={inList ? 'სიაშია — საგანძურის გზაზე' : undefined} on={inList}
          onChange={() => { triggerHaptic(15); handleToggleSong(song.id, song.title, region.regionCode, region.nameGe); }} />
        {onMove && <Row lead={<Dot icon={<ArrowRightLeft />} />} title="გადატანა" sub="სხვა კუთხეში, სიმღერაში ან საგალობლებში" onClick={() => { onClose(); onMove(); }} />}
      </Rows>
      {!take && !song.soundcloud && <Note>ჩანაწერი ჯერ არ არის.</Note>}
    </Sheet>
  );
};
