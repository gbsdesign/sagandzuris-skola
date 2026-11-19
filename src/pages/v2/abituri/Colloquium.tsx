import React, { useState } from 'react';
import { ArrowRight, Check as CheckIcon, Ear, Play, RotateCcw, X } from 'lucide-react';
import { Button, Card, Dot, Note, Pill, Press, SectionLabel, TopBar, cx, FOCUS } from '../../../components/ui2';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useNavigation } from '../../../context';
import { COLLOQUIUM_CHANTS, COLLOQUIUM_SONGS, COLLOQUIUM_VIDEOS, type ColloquiumGroup, type ColloquiumItem } from '../../../data/abituriProgram';
import type { AbituriProgressApi } from '../../../hooks/useAbituriProgress';
import { triggerHaptic } from '../../../utils/haptics';
import { about, embed, makeRound, type Entry, type Pool, type Round } from '../../abituri/ColloquiumQuiz';
import { useCanListen } from '../../abituri/shared';
import { Page, watchUrl } from './parts';

// x-kolokviumi — the III exam in the new look: „გამოიცანი სმენით“ on top (what it is, the pool chips, „დაწყება“), then the
// chants and the songs in their groups, a ▶ each that opens its part of the university's video under the line. The game
// itself is one question a screen (`mapItem` „colloquium/quiz“): listen and pick. Its rules are the old card's
// (pages/abituri/ColloquiumQuiz.tsx: makeRound, embed, about).

const POOL_KEY = 'sg-abituri-pool';
const readPool = (): Pool => {
  try { const p = sessionStorage.getItem(POOL_KEY); return p === 'chant' || p === 'song' ? p : 'all'; } catch { return 'all'; }
};
const POOLS: { id: Pool; label: string }[] = [
  { id: 'all', label: 'ყველა' }, { id: 'chant', label: 'საგალობლები' }, { id: 'song', label: 'სიმღერები' },
];

const count = (gs: ColloquiumGroup[]) => gs.reduce((n, g) => n + g.items.length, 0);
// the item's part of the video, starting at once (privacy-enhanced player, no suggestions from other channels)
const partUrl = (id: string, [start, end]: ColloquiumItem['yt']) =>
  `https://www.youtube-nocookie.com/embed/${id}?start=${start}${end ? `&end=${end}` : ''}&autoplay=1&rel=0&playsinline=1&modestbranding=1`;

const Groups: React.FC<{ groups: ColloquiumGroup[]; video: string; open: string | null; setOpen: (k: string | null) => void }> = ({
  groups, video, open, setOpen,
}) => {
  const canListen = useCanListen();
  let n = 0;
  return (
    <div className="grid shrink-0 items-start gap-3 lg:grid-cols-2">
      {groups.map(g => (
        <section key={g.name} aria-label={g.name} className="flex flex-col overflow-hidden rounded-card bg-surf">
          <h3 className="px-4 pt-3 pb-1.5 text-meta font-bold text-wine">{g.name}</h3>
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {g.items.map(it => {
              n += 1;
              const key = `${video}:${it.yt[0]}`;
              const isOpen = open === key;
              return (
                <li key={key} className="flex flex-col">
                  <div className="flex min-h-row items-center gap-3 py-1.5 pr-3 pl-4">
                    <span aria-hidden="true" className="w-5 shrink-0 text-center text-body font-bold text-mut tabular-nums">{n}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-lead leading-snug font-bold wrap-break-word">{it.title}</span>
                      {(it.sub || it.genre) && <span className="text-meta text-mut wrap-break-word">{[it.sub, it.genre].filter(Boolean).join(' · ')}</span>}
                    </span>
                    <Press
                      aria-label={`${it.title} — ${isOpen ? 'დახურვა' : 'მოსმენა'}`}
                      title={isOpen ? 'დახურვა' : 'მოსმენა'}
                      aria-expanded={isOpen}
                      onClick={() => {
                        if (!canListen) { askSignIn('ჩანაწერები'); return; }
                        setOpen(isOpen ? null : key);
                      }}
                      className={cx(
                        'flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 [&_svg]:size-[18px]',
                        isOpen ? 'bg-wine text-white' : 'bg-tint text-wine',
                        FOCUS,
                      )}
                    >
                      {isOpen ? <X aria-hidden="true" /> : <Play aria-hidden="true" className="translate-x-px fill-current" />}
                    </Press>
                  </div>
                  {isOpen && (
                    <div className="mx-3 mb-3 aspect-video overflow-hidden rounded-tile bg-ink">
                      <iframe title={it.title} src={partUrl(video, it.yt)} className="block h-full w-full border-0"
                        allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};

/** „ყველა ერთად“: the whole video on YouTube — like every recording, for members (a guest is asked to sign in) */
const AllTogether: React.FC<{ id: string }> = ({ id }) => {
  const canListen = useCanListen();
  const look = cx('-my-2.5 inline-flex min-h-tap shrink-0 items-center gap-1.5 rounded-full px-1.5 text-meta font-bold text-wine', FOCUS);
  const body = <><Play aria-hidden="true" className="size-3.5 fill-current" />ყველა ერთად</>;
  return canListen
    ? <a href={watchUrl(id)} target="_blank" rel="noopener noreferrer" className={look}>{body}</a>
    : <Press onClick={() => askSignIn('ჩანაწერები')} className={cx(look, 'cursor-pointer')}>{body}</Press>;
};

export const ColloquiumScreen: React.FC = () => {
  const { handleGoBack, openMapItem } = useNavigation();
  const canListen = useCanListen();
  const [pool, setPool] = useState<Pool>(readPool);
  const [open, setOpen] = useState<string | null>(null);
  const choose = (p: Pool) => { setPool(p); try { sessionStorage.setItem(POOL_KEY, p); } catch { /* ignore */ } };

  return (
    <Page>
      <TopBar title="კოლოქვიუმი" sub="III გამოცდა" onBack={handleGoBack} />
      <Card id="quiz" className="flex scroll-mt-24 flex-col gap-3">
        <div className="flex items-center gap-3">
          <Dot icon={<Ear />} size={40} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-head leading-snug font-bold">გამოიცანი სმენით</span>
            <span className="text-meta text-mut">ვარჯიში უნივერსიტეტის ჩანაწერებით</span>
          </span>
        </div>
        <p className="text-body leading-relaxed text-ink">
          აპი ჩართავს ნახევარწუთიან ნაწყვეტს, შენ კი ოთხი სახელიდან სწორს აირჩევ. მერე ნახავ, სადაურია და რა ჟანრისაა —
          გამოცდაზე ესეც უნდა დაწერო.
        </p>
        {/* the kit's chips are white: inside the white card the idle ones take the page's grey */}
        <div role="group" aria-label="რას ვუსმენთ" className="flex flex-wrap gap-x-2 gap-y-1">
          {POOLS.map(p => {
            const on = p.id === pool;
            return (
              <Press key={p.id} aria-pressed={on} onClick={() => choose(p.id)}
                className="group flex h-tap shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none">
                <span className={cx(
                  'flex h-10 min-w-tap items-center justify-center rounded-full px-4 text-body whitespace-nowrap transition group-active:scale-[0.97]',
                  'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
                  on ? 'bg-wine font-bold text-white' : 'bg-page font-semibold text-ink',
                )}>{p.label}</span>
              </Press>
            );
          })}
        </div>
        <Button full icon={<ArrowRight aria-hidden="true" />}
          onClick={() => (canListen ? openMapItem('colloquium/quiz') : askSignIn('ჩანაწერები'))}>
          დაწყება
        </Button>
      </Card>

      <SectionLabel label={`საგალობლები · ${count(COLLOQUIUM_CHANTS)}`} right={<AllTogether id={COLLOQUIUM_VIDEOS.chants} />} />
      <Groups groups={COLLOQUIUM_CHANTS} video={COLLOQUIUM_VIDEOS.chants} open={open} setOpen={setOpen} />

      <SectionLabel label={`სიმღერები · ${count(COLLOQUIUM_SONGS)} · 10 კუთხე`} right={<AllTogether id={COLLOQUIUM_VIDEOS.songs} />} />
      <Groups groups={COLLOQUIUM_SONGS} video={COLLOQUIUM_VIDEOS.songs} open={open} setOpen={setOpen} />
    </Page>
  );
};

/** „გამოიცანი სმენით“ — one question a screen: the excerpt, four names, then what it was */
export const QuizScreen: React.FC<{ api: AbituriProgressApi }> = ({ api }) => {
  const { handleGoBack } = useNavigation();
  const [pool] = useState<Pool>(readPool);
  const [round, setRound] = useState<Round>(() => makeRound(pool));
  const [choice, setChoice] = useState<Entry | null>(null);
  const [score, setScore] = useState({ right: 0, all: 0 });
  const [replay, setReplay] = useState(0);

  const next = () => { triggerHaptic(10); setRound(r => makeRound(pool, r.e)); setChoice(null); setReplay(0); window.scrollTo({ top: 0 }); };
  const choose = (o: Entry) => {
    if (choice) return;
    triggerHaptic(o === round.e ? 15 : 30);
    setChoice(o);
    const ok = o === round.e;
    setScore(s => ({ right: s.right + (ok ? 1 : 0), all: s.all + 1 }));
    api.countDrill('colloquium', ok);
  };
  const right = choice === round.e;

  return (
    <Page>
      <TopBar
        title="რა ჟღერს?"
        sub={`გამოიცანი სმენით · ${POOLS.find(p => p.id === pool)?.label ?? ''}`}
        onBack={handleGoBack}
        right={score.all > 0 ? <Pill icon={<CheckIcon aria-hidden="true" />} className="tabular-nums">{score.right} / {score.all}</Pill> : undefined}
      />
      <div className="aspect-video shrink-0 overflow-hidden rounded-card bg-ink">
        <iframe key={`${round.n}:${replay}`} title="ნაწყვეტი კოლოკვიუმისთვის" src={embed(round)} className="block h-full w-full border-0"
          allow="autoplay; encrypted-media" />
      </div>
      <div className="flex items-center gap-2">
        <Note className="min-w-0 flex-1">ნახევარი წუთი. თუ არ ჩაირთო, შეეხე ვიდეოს.</Note>
        <Button kind="quiet" size="md" icon={<RotateCcw aria-hidden="true" />} onClick={() => setReplay(x => x + 1)}>თავიდან</Button>
      </div>

      <div role="group" aria-label="რა ჟღერს?" className="grid shrink-0 gap-2.5 sm:grid-cols-2">
        {round.options.map(o => {
          const won = !!choice && o === round.e;
          const wrong = !!choice && o === choice && !right;
          return (
            <Press key={o.item.title + o.group} disabled={!!choice} onClick={() => choose(o)}
              className={cx(
                'flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-tile px-4 py-2.5 text-left text-lead font-bold transition active:scale-[0.99] disabled:cursor-default',
                FOCUS,
                won ? 'bg-leaf-tint text-leaf-ink ring-2 ring-leaf'
                  : wrong ? 'bg-tint text-wine ring-2 ring-wine/40'
                  : choice ? 'bg-surf text-mut'
                  : 'bg-surf text-ink',
              )}>
              <span className="min-w-0 flex-1 font-serif-ge wrap-break-word">{o.item.title}</span>
              {won && <CheckIcon aria-label="სწორია" className="size-5 shrink-0" />}
              {wrong && <X aria-label="არასწორია" className="size-5 shrink-0" />}
            </Press>
          );
        })}
      </div>

      {choice && (
        <>
          <p role="status" className={cx('sg-in shrink-0 rounded-tile px-4 py-3 text-body leading-relaxed text-ink', right ? 'bg-leaf-tint' : 'bg-tint')}>
            <strong className={right ? 'text-leaf-ink' : 'text-wine'}>{right ? 'სწორია! ' : 'არასწორია. '}</strong>
            ეს იყო <b className="font-serif-ge">„{round.e.item.title}“</b> — {about(round.e)}.
          </p>
          <Button full icon={<ArrowRight aria-hidden="true" />} onClick={next}>შემდეგი</Button>
        </>
      )}
    </Page>
  );
};
