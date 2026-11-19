import React, { useMemo, useRef, useState } from 'react';
import { BarChart3, Camera, ChevronRight, LayoutGrid, Shield, Shirt, SlidersHorizontal, Trash2, Users } from 'lucide-react';
import { useAuth, useNavigation, useViewing } from '../../../context';
import {
  Avatar, Badge, Card, Dot, PageHead, Press, Row, Rows, RoundButton, SectionLabel, Sheet, Stats,
} from '../../../components/ui2';
import { FOCUS_IN } from '../../../components/ui2/cx';
import { monthNumbers } from '../../../components/app/MyMonthStrip';
import { useAdminEntry } from '../../../components/views/AdminEntry';
import { useSamosiSummary } from '../../../components/views/PathOrbs';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { openMyVoice } from '../../../components/aiLesson/open';
import { saveMyPhoto } from '../../../hooks/useMyPhoto';
import { useAccess } from '../../../hooks/useAccess';
import { useMembership } from '../../../utils/memberAccess';
import { MAX_SHORTCUTS, useMyShortcuts } from '../../../utils/shortcuts';
import { georgiaToday } from '../../../utils/psalter';
import { SAMOSI_TOTAL } from '../../../data/samosiData';
import { PhotoCropV2 } from './PhotoCropV2';
import { VOICE_NAMES, useProfileDoc } from './profileStore';
import { PersonalInfo } from './PersonalInfo';
import { SingingScreen } from './Singing';
import { ScheduleScreen } from './Schedule';
import { ButtonsScreen } from './Buttons';
import { HelpButton } from '../mkitkhe/HelpButton';

// x-propili — „პროფილი“ in the new look (the bottom menu's own page): me and this month's three numbers on top, then five
// rows — my class, my voice (the AI teacher's), my outfit, my home buttons — and the settings and the admin panel. What
// the old profile held at its bottom (reminders, ხუცური, the widget, the calendar, installing, leaving) lives on the
// settings page; the details (name, place, phone, birth date; singing and interests; the work timetable) are inner screens
// of this page, opened from the head card or the settings' „პირადი ინფორმაცია“:
// mapItem `info` · `galoba` · `ganrigi` · `ghilakebi` (the home buttons, board x-ghilakebi).

export type ProfileItem = 'info' | 'galoba' | 'ganrigi' | 'ghilakebi';

/** The round photo of the head card: a tap picks a picture (or, with my own kept, offers another one or taking it off). */
const PhotoPick: React.FC<{ name: string; photo: string; own: boolean; hasOwn: boolean; onFile: (f: File) => void; onRemove: () => void }> = ({
  name, photo, own, hasOwn, onFile, onRemove,
}) => {
  const file = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const picture = <Avatar name={name || '?'} photo={photo || undefined} size={64} />;
  if (!own) return picture;
  return (
    <>
      <Press aria-label="ფოტოს შეცვლა" title="ფოტოს შეცვლა"
        onClick={() => (hasOwn ? setMenu(true) : file.current?.click())}
        className="relative shrink-0 cursor-pointer rounded-full transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60">
        {picture}
        <span aria-hidden="true" className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full bg-wine text-white ring-2 ring-surf [&_svg]:size-3">
          <Camera />
        </span>
      </Press>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
      <Sheet open={menu} title="ფოტო" onClose={() => setMenu(false)}>
        <Rows>
          <Row lead={<Dot icon={<Camera />} />} title="სხვა ფოტო" right={null} onClick={() => { setMenu(false); file.current?.click(); }} />
          <Row lead={<Dot icon={<Trash2 />} />} title="ჩემი ფოტოს მოხსნა" tone="danger" right={null} onClick={() => { setMenu(false); onRemove(); }} />
        </Rows>
      </Sheet>
    </>
  );
};

const ProfileMain: React.FC = () => {
  const { user, isAdmin, isSuperAdmin, isTeacher } = useAuth();
  const { navigateTo, openMapItem, openClass } = useNavigation();
  const viewing = useViewing();
  const access = useAccess();
  const waiting = useMembership().status === 'pending';
  const me = useProfileDoc();
  const admin = useAdminEntry();
  const samosi = useSamosiSummary();
  const classes = useAllMyClasses();
  const { list } = useMyShortcuts(user?.uid);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const today = georgiaToday();
  const month = useMemo(() => monthNumbers(me.data, today), [me.data, today]);

  if (!user) return null;
  const p = me.profile;
  const name = p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : user.displayName || 'შენი სახელი';
  const role = isSuperAdmin ? 'სუპერადმინი' : isAdmin ? 'ადმინი' : isTeacher ? 'მასწავლებელი' : '';
  const voices = (Array.isArray(p.voices) ? p.voices : []).map(v => VOICE_NAMES[v]).filter(Boolean);
  const sub = [role, ...voices].filter(Boolean).join(' · ') || user.email || '';
  const shownPhoto = me.photo || user.photoURL || '';
  const keepPhoto = (dataUrl: string | null) => {
    setPhotoError(false);
    saveMyPhoto(user.uid, dataUrl, user.photoURL || '').catch(() => setPhotoError(true));
  };
  const openGz = (item: string) => { navigateTo('gz'); openMapItem(item); };
  const buttons = list?.length ?? 0;

  return (
    <div className="flex w-full flex-col gap-3 pb-5">
      {/* data-help(-way): „მკითხე“'s answers that speak of it (pages/v2/mkitkhe/light.ts); „?“ — this page's three, always last */}
      <PageHead title="პროფილი" right={
        <>
          <RoundButton label="პარამეტრები" onClick={() => navigateTo('settings')} data-help-way="30 31 32 33 34 35 36 37 39 40">
            <SlidersHorizontal strokeWidth={1.75} />
          </RoundButton>
          <HelpButton page="profile" />
        </>
      } />

      {/* me: the photo (a tap changes it), the name and a line; the rest of the card opens my details */}
      <Card pad="none" data-help="38" className="flex items-center gap-3.5 py-4 pr-3 pl-[18px]">
        <PhotoPick name={name} photo={shownPhoto} own={!viewing} hasOwn={!!me.photo}
          onFile={setCropFile} onRemove={() => keepPhoto(null)} />
        <Press onClick={() => openMapItem('info')}
          className={`flex min-h-tap min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-field text-left ${FOCUS_IN}`}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-title leading-tight font-bold wrap-break-word">{name}</span>
            {sub && <span className="sg-fit truncate text-meta text-mut">{sub}</span>}
          </span>
          <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" />
        </Press>
      </Card>
      {photoError && <p role="alert" className="px-1.5 text-meta font-semibold text-danger">ფოტო ვერ შეინახა — სცადე თავიდან.</p>}

      {!waiting && (
        <>
          {/* this month in three numbers (the old „ჩემი თვე“; the month's caption left so the page fits one screen) */}
          {me.data !== undefined && (
            <Stats items={[
              { value: month.days, label: 'აქტიური დღე' },
              { value: month.habits, label: 'მონიშნული ჩვევა' },
              { value: month.learn, label: 'ნავარჯიშევი ფრაზა' },
            ]} />
          )}

          <SectionLabel label="ჩემი" />
          <Rows>
            {access.on('classes') && classes.length > 0 && (
              <Row lead={<Dot icon={<Users />} />} title={classes.length > 1 ? 'ჩემი კლასები' : 'ჩემი კლასი'}
                sub={classes.length > 1 ? classes.map(c => c.name).join(' · ') : classes[0].name}
                onClick={() => (classes.length > 1 ? openGz('klasebi') : openClass(classes[0].id))} />
            )}
            {access.on('aiTeacher') && (
              <Row lead={<Dot icon={<BarChart3 />} />} title="ჩემი ხმა" sub="დღიური · ხმის ზომა · მოწმობები" onClick={() => openMyVoice('diary')} />
            )}
            {access.on('samosi') && (
              <Row lead={<Dot icon={<Shirt />} />} title="ჩემი სამოსი" sub={`${samosi.count} / ${SAMOSI_TOTAL}`} onClick={() => openGz('samosi')} />
            )}
            <Row lead={<Dot icon={<LayoutGrid />} />} title="ჩემი ღილაკები" sub={`${buttons} / ${MAX_SHORTCUTS}`} onClick={() => openMapItem('ghilakebi')} />
          </Rows>
        </>
      )}

      <Rows>
        <Row lead={<Dot icon={<SlidersHorizontal />} />} title="პარამეტრები" sub="შეხსენებები, ტექსტი, მუქი ფონი" onClick={() => navigateTo('settings')} />
        {admin.shown && (
          <Row lead={<Dot icon={<Shield />} />} title="ადმინის პანელი"
            sub={admin.waiting > 0 ? 'ახალი წევრები ელოდება დამატებას' : 'წევრები, კლასები, სკოლა'}
            right={admin.waiting > 0 ? <span className="flex items-center gap-1"><Badge n={admin.waiting} /><ChevronRight aria-hidden="true" className="size-[18px] text-mut" /></span> : undefined}
            onClick={admin.open} />
        )}
      </Rows>

      {cropFile && <PhotoCropV2 file={cropFile} onClose={() => setCropFile(null)} onDone={url => { setCropFile(null); keepPhoto(url); }} />}
    </div>
  );
};

/** The page `profile` in the new look, with its inner screens. */
export const ProfileV2: React.FC = () => {
  const { mapItem } = useNavigation();
  const waiting = useMembership().status === 'pending';
  if (mapItem === 'info') return <PersonalInfo />;
  if (mapItem === 'galoba') return <SingingScreen />;
  // the path's timetable and the home buttons are a member's tools (not while one waits to be let in)
  if (mapItem === 'ganrigi' && !waiting) return <ScheduleScreen />;
  if (mapItem === 'ghilakebi' && !waiting) return <ButtonsScreen />;
  return <ProfileMain />;
};
