import React, { useState } from 'react';
import { CirclePlay, Ear, Play, X } from 'lucide-react';
import { COLLOQUIUM_CHANTS, COLLOQUIUM_SONGS, COLLOQUIUM_VIDEOS, type ColloquiumGroup, type ColloquiumItem } from '../../data/abituriProgram';
import { triggerHaptic } from '../../utils/haptics';
import { CARD, Pill, SectionHead } from './shared';
import { ColloquiumQuiz } from './ColloquiumQuiz';

// III exam — the colloquium: excerpts are played, the student names them. Every item plays its own part of the
// university's listening video right here (an embedded player opens under the row; one at a time).

export const ColloquiumTab: React.FC = () => {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-7">
      <div className={`${CARD} flex items-start gap-3 p-3.5 sm:p-4`}>
        <span className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028]">
          <Ear className="w-5 h-5" />
        </span>
        <p className="text-[14px] leading-relaxed text-[#3a2d22]">
          გამოცდაზე მოგასმენინებენ ნაწყვეტებს სიმღერებიდან და საგალობლებიდან. უნდა გამოიცნო, <b>რა არის</b>,
          <b> რა ჰქვია</b> და <b>სადაურია</b>, და ფურცელზე დაწერო. ქვემოთ — ყველაფერი, რაც შეიძლება შეგხვდეს.
        </p>
      </div>

      <ColloquiumQuiz />

      <section>
        <SectionHead
          title="საგალობლები"
          sub={`${count(COLLOQUIUM_CHANTS)} საგალობელი`}
          extra={<Pill href={watchUrl(COLLOQUIUM_VIDEOS.chants)} icon={<CirclePlay className="w-4 h-4" />}>ყველა ერთად</Pill>}
        />
        <Groups groups={COLLOQUIUM_CHANTS} video={COLLOQUIUM_VIDEOS.chants} open={open} setOpen={setOpen} />
      </section>

      <section>
        <SectionHead
          title="სიმღერები"
          sub={`${count(COLLOQUIUM_SONGS)} სიმღერა · 10 კუთხე`}
          extra={<Pill href={watchUrl(COLLOQUIUM_VIDEOS.songs)} icon={<CirclePlay className="w-4 h-4" />}>ყველა ერთად</Pill>}
        />
        <Groups groups={COLLOQUIUM_SONGS} video={COLLOQUIUM_VIDEOS.songs} open={open} setOpen={setOpen} />
      </section>
    </div>
  );
};

const count = (gs: ColloquiumGroup[]) => gs.reduce((n, g) => n + g.items.length, 0);
const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
// the item's part of the video, starting at once (privacy-enhanced player, no suggestions from other channels)
const embedUrl = (id: string, [start, end]: ColloquiumItem['yt']) =>
  `https://www.youtube-nocookie.com/embed/${id}?start=${start}${end ? `&end=${end}` : ''}&autoplay=1&rel=0&playsinline=1&modestbranding=1`;

const Groups: React.FC<{ groups: ColloquiumGroup[]; video: string; open: string | null; setOpen: (k: string | null) => void }> = ({ groups, video, open, setOpen }) => {
  let n = 0;
  return (
    <div className="grid sm:grid-cols-2 gap-3 items-start">
      {groups.map(g => (
        <div key={g.name} className={`${CARD} p-3 sm:p-3.5`}>
          <h3 className="px-1 pb-1.5 text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{g.name}</h3>
          <ul>
            {g.items.map(it => {
              n += 1;
              const key = `${video}:${it.yt[0]}`;
              const isOpen = open === key;
              return (
                <li key={key} className="border-t border-[#f3ead9] first:border-t-0">
                  <div className="flex items-center gap-2.5 min-h-11 px-1">
                    <span className="shrink-0 w-6 text-right text-[12px] font-bold tabular-nums text-[#b3a28d]">{n}</span>
                    <span className="flex-1 min-w-0 py-1.5">
                      <span className="block font-serif-ge text-[15px] font-bold leading-snug text-[#2a2017]">{it.title}</span>
                      {(it.sub || it.genre) && (
                        <span className="block text-[12px] font-semibold leading-snug text-[#8a7a6a]">
                          {it.sub}
                          {it.sub && it.genre && ' · '}
                          {it.genre && <span className="text-[#a0612c]">{it.genre}</span>}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => { triggerHaptic(10); setOpen(isOpen ? null : key); }}
                      title={isOpen ? 'დახურვა' : 'მოსმენა'}
                      aria-label={`${it.title} — ${isOpen ? 'დახურვა' : 'მოსმენა'}`}
                      aria-expanded={isOpen}
                      className={`shrink-0 grid place-items-center w-10 h-10 rounded-full active:scale-95 transition-all cursor-pointer ${
                        isOpen ? 'bg-[#2a2017] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] text-[#7a2028] hover:bg-[#7a2028] hover:text-[#fbf6ec]'
                      }`}
                    >
                      {isOpen ? <X className="w-[18px] h-[18px]" /> : <Play className="w-[17px] h-[17px] translate-x-[1px]" fill="currentColor" />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="mb-2.5 mt-0.5 rounded-xl overflow-hidden bg-black aspect-video">
                      <iframe
                        title={it.title}
                        src={embedUrl(video, it.yt)}
                        className="block w-full h-full border-0"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};
