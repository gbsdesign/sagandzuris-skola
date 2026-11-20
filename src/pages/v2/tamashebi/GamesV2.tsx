import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Dices, Flag, Music, Search, Users, X } from 'lucide-react';
import { useNavigation } from '../../../context';
import type { FilmKind } from '../../../data/georgianFilms';
import { GAME_GROUPS } from '../../../data/games';
import { Card, Dot, Note, Press, RoundButton, Row, Rows, SectionLabel, Seg, Small, TopBar, cx, FOCUS_IN } from '../../../components/ui2';
import { Toast } from '../../../components/ui/Toast';
import { PageSkeleton } from '../../../components/shell/PageSkeleton';
import { setDarkPage } from '../../../design/look';
import { gameIcon } from '../../../components/games/gameIcons';
import { INNER_GAMES } from '../../games/inner';
import { useGamesHub, type HubCard } from '../../games/useGamesHub';
import { GameFrame } from './GameFrame';

// „სახალისო“ in the new look (board x-tamashebi; the canvas's note: „11 პატარა ფილის ნაცვლად 3 დღის თამაშია. დანარჩენი 46 —
// ოთხ ჯგუფში“): the bar with 🔍, the tabs თამაში · ფილმი · სპექტაკლი · მულტფილმი (while the films are open), the three daily
// games as tiles, then the four kinds as rows — a kind opens its games (`mapItem` „g:<kind>“, so „უკან“ comes back here). A
// game opens in its frame (GameFrame, board x-tamashi). The other daily games' results show on their rows.

// the films' list (loads only when opened) — the same one the old hub shows
const KinoKind = lazy(() => import('../../VideosPage').then(m => ({ default: m.KinoKind })));

type HubTab = 'games' | FilmKind;
const TAB_KEY = 'sg-games-tab';
const readTab = (): HubTab => {
  try { const t = sessionStorage.getItem(TAB_KEY); return t === 'film' || t === 'theatre' || t === 'cartoon' ? t : 'games'; } catch { return 'games'; }
};

const GROUP_ICON: Record<string, React.ReactNode> = { music: <Music />, georgia: <Flag />, live: <Users />, board: <Dices /> };
// the board's names of the kinds („ცოცხალი — ერთად სათამაშო“); the others as data/games.ts writes them
const GROUP_TITLE: Record<string, string> = { live: 'ცოცხალი — ერთად სათამაშო' };
const groupTitle = (id: string) => GROUP_TITLE[id] ?? GAME_GROUPS.find(g => g.id === id)?.title ?? '';

/** a game as a row: its mark, its name, today's result or its line */
const GameRow: React.FC<{ c: HubCard; meta?: string; onOpen: () => void }> = ({ c, meta, onOpen }) => {
  const soon = c.state === 'soon';
  return (
    <Row
      lead={<Dot icon={gameIcon(c.g.id)} color={soon ? 'soft' : 'tint'} />}
      title={c.g.title}
      sub={soon ? 'მალე' : meta ?? c.g.text}
      onClick={onOpen}
    />
  );
};

const Hub: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const { cards, groups, daily, films, meta, play, search, soon, setSoon } = useGamesHub();
  const [tab, setTab] = useState<HubTab>(readTab);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const chooseTab = (t: HubTab) => {
    setTab(t);
    try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private mode */ }
    // the films' list is still the old drawing: the dark look steps aside on its tab (design/look.ts reads the same key)
    if (!mapItem) setDarkPage(t === 'games');
    if (t !== 'games') { setSearching(false); setQuery(''); }
  };
  useEffect(() => { if (searching) field.current?.focus(); }, [searching]);

  // a film open from a tab: `kino/<YouTube id>` (the bar's „უკან“ closes it); an old `kino` opens the films' tab
  const [kinoList, kinoFilm] = (mapItem ?? '').split('/');
  const inKino = kinoList === 'kino';
  const shown: HubTab = films ? (inKino && tab === 'games' ? 'film' : tab) : 'games';
  const found = searching ? search(query) : null;
  const toggleSearch = () => {
    if (searching) { setSearching(false); setQuery(''); return; }
    chooseTab('games');
    setSearching(true);
  };

  return (
    <div className="flex w-full flex-col pb-2">
      <TopBar
        title="სახალისო"
        onBack={handleGoBack}
        right={(
          <RoundButton label={searching ? 'ძებნის დახურვა' : 'თამაშის ძებნა'} aria-pressed={searching} onClick={toggleSearch}>
            {searching ? <X strokeWidth={1.75} /> : <Search strokeWidth={1.75} />}
          </RoundButton>
        )}
      />
      <div className="flex flex-col gap-3 pt-0.5">
        {films && (
          <Seg<HubTab>
            label="სახალისო"
            value={shown}
            onChange={chooseTab}
            items={[{ id: 'games', label: 'თამაში' }, { id: 'film', label: 'ფილმი' }, { id: 'theatre', label: 'სპექტაკლი' }, { id: 'cartoon', label: 'მულტფილმი' }]}
          />
        )}

        {shown !== 'games' ? (
          <Suspense fallback={<PageSkeleton />}>
            <KinoKind
              key={shown}
              only={shown}
              open={inKino ? kinoFilm : undefined}
              onPlay={id => openMapItem(`kino/${id}`, false, true)}
              onMove={id => openMapItem(`kino/${id}`, true, true)}
              onClose={handleGoBack}
            />
          </Suspense>
        ) : (
          <>
            {searching && (
              <label className="relative block shrink-0">
                <span className="sr-only">თამაშის ძებნა</span>
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-[18px] size-[18px] -translate-y-1/2 text-mut" strokeWidth={1.75} />
                <input
                  ref={field}
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="მოძებნე თამაში"
                  className="h-[52px] w-full min-w-0 rounded-full bg-surf pr-[18px] pl-12 text-lead text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60"
                />
              </label>
            )}

            {found ? (
              <>
                <SectionLabel label={<span role="status">{found.length ? `ნაპოვნია ${found.length}` : 'ასეთი თამაში ვერ ვიპოვე'}</span>} />
                {found.length > 0 && (
                  <Rows>{found.map(c => <GameRow key={c.g.id} c={c} meta={meta(c.g)} onOpen={() => play(c.g, c.state, 'online')} />)}</Rows>
                )}
              </>
            ) : (
              <>
                {daily.length > 0 && (
                  <>
                    <SectionLabel label="დღის თამაშები" />
                    <div className="grid shrink-0 grid-cols-3 gap-2.5">
                      {daily.slice(0, 3).map(({ g, state, done }) => (
                        <Press
                          key={g.id}
                          onClick={() => play(g, state, 'online')}
                          aria-label={`${g.title}${done ? ' — დღეს გაკეთებულია' : ''}`}
                          className={cx('flex min-h-[104px] min-w-0 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-card bg-surf px-2 py-3 text-center transition active:scale-[0.98] active:bg-soft', FOCUS_IN)}
                        >
                          <Dot icon={done ? <Check strokeWidth={2.4} /> : gameIcon(g.id)} color={done ? 'leaf' : 'tint'} />
                          <span className="w-full text-meta leading-tight font-bold wrap-break-word">{g.title}</span>
                        </Press>
                      ))}
                    </div>
                  </>
                )}
                <SectionLabel label={`ყველა თამაში · ${cards.length}`} />
                <Rows>
                  {groups.map(gr => (
                    <Row
                      key={gr.id}
                      lead={<Dot icon={GROUP_ICON[gr.id] ?? <Dices />} />}
                      title={groupTitle(gr.id)}
                      wrap
                      right={<span className="flex shrink-0 items-center gap-1.5"><Small>{gr.list.length}</Small><ChevronRight aria-hidden="true" className="size-[18px] text-mut" strokeWidth={2} /></span>}
                      onClick={() => openMapItem(`g:${gr.id}`)}
                    />
                  ))}
                </Rows>
              </>
            )}
          </>
        )}
      </div>
      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};

/** one kind's games (`mapItem` „g:<kind>“) */
const GroupScreen: React.FC<{ id: string }> = ({ id }) => {
  const { handleGoBack } = useNavigation();
  const { groups, meta, play, soon, setSoon } = useGamesHub();
  const gr = groups.find(g => g.id === id);
  return (
    <div className="flex w-full flex-col pb-2">
      <TopBar title={groupTitle(id) || 'თამაშები'} sub={gr ? `${gr.list.length} თამაში` : undefined} onBack={handleGoBack} />
      <div className="flex flex-col gap-3 pt-0.5">
        {gr ? (
          <>
            <Note>{gr.hint}</Note>
            <Rows>{gr.list.map(c => <GameRow key={c.g.id} c={c} meta={meta(c.g)} onOpen={() => play(c.g, c.state, 'online')} />)}</Rows>
          </>
        ) : (
          <Card><p className="text-body text-mut">ეს ჯგუფი ახლა ცარიელია.</p></Card>
        )}
      </div>
      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};

/** the games page in the new look: the hub, a kind's list, or an open game in its frame */
export const GamesV2: React.FC = () => {
  const { mapItem } = useNavigation();
  const Inner = mapItem ? INNER_GAMES[mapItem] : undefined;
  if (Inner && mapItem) return <GameFrame key={mapItem} item={mapItem} Inner={Inner} />;
  if (mapItem?.startsWith('g:')) return <GroupScreen id={mapItem.slice(2)} />;
  return <Hub />;
};

export default GamesV2;
