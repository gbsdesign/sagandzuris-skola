import React, { useState } from 'react';
import { CalendarClock, Lock, Music2 } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Button, Dot, Field, Helper, Row, Rows, Sheet, TopBar, Val } from '../../../components/ui2';
import { useMembership } from '../../../utils/memberAccess';
import { isGeorgian } from '../../../utils/memberName';
import { MONTHS_GE } from '../../../utils/dateNames';
import {
  ABILITY_OPTIONS, BirthDate, GEORGIAN_REGIONS, abilitiesOf, isPlaceholderBirth, normalizePhone, showPhone, validBirth,
} from '../../../utils/profileFields';
import { WORK_DAYS, hoursOf } from '../../../components/views/WorkScheduleEditor';
import { BirthFields, ErrorLine, SelectField } from './parts';
import { VOICE_NAMES, saveName, saveProfileFields, useProfileDoc } from './profileStore';

// x-piradi-inpormatsia — „პირადი ინფორმაცია“ (profile mapItem `info`): six rows instead of nine fields; a tap opens only
// the one being changed, in a window with its own „შენახვა“. The rules are „პირველი გაცნობა“'s: the name in Georgian
// letters, a region of the list and a town or village, a phone that is one, a whole birth date — so saving never leaves
// the profile incomplete. Under them the two other parts of the old profile card's details: singing and interests, the
// work timetable.

type Edit = null | 'first' | 'last' | 'church' | 'place' | 'phone' | 'birth';

const NOT_GEORGIAN = /[^ა-ჿᲐ-Ჿ\s-]/g;
const georgianOnly = (v: string) => v.replace(NOT_GEORGIAN, '').replace(/\s{2,}/g, ' ');

const EditSheet: React.FC<{
  title: string; open: boolean; onClose: () => void; busy: boolean; error: string; onSave: () => void; children: React.ReactNode;
}> = ({ title, open, onClose, busy, error, onSave, children }) => (
  <Sheet open={open} title={title} onClose={onClose}>
    <form className="flex flex-col gap-3" noValidate onSubmit={e => { e.preventDefault(); onSave(); }}>
      {children}
      {error && <ErrorLine>{error}</ErrorLine>}
      <Button type="submit" full disabled={busy} className="mt-2">{busy ? 'ინახება…' : 'შენახვა'}</Button>
    </form>
  </Sheet>
);

export const PersonalInfo: React.FC = () => {
  const { user } = useAuth();
  const { handleGoBack, openMapItem } = useNavigation();
  const waiting = useMembership().status === 'pending';
  const me = useProfileDoc();
  const p = me.profile;
  const [edit, setEdit] = useState<Edit>(null);
  const [text, setText] = useState('');
  const [region, setRegion] = useState('');
  const [birth, setBirth] = useState<BirthDate>({ day: 0, month: 0, year: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;
  // the old starting value (1 January 2000) that many saved without choosing shows as not chosen yet
  const birthUnset = !me.met && isPlaceholderBirth(p.birthDate);
  const birthText = p.birthDate && validBirth(p.birthDate) && !birthUnset
    ? `${p.birthDate.day} ${MONTHS_GE[p.birthDate.month - 1]} ${p.birthDate.year}` : 'არ არის';
  const place = [p.city, p.region].filter(Boolean).join(', ');
  const phone = showPhone(p.phone);

  const open = (e: Exclude<Edit, null>) => {
    setError('');
    if (e === 'first') setText(p.firstName || '');
    if (e === 'last') setText(p.lastName || '');
    if (e === 'church') setText(p.churchName || '');
    if (e === 'place') { setRegion(p.region || ''); setText(p.city || ''); }
    if (e === 'phone') setText(phone);
    if (e === 'birth') setBirth(p.birthDate && !birthUnset ? { ...p.birthDate } : { day: 0, month: 0, year: 0 });
    setEdit(e);
  };

  const run = async (job: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await job(); setEdit(null); } catch { setError('ვერ შეინახა — შეამოწმე ინტერნეტი და სცადე თავიდან.'); }
    setBusy(false);
  };

  const save = () => {
    const names = { firstName: (p.firstName || '').trim(), lastName: (p.lastName || '').trim(), churchName: (p.churchName || '').trim() };
    const v = text.trim();
    if (edit === 'first' || edit === 'last') {
      if (!isGeorgian(v)) { setError('ჩაწერე ქართული ასოებით.'); return; }
      void run(() => saveName(user, { ...names, [edit === 'first' ? 'firstName' : 'lastName']: v }, me.photo));
    } else if (edit === 'church') {
      if (v && !isGeorgian(v)) { setError('ჩაწერე ქართული ასოებით — ან დატოვე ცარიელი.'); return; }
      void run(() => saveName(user, { ...names, churchName: v }, me.photo));
    } else if (edit === 'place') {
      if (!GEORGIAN_REGIONS.includes(region)) { setError('აირჩიე რეგიონი.'); return; }
      if (v.length < 2) { setError('ჩაწერე ქალაქი ან სოფელი.'); return; }
      void run(() => saveProfileFields(user, p, { region, city: v }));
    } else if (edit === 'phone') {
      const n = normalizePhone(v);
      if (!n) { setError('ჩაწერე ტელეფონის ნომერი, მაგალითად: 599 12 34 56'); return; }
      void run(() => saveProfileFields(user, p, { phone: n }));
    } else if (edit === 'birth') {
      if (!validBirth(birth)) { setError('აირჩიე რიცხვი, თვე და წელი.'); return; }
      void run(() => saveProfileFields(user, p, { birthDate: birth }));
    }
  };

  // what the two other parts say while closed (as the old card's folds)
  const voices = (Array.isArray(p.voices) ? p.voices : []).map(x => VOICE_NAMES[x]).filter(Boolean);
  const abilities = ABILITY_OPTIONS.filter(a => abilitiesOf(p).includes(a.id)).map(a => a.title);
  const singing = [...voices, ...abilities].join(' · ') || 'ხმა, შესაძლებლობები, ინტერესები';
  const days = WORK_DAYS.filter(d => hoursOf(p.workSchedule, d.id).length > 0);
  const schedule = days.length ? days.map(d => d.short).join(', ') : 'დღეები ჯერ არ არის არჩეული';
  const close = () => setEdit(null);
  const loaded = me.data !== undefined;

  return (
    <div className="flex w-full flex-col gap-3 pb-5">
      <TopBar title="პირადი ინფორმაცია" onBack={handleGoBack} />
      <Rows aria-busy={!loaded}>
        <Row title="სახელი" right={<Val>{p.firstName || 'არ არის'}</Val>} onClick={() => open('first')} />
        <Row title="გვარი" right={<Val>{p.lastName || 'არ არის'}</Val>} onClick={() => open('last')} />
        <Row title="ნათლობის სახელი" right={<Val>{p.churchName || 'არ არის'}</Val>} onClick={() => open('church')} />
        <Row title="სად ვცხოვრობ" right={<Val>{place || 'არ არის'}</Val>} onClick={() => open('place')} />
        <Row title="ტელეფონი" right={<Val>{phone || 'არ არის'}</Val>} onClick={() => open('phone')} />
        <Row title="დაბადების დღე" right={<Val>{birthText}</Val>} onClick={() => open('birth')} />
      </Rows>
      <Helper icon={<Lock />}>ნომერს ხედავენ მხოლოდ შენი მასწავლებლები და სკოლის ადმინები.</Helper>

      <Rows className="mt-2">
        <Row lead={<Dot icon={<Music2 />} />} title="გალობა და ინტერესები" sub={singing} onClick={() => openMapItem('galoba')} />
        {!waiting && <Row lead={<Dot icon={<CalendarClock />} />} title="მუშაობის განრიგი" sub={schedule} onClick={() => openMapItem('ganrigi')} />}
      </Rows>

      <EditSheet title="სახელი" open={edit === 'first'} onClose={close} busy={busy} error={error} onSave={save}>
        <Field label="სახელი" value={text} onChange={v => { setText(georgianOnly(v)); setError(''); }} lang="ka" autoComplete="given-name" autoFocus
          hint="ქართული ასოებით — ასე გამოჩნდები ჯგუფში და მოსახსენებელში." />
      </EditSheet>
      <EditSheet title="გვარი" open={edit === 'last'} onClose={close} busy={busy} error={error} onSave={save}>
        <Field label="გვარი" value={text} onChange={v => { setText(georgianOnly(v)); setError(''); }} lang="ka" autoComplete="family-name" autoFocus />
      </EditSheet>
      <EditSheet title="ნათლობის სახელი" open={edit === 'church'} onClose={close} busy={busy} error={error} onSave={save}>
        <Field label="სახელი მოსახსენებლად" value={text} onChange={v => { setText(georgianOnly(v)); setError(''); }} lang="ka" autoFocus
          placeholder={p.firstName || 'მაგ. ნინო'} hint="თუ ნათლობის სახელი სხვაა. ცარიელი — მოსახსენებელში სახელი ჩაიწერება." />
      </EditSheet>
      <EditSheet title="სად ვცხოვრობ" open={edit === 'place'} onClose={close} busy={busy} error={error} onSave={save}>
        <SelectField label="რეგიონი" placeholder="აირჩიე რეგიონი" value={region} onChange={v => { setRegion(v); setError(''); }}>
          {/* an old free-text region stays visible until another is chosen */}
          {[...GEORGIAN_REGIONS, ...(region && !GEORGIAN_REGIONS.includes(region) ? [region] : [])].map(r => <option key={r} value={r}>{r}</option>)}
        </SelectField>
        <Field label="ქალაქი ან სოფელი" value={text} onChange={v => { setText(v); setError(''); }} lang="ka" autoComplete="address-level2" />
      </EditSheet>
      <EditSheet title="ტელეფონი" open={edit === 'phone'} onClose={close} busy={busy} error={error} onSave={save}>
        <Field label="ნომერი" type="tel" inputMode="tel" autoComplete="tel" placeholder="599 12 34 56" value={text} autoFocus
          onChange={v => { setText(v); setError(''); }} hint="ბავშვისთვის — მშობლის ნომერი." />
      </EditSheet>
      <EditSheet title="დაბადების დღე" open={edit === 'birth'} onClose={close} busy={busy} error={error} onSave={save}>
        <BirthFields value={birth} onChange={b => { setBirth(b); setError(''); }} />
      </EditSheet>
    </div>
  );
};
