import React, { useEffect, useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn, Sheet } from '../ui/kit';

// "საჭიროა რეგისტრაცია": guests see these sections' buttons, but opening one asks them to sign in.
// askSignIn('ბიბლიოთეკა') from anywhere opens the one prompt mounted in App.
const EVENT = 'sg-ask-sign-in';

export const askSignIn = (what: string) => window.dispatchEvent(new CustomEvent(EVENT, { detail: what }));

export const SignInPrompt: React.FC = () => {
  const { user, signInWithGoogle, signingIn } = useAuth();
  const [what, setWhat] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setWhat((e as CustomEvent<string>).detail || 'ეს განყოფილება');
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => { if (user) setWhat(null); }, [user]);
  if (!what) return null;
  return (
    <Sheet open onClose={() => setWhat(null)} title="საჭიროა რეგისტრაცია">
      <div className="text-center space-y-4 py-1">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Lock className="w-8 h-8" /></div>
        <div>
          <p className="font-serif-ge text-lg font-bold text-[#4a3426]">„{what}“</p>
          <p className="mt-1.5 text-sm text-[#75685a] leading-relaxed max-w-sm mx-auto">
            ეს ნაწილი რეგისტრირებული წევრებისთვისაა. შედი Google-ის ანგარიშით — უფასოა და ერთ წამს წაიღებს.
          </p>
        </div>
        <Btn size="lg" full icon={<LogIn />} onClick={() => void signInWithGoogle()} disabled={signingIn}>
          {signingIn ? 'შესვლა…' : 'შესვლა Google-ით'}
        </Btn>
        <Btn kind="ghost" full onClick={() => setWhat(null)}>არა ახლა</Btn>
      </div>
    </Sheet>
  );
};

/** In place of a page a guest may not open (e.g. after a reload). */
export const LockedPage: React.FC<{ what: string }> = ({ what }) => {
  const { signInWithGoogle, signingIn } = useAuth();
  return (
    <div className="w-full max-w-md mx-auto py-16 px-4 text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-3xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Lock className="w-8 h-8" /></div>
      <p className="font-serif-ge text-xl font-bold text-[#4a3426]">„{what}“ — მხოლოდ წევრებისთვის</p>
      <p className="text-sm text-[#75685a]">შედი Google-ის ანგარიშით, რომ ეს ნაწილი გაიხსნას.</p>
      <Btn size="lg" icon={<LogIn />} onClick={() => void signInWithGoogle()} disabled={signingIn}>{signingIn ? 'შესვლა…' : 'შესვლა Google-ით'}</Btn>
    </div>
  );
};
