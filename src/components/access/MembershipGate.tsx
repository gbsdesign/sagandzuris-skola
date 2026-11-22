import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Hourglass, PartyPopper, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useMembership } from '../../utils/memberAccess';
import { Btn, Sheet } from '../ui/kit';
import { WaitingText } from './SignInPrompt';
import { useNewLook } from '../../design/newLook';

// What a member reads about their own admission (utils/memberAccess), mounted once in App:
// • waiting — a thin „მიმდინარეობს დამატება“ strip at the top of every page; a tap opens the full text (WaitingBanner); the
//   new look shows one calm screen in place of the home page instead (pages/v2/gatsnoba/WaitingHome);
// • refused — „დამატება შეფერხებულია“, and they are signed out; it repeats on every later sign-in;
// • let in while the app is open — a short welcome, and what was given opens at once.
// Nothing here says who decided or what was left out.

export const MembershipGate: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const { status } = useMembership();
  const [refused, setRefused] = useState(false);
  // a superadmin stopped (a „404“, as if broken — the user's wish) or deleted the member (utils/memberRemoval.ts)
  const [stopped, setStopped] = useState<'suspended' | 'deleted' | null>(null);
  const [welcome, setWelcome] = useState(false);
  const last = useRef(status);

  useEffect(() => {
    const before = last.current;
    last.current = status;
    if (status === 'rejected' && user) {
      setRefused(true);
      void signOutUser();
    }
    if ((status === 'suspended' || status === 'deleted') && user) {
      setStopped(status);
      void signOutUser();
    }
    if (status === 'approved' && before === 'pending') setWelcome(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user]);

  if (stopped === 'suspended') {
    return (
      <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-3 bg-page px-8 text-center safe-x">
        <p className="text-hero font-bold tracking-widest text-mut">404</p>
        <p className="text-lead font-bold text-ink">გვერდი ვერ ჩაიტვირთა</p>
        <p className="max-w-xs text-body text-mut">მოხდა ტექნიკური ხარვეზი. გთხოვთ, სცადოთ მოგვიანებით.</p>
        <button type="button" onClick={() => window.location.reload()}
          className="mt-2 h-tap cursor-pointer rounded-full bg-surf px-6 text-body font-semibold text-ink ring-1 ring-line">თავიდან ცდა</button>
      </div>
    );
  }
  if (stopped === 'deleted') {
    return (
      <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-3 bg-page px-8 text-center safe-x">
        <ShieldAlert className="size-12 text-wine" aria-hidden="true" />
        <p className="text-title font-bold text-ink">თქვენი ანგარიში წაშლილია</p>
        <p className="max-w-xs text-body text-mut">ანგარიში სკოლიდან წაიშალა. კითხვის შემთხვევაში დაუკავშირდით სკოლის ადმინისტრაციას.</p>
        <button type="button" onClick={() => setStopped(null)}
          className="mt-2 h-tap cursor-pointer rounded-full bg-surf px-6 text-body font-semibold text-ink ring-1 ring-line">გასაგებია</button>
      </div>
    );
  }

  if (refused) {
    return (
      <Sheet open onClose={() => setRefused(false)} title="დამატება შეფერხებულია" footer={<Btn size="lg" full onClick={() => setRefused(false)}>გასაგებია</Btn>}>
        <div className="text-center py-1">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-[#9b2c2c]/[0.08] text-[#9b2c2c] flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <p className="mt-4 font-serif-ge text-lg font-bold text-[#4a3426]">თქვენი დამატება შეფერხებულია</p>
          <p className="mt-1.5 text-[15px] text-[#75685a] leading-relaxed max-w-sm mx-auto">
            ამჟამად სკოლაში დამატება ვერ მოხერხდა, ამიტომ ანგარიშიდან გამოხვედით. თქვენი მონაცემები შენახულია.
            კითხვის შემთხვევაში დაუკავშირდით სკოლის ადმინისტრაციას.
          </p>
        </div>
      </Sheet>
    );
  }

  if (welcome && user) {
    return (
      <Sheet open onClose={() => setWelcome(false)} title="მოგესალმებით!" footer={<Btn size="lg" full onClick={() => setWelcome(false)}>დავიწყოთ</Btn>}>
        <div className="text-center py-1">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-[#2f6b3a]/[0.09] text-[#2f6b3a] flex items-center justify-center">
            <PartyPopper className="w-8 h-8" />
          </div>
          <p className="mt-4 font-serif-ge text-lg font-bold text-[#4a3426]">თქვენ დაემატეთ საგანძურის სკოლას</p>
          <p className="mt-1.5 text-[15px] text-[#75685a] leading-relaxed max-w-sm mx-auto">
            დამატება დასრულდა — თქვენი განყოფილებები უკვე გაიხსნა.
          </p>
        </div>
      </Sheet>
    );
  }

  return null;
};

/** „მიმდინარეობს დამატება“ above the page while a superadmin has not decided yet. */
export const WaitingBanner: React.FC = () => {
  const { status } = useMembership();
  const { notes } = useNotes();
  const [open, setOpen] = useState(false);
  // the new look says it once, in place of the home page (pages/v2/gatsnoba/WaitingHome)
  const nl = useNewLook();
  if (status !== 'pending' || notes || nl) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 w-full min-h-11 flex items-center gap-2.5 rounded-2xl bg-[#fdf3dc] ring-1 ring-[#ecd39a] px-4 py-2 text-left text-[#5c4413] cursor-pointer hover:bg-[#fbedcb] transition-colors"
      >
        <Hourglass className="w-[18px] h-[18px] shrink-0 text-[#9a6212]" aria-hidden />
        <span className="flex-1 min-w-0 font-bold text-[14.5px] leading-snug">მიმდინარეობს დამატება</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-[#9a6212]" aria-hidden />
      </button>
      {open && (
        <Sheet open onClose={() => setOpen(false)} title="მიმდინარეობს დამატება" footer={<Btn size="lg" full onClick={() => setOpen(false)}>კარგი</Btn>}>
          <WaitingText />
        </Sheet>
      )}
    </>
  );
};
