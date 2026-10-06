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
import { NotesProvider } from './context/NotesContext';

// Layout & Core Views
import { Header, Footer } from './components/layout';
import { AppRouter } from './routes/AppRouter';
import { AppModals } from './components/AppModals';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageSprinkles } from './components/home/PlateOrnaments';
import { TodaySaintsCard } from './components/calendar/TodaySaintsCard';
import { SaintLifeOverlay } from './components/saints/SaintLifeOverlay';
import { usePrayerReminderScheduler } from './utils/prayerReminders';
import { isPrayerId } from './data/prayers';
import { setRecordingsHidden, startRecordingBindings, useRecordingBindings } from './data/runtimeRecordings';
import { SignInPrompt } from './components/access/SignInPrompt';
import { EmailLinkFinish } from './components/access/EmailLinkFinish';
import { FirstMeeting } from './components/onboarding/FirstMeeting';
import { useKidsMode } from './hooks/useAccess';

startRecordingBindings();

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
  const { currentPage, openPrayer, navigateTo } = useNavigation();
  // live recordings are for signed-in members only (set before the tree below renders)
  setRecordingsHidden(!user);
  // recordings bound in the admin panel: the page redraws when they arrive
  useRecordingBindings();
  // the kids' mode a teacher turned on: no sharing or outside links anywhere (index.css)
  const kids = useKidsMode();
  useEffect(() => {
    document.documentElement.classList.toggle('kids-mode', Boolean(kids));
  }, [kids]);
  const [dbLogo, setDbLogo] = useState<string | null>(null);

  usePrayerReminderScheduler(openPrayer);

  // a tapped reminder may open the site as /?prayer=<id> or /?open=psalter|gz|teacher
  const openFromUrl = (href: string) => {
    const url = new URL(href, window.location.origin);
    const prayerId = url.searchParams.get('prayer');
    const page = url.searchParams.get('open');
    if (prayerId && isPrayerId(prayerId)) openPrayer(prayerId);
    else if (page === 'psalter' || page === 'gz' || page === 'teacher') navigateTo(page);
  };
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.get('prayer') && !url.searchParams.get('open')) return;
    const href = url.href;
    url.searchParams.delete('prayer');
    url.searchParams.delete('open');
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">იტვირთება...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative isolate min-h-screen safe-x text-slate-900 flex flex-col font-sans ${
        // the chant pages share the warm paper of the notes pages
        currentPage === 'galoba' ? 'bg-gradient-to-b from-[#fdfaf4] via-[#f8f1e5] to-[#f1e7d6]'
          // the home page: the footer's warm cream (#fbf6ec), only lighter
          : currentPage === 'home' ? 'bg-gradient-to-b from-[#fffdf9] via-[#fdfaf4] to-[#fcf7ef]'
          // the school's management pages and the psalter group: warm paper too
          : currentPage === 'psalter' || currentPage === 'teacher' || currentPage === 'admin' ? 'bg-gradient-to-b from-[#fdfaf4] via-[#faf4ea] to-[#f6eedf]'
          : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}
    >
      {/* plate ornaments at the window edges, behind everything (the home page has its own) */}
      {currentPage !== 'home' && <PageSprinkles seed={currentPage} />}

      <Header logoUrl={currentLogo} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">
        <div className="w-full max-w-4xl mx-auto">
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

      {/* once a day on entering: today's saints from the church calendar */}
      <ErrorBoundary>
        <TodaySaintsCard />
      </ErrorBoundary>

      {/* sign-in (Google or a link by e-mail), "საჭიროა რეგისტრაცია" for guests, and the return from the e-mail link */}
      <SignInPrompt />
      <EmailLinkFinish />

      {/* "პირველი გაცნობა": name, voice and goal, once */}
      <ErrorBoundary>
        <FirstMeeting />
      </ErrorBoundary>

      {/* a saint's life, opened from that card, the calendar or the library */}
      <ErrorBoundary>
        <SaintLifeOverlay />
      </ErrorBoundary>
    </div>
  );
}
