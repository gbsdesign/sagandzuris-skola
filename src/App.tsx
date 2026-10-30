import React, { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import defaultLogo from './assets/images/user_provided_logo_1790330250486.jpg';

// Contexts
import {
  AuthProvider,
  useAuth,
  useNavigation,
  NavigationProvider,
  ModalProvider,
  ChantSelectionProvider,
} from './context';
import { AppLinks, requestShortcut } from './components/app/AppLinks';
import { requestWidgetLink } from './components/app/WidgetLinkAsk';
import { NotesProvider } from './context/NotesContext';

// Layout & Core Views
import { Header, Footer } from './components/layout';
import { AppRouter } from './routes/AppRouter';
import { AppModals } from './components/AppModals';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageSprinkles } from './components/home/PlateOrnaments';
import { ConfirmHost, UndoHost } from './components/ui/kit';
import { requestOpen } from './utils/searchOpen';
import { SaintLifeOverlay } from './components/saints/SaintLifeOverlay';
import { GlobalSearch } from './components/search/GlobalSearch';
import { usePrayerReminderScheduler } from './utils/prayerReminders';
import { isPrayerId } from './data/prayers';
import { setRecordingsHidden, startRecordingBindings, useRecordingBindings } from './data/runtimeRecordings';
import { startPlacements } from './data/placements';
import { SignInPrompt } from './components/access/SignInPrompt';
import { EmailLinkFinish } from './components/access/EmailLinkFinish';
import { FirstMeeting } from './components/onboarding/FirstMeeting';
import { CallLayer } from './components/calls/CallLayer';
import { GameInvites } from './components/games/GameInvites';
import { useKidsMode } from './hooks/useAccess';
import { useClassMarksSync } from './hooks/useClassMarks';
import { MembershipGate, WaitingBanner } from './components/access/MembershipGate';
import { useMembership } from './utils/memberAccess';
import { useBirthdaySync } from './utils/birthdays';
import { useAlbumAccessSync } from './data/albumAccess';

startRecordingBindings();
startPlacements();

// Backward compatibility exports
export { filterValidVariants, getValidVariantIds } from './utils/variantValidation';
export { MANERA_ITEMS, HABIT_ITEMS } from './data/habitsAndManera';

export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <ModalProvider>
          <ChantSelectionProvider>
            <NotesProvider>
              <AppContent />
            </NotesProvider>
          </ChantSelectionProvider>
        </ModalProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { loading, user } = useAuth();
  const { currentPage, openPrayer, navigateTo, openMapItem } = useNavigation();
  // live recordings are for members a superadmin let in with them (set before the tree below renders)
  const membership = useMembership();
  setRecordingsHidden(!user || !membership.can('recordings'));
  // recordings bound in the admin panel: the page redraws when they arrive
  useRecordingBindings();
  // the kids' mode a teacher turned on: no sharing or outside links anywhere (index.css)
  const kids = useKidsMode();
  useEffect(() => {
    document.documentElement.classList.toggle('kids-mode', Boolean(kids));
  }, [kids]);
  const [dbLogo, setDbLogo] = useState<string | null>(null);

  usePrayerReminderScheduler(openPrayer);
  // the member's marks on their classes' programs, for the class page's "who knows this voice"
  useClassMarksSync();
  // my day and month for everyone's birthdays list (utils/birthdays)
  useBirthdaySync();
  // which song albums I may hear and save (data/albumAccess): the songs' lists follow
  useAlbumAccessSync();

  // a tapped reminder may open the site as /?prayer=<id> or /?open=psalter|gz|teacher (the teacher panel is gone:
  // „teacher“ opens the class page) or /?open=admin&person=<uid>
  const openFromUrl = (href: string) => {
    const url = new URL(href, window.location.origin);
    const prayerId = url.searchParams.get('prayer');
    const page = url.searchParams.get('open');
    if (prayerId && isPrayerId(prayerId)) openPrayer(prayerId);
    else if (page === 'psalter' || page === 'gz' || page === 'profile') navigateTo(page);
    else if (page === 'teacher') navigateTo('class');
    // a widget not linked yet (android/ BaseWidget): the linking window
    else if (page === 'widgets') requestWidgetLink();
    // the Android app's widgets and icon menu: a home-shelf button by its id
    else if (page === 'sc') {
      const id = url.searchParams.get('id');
      if (id) requestShortcut(id);
    }
    // „სამშვილდის ღამე“: an invitation into a class's game room
    else if (page === 'samshvilde') {
      const c = url.searchParams.get('c');
      const r = url.searchParams.get('r');
      if (c && r) {
        requestOpen('samshvilde', `${c}/${r}`);
        navigateTo('games');
        openMapItem('samshvilde');
      }
    }
    // an admin's notice: the panel, with the newcomer's window open
    else if (page === 'admin') {
      const person = url.searchParams.get('person');
      if (person) requestOpen('admin', person);
      navigateTo('admin');
    }
  };
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.get('prayer') && !url.searchParams.get('open')) return;
    const href = url.href;
    url.searchParams.delete('prayer');
    url.searchParams.delete('open');
    url.searchParams.delete('person');
    url.searchParams.delete('id');
    url.searchParams.delete('c');
    url.searchParams.delete('r');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    openFromUrl(href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ... and while the site is open, the service worker passes the address on
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const onMessage = (e: MessageEvent) => { if (e.data?.type === 'open-url' && typeof e.data.url === 'string') openFromUrl(e.data.url); };
    sw.addEventListener('message', onMessage);
    return () => sw.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'logo'),
      (snapshot) => {
        if (snapshot.exists() && snapshot.data()?.logoUrl) {
          setDbLogo(snapshot.data().logoUrl);
        }
      },
      (err) => console.warn('Firestore settings snapshot note:', err?.message || err)
    );
    return () => unsubscribe();
  }, []);

  const currentLogo = dbLogo || defaultLogo;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbf6ec] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-[#8a7a6a]">
          <Loader2 className="w-8 h-8 animate-spin text-[#7a2028]" />
          <p className="text-sm font-semibold">იტვირთება…</p>
        </div>
      </div>
    );
  }

  return (
    // one warm paper for every page (the notes page has its own)
    <div className="relative isolate min-h-screen safe-x text-[#2a2017] flex flex-col font-sans bg-gradient-to-b from-[#fdfaf4] via-[#faf4ea] to-[#f6eedf]">
      {/* plate ornaments at the window edges, behind everything (the home page has its own) */}
      {currentPage !== 'home' && <PageSprinkles seed={currentPage} />}

      <Header logoUrl={currentLogo} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col">
        <div className="w-full max-w-4xl mx-auto">
          {/* „მიმდინარეობს დამატება“ while a superadmin has not decided on a new member */}
          <WaitingBanner />
          <ErrorBoundary>
            <Suspense fallback={<div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" /></div>}>
              <AppRouter logoUrl={currentLogo} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      <Footer logoUrl={currentLogo} />

      <ErrorBoundary>
        <AppModals />
      </ErrorBoundary>

      {/* the app's own „are you sure?“ card (kit askConfirm) */}
      <ConfirmHost />
      <UndoHost />
      {/* the Android app: widget and icon-menu buttons, the widgets' summary, things shared into the app */}
      <ErrorBoundary>
        <AppLinks />
      </ErrorBoundary>

      {/* sign-in (Google or a link by e-mail), "საჭიროა რეგისტრაცია" for guests, and the return from the e-mail link */}
      <SignInPrompt />
      <EmailLinkFinish />

      {/* a new member's admission: „დამატება შეფერხებულია“ (and signing out) or the welcome */}
      <MembershipGate />

      {/* "პირველი გაცნობა": name, voice and goal, once */}
      <ErrorBoundary>
        <FirstMeeting />
      </ErrorBoundary>

      {/* a saint's life, opened from that card, the calendar or the library */}
      <ErrorBoundary>
        <SaintLifeOverlay />
      </ErrorBoundary>

      {/* the one search over the whole app (header button, the home field, "/" or Ctrl+K) */}
      <ErrorBoundary>
        {membership.can('search') && <GlobalSearch />}
      </ErrorBoundary>

      {/* „სამშვილდის ღამე“ online: an invitation into a class's game room, or the way back into one's own game */}
      <ErrorBoundary>
        {membership.can('classes') && <GameInvites />}
      </ErrorBoundary>

      {/* the school's calls: the call screen and the incoming call (private chats and classes) */}
      <ErrorBoundary>
        {membership.can('messages') && <CallLayer logoUrl={currentLogo} />}
      </ErrorBoundary>
    </div>
  );
}
