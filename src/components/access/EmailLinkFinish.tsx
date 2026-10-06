import React, { useEffect, useRef, useState } from 'react';
import { Loader2, LogIn, MailWarning } from 'lucide-react';
import { auth } from '../../firebase';
import { Btn, Sheet } from '../ui/kit';
import { EMAIL_FIELD } from './SignInChoices';
import { openSignIn } from './SignInPrompt';
import {
  dropLinkFromAddress, emailLinkError, finishEmailLink, looksLikeEmail, openedFromEmailLink, rememberedEmail,
} from '../../utils/emailLink';

// The page was opened from the sign-in letter: finish the sign-in. On the same device the remembered address
// is used at once; in another browser the person types the address again. Mounted once in App.

type State = 'off' | 'working' | 'ask' | 'error';

export const EmailLinkFinish: React.FC = () => {
  const [state, setState] = useState<State>(() => (openedFromEmailLink() ? 'working' : 'off'));
  const [email, setEmail] = useState(rememberedEmail);
  const [error, setError] = useState('');
  const started = useRef(false);

  const finish = async (address: string) => {
    setState('working');
    setError('');
    try {
      await finishEmailLink(address);
      setState('off');
    } catch (e: any) {
      const code = e?.code;
      if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
        dropLinkFromAddress();
        // an old letter tapped again by someone already inside: nothing to say
        if (auth.currentUser) { setState('off'); return; }
        setError(emailLinkError(code));
        setState('error');
        return;
      }
      setError(code === 'auth/invalid-email'
        ? 'ეს ელფოსტა არ ემთხვევა იმას, რომელზეც ბმული გაიგზავნა.'
        : emailLinkError(code));
      setState('ask');
    }
  };

  useEffect(() => {
    if (state !== 'working' || started.current) return;
    started.current = true;
    const saved = rememberedEmail();
    if (saved) void finish(saved);
    else setState('ask');
  }, []);

  if (state === 'off') return null;

  const close = () => {
    if (state === 'working') return;
    dropLinkFromAddress();
    setState('off');
  };

  return (
    <Sheet open onClose={close} title="შესვლა ელფოსტით">
      {state === 'working' && (
        <div className="py-8 flex flex-col items-center gap-3 text-[#4a3426]">
          <Loader2 className="w-8 h-8 animate-spin text-[#7a2028]" />
          <p className="text-[16px] font-semibold">შესვლა…</p>
        </div>
      )}

      {state === 'ask' && (
        <form
          className="space-y-3 text-left py-1"
          noValidate
          onSubmit={e => {
            e.preventDefault();
            if (looksLikeEmail(email)) void finish(email);
            else setError('ელფოსტა არასწორადაა ჩაწერილი.');
          }}
        >
          <p className="text-[15px] text-[#4a3426] leading-relaxed">
            ბმული სხვა ბრაუზერში ან სხვა ტელეფონზე გაიხსნა. დასადასტურებლად ჩაწერეთ ელფოსტა, რომელზეც ის მოვიდა.
          </p>
          <label htmlFor="sg-finish-email" className="block text-[15px] font-bold text-[#4a3426]">თქვენი ელფოსტა</label>
          <input
            id="sg-finish-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="nino@gmail.com"
            className={EMAIL_FIELD}
          />
          {error && <p role="alert" className="text-[14px] font-semibold text-[#9b2c2c] leading-snug">{error}</p>}
          <Btn type="submit" size="lg" full icon={<LogIn />}>შესვლა</Btn>
        </form>
      )}

      {state === 'error' && (
        <div className="space-y-4 py-1 text-center">
          <div className="mx-auto w-14 h-14 rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <MailWarning className="w-7 h-7" />
          </div>
          <p className="text-[15px] text-[#4a3426] leading-relaxed">{error}</p>
          <Btn size="lg" full onClick={() => { setState('off'); openSignIn(); }}>ახალი ბმულის მოთხოვნა</Btn>
          <Btn kind="ghost" full onClick={close}>დახურვა</Btn>
        </div>
      )}
    </Sheet>
  );
};
