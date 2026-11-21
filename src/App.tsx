import React, { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { requestShortcut } from './components/app/appLinkRequests';
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
import { wantAnswer } from './components/calls/callActions';
import { stationRequest } from './utils/dzebna';
import { isRoomGame } from './utils/gameRoom';
import { ROOM_GAME_INFO } from './data/roomGames';
import { GlobalSearch } from './components/search/GlobalSearch';
import { usePrayerReminderScheduler } from './utils/prayerReminders';
import { requestEvening } from './utils/eveningCheck';
import { EveningCheck } from './components/habits/EveningCheck';
import { isPrayerId } from './data/prayers';
import { setRecordingsHidden, startRecordingBindings, useRecordingBindings } from './data/runtimeRecordings';
import { SignInPrompt } from './components/access/SignInPrompt';
import { EmailLinkFinish } from './components/access/EmailLinkFinish';
import { useKidsMode } from './hooks/useAccess';
import { MembershipGate, WaitingBanner } from './components/access/MembershipGate';
import { useMembership } from './utils/memberAccess';
import { useBirthdaySync } from './utils/birthdays';
import { useAlbumAccessSync } from './data/albumAccess';
import { openEarTest, useAiLessonOpen, useMyVoiceOpen } from './components/aiLesson/open';
import { useExamOpen } from './pages/v2/gamocda/open';
import { useAssistantOpen } from './pages/v2/damkhmare/open';
import { useMkitkheOpen } from './pages/v2/mkitkhe/open';
import { AI_REPORT } from './pages/v2/klasi/nav';
import { useAccess } from './hooks/useAccess';
import { setNewLook } from './design/newLook';
import { setNewEar } from './utils/earChoice';
import { AppBadge, DeskBar } from './components/shell/BottomNav';
import { HomeBar } from './components/shell/HomeBar';
import { ShellLinks } from './components/shell/ShellLinks';
import { Waiting } from './components/shell/PageSkeleton';
// the AI teacher's day lesson loads only when opened
const AiLesson = React.lazy(() => import('./components/aiLesson/AiLesson').then(m => ({ default: m.AiLesson })));
const MyVoiceHost = React.lazy(() => import('./components/aiLesson/MyVoiceHost').then(m => ({ default: m.MyVoiceHost })));
const ExamHost = React.lazy(() => import('./pages/v2/gamocda/ExamHost').then(m => ({ default: m.ExamHost })));
const AssistantHost = React.lazy(() => import('./pages/v2/damkhmare/AssistantHost').then(m => ({ default: m.AssistantHost })));
const ProgramFab = React.lazy(() => import('./pages/v2/damkhmare/ProgramFab').then(m => ({ default: m.ProgramFab })));
const MkitkheHost = React.lazy(() => import('./pages/v2/mkitkhe/MkitkheHost').then(m => ({ default: m.MkitkheHost })));
// the parts over the page that are not needed for the first screen load a moment after it (redesign stage 3 „სიჩქარე“)
const later = <T extends string>(load: () => Promise<Record<T, React.ComponentType<any>>>, name: T) =>
  React.lazy(() => load().then(m => ({ default: m[name] })));
const AppLinks = later(() => import('./components/app/AppLinks'), 'AppLinks');
const SaintLifeOverlay = later(() => import('./components/saints/SaintLifeOverlay'), 'SaintLifeOverlay');
const FirstMeeting = later(() => import('./components/onboarding/FirstMeeting'), 'FirstMeeting');
const KanonGate = later(() => import('./components/psalter/KanonGate'), 'KanonGate');
const KanonGateV2 = later(() => import('./pages/v2/psalmuni/KanonGate'), 'KanonGateV2');
const LearnedMoment = later(() => import('./pages/v2/barati/LearnedMoment'), 'LearnedMoment');
const CallLayer = later(() => import('./components/calls/CallLayer'), 'CallLayer');
const PhoneRingSetup = later(() => import('./components/calls/PhoneRingSetup'), 'PhoneRingSetup');
const GameInvites = later(() => import('./components/games/GameInvites'), 'GameInvites');
const ClassMarksSync = later(() => import('./components/app/ClassMarksSync'), 'ClassMarksSync');
const ProgramAutoOffline = later(() => import('./components/classes/ProgramAutoOffline'), 'ProgramAutoOffline');

startRecordingBindings();
// the songs' moved recordings (data/placements, with all the songs' data) start listening a moment after the first screen
{
  const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
  const go = () => void import('./data/placements').then(m => m.startPlacements());
  if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 5000 }); else window.setTimeout(go, 3000);
}

// Backward compatibility exports
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
  const { loading, user, isSuperAdmin } = useAuth();
  const { currentPage, openPrayer, navigateTo, openMapItem, openDm, openClass } = useNavigation();
  // „ახალი სახე“ (redesign stage 2): its switch `newLook` — admins first, then everyone (data/sections)
  const access = useAccess();
  const newLook = access.on('newLook');
  useLayoutEffect(() => { setNewLook(newLook); }, [newLook]);
  // the new ear (AI teacher 2.0): admins first, everyone once its switch is open
  const newEar = access.on('newEar');
  useLayoutEffect(() => { setNewEar(newEar); }, [newEar]);
  // a soft way in for a new page (the new look; none for „reduce motion“) — the page itself is not remounted
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pageRef.current;
    if (!newLook || !el || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }, [currentPage, newLook]);
  // a page this person may not open is drawn as the home page in its place (AppRouter) — then the frame is the home's
  // too: a guest who reloaded /p/search or /p/settings got the home page with no bar on top and no menu below
  const pageAccess = access.page(currentPage);
  const homeInPlace = currentPage !== 'home'
    && (pageAccess === 'hidden' || pageAccess === 'soon' || (currentPage === 'settings' && !user));
  const framePage = homeInPlace ? 'home' : currentPage;
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
  // my day and month for everyone's birthdays list (utils/birthdays)
  useBirthdaySync();
  // which song albums I may hear and save (data/albumAccess): the songs' lists follow
  useAlbumAccessSync();

  // a tapped reminder may open the site as /?prayer=<id> or /?open=psalter|gz|teacher (the teacher panel is gone:
  // „teacher“ opens the class page) or /?open=admin&person=<uid> or /?open=class&id=<classId>&item=ai-report
  const openFromUrl = (href: string) => {
    const url = new URL(href, window.location.origin);
    const prayerId = url.searchParams.get('prayer');
    const page = url.searchParams.get('open');
    if (prayerId && isPrayerId(prayerId)) openPrayer(prayerId);
    else if (page === 'psalter' || page === 'gz' || page === 'profile') navigateTo(page);
    else if (page === 'teacher') navigateTo('class');
    // an admin's notice for everyone on the phone (worker/reminders /announce): the header's 🔔 list
    else if (page === 'bell') requestOpen('bell', '1');
    // „საღამოს კითხვა“ — the evening notice: the window to tick the day's habits (components/habits/EveningCheck)
    else if (page === 'sagamo') requestEvening();
    // „ყურის შემოწმება“ — how well the app hears my voice (AI teacher 2.0, stage 1)
    else if (page === 'ear') openEarTest();
    // a widget not linked yet (android/ BaseWidget): the linking window
    else if (page === 'widgets') requestWidgetLink();
    // the Android app's widgets and icon menu: a home-shelf button by its id
    else if (page === 'sc') {
      const id = url.searchParams.get('id');
      if (id) requestShortcut(id);
    }
    // an invitation into a class's game room (/?open=<game>&c=<class>&r=<room>)
    else if (isRoomGame(page)) {
      const c = url.searchParams.get('c');
      const r = url.searchParams.get('r');
      if (c && r) {
        requestOpen(page, `${c}/${r}`);
        navigateTo('games');
        openMapItem(ROOM_GAME_INFO[page].item);
      }
    }
    // a station's card of „საგანძურის ძებნა“ (/?open=dzebna&h=<code>&s=<station>&n=<next place>): its station on the games page
    else if (page === 'dzebna') {
      const h = url.searchParams.get('h');
      const s = url.searchParams.get('s');
      if (h && s) {
        requestOpen('dzebna', stationRequest(h, s, url.searchParams.get('n') ?? ''));
        navigateTo('games');
        openMapItem('dzebna');
      }
    }
    // a message on the phone (worker/reminders /chat-notify): its chat — a private one by its id, a class's as class:<id>
    else if (page === 'chat') {
      const id = url.searchParams.get('id');
      if (id && /^(class:)?[A-Za-z0-9_-]{1,128}$/.test(id)) openDm(id);
    }
    // a ring on the phone (its „პასუხი“ or the notice itself): the chat, and the call answered once the app sees it
    else if (page === 'call') {
      const m = /^(dms|classes)\/([A-Za-z0-9_-]{1,128})$/.exec(url.searchParams.get('b') || '');
      if (m) {
        wantAnswer(`${m[1]}/${m[2]}`);
        openDm(m[1] === 'dms' ? m[2] : `class:${m[2]}`);
      }
    }
    // a teacher's Monday notice (worker/reminders „კვირის შეჯამება მზადაა“): the class, on the week's summary
    else if (page === 'class') {
      const id = url.searchParams.get('id');
      if (id && /^[A-Za-z0-9_-]{1,128}$/.test(id)) {
        openClass(id);
        if (url.searchParams.get('item') === AI_REPORT) openMapItem(AI_REPORT);
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
    // a share from another app (/?open=share) is ShareHost's: it mounts only after the sign-in is known, so the marker
    // must still be there then — this effect runs while the loading screen shows and used to wipe it first
    if (url.searchParams.get('open') === 'share') return;
    const href = url.href;
    url.searchParams.delete('prayer');
    url.searchParams.delete('open');
    url.searchParams.delete('person');
    url.searchParams.delete('id');
    url.searchParams.delete('c');
    url.searchParams.delete('r');
    url.searchParams.delete('h');
    url.searchParams.delete('s');
    url.searchParams.delete('n');
    url.searchParams.delete('b');
    url.searchParams.delete('item');
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
  // ... and the iPhone app, for a tapped notice or a link into the site (ios/Sagandzuri/WebViewController.swift open)
  useEffect(() => {
    const w = window as unknown as { sgOpenUrl?: (href: string) => void };
    w.sgOpenUrl = (href: string) => openFromUrl(href);
    return () => { delete w.sgOpenUrl; };
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
  const aiLesson = useAiLessonOpen();
  const examOpen = useExamOpen();
  const assistantOpen = useAssistantOpen();
  const mkitkheOpen = useMkitkheOpen();
  const myVoice = useMyVoiceOpen();

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
    // one warm paper for every page (the notes page has its own); the new look's plain page colour
    <div className={newLook
      ? 'sg-paper relative isolate min-h-screen safe-x text-ink flex flex-col font-sans bg-page'
      : 'sg-paper relative isolate min-h-screen safe-x text-[#2a2017] flex flex-col font-sans bg-gradient-to-b from-[#fdfaf4] via-[#faf4ea] to-[#f6eedf]'}>
      {/* plate ornaments at the window edges, behind everything (the home page has its own); none in the new look */}
      {!newLook && currentPage !== 'home' && <PageSprinkles seed={currentPage} />}

      {/* the new look: the phone's status bar keeps the page colour under it while the page scrolls */}
      {newLook && <div aria-hidden className="fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top,0px)] bg-page" />}
      {/* the new look has no header: the home page's own bar, the bottom menu, every other page its one bar */}
      {/* a computer (lg and up): one bar across the top with the four places and the search field (boards x-desk-sia · x-desk-klasi) */}
      {newLook && <DeskBar logoUrl={currentLogo} />}
      {newLook ? framePage === 'home' && <HomeBar logoUrl={currentLogo} /> : <Header logoUrl={currentLogo} />}

      <main className={newLook
        ? `flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 flex flex-col ${framePage === 'home' ? 'pt-1' : 'pt-[calc(env(safe-area-inset-top,0px)+4px)]'} pb-[calc(env(safe-area-inset-bottom,0px)+24px)] ${framePage === 'home' ? 'lg:pt-4' : ''}`
        : 'flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col'}>
        <div ref={pageRef} className="w-full max-w-4xl mx-auto">
          {/* „მიმდინარეობს დამატება“ while a superadmin has not decided on a new member */}
          <WaitingBanner />
          <ErrorBoundary>
            <Suspense fallback={newLook
              ? <Waiting className="pt-16" />
              : <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" /></div>}>
              <AppRouter logoUrl={currentLogo} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* the new look keeps only the footer's church calendar (its links moved to the settings page) */}
      <Footer logoUrl={currentLogo} bare={newLook} />
      {/* phones have no bottom menu since 2026-11-21 (profile and 🔍 in the home bar, „წერილები“ on the vine) */}
      {newLook && user && <AppBadge />}
      {newLook && <ShellLinks />}

      <ErrorBoundary>
        <AppModals />
      </ErrorBoundary>

      {/* „საღამოს კითხვა“ — each evening: which habits were done today */}
      <ErrorBoundary>
        <EveningCheck />
      </ErrorBoundary>

      {/* the AI teacher's day lesson, over everything (components/aiLesson) */}
      {aiLesson.open && (
        <ErrorBoundary>
          <Suspense fallback={null}><AiLesson onClose={aiLesson.close} /></Suspense>
        </ErrorBoundary>
      )}
      {/* the AI teacher's exam (AI step 3, boards x-ai-gamocda-tsin / x-ai-gamocda) */}
      {examOpen.exam && (
        <ErrorBoundary>
          <Suspense fallback={null}><ExamHost exam={examOpen.exam} onClose={examOpen.close} /></Suspense>
        </ErrorBoundary>
      )}
      {/* the superadmins' floating cog: opens „ავტომატური პროგრამა“ over the page it is on (plan 2.0, prototype 15) */}
      {isSuperAdmin && !assistantOpen.assistant && (
        <ErrorBoundary>
          <Suspense fallback={null}><ProgramFab /></Suspense>
        </ErrorBoundary>
      )}
      {/* „ავტომატური პროგრამა“ — the school's assistant for teachers and admins (boards x-ai-damkhmare, -gegma, -klasi) */}
      {assistantOpen.assistant && (
        <ErrorBoundary>
          <Suspense fallback={null}><AssistantHost req={assistantOpen.assistant} onClose={assistantOpen.close} /></Suspense>
        </ErrorBoundary>
      )}
      {/* „მკითხე“ — the app's helper, for everyone (boards x-ultra-mkitkhe-1…5) */}
      {mkitkheOpen.mkitkhe && (
        <ErrorBoundary>
          <Suspense fallback={null}><MkitkheHost req={mkitkheOpen.mkitkhe} onClose={mkitkheOpen.close} /></Suspense>
        </ErrorBoundary>
      )}
      {/* „ჩემი ხმა“ — what the AI teacher remembers (over the lesson, when opened from it) */}
      {myVoice.tab && (
        <ErrorBoundary>
          <Suspense fallback={null}><MyVoiceHost tab={myVoice.tab} onClose={myVoice.close} /></Suspense>
        </ErrorBoundary>
      )}

      {/* the app's own „are you sure?“ card (kit askConfirm) */}
      <ConfirmHost />
      <UndoHost />
      {/* the member's marks on their classes' programs, for the class page's "who knows this voice" (loads after the
          first screen: it needs every chant's data) */}
      <ErrorBoundary><Suspense fallback={null}><ClassMarksSync /></Suspense></ErrorBoundary>
      {/* the class program downloads by itself when it changes (signed-in members and teachers only) */}
      {user && <ErrorBoundary><Suspense fallback={null}><ProgramAutoOffline /></Suspense></ErrorBoundary>}
      {/* the Android app: widget and icon-menu buttons, the widgets' summary, things shared into the app */}
      <ErrorBoundary>
        <Suspense fallback={null}><AppLinks /></Suspense>
      </ErrorBoundary>

      {/* sign-in (Google or a link by e-mail), "საჭიროა რეგისტრაცია" for guests, and the return from the e-mail link */}
      <SignInPrompt logoUrl={currentLogo} />
      <EmailLinkFinish />

      {/* a new member's admission: „დამატება შეფერხებულია“ (and signing out) or the welcome */}
      <MembershipGate />

      {/* „აირჩიე შენი კანონი“: a class member whose psalter group gives them no kanon picks one before going on (under the
          profile form, which covers it while it is open) */}
      <ErrorBoundary>
        <Suspense fallback={null}>{membership.can('classes') && (newLook ? <KanonGateV2 /> : <KanonGate />)}</Suspense>
        {/* a chant newly learned: the moment + its share card (stage 4e, boards x-idea-barati) */}
        <Suspense fallback={null}>{newLook && <LearnedMoment />}</Suspense>
      </ErrorBoundary>

      {/* "პირველი გაცნობა": name, voice and goal, once */}
      <ErrorBoundary>
        <Suspense fallback={null}><FirstMeeting /></Suspense>
      </ErrorBoundary>

      {/* a saint's life, opened from that card, the calendar or the library */}
      <ErrorBoundary>
        <Suspense fallback={null}><SaintLifeOverlay /></Suspense>
      </ErrorBoundary>

      {/* the one search over the whole app (header button, the home field, "/" or Ctrl+K) */}
      <ErrorBoundary>
        {membership.can('search') && !newLook && <GlobalSearch />}
      </ErrorBoundary>

      {/* „სამშვილდის ღამე“ online: an invitation into a class's game room, or the way back into one's own game */}
      <ErrorBoundary>
        <Suspense fallback={null}>{membership.can('classes') && <GameInvites />}</Suspense>
      </ErrorBoundary>

      {/* the school's calls: the call screen and the incoming call (private chats and classes); and this phone rings for
          calls and shows messages with the app closed (asked once, components/calls/PhoneRingSetup) */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          {membership.can('messages') && <CallLayer logoUrl={currentLogo} />}
          {(membership.can('messages') || membership.can('classes')) && <PhoneRingSetup />}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
