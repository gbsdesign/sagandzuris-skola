import React, { useEffect, useState } from 'react';
import { Bell, BellOff, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigation } from '../context';
import { KATHISMAS, PRAYER_HOURS, PrayerHour, bibleChapterId, hourClock, parseBibleId, prayerTitle } from '../data/prayers';
import { PROSE, PrayerText } from '../components/views/PrayerText';
import {
  REMINDER_OFFSETS,
  askNotificationPermission,
  notificationsSupported,
  setHourReminders,
  useReminders,
} from '../utils/prayerReminders';

// orthodox.ge texts are the morning/evening, hour, weekday prayers and akathist-1…18; the rest come from orthodoxy.ge
const fromOrthodoxGe = (id: string) => /^(dila|dzili|hour-\d+|week-\d-\w+|akathist-\d+)$/.test(id);

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
export const PrayerPage: React.FC = () => {
  const { selectedPrayerId, openPrayer } = useNavigation();
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!selectedPrayerId) return;
    let alive = true;
    setHtml(null);
    setFailed(false);
    loadText(selectedPrayerId)
      .then(text => alive && setHtml(text))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [selectedPrayerId]);

  if (!selectedPrayerId) return null;
  const hour = PRAYER_HOURS.find(h => h.id === selectedPrayerId);
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
      <h1 className="text-center font-serif-ge text-xl sm:text-2xl font-bold text-[#7a2028]">{prayerTitle(selectedPrayerId)}</h1>

      {hour && <HourReminders hour={hour} />}

      <article className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-5 sm:px-7 sm:py-6">
        {failed ? (
          <p className="text-center text-sm text-[#8a7a6a]">ტექსტის ჩატვირთვა ვერ მოხერხდა. სცადე ხელახლა.</p>
        ) : html === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#7a2028]" />
          </div>
        ) : parseBibleId(selectedPrayerId) ? (
          <div className={PROSE} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <PrayerText html={html} />
        )}
      </article>

      {pager}

      <p className="text-center text-xs text-[#8a7a6a]">
        წყარო:{' '}
        {fromOrthodoxGe(selectedPrayerId) ? (
          <a href="https://orthodox.ge/locvani" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#7a2028]">
            orthodox.ge — ლოცვანი
          </a>
        ) : parseBibleId(selectedPrayerId) ? (
          <a href="https://www.orthodoxy.ge/tserili/mtatsmindeli/akhali_agtqma.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#7a2028]">
            orthodoxy.ge — ახალი აღთქმა, გიორგი მთაწმიდელის თარგმანი
          </a>
        ) : (
          <a href="https://www.orthodoxy.ge/lotsvani.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#7a2028]">
            orthodoxy.ge — ლოცვანი
          </a>
        )}
      </p>
    </div>
  );
};

// Reminder chips for one of the seven-times prayers: 10, 5 and 1 minute before the hour.
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

  return (
    <section className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-3.5 space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-bold text-[#4a3426]">
        {active.length ? <Bell className="w-4 h-4 text-[#7a2028]" /> : <BellOff className="w-4 h-4 text-[#b5a48c]" />}
        <span>შეხსენება {hourClock(hour)}-მდე</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {REMINDER_OFFSETS.map(minutes => {
          const on = active.includes(minutes);
          return (
            <button
              key={minutes}
              type="button"
              aria-pressed={on}
              onClick={() => void toggle(minutes)}
              className={`h-9 px-3.5 rounded-full text-sm font-semibold transition-colors cursor-pointer active:scale-95 ${
                on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
              }`}
            >
              {minutes} წუთით ადრე
            </button>
          );
        })}
      </div>
      {notice && <p className="text-xs text-[#7a2028]">{notice}</p>}
      <p className="text-[11px] leading-snug text-[#8a7a6a]">
        {!notificationsSupported()
          ? 'ეს ბრაუზერი შეტყობინებებს არ უჭერს მხარს. iPhone-ზე ჯერ დაამატე საიტი მთავარ ეკრანზე („Add to Home Screen“) და იქიდან გახსენი.'
          : 'PushManager' in window
          ? 'შეხსენება მოვა ამ მოწყობილობაზე, საიტი დახურულიც რომ იყოს.'
          : 'შეხსენება მოვა მაშინ, როცა საიტი გახსნილია ამ მოწყობილობაზე.'}
      </p>
    </section>
  );
};
