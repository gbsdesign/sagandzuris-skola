import React, { Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { BookOpen, Info, Link2, Loader2, MoreHorizontal, Pin, PinOff, Play, Printer } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { DAILY_GAMES, GAMES, GAME_GROUPS, MODE_HINT, type GameDef } from '../../../data/games';
import { hideNav } from '../../../design/newLook';
import { Button, Card, Choice, Dot, Pill, RoundButton, Row, Rows, SectionLabel, Seg, Sheet, Steps, TopBar } from '../../../components/ui2';
import {
  askNewRoom, onTableOpened, setGameKeysPaused, tableOpenNow, useFrameHowTo, useFrameIntro, useVariantFrame,
} from '../../../components/games/gameVariant';
import { useKitMaker } from '../../../components/games/KitButton';
import { isRoomGame } from '../../../utils/gameRoom';
import { dayNumber, tbilisiToday } from '../../../utils/hangi';
import { OPEN_REQUEST_EVENT, lastOpenRequest, peekOpen, type OpenTarget } from '../../../utils/searchOpen';
import { addressOf } from '../../../utils/pageAddress';
import { triggerHaptic } from '../../../utils/haptics';
import { MAX_SHORTCUTS, saveShortcuts, shortcutLabel, useMyShortcuts } from '../../../utils/shortcuts';
import { GameWaiting } from '../../games/inner';

// A game's page in the new look — one frame for all 46 (boards x-tamashi-<game>; the canvas's note: „დღის თამაშები ახლა ამ
// გვერდზე იხსნება — ერთი შეხებით მეტი —, რომ თამაშს მთელი ეკრანი დარჩეს“): the bar ← name ⋯ (the home page's pin and the
// link inside ⋯), the game's variants as tabs, a white card with its kind and — a daily game — „დღის თამაში · №N“, its line,
// ONE big start button, then „როგორ ვითამაშოთ · N ნაბიჯი“ and „სამაგიდო ვარიანტი“ (only with a printed kit).
// The start shows the game itself (boards x-tamashi, x-otakhi-molodini: ← the name, the variant under it, ⋯ with the
// variants, the rules and the kit); its play screens cover everything (TableScreen: ✕, the name, a number). The game is
// mounted under the first page too, hidden, so its own tabs and steps reach the frame (components/games/gameVariant) and its
// state lives on. A room game's „ოთახის გახსნა“ opens the room setup's window at once (board x-tamashi-otakhi).

/** a request's ids that only pick a tab (anything else — a room, a station — shows the game at once) */
const VARIANT_IDS = new Set(['online', 'table', 'solo', 'stage', 'class']);
const hintOf = (id: string) => (id === 'online' ? MODE_HINT.online : id === 'table' || id === 'class' ? MODE_HINT.hybrid : undefined);
/** a daily game's tab of the day („დღის ჰანგი“ keeps its class room on „ონლაინ“) */
const dailyTabOf = (g?: GameDef) => (g && DAILY_GAMES.includes(g.id) ? (g.item === 'hangi' ? 'solo' : 'online') : null);
const kindOf = (id?: string) => (id ? GAME_GROUPS.find(gr => gr.games.includes(id))?.title : undefined);
const sentence = (t: string) => (/[.!?…]$/.test(t.trim()) ? t : `${t}.`);
const playing = (item: string) => {
  const s = window.history.state || {};
  return !!s.sgGamePlay && s.sgNav?.page === 'games' && s.sgNav?.mapItem === item;
};

/** the kit's row: a tap makes the PDF on the phone and saves it */
const KitRow: React.FC<{ g: GameDef }> = ({ g }) => {
  const { busy, note, run } = useKitMaker(g.print!.make, g.title);
  return (
    <Row
      lead={<Dot icon={busy ? <Loader2 className="animate-spin" /> : <Printer />} />}
      title="სამაგიდო ვარიანტი"
      sub={<span aria-live="polite">{note || 'ამობეჭდე და ითამაშე ქაღალდზე'}</span>}
      aria-busy={busy}
      onClick={() => { void run(); }}
    />
  );
};

/** the games' button on the home page (the old bar's 📌: `section:tamashebi`) */
const PinRow: React.FC = () => {
  const id = 'section:tamashebi';
  const { user } = useAuth();
  const { list, loaded } = useMyShortcuts(user?.uid);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(''), 2200);
    return () => window.clearTimeout(t);
  }, [note]);
  if (!user || !loaded || !shortcutLabel(id)) return null;
  const current = list || [];
  const pinned = current.includes(id);
  const toggle = () => {
    if (pinned) { saveShortcuts(user.uid, current.filter(x => x !== id)).catch(() => {}); setNote('მოიხსნა მთავარიდან'); }
    else if (current.length >= MAX_SHORTCUTS) setNote(`მთავარზე უკვე ${MAX_SHORTCUTS} ღილაკია`);
    else { saveShortcuts(user.uid, [...current, id]).catch(() => {}); setNote('გავიდა მთავარ გვერდზე'); }
  };
  return (
    <Row
      lead={<Dot icon={pinned ? <PinOff /> : <Pin />} color={pinned ? 'wine' : 'tint'} />}
      title={pinned ? 'მთავარიდან მოხსნა' : 'მთავარ გვერდზე მიმაგრება'}
      sub={<span role="status">{note || 'თამაშების ღილაკი მთავარ გვერდზე'}</span>}
      right={null}
      onClick={toggle}
    />
  );
};

/** the game's link: the phone's share sheet, else copied */
const ShareRow: React.FC<{ item: string; title: string }> = ({ item, title }) => {
  const [note, setNote] = useState('');
  const share = async () => {
    triggerHaptic(10);
    const url = `${window.location.origin}${addressOf({ page: 'games', service: null, classId: null, prayerId: null, mapItem: item })}`;
    const text = `„${title}“ — საგანძურის სკოლის თამაში`;
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNote('ბმული დაკოპირდა');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setNote('ვერ გაზიარდა');
    }
  };
  return (
    <Row
      lead={<Dot icon={<Link2 />} />}
      title="გაზიარება"
      sub={<span role="status">{note || 'თამაშის ბმული მეგობარს'}</span>}
      right={null}
      onClick={() => { void share(); }}
    />
  );
};

export const GameFrame: React.FC<{ item: string; Inner: React.ComponentType }> = ({ item, Inner }) => {
  const { handleGoBack } = useNavigation();
  const g = GAMES.find(x => x.item === item);
  const slot = useVariantFrame();
  const steps = useFrameHowTo();
  const story = useFrameIntro();
  const [play, setPlay] = useState(() => {
    if (playing(item)) return true;
    const id = peekOpen(item as OpenTarget);
    return !!id && !VARIANT_IDS.has(id);
  });
  const [more, setMore] = useState(false);
  const [how, setHow] = useState(false);
  useEffect(() => hideNav(), []);
  const title = g?.title ?? '';

  // the game shown: its own history step (once the page's own entry is written), so the phone's „back“ comes to the first page
  const enterPlay = useCallback(() => {
    setPlay(true);
    window.setTimeout(() => {
      const s = window.history.state || {};
      if (!s.sgGamePlay && s.sgNav?.page === 'games' && s.sgNav?.mapItem === item) window.history.pushState({ ...s, sgGamePlay: 1 }, '');
    }, 0);
  }, [item]);
  const leavePlay = () => {
    if (playing(item)) window.history.back();
    else setPlay(false);
  };
  useEffect(() => {
    if (play && !playing(item)) enterPlay();
    const onPop = (e: PopStateEvent) => {
      const st = e.state || {};
      if (st.sgNav?.page === 'games' && st.sgNav?.mapItem === item) setPlay(!!st.sgGamePlay);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [play]);

  // a play screen opening under the first page (a resumed game, an invitation's room), a room or a station asked for: the game
  useEffect(() => {
    if (tableOpenNow()) enterPlay();
    const off = onTableOpened(enterPlay);
    const onAsk = () => {
      const r = lastOpenRequest();
      if (r && r.target === item && !VARIANT_IDS.has(r.id)) enterPlay();
    };
    window.addEventListener(OPEN_REQUEST_EVENT, onAsk);
    return () => { off(); window.removeEventListener(OPEN_REQUEST_EVENT, onAsk); };
  }, [enterPlay, item]);

  // the hidden game's keyboard listeners rest under the first page
  useLayoutEffect(() => {
    setGameKeysPaused(!play);
    return () => setGameKeysPaused(false);
  }, [play]);

  const tab = slot?.value;
  const variant = slot?.items.find(i => i.id === tab);
  const many = !!slot && slot.items.length > 1;
  const isDaily = !!tab && tab === dailyTabOf(g);
  const isRoom = isRoomGame(item) && tab === 'online';
  const startLabel = isDaily ? 'დღის თამაშის დაწყება' : isRoom ? 'ოთახის გახსნა' : 'დაწყება';
  const start = () => {
    triggerHaptic(10);
    // a room game: the window „ახალი ოთახი“ over this page (board x-tamashi-otakhi); signed out, in no class or with a room
    // of one's own, the game's online part says what to do
    if (isRoom && askNewRoom()) return;
    enterPlay();
  };
  const kind = kindOf(g?.id);
  const today = tbilisiToday();

  const moreSheet = (
    <Sheet open={more} title={title} onClose={() => setMore(false)}>
      {play && many && slot && (
        <>
          <SectionLabel label="როგორ ვთამაშობთ" />
          <Rows role="radiogroup" aria-label="როგორ ვთამაშობთ">
            {slot.items.map(it => (
              <Choice key={it.id} title={it.label} sub={hintOf(it.id)} on={it.id === slot.value} onClick={() => { slot.pick(it.id); setMore(false); }} />
            ))}
          </Rows>
        </>
      )}
      <Rows>
        {play && <Row lead={<Dot icon={<BookOpen />} />} title="როგორ ვითამაშოთ" sub={steps?.length ? `${steps.length} ნაბიჯი` : 'მოკლედ'} onClick={() => { setMore(false); setHow(true); }} />}
        {play && g?.print && <KitRow g={g} />}
        <PinRow />
        <ShareRow item={item} title={title} />
      </Rows>
    </Sheet>
  );

  const howSheet = (
    <Sheet open={how} title="როგორ ვითამაშოთ" onClose={() => setHow(false)}>
      {many && variant && <SectionLabel label={variant.label} />}
      {steps?.length ? <Steps items={steps} current={-1} /> : null}
      {(story || !steps?.length) && (
        <Card className="flex gap-3">
          <Dot icon={<Info />} />
          <p className="min-w-0 flex-1 text-body leading-snug wrap-break-word">{story || (g ? sentence(g.text) : '')}</p>
        </Card>
      )}
      {g?.about && (
        <>
          <SectionLabel label={g.like ? `რა თამაშს ჰგავს · ${g.like}` : 'რა თამაშია'} />
          <Card><p className="text-body leading-snug text-mut wrap-break-word">{g.about}</p></Card>
        </>
      )}
    </Sheet>
  );

  const moreButton = <RoundButton label="მეტი" onClick={() => setMore(true)}><MoreHorizontal strokeWidth={1.75} /></RoundButton>;

  return (
    <div className="flex w-full flex-col pb-2">
      {play ? (
        <TopBar title={title} sub={many && variant ? variant.label : undefined} onBack={leavePlay} right={moreButton} />
      ) : (
        <>
          <TopBar title={title} onBack={handleGoBack} right={moreButton} />
          <div className="flex flex-col gap-3 pt-0.5">
            {many && slot && (
              <Seg label="როგორ ვთამაშობთ" value={slot.value} onChange={id => slot.pick(id)} items={slot.items} />
            )}
            {g && (
              <Card className="flex flex-col gap-3">
                {(kind || dailyTabOf(g)) && (
                  <div className="flex flex-wrap gap-2">
                    {kind && <Pill>{kind}</Pill>}
                    {dailyTabOf(g) && <Pill on>დღის თამაში · №{dayNumber(today)}</Pill>}
                  </div>
                )}
                <p className="text-lead leading-relaxed wrap-break-word">{sentence(g.text)}</p>
              </Card>
            )}
            <Button full icon={<Play className="fill-current" strokeWidth={2} />} onClick={start}>{startLabel}</Button>
            <Rows>
              <Row lead={<Dot icon={<BookOpen />} />} title="როგორ ვითამაშოთ" sub={steps?.length ? `${steps.length} ნაბიჯი` : 'მოკლედ'} onClick={() => setHow(true)} />
              {g?.print && <KitRow g={g} />}
            </Rows>
          </div>
        </>
      )}
      <div hidden={!play} className="flex w-full flex-col items-center gap-3 pt-0.5">
        <Suspense fallback={play ? <GameWaiting /> : null}><Inner /></Suspense>
      </div>
      {moreSheet}
      {howSheet}
    </div>
  );
};
