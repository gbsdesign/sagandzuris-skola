import React, { useLayoutEffect } from 'react';
import { ArrowRight, Loader2, Lock, LogIn, Mail, MailCheck, Send } from 'lucide-react';
import { useAuth } from '../../../context';
import { Button, Field, H2, Helper, Press, Sheet } from '../../../components/ui2';
import { FOCUS } from '../../../components/ui2/cx';
import { AppleMark, useEmailSignIn } from '../../../components/access/SignInChoices';
import type { useEmailLinkFinish } from '../../../components/access/EmailLinkFinish';
import { isIphoneApp } from '../../../utils/iosApp';

// Signing in, in the new look: the sheet of the two ways in (Google, or a link by e-mail — and Apple's in the iPhone app),
// the e-mail step (board x-shesvla-elposta: one field, one sentence on what comes next, one button; ✕ closes, no „უკან“),
// the letter sent; and the return from the letter (x-elposta-bolo: opened on another phone or browser — the address once
// more; x-elposta-dzveli: an old link). The logic is the old windows' (components/access/SignInChoices `useEmailSignIn`,
// EmailLinkFinish `useEmailLinkFinish`).

/** A big round mark over a sheet's words. */
const Mark: React.FC<{ children: React.ReactNode; tone?: 'tint' | 'leaf' }> = ({ children, tone = 'tint' }) => (
  <span aria-hidden="true" className={`mx-auto flex size-16 shrink-0 items-center justify-center rounded-full [&_svg]:size-7 ${
    tone === 'leaf' ? 'bg-leaf-tint text-leaf-ink' : 'bg-tint text-wine'}`}>
    {children}
  </span>
);

/** The sign-in sheet. `what`: '' = the plain „შესვლა“, else the name of the part a guest tried to open. `email`: straight to
 *  the e-mail step (the sign-in screen's „შესვლა ელფოსტით“ — SignInScreenV2). */
export const SignInSheetV2: React.FC<{ what: string; onClose: () => void; email?: boolean }> = ({ what, onClose, email: byEmail }) => {
  const { signInWithGoogle, signInWithApple, signingIn } = useAuth();
  const { step, setStep, email, setEmail, busy, error, setError, wait, send } = useEmailSignIn();
  useLayoutEffect(() => { if (byEmail) setStep('email'); }, [byEmail, setStep]);
  const locked = what !== '';
  const title = step === 'choose' ? (locked ? 'საჭიროა რეგისტრაცია' : 'შესვლა') : 'შესვლა ელფოსტით';

  return (
    <Sheet open title={title} onClose={onClose}>
      {step === 'choose' && (
        <>
          <Mark>{locked ? <Lock /> : <LogIn />}</Mark>
          <div className="text-center">
            {locked && <H2 flush>„{what}“ — მხოლოდ წევრებისთვის</H2>}
            <p className="mt-1 text-body text-mut">Google-ით ან ელფოსტით, პაროლის გარეშე.</p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button full icon={<LogIn />} onClick={() => void signInWithGoogle()} disabled={signingIn}>
              {signingIn ? 'შესვლა…' : 'შესვლა Google-ით'}
            </Button>
            {isIphoneApp() && (
              <Press onClick={() => void signInWithApple()} disabled={signingIn}
                className={`inline-flex h-tap-lg w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink pr-5 pl-4 text-body font-bold text-white transition select-none active:scale-[0.97] disabled:opacity-50 ${FOCUS}`}>
                <AppleMark />
                შესვლა Apple-ით
              </Press>
            )}
            <Button full kind="ghost" icon={<Mail />} onClick={() => { setError(''); setStep('email'); }}>შესვლა ელფოსტით</Button>
          </div>
        </>
      )}

      {step === 'email' && (
        <form className="flex flex-col gap-3" noValidate onSubmit={e => { e.preventDefault(); void send(); }}>
          <Field label="ელფოსტა" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off"
            spellCheck={false} autoFocus placeholder="nino@gmail.com" value={email} onChange={v => { setEmail(v); setError(''); }} />
          {error
            ? <p role="alert" className="px-1.5 text-meta leading-normal font-semibold text-danger">{error}</p>
            : <Helper icon={<Mail />}>წერილში ბმული მოგივა. პაროლი არ გჭირდება.</Helper>}
          <Button type="submit" full icon={<Send />} disabled={busy} className="mt-10">{busy ? 'იგზავნება…' : 'ბმულის გაგზავნა'}</Button>
        </form>
      )}

      {step === 'sent' && (
        <>
          <Mark tone="leaf"><MailCheck /></Mark>
          <div className="text-center">
            <H2 flush>წერილი გაიგზავნა</H2>
            <p className="mt-1 text-body leading-normal text-ink">
              გახსენი ფოსტა <b className="break-all">{email.trim().toLowerCase()}</b> და დააჭირე წერილში ბმულს.
            </p>
            <p className="mt-1 text-body leading-normal text-mut">წერილი ინგლისურადაა („Sign in to …“); თუ არ ჩანს — სპამში.</p>
          </div>
          {error && <p role="alert" className="text-center text-meta font-semibold text-danger">{error}</p>}
          <div className="flex flex-col gap-2 pt-2">
            <Button full kind="soft" disabled={wait > 0 || busy} onClick={() => void send()}>
              {busy ? 'იგზავნება…' : wait > 0 ? `ხელახლა გაგზავნა (${wait} წმ)` : 'ხელახლა გაგზავნა'}
            </Button>
            <Button full kind="quiet" onClick={() => { setError(''); setStep('email'); }}>სხვა ელფოსტა</Button>
          </div>
        </>
      )}
    </Sheet>
  );
};

/** The letter's link, opened: signing in (same phone), the address once more (another one), or an old link. */
export const EmailLinkFinishV2: React.FC<{ f: ReturnType<typeof useEmailLinkFinish> }> = ({ f }) => {
  const { state, email, setEmail, error, setError, close, submit, again } = f;
  return (
    <Sheet open title="შესვლა ელფოსტით" onClose={close}>
      {state === 'working' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 aria-hidden="true" className="size-8 animate-spin text-wine" />
          <p className="text-lead font-semibold">შესვლა…</p>
        </div>
      )}

      {state === 'ask' && (
        <form className="flex flex-col gap-3" noValidate onSubmit={e => { e.preventDefault(); submit(); }}>
          <p className="px-1 text-body leading-normal text-ink">
            ბმული სხვა ტელეფონზე ან სხვა ბრაუზერში გახსენი. ჩაწერე ელფოსტა, რომელზეც წერილი მოვიდა.
          </p>
          <Field label="ელფოსტა" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off"
            spellCheck={false} autoFocus placeholder="მისამართი" value={email} onChange={v => { setEmail(v); setError(''); }} />
          {error && <p role="alert" className="px-1.5 text-meta leading-normal font-semibold text-danger">{error}</p>}
          <Button type="submit" full icon={<ArrowRight />} className="mt-6">შესვლა</Button>
        </form>
      )}

      {state === 'error' && (
        <>
          <Mark><Mail /></Mark>
          <div className="text-center">
            <H2 flush>ეს ბმული ძველია</H2>
            <p className="mt-1 text-body leading-normal text-mut">უკვე გამოყენებულია ან ვადა გაუვიდა. მოითხოვე ახალი.</p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button full icon={<Send />} onClick={again}>ახალი ბმულის მოთხოვნა</Button>
            <Button full kind="ghost" onClick={close}>დახურვა</Button>
          </div>
        </>
      )}
    </Sheet>
  );
};
