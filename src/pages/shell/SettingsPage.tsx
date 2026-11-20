import React, { useState } from 'react';
import { useAuth, useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { useMembership } from '../../utils/memberAccess';
import { useKhutsuriSetting } from '../../utils/khutsuri';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useWidgetLink } from '../../components/app/WidgetLinkCard';
import { useAccountActions } from '../../components/views/ProfileActions';
import { SettingsView } from './settings/SettingsView';
import { InstallGuide } from './settings/InstallGuide';
import { NotifyScreen, SummaryScreen } from '../v2/shetkobinebebi';
import { TextSizeScreen } from '../v2/parametrebi/TextSizeScreen';
import { ThemeScreen } from '../v2/parametrebi/ThemeScreen';
import { PhoneCalendarSheet } from '../v2/kalendari/PhoneCalendarSheet';
import { TEXT_STEPS, THEME_NAMES, useTextLook, useTheme } from '../../design/look';

export { SettingsView } from './settings/SettingsView';
export type { SettingsViewProps, WidgetLook } from './settings/SettingsView';

// The page „პარამეტრები“ (redesign stage 2), opened from the profile's ⚙ and its „პარამეტრები“ row. The same settings the
// profile's bottom and the footer held, with the same rules of who sees what (routes/AppRouter.tsx's profile block):
// • a member still waiting to be let in gets no reminders, widget or calendar;
// • the calendar only where its feature is open (`access.on('calendar')`), the widget only inside the Android app;
// • „აპის დაყენება“ only where the browser offers it (or on an iPhone, with its two steps);
// • the kids' mode has no profile, so no personal details, signing out or deleting the account here either;
// • a guest gets ხუცური, installing, the contacts and the privacy page.
// The windows: PhoneCalendarSheet (v2/kalendari); „შეტყობინებები“ (mapItem `notify`, the reminders inside it —
// v2/shetkobinebebi/NotifyScreen + v2/propili/Reminders), „ტექსტის ზომა“ and „იერი“ are screens of their own
// (mapItem `text`, `theme`); „პირადი ინფორმაცია“ opens the profile's own screen of it (profile mapItem `info`,
// pages/v2/propili/PersonalInfo, board x-piradi-inpormatsia).

type Win = null | 'calendar' | 'ios';

export const SettingsPage: React.FC = () => {
  const { handleGoBack, navigateTo, openMapItem, mapItem } = useNavigation();
  const { user } = useAuth();
  const access = useAccess();
  const waiting = useMembership().status === 'pending';
  const [khutsuri, setKhutsuri] = useKhutsuriSetting();
  const widget = useWidgetLink();
  const pwa = usePWAInstall();
  const account = useAccountActions();
  const textLook = useTextLook();
  const theme = useTheme();
  const [win, setWin] = useState<Win>(null);
  const close = () => setWin(null);

  const member = !!user && !waiting;
  const adult = !!user && !access.kids;
  const canInstall = !pwa.isInstalled && (pwa.isInstallable || pwa.isIOS);

  // one page for everything the phone tells; `reminders` is its old second address (a „მკითხე“ answer, an old step)
  if (member && (mapItem === 'notify' || mapItem === 'reminders')) return <NotifyScreen />;
  if (member && mapItem === 'notify~summary') return <SummaryScreen />;
  // reading comfort (2026-11-18): the text size and the dark look, for everyone signed in
  if (mapItem === 'text') return <TextSizeScreen />;
  if (mapItem === 'theme') return <ThemeScreen />;

  return (
    <>
      <SettingsView
        onBack={handleGoBack}
        onNotify={member ? () => openMapItem('notify') : undefined}
        textSize={{ label: TEXT_STEPS[textLook.step].name, onTap: () => openMapItem('text') }}
        theme={{ label: theme.choice === 'auto' ? 'ტელეფონით' : THEME_NAMES[theme.choice], onTap: () => openMapItem('theme') }}
        khutsuri={khutsuri}
        onKhutsuri={setKhutsuri}
        widget={member && widget.shown ? {
          linked: widget.linked,
          state: widget.state === 'idle' && widget.secret ? 'ready' : widget.state,
          onTap: () => void widget.go(),
        } : undefined}
        onCalendar={member && access.on('calendar') ? () => setWin('calendar') : undefined}
        onInstall={canInstall ? () => { if (pwa.isInstallable) void pwa.install(); else setWin('ios'); } : undefined}
        onPersonal={adult ? () => { navigateTo('profile'); openMapItem('info'); } : undefined}
        onSignOut={adult ? () => void account.leave() : undefined}
        remove={adult && account.canDelete ? { onTap: () => void account.remove(), busy: account.busy, error: account.error } : undefined}
      />
      <PhoneCalendarSheet open={win === 'calendar'} onClose={close} />
      <InstallGuide open={win === 'ios'} onClose={close} />
    </>
  );
};
