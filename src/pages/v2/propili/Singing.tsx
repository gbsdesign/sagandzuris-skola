import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Field, Note, Press, SectionLabel, TopBar, WrapChips, cx } from '../../../components/ui2';
import { FOCUS } from '../../../components/ui2/cx';
import { INSTRUMENTS_LIST } from '../../../data/instrumentsData';
import {
  ABILITY_OPTIONS, AbilityId, INTEREST_OPTIONS, InterestId, abilitiesDone, abilitiesOf, interestsDone, profileComplete,
} from '../../../utils/profileFields';
import { ErrorLine } from './parts';
import { ProfileFields, saveProfileFields, useProfileDoc } from './profileStore';

// x-galoba-interesebi — „გალობა და ინტერესები“ (profile mapItem `galoba`): what I can do (with where I chant, what I play,
// or my own words), my voice, what interests me — the same answers as „პირველი გაცნობა“. A choice is kept at once (no
// „შენახვა“); a written line when the field is left. A part waits unsaved while its answer is not whole (galoba with no
// place, nothing chosen…) — a save must never leave the profile incomplete, or „პირველი გაცნობა“ would cover the screen.

type Voice = '1' | '2' | '3';
const VOICES: { id: Voice | 'x'; label: string }[] = [
  { id: '1', label: 'I ხმა' }, { id: '2', label: 'II ხმა' }, { id: '3', label: 'III ხმა' }, { id: 'x', label: 'არ ვიცი' },
];

interface Draft {
  abilities: AbilityId[];
  chantPlace: string;
  instruments: string[];
  abilityOther: string;
  interests: InterestId[];
  interestOther: string;
  voices: Voice[];
  unknown: boolean;
}

const short = (v: string) => v.trim().length < 2;

const abilityProblem = (d: Draft) => {
  if (!d.abilities.length) return 'მონიშნე ერთი მაინც — მანამდე არ შეინახება.';
  if (d.abilities.includes('galoba') && short(d.chantPlace)) return 'ჩაწერე, სად გალობ — მერე შეინახება.';
  if (d.abilities.includes('dakvra') && !d.instruments.length) return 'აირჩიე, რაზე უკრავ — მერე შეინახება.';
  if (d.abilities.includes('skhva') && short(d.abilityOther)) return 'ჩაწერე, რა შეგიძლია — მერე შეინახება.';
  return '';
};
const interestProblem = (d: Draft) => {
  if (!d.interests.length) return 'მონიშნე ერთი მაინც — მანამდე არ შეინახება.';
  if (d.interests.includes('skhva') && short(d.interestOther)) return 'ჩაწერე, რა გაინტერესებს — მერე შეინახება.';
  return '';
};

/** The voices as the kit's switch looks (a grey track, the chosen ones white), but several may be on; „არ ვიცი“ alone. */
const VoiceSwitch: React.FC<{ voices: Voice[]; unknown: boolean; withUnknown: boolean; onChange: (v: Voice[], unknown: boolean) => void }> = ({
  voices, unknown, withUnknown, onChange,
}) => (
  <div role="group" aria-label="ჩემი ხმა" className="flex h-[52px] shrink-0 gap-1 rounded-full bg-track p-1">
    {VOICES.filter(v => withUnknown || v.id !== 'x').map(v => {
      const on = v.id === 'x' ? unknown && !voices.length : voices.includes(v.id);
      return (
        <Press key={v.id} aria-pressed={on}
          onClick={() => {
            if (v.id === 'x') onChange([], !on);
            else onChange(on ? voices.filter(x => x !== v.id) : [...voices, v.id].sort() as Voice[], false);
          }}
          className={cx(
            'flex h-tap min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full px-1 text-body whitespace-nowrap transition',
            on ? 'bg-surf font-bold text-wine shadow-knob' : 'font-semibold text-mut active:bg-ink/5',
            FOCUS,
          )}>
          <span className="min-w-0 truncate">{v.label}</span>
        </Press>
      );
    })}
  </div>
);

export const SingingScreen: React.FC = () => {
  const { user } = useAuth();
  const { handleGoBack } = useNavigation();
  const me = useProfileDoc();
  const [d, setD] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const dRef = useRef<Draft | null>(null);
  dRef.current = d;

  // start from what is kept, once it has come
  useEffect(() => {
    if (me.data === undefined || d) return;
    const p = me.profile;
    setD({
      abilities: abilitiesOf(p),
      chantPlace: p.chantPlace || '',
      instruments: (p.instruments || []).filter(x => INSTRUMENTS_LIST.some(i => i.id === x)),
      abilityOther: p.abilityOther || '',
      interests: (p.interests || []).filter((x): x is InterestId => INTEREST_OPTIONS.some(o => o.id === x)),
      interestOther: p.interestOther || '',
      // the old default of all three voices meant „not chosen“ (as the old card reads it)
      voices: ((p.voices || []).length === 3 ? [] : (p.voices || [])).filter((v): v is Voice => v === '1' || v === '2' || v === '3'),
      unknown: me.voiceUnknown,
    });
  }, [me.data, me.profile, me.voiceUnknown, d]);

  if (!user) return null;

  // a patch is kept only when the profile stays complete afterwards (or was not complete anyway)
  const keeps = (patch: ProfileFields, unknown?: boolean) => {
    if (!profileComplete(me.data)) return true;
    const met = me.data?.firstMeeting;
    return profileComplete({ ...me.data, profile: { ...me.profile, ...patch }, firstMeeting: unknown === undefined ? met : { ...met, voiceUnknown: unknown } });
  };
  const write = (patch: ProfileFields, unknown?: boolean) => {
    setError('');
    saveProfileFields(user, me.profile, patch, unknown).catch(() => setError('ვერ შეინახა — შეამოწმე ინტერნეტი.'));
  };

  const saveAbilities = (n: Draft) => {
    if (abilityProblem(n)) return;
    const patch: ProfileFields = {
      abilities: n.abilities,
      chantPlace: n.abilities.includes('galoba') ? n.chantPlace.trim() : '',
      instruments: n.abilities.includes('dakvra') ? INSTRUMENTS_LIST.map(i => i.id).filter(id => n.instruments.includes(id)) : [],
      abilityOther: n.abilities.includes('skhva') ? n.abilityOther.trim() : '',
    };
    // an answer of the old „სტატუსი“ times kept the profile whole; the new list asks for interests too
    if (keeps(patch)) write(patch);
  };
  const saveInterests = (n: Draft) => {
    if (interestProblem(n)) return;
    const patch: ProfileFields = {
      interests: INTEREST_OPTIONS.map(o => o.id).filter(id => n.interests.includes(id)),
      interestOther: n.interests.includes('skhva') ? n.interestOther.trim() : '',
    };
    if (keeps(patch)) write(patch);
  };
  const saveVoices = (n: Draft) => {
    if (!n.voices.length && !n.unknown) return;
    const unknown = me.met && n.unknown !== me.voiceUnknown ? n.unknown : undefined;
    if (keeps({ voices: n.voices }, unknown)) write({ voices: n.voices }, unknown);
  };

  const change = (patch: Partial<Draft>, then?: (n: Draft) => void) => {
    if (!dRef.current) return;
    const n = { ...dRef.current, ...patch };
    setD(n);
    then?.(n);
  };

  if (!d) {
    return <div className="flex w-full flex-col gap-3 pb-5"><TopBar title="გალობა და ინტერესები" onBack={handleGoBack} /></div>;
  }
  const aProblem = abilityProblem(d);
  const iProblem = interestProblem(d);

  const toggleAbilities = (next: AbilityId[]) => {
    // „ჯერ ვიწყებ“ stands alone
    const added = next.find(x => !d.abilities.includes(x));
    const list = added === 'beginner' ? ['beginner' as const] : next.filter(x => x !== 'beginner');
    change({ abilities: list }, saveAbilities);
  };

  return (
    <div className="flex w-full flex-col gap-3 pb-5">
      <TopBar title="გალობა და ინტერესები" onBack={handleGoBack} />

      <SectionLabel label="რა შემიძლია" />
      <WrapChips label="რა შემიძლია" items={ABILITY_OPTIONS.map(o => ({ id: o.id, label: o.title }))} value={d.abilities} onChange={toggleAbilities} />
      {d.abilities.includes('galoba') && (
        <Field label="სად ვგალობ" placeholder="ტაძარი, ქალაქი ან სოფელი" value={d.chantPlace} lang="ka"
          onChange={v => change({ chantPlace: v })} onBlur={() => change({}, saveAbilities)} />
      )}
      {d.abilities.includes('dakvra') && (
        <>
          <SectionLabel label="რაზე ვუკრავ" />
          <WrapChips label="რაზე ვუკრავ" items={INSTRUMENTS_LIST.map(i => ({ id: i.id, label: i.nameGe }))} value={d.instruments}
            onChange={v => change({ instruments: v }, saveAbilities)} />
        </>
      )}
      {d.abilities.includes('skhva') && (
        <Field label="სხვა — რა შემიძლია" value={d.abilityOther} lang="ka"
          onChange={v => change({ abilityOther: v })} onBlur={() => change({}, saveAbilities)} />
      )}
      {aProblem && <Note>{aProblem}</Note>}

      <SectionLabel label="ჩემი ხმა" className="mt-1" />
      <VoiceSwitch voices={d.voices} unknown={d.unknown} withUnknown={me.met}
        onChange={(voices, unknown) => change({ voices, unknown }, saveVoices)} />
      {!d.voices.length && !d.unknown && <Note>მონიშნე ხმა{me.met ? ' ან „არ ვიცი“' : ''} — მანამდე არ შეინახება.</Note>}

      <SectionLabel label="რა მაინტერესებს" className="mt-1" />
      <WrapChips label="რა მაინტერესებს" items={INTEREST_OPTIONS.map(o => ({ id: o.id, label: o.title }))} value={d.interests}
        onChange={v => change({ interests: v }, saveInterests)} />
      {d.interests.includes('skhva') && (
        <Field label="სხვა — რა მაინტერესებს" value={d.interestOther} lang="ka"
          onChange={v => change({ interestOther: v })} onBlur={() => change({}, saveInterests)} />
      )}
      {iProblem && <Note>{iProblem}</Note>}

      {error && <ErrorLine>{error}</ErrorLine>}
      {!error && !aProblem && !iProblem && (d.voices.length > 0 || d.unknown) && (
        <Note className="flex items-center gap-1.5"><Check aria-hidden="true" className="size-3.5 text-leaf" /> არჩევისთანავე ინახება.</Note>
      )}
    </div>
  );
};
