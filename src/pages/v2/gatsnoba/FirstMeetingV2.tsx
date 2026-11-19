import React, { useId } from 'react';
import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react';
import { Button, Choice, Dashes, Field, Helper, Press, RoundButton, Rows, SectionLabel, WrapChips } from '../../../components/ui2';
import { FOCUS } from '../../../components/ui2/cx';
import { useAccess } from '../../../hooks/useAccess';
import { openAiLesson } from '../../../components/aiLesson/open';
import { INSTRUMENTS_LIST } from '../../../data/instrumentsData';
import { ABILITY_OPTIONS, GEORGIAN_REGIONS, INTEREST_OPTIONS } from '../../../utils/profileFields';
import type { FirstMeetingState } from '../../../components/onboarding/FirstMeeting';
import { BirthFields, ErrorLine, SelectField } from '../propili/parts';

// x-gatsnoba … x-gatsnoba-7 — „პირველი გაცნობა“ in the new look: the old locked window becomes a whole screen, one question
// a screen, „შემდეგი“ at the bottom, the step back as an arrow at the top (the first step: „გამოსვლა“). The form's state and
// rules are the old one's (components/onboarding/FirstMeeting `useFirstMeeting`): every answer is required and the screen
// stays until the profile is whole. One who answers „არ ვიცი“ for the voice goes on to the AI teacher's first lesson,
// whose two-minute voice check tells it (only where the AI teacher is open for them).

type Voice = '1' | '2' | '3';

const HEADS: { title: string; text?: string }[] = [
  { title: 'ვინ ხართ?', text: 'სახელი და გვარი ქართული ასოებით.' },
  { title: 'დაბადების თარიღი', text: 'წელს სხვა წევრები ვერ ხედავენ.' },
  { title: 'სად ცხოვრობთ?' },
  { title: 'ტელეფონის ნომერი', text: 'ბავშვისთვის — მშობლის ნომერი.' },
  { title: 'შესაძლებლობები', text: 'მონიშნეთ, რაც შეგიძლიათ.' },
  { title: 'ინტერესები', text: 'მონიშნეთ, რაც გაინტერესებთ.' },
  { title: 'რომელ ხმას გალობთ?' },
];

export const FirstMeetingV2: React.FC<{ fm: FirstMeetingState }> = ({ fm }) => {
  const { step, steps, a, latin, error, saving, set, georgianOnly, toggle, toggleAbility, toggleVoice, next, back, finish, signOut, skippable, skip } = fm;
  const ai = useAccess().on('aiTeacher');
  const titleId = useId();
  const head = HEADS[step];
  const last = step === steps - 1;
  const voices: { id: Voice | 'x'; title: string; sub: string }[] = [
    { id: '1', title: 'I ხმა', sub: 'მთქმელი' },
    { id: '2', title: 'II ხმა', sub: 'მოძახილი' },
    { id: '3', title: 'III ხმა', sub: 'ბანი' },
    { id: 'x', title: 'არ ვიცი', sub: ai ? 'ხმის შემოწმება 2 წუთში გეტყვით' : 'მასწავლებელი დაგეხმარებათ' },
  ];

  const done = async () => {
    const unknown = a.voices.includes('x');
    if ((await finish()) && unknown && ai) openAiLesson();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex flex-col overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col">
        <header className="flex shrink-0 flex-col gap-2.5 px-5 pt-4">
          <Dashes total={steps} done={step + 1} label={`ნაბიჯი ${step + 1} ${steps}-დან`} />
          <div className="grid min-h-tap grid-cols-[1fr_auto_1fr] items-center">
            <span className="justify-self-start">
              {step === 0 ? (
                <Press onClick={signOut} disabled={saving}
                  className={`flex h-tap cursor-pointer items-center rounded-full pr-2 text-meta font-semibold text-mut disabled:opacity-50 ${FOCUS}`}>
                  გამოსვლა
                </Press>
              ) : (
                <RoundButton label="წინა ნაბიჯი" onClick={back} disabled={saving}><ArrowLeft /></RoundButton>
              )}
            </span>
            <span className="text-meta font-semibold text-mut tabular-nums">{step + 1} / {steps}</span>
            <span className="justify-self-end">
              {/* the last three steps may be skipped (the owner's answer, 2026-11-16 — boards x-gatsnoba-5…7) */}
              {skippable && (
                <Press onClick={() => void skip()} disabled={saving}
                  className={`flex h-tap cursor-pointer items-center rounded-full pl-2 text-meta font-semibold text-wine disabled:opacity-50 ${FOCUS}`}>
                  გამოტოვება
                </Press>
              )}
            </span>
          </div>
        </header>

        <form noValidate onSubmit={e => { e.preventDefault(); if (last) void done(); else next(); }}
          className="flex flex-1 flex-col gap-3.5 px-5 pt-3.5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <h1 id={titleId} className="text-hero leading-tight font-bold tracking-tight wrap-break-word">{head.title}</h1>
          {head.text && <p className="-mt-1 text-body text-mut">{head.text}</p>}

          {step === 0 && (
            <>
              <Field label="სახელი" placeholder="მაგ. ნინო" lang="ka" autoComplete="given-name" value={a.first} onChange={v => georgianOnly(v, 'first')} />
              <Field label="გვარი" lang="ka" autoComplete="family-name" value={a.last} onChange={v => georgianOnly(v, 'last')} />
              {latin && !error && <p className="px-1.5 text-meta font-semibold text-gold-ink">გთხოვთ, ქართული ასოებით — ჩართეთ ქართული კლავიატურა.</p>}
            </>
          )}

          {step === 1 && (
            <BirthFields value={{ day: a.day, month: a.month, year: a.year }} onChange={b => set({ day: b.day, month: b.month, year: b.year })} />
          )}

          {step === 2 && (
            <>
              <SelectField label="რეგიონი" placeholder="აირჩიეთ რეგიონი" value={a.region} onChange={v => set({ region: v })}>
                {GEORGIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </SelectField>
              <Field label="ქალაქი ან სოფელი" lang="ka" autoComplete="address-level2" value={a.city} onChange={v => set({ city: v })} />
            </>
          )}

          {step === 3 && (
            <>
              <Field label="ნომერი" type="tel" inputMode="tel" autoComplete="tel" placeholder="599 12 34 56" value={a.phone} onChange={v => set({ phone: v })} />
              <Helper icon={<Lock />}>ნომერს ხედავენ მხოლოდ თქვენი მასწავლებლები და სკოლის ადმინები.</Helper>
            </>
          )}

          {step === 4 && (
            <>
              <Rows role="group" aria-label="შესაძლებლობები">
                {ABILITY_OPTIONS.map(o => (
                  <Choice key={o.id} multi title={o.title} sub={o.sub || undefined} on={a.abilities.includes(o.id)} onClick={() => toggleAbility(o.id)} />
                ))}
              </Rows>
              {a.abilities.includes('galoba') && (
                <Field label="სად გალობთ?" placeholder="ტაძარი, ქალაქი ან სოფელი" lang="ka" value={a.chantPlace} onChange={v => set({ chantPlace: v })} />
              )}
              {a.abilities.includes('dakvra') && (
                <>
                  <SectionLabel label="რაზე უკრავთ?" />
                  <WrapChips label="რაზე უკრავთ?" items={INSTRUMENTS_LIST.map(i => ({ id: i.id, label: i.nameGe }))} value={a.instruments}
                    onChange={v => set({ instruments: v })} />
                </>
              )}
              {a.abilities.includes('skhva') && (
                <Field label="რა შეგიძლიათ?" lang="ka" value={a.abilityOther} onChange={v => set({ abilityOther: v })} />
              )}
            </>
          )}

          {step === 5 && (
            <>
              <Rows role="group" aria-label="ინტერესები">
                {INTEREST_OPTIONS.map(o => (
                  <Choice key={o.id} multi title={o.title} sub={o.sub || undefined} on={a.interests.includes(o.id)}
                    onClick={() => set({ interests: toggle(a.interests, o.id) })} />
                ))}
              </Rows>
              {a.interests.includes('skhva') && (
                <Field label="რა გაინტერესებთ?" lang="ka" value={a.interestOther} onChange={v => set({ interestOther: v })} />
              )}
            </>
          )}

          {step === 6 && (
            <Rows role="group" aria-label="ხმა">
              {voices.map(v => <Choice key={v.id} multi title={v.title} sub={v.sub} on={a.voices.includes(v.id)} onClick={() => toggleVoice(v.id)} />)}
            </Rows>
          )}

          <div className="min-h-4 flex-1" />
          {error && <ErrorLine>{error}</ErrorLine>}
          {last ? (
            <Button type="submit" full icon={<Check />} disabled={saving}>{saving ? 'ინახება…' : 'დასრულება'}</Button>
          ) : (
            <Button type="submit" full icon={<ArrowRight />}>შემდეგი</Button>
          )}
        </form>
      </div>
    </div>
  );
};
