import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useNavigation } from '../context';
import { PageBar } from '../components/ui/kit';
import { RoundButton } from '../components/ui2';
import { ProfileActions } from '../components/views/ProfileActions';
import { KhutsuriSwitch } from '../components/views/KhutsuriSwitch';
import { WidgetLinkCard } from '../components/app/WidgetLinkCard';
import { CalendarLinkCard } from '../components/app/CalendarLinkCard';
import { AdminEntry } from '../components/views/AdminEntry';
import { RemindersCard } from '../components/app/RemindersCard';
import { MyClassCard } from '../components/app/MyClassCard';
import { MyMonthStrip } from '../components/app/MyMonthStrip';
import { StudentProfileCard } from '../components/views';
import { ChemiSamosi } from '../components/views/ChemiSamosi';
import { ShortcutShelf } from '../components/home/ShortcutShelf';
import { useAccess } from '../hooks/useAccess';
import { useMembership } from '../utils/memberAccess';
import { useNewLook } from '../design/newLook';
import { TOP_PAGES } from '../components/shell/tabs';

// The profile page (its own chunk since redesign stage 3; the router opens it): the head card, the admin panel's row, my
// month, my classes, outfit and home buttons, then the settings (old look) and the details.

/** A small heading between the profile's groups of rows (the same as the prayer book's group titles). */
const ProfileCaption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="px-4 pt-2 -mb-1 text-[12.5px] font-bold text-[#a08a76]">{children}</h3>
);

export const ProfilePage: React.FC = () => {
  const { handleGoBack, navigateTo, currentPage } = useNavigation();
  const access = useAccess();
  // a member still waiting to be let in: the profile shows who they are, not the member's tools
  const waiting = useMembership().status === 'pending';
  const nl = useNewLook();
  const top = nl && TOP_PAGES.includes(currentPage);
  return (
      <div className="w-full max-w-lg mx-auto px-1 py-3 sm:px-0">
        <PageBar title="პროფილი" onBack={top ? undefined : handleGoBack} className="mb-4"
          right={nl ? <RoundButton label="პარამეტრები" onClick={() => navigateTo('settings')}><SlidersHorizontal strokeWidth={1.75} /></RoundButton> : undefined} />
        {/* the head card, the admin panel's row (admins), my outfit and home buttons, ხუცური, then the details folded */}
        <StudentProfileCard waiting={waiting} slot={<>
          <AdminEntry />
          {/* two small headings (2026-11-06): what is mine, then the settings — the rows all looked alike */}
          {/* this month in three numbers (2026-11-06) */}
          {!waiting && <MyMonthStrip />}
          {!waiting && <ProfileCaption>ჩემი</ProfileCaption>}
          {/* my classes: a row each with the next lesson (2026-11-06) */}
          {!waiting && access.on('classes') && <MyClassCard />}
          {!waiting && access.on('samosi') && <ChemiSamosi row />}
          {!waiting && <ShortcutShelf variant="profile" />}
          {/* the new look: the reminders, ხუცური, the widget, the calendar, installing and leaving live on the settings page */}
          {!nl && <>
            <ProfileCaption>პარამეტრები</ProfileCaption>
            {/* every phone reminder in one window (2026-11-06) */}
            {!waiting && <RemindersCard />}
            {/* ხუცური: the whole site in the old script, on this device */}
            <KhutsuriSwitch />
            {/* the Android app's home-screen widgets */}
            {!waiting && <WidgetLinkCard />}
            {/* the feasts, fasts and my lessons in the phone's calendar */}
            {!waiting && access.on('calendar') && <CalendarLinkCard />}
          </>}
          <ProfileCaption>ჩემი მონაცემები</ProfileCaption>
        </>} />
        {/* install the app · leave the account (asks first) */}
        {!nl && <div className="max-w-lg mx-auto mt-3"><ProfileActions /></div>}
      </div>
  );
};
