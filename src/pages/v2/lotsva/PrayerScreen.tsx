import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Check, ChevronLeft, ChevronRight, ChevronsDown, Loader2, Moon, Star } from 'lucide-react';
import { useNavigation } from '../../../context';
import { PrayerHour, hourClock, isPrayerId, prayerTitle } from '../../../data/prayers';
import { PrayerBody, useHourReminders, usePrayerReader, useReadMark } from '../../PrayerPage';
import { AutoScrollButton } from '../../../components/views/ReadingTools';
import { useFavPrayers } from '../../../components/prayers/FavPrayers';
import { Button, Note, Press, RoundButton, Rows, Row, Sheet, Stepper, TopBar, WrapChips } from '../../../components/ui2';
import { cx, FOCUS } from '../../../components/ui2/cx';
import { ButtonNote, PinRound } from '../gza/parts';
import { triggerHaptic } from '../../../utils/haptics';
import { WordMeanings } from '../sitqva/WordMeanings';

/** x-lotsva — one prayer (or a Bible chapter, a kanon) in the new look: the bar with the title and ★, one row of tools
 *  (ზომა · ღამე · ხუცური · ავტო), then the text alone and one „წავიკითხე“. The logic is the old page's (PrayerPage.tsx:
 *  usePrayerReader, PrayerBody, useReadMark, useHourReminders); the prompter and the kanon's neighbours stay. */

const SIZE_MIN = 50;
const SIZE_MAX = 200;

export const PrayerScreen: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const r = usePrayerReader();
  const [sizeOpen, setSizeOpen] = useState(false);
  if (!r.id) return null;
  const id = r.id;
  const { prev, next, openPrayer, night } = r;
  const neighbours = {
    prev: prev && { label: prev.label, go: () => openPrayer(prev.id) },
    next: next && { label: next.label, go: () => openPrayer(next.id) },
  };

  return (
    <div className={cx('mx-auto flex w-full max-w-2xl flex-col gap-2.5 pb-4', night && 'text-night-ink')}>
      {/* the kit's bar, with its „უკან“ drawn here so the night paper can dim it too */}
      <TopBar title={prayerTitle(id)} right={<><PinRound id={`prayer:${id}`} /><FavRound id={id} night={night} /></>}>
        <RoundButton label="უკან" tone={night ? 'glass' : 'surf'} onClick={handleGoBack}><ArrowLeft aria-hidden="true" strokeWidth={1.75} /></RoundButton>
        <div className="min-w-0 flex-1 pl-0.5">
          <h1 className="truncate text-title leading-tight font-bold tracking-tight">{prayerTitle(id)}</h1>
          <div className={cx('truncate text-meta', night ? 'text-night-ink/70' : 'text-mut')}>ლოცვანი</div>
        </div>
      </TopBar>

      {/* the tools stay at hand down a long text; they stay while the next kanon loads (the prompter goes on to it) */}
      {!r.failed && (
        <div
          role="group"
          aria-label="კითხვის ხელსაწყოები"
          className={cx(
            'sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-1 flex flex-wrap gap-1.5 px-1 pt-0.5 pb-1.5',
            // the ⏬'s own wrapper grows like the other pills; the narrowest phones get two a row
            '[&>span]:flex [&>span]:flex-auto [&>span>button]:w-full max-[339px]:grid max-[339px]:grid-cols-2',
            night ? 'bg-ink' : 'bg-page',
          )}
        >
          <Tool night={night} onClick={() => setSizeOpen(true)} icon={<span className="text-meta font-bold">Aa</span>}>
            ზომა
          </Tool>
          <Tool night={night} on={night} onClick={() => r.setNight(!night)} icon={<Moon />} label={night ? 'ღია ფურცელი' : 'ღამის ფურცელი'}>
            ღამე
          </Tool>
          <Tool
            night={night}
            on={r.khutsuri}
            onClick={() => r.setKhutsuri(!r.khutsuri)}
            icon={<span className="font-serif-ge text-lead leading-none">Ⴞ</span>}
            label="ძველი ქართული დამწერლობით"
          >
            ხუცური
          </Tool>
          <AutoScrollButton
            source={() => (r.html === null ? null : r.textEl)}
            zoom={r.textSize / 100}
            psalter={r.psalter}
            neighbours={neighbours}
            className={toolLook(night, false)}
            face={<><ChevronsDown aria-hidden="true" strokeWidth={2} className={night ? 'text-blush' : 'text-wine'} />ავტო</>}
          />
        </div>
      )}

      {r.hour && <HourCard hour={r.hour} />}

      {r.failed ? (
        <Note className="py-6 text-center">ტექსტის ჩატვირთვა ვერ მოხერხდა. სცადე ხელახლა.</Note>
      ) : r.html === null ? (
        <div className="flex justify-center py-12"><Loader2 aria-label="იტვირთება" className="size-6 animate-spin text-wine" /></div>
      ) : (
        // the text big and alone; the night paper is index.css's .sg-night (the whole screen: html.sg-night-page)
        <article className={cx('px-2 pt-1.5', night && 'sg-night')}>
          {/* old church words: a dotted line, a tap tells the meaning (not over the old script — its letters are not these words) */}
          <WordMeanings el={r.textEl} html={r.khutsuri ? null : r.html} />
          <PrayerBody id={id} html={r.html} khutsuri={r.khutsuri} size={r.textSize} onEl={r.setTextEl} />
        </article>
      )}

      {r.html !== null && !r.failed && <ReadButton prayerId={id} />}

      {(prev || next) && (
        <div className="flex items-center justify-between gap-2.5">
          {prev ? (
            <Button kind="ghost" size="md" icon={<ChevronLeft />} onClick={() => openPrayer(prev.id)}>{prev.label}</Button>
          ) : <span />}
          {next && (
            <Button kind="ghost" size="md" onClick={() => openPrayer(next.id)} className="pr-4 pl-5 [&>span]:flex [&>span]:items-center [&>span]:gap-1">
              {next.label}
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
        </div>
      )}

      <Sheet open={sizeOpen} title="ასოების ზომა" onClose={() => setSizeOpen(false)}>
        <Rows>
          <Row
            title="ზომა"
            sub={r.textSize === 100 ? 'ჩვეულებრივი' : undefined}
            right={(
              <Stepper
                label="ასოების ზომა"
                value={r.textSize}
                min={SIZE_MIN}
                max={SIZE_MAX}
                step={10}
                onChange={r.setTextSize}
                format={v => `${v}%`}
                className="[&_output]:min-w-14"
              />
            )}
          />
        </Rows>
        {r.textSize !== 100 && (
          <Button kind="quiet" size="md" onClick={() => r.setTextSize(100)} className="self-start">ჩვეულებრივი ზომა</Button>
        )}
      </Sheet>
    </div>
  );
};

const toolLook = (night: boolean, on: boolean) => cx(
  'flex h-tap min-w-0 flex-auto cursor-pointer items-center justify-center gap-1 rounded-full px-2 text-meta font-bold whitespace-nowrap transition',
  'active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0',
  on ? 'bg-wine text-white' : night ? 'bg-night-surf text-night-ink' : 'bg-surf text-ink',
  FOCUS,
);

/** One pill of the tools' row: an icon and a short word; `on` = pressed in (night, ხუცური). */
const Tool: React.FC<{ icon: React.ReactNode; on?: boolean; night: boolean; label?: string; onClick: () => void; children: React.ReactNode }> = ({
  icon, on, night, label, onClick, children,
}) => (
  <Press onClick={onClick} aria-pressed={on === undefined ? undefined : on} title={label} className={toolLook(night, !!on)}>
    <span aria-hidden="true" className={cx('flex items-center', on ? 'text-white' : night ? 'text-blush' : 'text-wine')}>{icon}</span>
    {children}
  </Press>
);

/** ★ on the bar: the prayer into „რჩეული“ at the top of ლოცვანი, or off it (FavPrayers' list). */
const FavRound: React.FC<{ id: string; night: boolean }> = ({ id, night }) => {
  const fav = useFavPrayers();
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(''), 2200);
    return () => window.clearTimeout(t);
  }, [note]);
  if (!fav.loaded || !isPrayerId(id)) return null;
  const on = fav.has(id);
  const toggle = () => {
    triggerHaptic(15);
    if (on) { fav.remove(id); setNote('რჩეულიდან მოიხსნა'); }
    else { fav.add(id); setNote('დაემატა რჩეულში'); }
  };
  return (
    <span className="relative inline-flex">
      <RoundButton label={on ? 'რჩეულიდან მოხსნა' : 'რჩეულში დამატება'} tone={night ? 'glass' : 'surf'} aria-pressed={on} onClick={toggle}>
        <Star strokeWidth={1.75} className={on ? 'fill-gold/70 text-gold' : night ? 'text-night-ink' : 'text-wine'} />
      </RoundButton>
      {note && <ButtonNote text={note} />}
    </span>
  );
};

/** At the end: one „წავიკითხე“ (the habit it belongs to, my psalter kanon); then a soft „წაკითხულია“. */
const ReadButton: React.FC<{ prayerId: string }> = ({ prayerId }) => {
  const { show, pressed, ticked, counter, count, of, press, undo, blessing } = useReadMark(prayerId);
  if (!show) return null;
  return (
    <div className="mt-2 flex flex-col gap-2.5">
      {pressed ? (
        <Button full kind="soft" icon={<Check strokeWidth={2.2} />} onClick={counter ? undo : undefined} aria-pressed title={counter ? 'გაუქმება' : undefined}>
          წაკითხულია{of}
        </Button>
      ) : (
        <Button full kind={ticked ? 'soft' : 'primary'} icon={<Check strokeWidth={2.2} />} onClick={press}>
          წავიკითხე{counter && count > 0 ? of : ''}
        </Button>
      )}
      {blessing}
    </div>
  );
};

/** The seven-times prayer's reminders: 10, 5 and 1 minute before its hour (white pills on the page). */
const HourCard: React.FC<{ hour: PrayerHour }> = ({ hour }) => {
  const { active, toggle, notice, where, offsets } = useHourReminders(hour);
  const items = offsets.map(m => ({ id: String(m), label: `${m} წთ` }));
  return (
    <section aria-label="შეხსენება" className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-3">
        <span className="flex flex-1 items-center gap-2 pl-1 text-body font-bold whitespace-nowrap">
          {active.length
            ? <Bell aria-hidden="true" className="size-4 shrink-0 text-wine" />
            : <BellOff aria-hidden="true" className="size-4 shrink-0 text-mut" />}
          შეხსენება {hourClock(hour)}-მდე
        </span>
        <WrapChips
          label="რამდენი წუთით ადრე"
          items={items}
          value={active.map(String)}
          onChange={nextIds => {
            const now = new Set(nextIds);
            const changed = offsets.find(m => now.has(String(m)) !== active.includes(m));
            if (changed !== undefined) void toggle(changed);
          }}
        />
      </div>
      {notice && <p className="px-1.5 text-meta text-wine">{notice}</p>}
      {where && <Note>{where}</Note>}
    </section>
  );
};
