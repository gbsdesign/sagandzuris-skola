import React, { useEffect, useState } from 'react';
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
import { usePrayerReminderScheduler } from './utils/prayerReminders';
import { isPrayerId } from './data/prayers';

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
  const { loading } = useAuth();
  const { currentPage, openPrayer } = useNavigation();
  const [dbLogo, setDbLogo] = useState<string | null>(null);

  usePrayerReminderScheduler(openPrayer);

  // a tapped reminder may open the site as /?prayer=<id>
  useEffect(() => {
    const url = new URL(window.location.href);
    const prayerId = url.searchParams.get('prayer');
    if (!prayerId) return;
    url.searchParams.delete('prayer');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (isPrayerId(prayerId)) openPrayer(prayerId);
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
      className={`relative isolate min-h-screen text-slate-900 flex flex-col font-sans ${
        // the chant pages share the warm paper of the notes pages
        currentPage === 'galoba' ? 'bg-gradient-to-b from-[#fdfaf4] via-[#f8f1e5] to-[#f1e7d6]' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}
    >
      {/* plate ornaments at the window edges, behind everything (the home page has its own) */}
      {currentPage !== 'home' && <PageSprinkles seed={currentPage} />}

      <Header logoUrl={currentLogo} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">
        <div className="w-full max-w-4xl mx-auto">
          <ErrorBoundary>
            <AppRouter logoUrl={currentLogo} />
          </ErrorBoundary>
        </div>
      </main>

      <Footer logoUrl={currentLogo} />

      <ErrorBoundary>
        <AppModals />
      </ErrorBoundary>
    </div>
  );
}
