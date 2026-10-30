import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { KATHISMAS, PRAYER_HOURS, PrayerHour, bibleChapterId, hourClock, parseBibleId, prayerTitle, todaysWeekPrayerId } from '../data/prayers';
import { HABIT_ITEMS } from '../data/habitsAndManera';
import { COUNTED_BY_READING } from '../data/habitLooks';
import { FoldedPrayer, PROSE, PrayerText } from '../components/views/PrayerText';
import { HourPsalms } from '../components/views/HourPsalms';
import { ReadingToolbar, useKhutsuri } from '../components/views/ReadingTools';
import { useHabitsModel } from '../components/habits/useHabits';
import { Btn } from '../components/ui/kit';
import { useAccess } from '../hooks/useAccess';
import { markRead, useMyPsalterGroups, useTakenByMe } from '../hooks/usePsalter';
import { cycleOf, georgiaToday, kathismasOf, ownersIn } from '../utils/psalter';
import { habitOfPrayer, rememberRead } from '../utils/prayerHabits';
import {
  REMINDER_OFFSETS,
  askNotificationPermission,
  notificationsSupported,
  setHourReminders,
  useReminders,
} from '../utils/prayerReminders';

// Fetches { html } for a prayer, or one chapter of a book of the New Testament.
const loadText = async (id: string): Promise<string> => {
  const bible = parseBibleId(id);
  if (bible) {
    const data: { chapters: string[] } = await (await fetch(`/bible/${bible.book.id}.json`)).json();
    return data.chapters[bible.chapter - 1] || '';
  }
  const data: { html: string } = await (await fetch(`/prayers/${id}.json`)).json();
  return data.html;
};

// The neighbours of a chapter or kathisma, for reading on.
const neighbours = (id: string): { prev?: { id: string; label: string }; next?: { id: string; label: string } } => {
  const bible = parseBibleId(id);
  if (bible) {
    const { book, chapter } = bible;
    return {
      prev: chapter > 1 ? { id: bibleChapterId(book.id, chapter - 1), label: `თავი ${chapter - 1}` } : undefined,
      next: chapter < book.chapters ? { id: bibleChapterId(book.id, chapter + 1), label: `თავი ${chapter + 1}` } : undefined,
    };
  }
  const k = KATHISMAS.findIndex(x => x.id === id);
  if (k >= 0) {
    return {
      prev: k > 0 ? { id: KATHISMAS[k - 1].id, label: `კანონი ${k}` } : undefined,
      next: k < KATHISMAS.length - 1 ? { id: KATHISMAS[k + 1].id, label: `კანონი ${k + 2}` } : undefined,
    };
  }
  return {};
};

// One prayer from the ლოცვანი (or a chapter of the Gospel / Apostle), read in full.
// The text's own first heading goes when the page's bar already says it („დილის ლოცვები“ twice; a kathisma's
// „კანონი პირველი“ under „ფსალმუნნი — კანონი 1“); a fuller one (an akathist's whole name) stays.
const flat = (t: string) => t.replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
const withoutBarTitle = (html: string, id: string): string => {
  const head = html.match(/^\s*<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (!head) return html;
  const same = flat(head[1]) === flat(prayerTitle(id)) || KATHISMAS.some(k => k.id === id);
  return same ? html.slice(head[0].length) : html;
};

export const PrayerPage: React.FC = () => {
  const { selectedPrayerId, openPrayer } = useNavigation();
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // kept while reading on (next chapter or kathisma); every new visit starts at the standard size, in ordinary letters
  const [textSize, setTextSize] = useState(100);
  const [khutsuri, setKhutsuri] = useState(false);
  const [textEl, setTextEl] = useState<HTMLDivElement | null>(null);
  useKhutsuri(textEl, khutsuri);

  useEffect(() => {
    if (!selectedPrayerId) return;
    // a chapter or an akathist becomes the habit menu's "გააგრძელე"
    rememberRead(selectedPrayerId);
    let alive = true;
    setHtml(null);
    setFailed(false);
    loadText(selectedPrayerId)
      .then(text => alive && setHtml(withoutBarTitle(text, selectedPrayerId)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [selectedPrayerId]);

  if (!selectedPrayerId) return null;
  const hour = PRAYER_HOURS.find(h => h.id === selectedPrayerId);
  const kathisma = KATHISMAS.find(k => k.id === selectedPrayerId);
  const { prev, next } = neighbours(selectedPrayerId);
  const pager = (prev || next) && (
    <div className="flex items-center justify-between gap-2">
      {prev ? (
        <button type="button" onClick={() => openPrayer(prev.id)} className="h-10 pl-2.5 pr-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] text-sm font-semibold text-[#4a3426] hover:text-[#7a2028] hover:ring-[#7a2028]/40 inline-flex items-center gap-1 cursor-pointer active:scale-95">
          <ChevronLeft className="w-4 h-4" />
          {prev.label}
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button type="button" onClick={() => openPrayer(next.id)} className="h-10 pl-3.5 pr-2.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] text-sm font-semibold text-[#4a3426] hover:text-[#7a2028] hover:ring-[#7a2028]/40 inline-flex items-center gap-1 cursor-pointer active:scale-95">
          {next.label}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1 space-y-4">
      {hour && <HourReminders hour={hour} />}

      <article className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-5 sm:px-7 sm:py-6">
        {failed ? (
          <p className="text-center text-sm text-[#8a7a6a]">ტექსტის ჩატვირთვა ვერ მოხერხდა. სცადე ხელახლა.</p>
        ) : html === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#7a2028]" />
          </div>
        ) : (
          <>
            <ReadingToolbar size={textSize} onSize={setTextSize} khutsuri={khutsuri} onKhutsuri={setKhutsuri} />
            {/* big sizes: a long word breaks rather than leaving the card; ხუცური off = the text drawn afresh */}
            <div key={khutsuri ? 'khutsuri' : 'mkhedruli'} ref={setTextEl} style={{ zoom: textSize / 100 }} className="break-words">
              {parseBibleId(selectedPrayerId) ? (
                // the prayers before and after reading Holy Scripture, folded around the chapter; folded again on the next one
                <div key={selectedPrayerId} className={PROSE}>
                  <FoldedPrayer id="sakhareba-tsin" label="ლოცვა წაკითხვის წინ" className="mb-5" />
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                  <FoldedPrayer id="sakhareba-shemdeg" label="ლოცვა წაკითხვის შემდეგ" className="mt-5" />
                </div>
              ) : (
                <>
                  {/* a kathisma: the rule's opening prayers above it and the closing ones below, folded; folded again on the next one */}
                  {kathisma && (
                    <div className={PROSE}>
                      <FoldedPrayer key={`tsin-${kathisma.id}`} id="psalter-tsin" label="კითხვის წინ" className="mb-5" />
                    </div>
                  )}
                  <PrayerText
                    html={html}
                    glory={Boolean(kathisma)}
                    dayPrayer={selectedPrayerId === 'dila' || selectedPrayerId === 'dzili' ? todaysWeekPrayerId(selectedPrayerId) : undefined}
                  />
                  {kathisma && (
                    <div className={PROSE}>
                      <FoldedPrayer key={`shemdeg-${kathisma.id}`} id="psalter-shemdeg" label="კითხვის შემდეგ" className="mt-5" woven />
                    </div>
                  )}
                </>
              )}
              {/* each of the seven hours goes on with „მოწყალებისა კარი“ (said three times), folded, then one's own psalms for this hour */}
              {hour && (
                <div className={PROSE}>
                  <FoldedPrayer key={hour.id} id="motskhalebisa-kari" label="განაგრძე" className="mt-6" />
                  <HourPsalms key={`psalms-${hour.id}`} hour={hour} />
                </div>
              )}
            </div>
          </>
        )}
      </article>


      {html !== null && !failed && <ReadMark prayerId={selectedPrayerId} />}

      {pager}

    </div>
  );
};

// At the end of a prayer: "წავიკითხე" ticks today's habit it belongs to (the morning prayers count for
// "დილის და საღამოს ლოცვები"…; a chapter adds one თავი to "სახარება" or "სამოციქულო") and moves "გააგრძელე" past a finished chapter.
// A kathisma ticks "ფსალმუნები" the same way, and when it is my kanon in a psalter group this cycle — or one I took over
// to help — the group's kanon is marked read too (the one button for both).
const ReadMark: React.FC<{ prayerId: string }> = ({ prayerId }) => {
  const { user } = useAuth();
  const access = useAccess();
  const { model, blessing } = useHabitsModel(() => {});
  const [pressed, setPressed] = useState(false);
  useEffect(() => setPressed(false), [prayerId]);
  const { groups } = useMyPsalterGroups(user?.uid);
  const taken = useTakenByMe(groups, user?.uid);

  const k = /^kathisma-(\d+)$/.exec(prayerId)?.[1];
  const kanonIn = !user || !k || access.section('medavitneoba') !== 'open' ? [] : groups.flatMap(g => {
    const c = cycleOf(georgiaToday(), g.cycleDays, g.shiftDays);
    const mine = kathismasOf(ownersIn(g.assignment, g.baseHalf, c.half), user.uid).includes(Number(k)) || (taken[g.id] || []).includes(Number(k));
    return g.memberIds.includes(user.uid) && mine ? [{ g, c }] : [];
  });
  const found = HABIT_ITEMS.find(h => h.id === habitOfPrayer(prayerId));
  const habit = found && access.section('chvevebi') === 'open' ? found : undefined;
  if (!user || (!habit && !kanonIn.length)) return null;
  const today = new Date();
  const ticked = !!habit && model.isOn(habit.id, today);
  // a chapter of the Gospel or the Apostle adds one to the day's count (the day ticks at the goal); „გაუქმება“ takes it back
  const counter = habit && COUNTED_BY_READING.includes(habit.id) ? model.counters[habit.id] : undefined;
  const count = habit && counter ? model.countOn(habit.id, today) : 0;

  const press = () => {
    setPressed(true);
    rememberRead(prayerId, true);
    // the mark waits on the phone when offline and is sent later
    for (const { g, c } of kanonIn) void markRead(g.id, c, Number(k), user.uid).catch(() => {});
    if (!habit) return;
    if (counter) model.setCount(habit.id, count + 1, today);
    else if (!ticked) model.toggle(habit.id, today);
  };
  const undo = () => {
    setPressed(false);
    if (habit) model.setCount(habit.id, count - 1, today);
  };

  // one button, no card: „წავიკითხე“, then a soft „წაკითხულია“ (a chapter: „2 / 5 თავი“, a second press takes it back)
  const of = counter ? ` · ${count} / ${counter.goal} ${counter.unit}` : '';
  return (
    <div className="space-y-2.5">
      {pressed ? (
        <Btn full size="lg" kind="soft" icon={<Check />} onClick={counter ? undo : undefined} aria-pressed title={counter ? 'გაუქმება' : undefined}>
          წაკითხულია{of}
        </Btn>
      ) : (
        <Btn full size="lg" kind={ticked ? 'soft' : 'primary'} icon={<Check />} onClick={press}>
          წავიკითხე{counter && count > 0 ? of : ''}
        </Btn>
      )}
      {blessing}
    </div>
  );
};

// Reminder chips for one of the seven-times prayers: 10, 5 and 1 minute before the hour, in one row.
const HourReminders: React.FC<{ hour: PrayerHour }> = ({ hour }) => {
  const settings = useReminders();
  const active = settings[hour.id] || [];
  const [notice, setNotice] = useState<string | null>(null);

  const toggle = async (minutes: number) => {
    const turningOn = !active.includes(minutes);
    if (turningOn) {
      const permission = await askNotificationPermission();
      if (permission === 'unsupported') {
        setNotice('ეს ბრაუზერი შეტყობინებებს ვერ აჩვენებს.');
        return;
      }
      if (permission !== 'granted') {
        setNotice('შეტყობინებები დაბლოკილია — ჩართე ბრაუზერის პარამეტრებში ამ საიტისთვის.');
        return;
      }
      setNotice(null);
    }
    setHourReminders(hour.id, turningOn ? [...active, minutes] : active.filter(m => m !== minutes));
  };

  // a line under the chips only when the reminder cannot work here
  const where = !notificationsSupported()
    ? 'ეს ბრაუზერი შეტყობინებებს არ უჭერს მხარს. iPhone-ზე ჯერ დაამატე საიტი მთავარ ეკრანზე („Add to Home Screen“) და იქიდან გახსენი.'
    : null;

  return (
    <section className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3.5 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex items-center gap-1.5 text-sm font-bold text-[#4a3426]">
          {active.length ? <Bell className="w-4 h-4 text-[#7a2028]" /> : <BellOff className="w-4 h-4 text-[#b5a48c]" />}
          შეხსენება {hourClock(hour)}-მდე
        </span>
        <div className="flex gap-1.5 ml-auto">
          {REMINDER_OFFSETS.map(minutes => {
            const on = active.includes(minutes);
            return (
              <button
                key={minutes}
                type="button"
                aria-pressed={on}
                title={`${minutes} წუთით ადრე`}
                onClick={() => void toggle(minutes)}
                className={`h-9 px-3 rounded-full text-[13px] font-semibold tabular-nums transition-colors cursor-pointer active:scale-95 ${
                  on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
                }`}
              >
                {minutes} წთ
              </button>
            );
          })}
        </div>
      </div>
      {notice && <p className="text-xs text-[#7a2028]">{notice}</p>}
      {where && <p className="text-[11px] leading-snug text-[#8a7a6a]">{where}</p>}
    </section>
  );
};
