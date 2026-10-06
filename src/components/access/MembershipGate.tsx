import React, { useEffect, useRef, useState } from 'react';
import { Hourglass, PartyPopper, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useMembership } from '../../utils/memberAccess';
import { Btn, Sheet } from '../ui/kit';

// What a member reads about their own admission (utils/memberAccess), mounted once in App:
// • waiting — „მიმდინარეობს დამატება“ at the top of every page (WaitingBanner);
// • refused — „დამატება შეფერხებულია“, and they are signed out; it repeats on every later sign-in;
// • let in while the app is open — a short welcome, and what was given opens at once.
// Nothing here says who decided or what was left out.

export const MembershipGate: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const { status } = useMembership();
  const [refused, setRefused] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const last = useRef(status);

  useEffect(() => {
    const before = last.current;
    last.current = status;
    if (status === 'rejected' && user) {
      setRefused(true);
      void signOutUser();
    }
    if (status === 'approved' && before === 'pending') setWelcome(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user]);

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
  if (status !== 'pending' || notes) return null;
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-2xl bg-[#fdf3dc] ring-1 ring-[#ecd39a] px-4 py-3.5 text-[#5c4413]"
    >
      <span className="w-10 h-10 shrink-0 rounded-xl bg-white/70 ring-1 ring-[#ecd39a] text-[#9a6212] flex items-center justify-center" aria-hidden>
        <Hourglass className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="font-bold text-[15px] leading-snug">მიმდინარეობს დამატება</p>
        <p className="mt-0.5 text-[14px] leading-relaxed text-[#7a5f2a]">
          ადმინისტრაცია განიხილავს თქვენს რეგისტრაციას. დადასტურებისთანავე ყველაფერი თავისით გაიხსნება.
        </p>
      </div>
    </div>
  );
};
