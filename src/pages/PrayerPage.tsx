import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useNavigation } from '../context';
import { PRAYER_HOURS, PrayerHour, hourClock, prayerTitle } from '../data/prayers';
import {
  REMINDER_OFFSETS,
  askNotificationPermission,
  notificationsSupported,
  setHourReminders,
  useReminders,
} from '../utils/prayerReminders';

// One prayer from the ლოცვანი, read in full. Texts come from public/prayers/<id>.json.
export const PrayerPage: React.FC = () => {
  const { selectedPrayerId } = useNavigation();
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!selectedPrayerId) return;
    let alive = true;
    setHtml(null);
    setFailed(false);
    fetch(`/prayers/${selectedPrayerId}.json`)
      .then(r => r.json())
      .then((data: { html: string }) => alive && setHtml(data.html))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [selectedPrayerId]);

  if (!selectedPrayerId) return null;
  const hour = PRAYER_HOURS.find(h => h.id === selectedPrayerId);

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1 space-y-4">
      <h1 className="text-center font-serif-ge text-xl sm:text-2xl font-bold text-[#7a2028]">{prayerTitle(selectedPrayerId)}</h1>

      {hour && <HourReminders hour={hour} />}

      <article className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-5 sm:px-7 sm:py-6">
        {failed ? (
          <p className="text-center text-sm text-[#8a7a6a]">ლოცვის ჩატვირთვა ვერ მოხერხდა. სცადე ხელახლა.</p>
        ) : html === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#7a2028]" />
          </div>
        ) : (
          <div
            className="prayer-text font-serif-ge text-[17px] leading-[1.75] text-[#2a2017] [&_p]:mb-3.5 [&_p.c]:text-center [&_p.c]:mt-5 [&_p.c]:text-[#7a2028] [&_h2]:font-bold [&_h2]:text-[#7a2028] [&_h2]:text-center [&_h2]:text-lg [&_h2]:mt-6 [&_h2]:mb-3 [&_h2:first-child]:mt-0 [&_em]:text-[#6b5544] [&_sup]:text-[11px] [&_hr]:my-5 [&_hr]:border-[#e8dcc8]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </article>

      <p className="text-center text-xs text-[#8a7a6a]">
        წყარო:{' '}
        <a href="https://orthodox.ge/locvani" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#7a2028]">
          orthodox.ge — ლოცვანი
        </a>
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
        შეხსენება მოვა მაშინ, როცა საიტი გახსნილია ამ მოწყობილობაზე (შეიძლება სხვა ჩანართშიც).
        {!notificationsSupported() && ' ეს ბრაუზერი შეტყობინებებს არ უჭერს მხარს.'}
      </p>
    </section>
  );
};
