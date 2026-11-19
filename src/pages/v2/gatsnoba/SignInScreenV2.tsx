import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogIn, Mail } from 'lucide-react';
import { useAuth } from '../../../context';
import { Button, Press, cx } from '../../../components/ui2';
import { FOCUS } from '../../../components/ui2/cx';
import { AppleMark } from '../../../components/access/SignInChoices';
import { isIphoneApp } from '../../../utils/iosApp';
import { SignInSheetV2 } from './SignInV2';

// Signing in, in the new look (board x-shesvla): a calm screen of its own — not a window over the blurred home. The logo,
// the school's name, one sentence, Google and e-mail as before (Apple's too in the iPhone app) and „დათვალიერება სტუმრად“,
// which only closes it. The e-mail road opens its sheet over this screen (SignInV2, board x-shesvla-elposta). The screen
// takes a history step of its own (`sgSignIn`), so the phone's back closes it.

const STEP = 'sgSignIn';

/** Signed in while the screen is open: its history step goes too (SignInPrompt calls it), so „back“ later lands on a page. */
export const dropSignInStep = () => { if (window.history.state?.[STEP]) window.history.back(); };

export const SignInScreenV2: React.FC<{ what: string; logoUrl?: string; onClose: () => void }> = ({ what, logoUrl, onClose }) => {
  const { signInWithGoogle, signInWithApple, signingIn } = useAuth();
  const [mail, setMail] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    try { if (!window.history.state?.[STEP]) window.history.pushState({ ...(window.history.state || {}), [STEP]: 1 }, ''); } catch { /* opens anyway */ }
    const onPop = (e: PopStateEvent) => { if (!e.state?.[STEP]) closeRef.current(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = prev;
    };
  }, []);

  const close = () => { if (window.history.state?.[STEP]) window.history.back(); else onClose(); };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="შესვლა"
      className="sg-in fixed inset-0 z-[85] flex flex-col overflow-y-auto overscroll-contain bg-page text-ink safe-x">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center gap-3 px-7 pt-[max(24px,env(safe-area-inset-top))] pb-[max(30px,env(safe-area-inset-bottom))] text-center">
        {logoUrl && (
          <img src={logoUrl} alt="საგანძურის სკოლის ლოგო" referrerPolicy="no-referrer"
            className="mb-1.5 size-28 shrink-0 rounded-card bg-surf object-cover" />
        )}
        <h1 className="text-hero font-bold tracking-tight">საგანძურის სკოლა</h1>
        {what && <p className="text-body leading-normal font-semibold wrap-break-word">„{what}“ წევრებისთვისაა.</p>}
        <p className="mb-3.5 text-body leading-normal text-mut">შედი და შენი გალობა, ჩვევები და კლასი თან გექნება.</p>

        <div className="flex w-full flex-col gap-2.5">
          <Button full icon={<LogIn />} onClick={() => void signInWithGoogle()} disabled={signingIn}>
            {signingIn ? 'შესვლა…' : 'შესვლა Google-ით'}
          </Button>
          {isIphoneApp() && (
            <Press onClick={() => void signInWithApple()} disabled={signingIn}
              className={cx('inline-flex h-tap-lg w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink pr-5 pl-4 text-body font-bold text-white transition select-none active:scale-[0.97] disabled:opacity-50', FOCUS)}>
              <AppleMark />
              შესვლა Apple-ით
            </Press>
          )}
          <Button full kind="ghost" icon={<Mail />} onClick={() => setMail(true)}>შესვლა ელფოსტით</Button>
        </div>
        <Press onClick={close}
          className={cx('mt-1 flex h-tap cursor-pointer items-center rounded-full px-4 text-body font-semibold text-mut transition active:bg-soft', FOCUS)}>
          დათვალიერება სტუმრად
        </Press>
      </div>
      {mail && <SignInSheetV2 what="" email onClose={() => setMail(false)} />}
    </div>,
    document.body,
  );
};
