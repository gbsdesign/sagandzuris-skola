import React, { useEffect, useState } from 'react';
import { ArrowLeft, LogIn, Mail, MailCheck, Send } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn } from '../ui/kit';
import { emailLinkError, looksLikeEmail, rememberedEmail, sendEmailLink } from '../../utils/emailLink';
import { isIphoneApp } from '../../utils/iosApp';

// The two ways in: the Google account, or a link sent to any e-mail address (no password). Large type and
// plain words: many who use the e-mail road are older members of the psalter group. In the iPhone app Apple's own
// sign-in stands beside Google's, as big (the App Store asks it of every app with a Google sign-in).

const AppleMark: React.FC = () => (
  <svg viewBox="0 0 17 20" aria-hidden="true" className="w-[18px] h-[18px] fill-current">
    <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.8 1.1 7.4c-1.9 3.2-.5 8 1.3 10.6.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.9-1.1-3-4.4zM11.5 3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" />
  </svg>
);

export const EMAIL_FIELD =
  'w-full h-12 px-4 rounded-2xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 text-[17px] text-[#2a2017] placeholder:text-[#b3a594] outline-none transition';

const RESEND_SECONDS = 60;

export type SignInStep = 'choose' | 'email' | 'sent';

/** `onStep` lets the sheet around it hide its own introduction once the e-mail road is taken. */
export const SignInChoices: React.FC<{ onStep?: (step: SignInStep) => void }> = ({ onStep }) => {
  const { signInWithGoogle, signInWithApple, signingIn } = useAuth();
  const inIosApp = isIphoneApp();
  const [step, setStep] = useState<SignInStep>('choose');
  const [email, setEmail] = useState(rememberedEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => { onStep?.(step); }, [step, onStep]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait(w => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const send = async () => {
    if (!looksLikeEmail(email)) {
      setError('ელფოსტა არასწორადაა ჩაწერილი. მაგალითად: nino@gmail.com');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendEmailLink(email);
      setStep('sent');
      setWait(RESEND_SECONDS);
    } catch (e: any) {
      setError(emailLinkError(e?.code));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'choose') {
    return (
      <div className="space-y-2.5">
        <Btn size="lg" full icon={<LogIn />} onClick={() => void signInWithGoogle()} disabled={signingIn}>
          {signingIn ? 'შესვლა…' : 'შესვლა Google-ით'}
        </Btn>
        {inIosApp && (
          <button
            type="button"
            onClick={() => void signInWithApple()}
            disabled={signingIn}
            className="w-full h-12 px-6 rounded-full bg-black text-white text-[15px] font-bold inline-flex items-center justify-center gap-2 select-none active:scale-[0.97] transition disabled:opacity-50"
          >
            <AppleMark />
            შესვლა Apple-ით
          </button>
        )}
        <Btn size="lg" kind="ghost" full icon={<Mail />} onClick={() => { setError(''); setStep('email'); }}>
          შესვლა ელფოსტით
        </Btn>
      </div>
    );
  }

  if (step === 'email') {
    return (
      <form className="space-y-3 text-left" onSubmit={e => { e.preventDefault(); void send(); }} noValidate>
        <label htmlFor="sg-signin-email" className="block text-[15px] font-bold text-[#4a3426]">
          თქვენი ელფოსტა
        </label>
        <input
          id="sg-signin-email"
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
        <Btn type="submit" size="lg" full icon={<Send />} disabled={busy}>
          {busy ? 'იგზავნება…' : 'ბმულის გაგზავნა'}
        </Btn>
        <Btn kind="ghost" full icon={<ArrowLeft />} onClick={() => { setError(''); setStep('choose'); }}>
          უკან
        </Btn>
      </form>
    );
  }

  return (
    <div className="space-y-3 text-center">
      <div className="mx-auto w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
        <MailCheck className="w-7 h-7" />
      </div>
      <div>
        <p className="font-serif-ge text-lg font-bold text-[#4a3426]">წერილი გაიგზავნა</p>
        <p className="mt-1 text-[15px] text-[#4a3426] leading-relaxed">
          გახსენით ფოსტა <span className="font-bold break-all">{email.trim().toLowerCase()}</span> და დააჭირეთ წერილში ბმულს.
        </p>
      </div>
      <p className="text-[15px] text-[#75685a] leading-relaxed">წერილი ინგლისურადაა („Sign in to …“); თუ არ ჩანს — სპამში.</p>
      {error && <p role="alert" className="text-[14px] font-semibold text-[#9b2c2c] leading-snug">{error}</p>}
      <Btn kind="soft" full disabled={wait > 0 || busy} onClick={() => void send()}>
        {busy ? 'იგზავნება…' : wait > 0 ? `ხელახლა გაგზავნა (${wait} წმ)` : 'ხელახლა გაგზავნა'}
      </Btn>
      <Btn kind="ghost" full onClick={() => { setError(''); setStep('email'); }}>
        სხვა ელფოსტა
      </Btn>
    </div>
  );
};
