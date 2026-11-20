import React, { useState } from 'react';
import { ALargeSmall, Bell, Calendar, Download, IdCard, LayoutGrid, LogOut, MessageCircle, Shield, SunMoon, Trash2, Type } from 'lucide-react';
import { Dot, Row, Rows, SectionLabel, ToggleRow, TopBar, Val } from '../../../components/ui2';
import { ContactSheet, OutMark } from './ContactSheet';
import { GearSpark } from '../../v2/damkhmare/GearSpark';

// „პარამეტრები“ (redesign stage 2, prototype x-parametrebi): every setting on one page in three groups — „აპი“, „ტელეფონი“,
// „ანგარიში“. Until now they sat at the profile's bottom and in the footer. Pure: everything comes in by props, a row whose
// handler is missing is not shown, and a group with no rows left is not shown either.

/** the widgets' link, as `useWidgetLink` (components/app/WidgetLinkCard.tsx) says: `ready` = the second tap hands it over */
export type WidgetLook = { linked: boolean; state: 'idle' | 'busy' | 'ready' | 'error'; onTap: () => void };

export interface SettingsViewProps {
  onBack: () => void;
  // აპი
  /** „შეტყობინებები“ — one page: the reminders and how the notices come */
  onNotify?: () => void;
  /** „ტექსტის ზომა“ and „იერი“ (design/look.ts): the row's value and its screen */
  textSize?: { label: string; onTap: () => void };
  theme?: { label: string; onTap: () => void };
  khutsuri: boolean;
  onKhutsuri: (on: boolean) => void;
  /** the superadmin's floating cog of „ავტომატური პროგრამა“: on this device or not (only they get the row) */
  cog?: { on: boolean; onChange: (on: boolean) => void };
  // ტელეფონი
  widget?: WidgetLook;
  onCalendar?: () => void;
  onInstall?: () => void;
  // ანგარიში
  onPersonal?: () => void;
  /** the privacy page, opened in a new tab */
  privacyHref?: string;
  onSignOut?: () => void;
  remove?: { onTap: () => void; busy: boolean; error?: string };
}

/** A grey name over one white card of rows; nothing at all when every row is hidden. */
const Group: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const rows = React.Children.toArray(children);
  if (!rows.length) return null;
  return (
    <section className="flex shrink-0 flex-col gap-2">
      <SectionLabel label={label} />
      <Rows>{rows}</Rows>
    </section>
  );
};

const lead = (icon: React.ReactNode) => <Dot icon={icon} />;

const widgetSub = (w: WidgetLook): React.ReactNode =>
  w.state === 'busy' ? 'ვამზადებ…'
    : w.state === 'ready' ? <span className="font-semibold text-wine">მზადაა — კიდევ ერთხელ შეეხე</span>
    : w.state === 'error' ? <span className="text-danger">ვერ დავაკავშირე — სცადე ხელახლა</span>
    : w.linked ? 'დაკავშირებულია'
    : undefined;

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack, onNotify, textSize, theme, khutsuri, onKhutsuri, cog, widget, onCalendar, onInstall, onPersonal, privacyHref = '/privacy.html',
  onSignOut, remove,
}) => {
  const [contact, setContact] = useState(false);
  return (
    <div className="flex flex-col">
      <TopBar title="პარამეტრები" onBack={onBack} />
      <main className="flex flex-col gap-2 pt-0.5 pb-5">
        <Group label="აპი">
          {onNotify && <Row lead={lead(<Bell />)} title="შეტყობინებები" sub="შეხსენებები და ჩუმი საათები" onClick={onNotify} />}
          {textSize && <Row lead={lead(<ALargeSmall />)} title="ტექსტის ზომა" right={<Val>{textSize.label}</Val>} onClick={textSize.onTap} />}
          {theme && <Row lead={lead(<SunMoon />)} title="იერი" right={<Val>{theme.label}</Val>} onClick={theme.onTap} />}
          <ToggleRow lead={lead(<Type />)} title="ხუცური" sub="მთელი აპი ძველი ასოებით" on={khutsuri} onChange={onKhutsuri} />
          {cog && (
            <ToggleRow lead={lead(<GearSpark />)} title="მცურავი კბილანა" sub="პროგრამის ღილაკი ყველა გვერდზე"
              on={cog.on} onChange={cog.onChange} />
          )}
        </Group>

        <Group label="ტელეფონი">
          {widget && (
            <Row
              lead={lead(<LayoutGrid />)}
              title="ვიჯეტი მთავარ ეკრანზე"
              sub={widgetSub(widget)}
              onClick={widget.onTap}
              disabled={widget.state === 'busy'}
            />
          )}
          {onCalendar && <Row lead={lead(<Calendar />)} title="კალენდარი ტელეფონში" onClick={onCalendar} />}
          {onInstall && <Row lead={lead(<Download />)} title="აპის დაყენება" sub="მთავარ ეკრანზე დამატება" onClick={onInstall} />}
        </Group>

        <Group label="ანგარიში">
          {onPersonal && <Row lead={lead(<IdCard />)} title="პირადი ინფორმაცია" onClick={onPersonal} />}
          <Row lead={lead(<MessageCircle />)} title="დაგვიკავშირდი" sub="Facebook · WhatsApp" onClick={() => setContact(true)} />
          <Row lead={lead(<Shield />)} title="კონფიდენციალურობა" right={<OutMark />} href={privacyHref} target="_blank" />
          {onSignOut && <Row lead={lead(<LogOut />)} title="გამოსვლა" onClick={onSignOut} />}
          {remove && (
            <Row
              lead={lead(<Trash2 />)}
              title={remove.busy ? 'იშლება…' : 'ანგარიშის წაშლა'}
              sub={remove.error ? <span role="alert" className="text-danger">{remove.error}</span> : undefined}
              wrap={!!remove.error}
              onClick={remove.onTap}
              disabled={remove.busy}
            />
          )}
        </Group>
      </main>
      <ContactSheet open={contact} onClose={() => setContact(false)} />
    </div>
  );
};
