import React, { useEffect, useState } from 'react';
import { Hourglass, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn, Sheet } from '../ui/kit';
import { SignInChoices, SignInStep } from './SignInChoices';

// The sign-in sheet, mounted once in App: Google or a link by e-mail (SignInChoices).
// askSignIn('ბიბლიოთეკა') — "საჭიროა რეგისტრაცია": guests see these sections' buttons, but opening one asks them to sign in.
// openSignIn() — the plain "შესვლა" from the header.
// A member who signed in but waits for a superadmin (utils/memberAccess) gets „მიმდინარეობს დამატება“ instead.
const EVENT = 'sg-ask-sign-in';

export const askSignIn = (what: string) => window.dispatchEvent(new CustomEvent(EVENT, { detail: what || 'ეს განყოფილება' }));
export const openSignIn = () => window.dispatchEvent(new CustomEvent(EVENT, { detail: '' }));

export const SignInPrompt: React.FC = () => {
  const { user } = useAuth();
  // null = closed; '' = plain sign-in; otherwise the locked section's name
  const [what, setWhat] = useState<string | null>(null);
  const [step, setStep] = useState<SignInStep>('choose');
  useEffect(() => {
    const on = (e: Event) => { setStep('choose'); setWhat((e as CustomEvent<string>).detail ?? ''); };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => { if (user) setWhat(null); }, [user]);
  if (what === null) return null;
  if (user) {
    return (
      <Sheet open onClose={() => setWhat(null)} title="მიმდინარეობს დამატება" footer={<Btn size="lg" full onClick={() => setWhat(null)}>კარგი</Btn>}>
        <WaitingText />
      </Sheet>
    );
  }
  const locked = what !== '';
  return (
    <Sheet open onClose={() => setWhat(null)} title={locked ? 'საჭიროა რეგისტრაცია' : 'შესვლა'}>
      <div className="space-y-4 py-1">
        {step === 'choose' && <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center">
            {locked ? <Lock className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
          </div>
          {locked && <p className="mt-4 font-serif-ge text-lg font-bold text-[#4a3426]">„{what}“</p>}
          <p className="mt-1.5 text-[15px] text-[#75685a] leading-relaxed max-w-sm mx-auto">
            {locked
              ? 'ეს ნაწილი რეგისტრირებული წევრებისთვისაა. შედით Google-ის ანგარიშით ან ელფოსტით — უფასოა.'
              : 'შედით, რომ თქვენი სწავლა და ჩანიშვნები ყველა მოწყობილობაზე შეინახოს. უფასოა.'}
          </p>
        </div>}
        <SignInChoices onStep={setStep} />
      </div>
    </Sheet>
  );
};

/** „მიმდინარეობს დამატება“: what a member waiting for a superadmin reads. */
export const WaitingText: React.FC = () => (
  <div className="text-center py-1">
    <div className="mx-auto w-16 h-16 rounded-3xl bg-[#b7791f]/[0.1] text-[#9a6212] flex items-center justify-center">
      <Hourglass className="w-8 h-8" />
    </div>
    <p className="mt-4 font-serif-ge text-lg font-bold text-[#4a3426]">თქვენი დამატება მიმდინარეობს</p>
    <p className="mt-1.5 text-[15px] text-[#75685a] leading-relaxed max-w-sm mx-auto">
      სკოლის ადმინისტრაცია განიხილავს თქვენს რეგისტრაციას. დადასტურებისთანავე ყველაფერი თავისით გაიხსნება — ხელახლა
      შესვლა არ დაგჭირდებათ. მანამდე შეგიძლიათ ისარგებლოთ ღია ნაწილებით.
    </p>
  </div>
);

/** In place of a page a guest may not open (e.g. after a reload). */
export const LockedPage: React.FC<{ what: string }> = ({ what }) => useAuth().user ? (
  <div className="w-full max-w-sm mx-auto py-16 px-4"><WaitingText /></div>
) : (
  <div className="w-full max-w-sm mx-auto py-16 px-4 text-center space-y-4">
    <div className="mx-auto w-16 h-16 rounded-3xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Lock className="w-8 h-8" /></div>
    <p className="font-serif-ge text-xl font-bold text-[#4a3426]">„{what}“ — მხოლოდ წევრებისთვის</p>
    <p className="text-[15px] text-[#75685a]">შედით Google-ით ან ელფოსტით, რომ ეს ნაწილი გაიხსნას.</p>
    <SignInChoices />
  </div>
);
