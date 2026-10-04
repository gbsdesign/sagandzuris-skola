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

// Layout & Core Views
import { Header, Footer } from './components/layout';
import { AppRouter } from './routes/AppRouter';
import { AppModals } from './components/AppModals';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageSprinkles } from './components/home/PlateOrnaments';

// Backward compatibility exports
export { filterValidVariants, getValidVariantIds } from './utils/variantValidation';
export { MANERA_ITEMS, HABIT_ITEMS } from './data/habitsAndManera';

export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <ModalProvider>
          <ChantSelectionProvider>
            <AppContent />
          </ChantSelectionProvider>
        </ModalProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { loading } = useAuth();
  const { currentPage } = useNavigation();
  const [dbLogo, setDbLogo] = useState<string | null>(null);

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
    <div className="relative isolate min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 flex flex-col font-sans">
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
