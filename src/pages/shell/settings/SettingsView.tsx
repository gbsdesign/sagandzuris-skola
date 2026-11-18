import React, { useState } from 'react';
import { Bell, BellRing, Calendar, Download, IdCard, LayoutGrid, LogOut, MessageCircle, Shield, Trash2, Type } from 'lucide-react';
import { Dot, Row, Rows, SectionLabel, ToggleRow, TopBar } from '../../../components/ui2';
import { ContactSheet, OutMark } from './ContactSheet';

// „პარამეტრები“ (redesign stage 2, prototype x-parametrebi): every setting on one page in three groups — „აპი“, „ტელეფონი“,
// „ანგარიში“. Until now they sat at the profile's bottom and in the footer. Pure: everything comes in by props, a row whose
// handler is missing is not shown, and a group with no rows left is not shown either.

/** the widgets' link, as `useWidgetLink` (components/app/WidgetLinkCard.tsx) says: `ready` = the second tap hands it over */
export type WidgetLook = { linked: boolean; state: 'idle' | 'busy' | 'ready' | 'error'; onTap: () => void };

export interface SettingsViewProps {
  onBack: () => void;
  // აპი
  onReminders?: () => void;
  onNotify?: () => void;
  khutsuri: boolean;
  onKhutsuri: (on: boolean) => void;
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
  onBack, onReminders, onNotify, khutsuri, onKhutsuri, widget, onCalendar, onInstall, onPersonal, privacyHref = '/privacy.html',
  onSignOut, remove,
}) => {
  const [contact, setContact] = useState(false);
  return (
    <div className="flex flex-col">
      <TopBar title="პარამეტრები" onBack={onBack} />
      <main className="flex flex-col gap-2 pt-0.5 pb-5">
        <Group label="აპი">
          {onReminders && <Row lead={lead(<Bell />)} title="შეხსენებები" onClick={onReminders} />}
          {onNotify && <Row lead={lead(<BellRing />)} title="შეტყობინებები" onClick={onNotify} />}
          {/* the next stages put „ტექსტის ზომა“ and „მუქი ფონი“ here, between the reminders and ხუცური */}
          <ToggleRow lead={lead(<Type />)} title="ხუცური" sub="მთელი აპი ძველი ასოებით" on={khutsuri} onChange={onKhutsuri} />
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
