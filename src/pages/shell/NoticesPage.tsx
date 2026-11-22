import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Megaphone } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { useMyNotices } from '../../hooks/useShellCounts';
import { deleteAnnouncement, sendAnnouncement, type Notice, type NoticeKind } from '../../hooks/useNotices';
import { notifyAnnouncement } from '../../utils/groupPush';
import { askConfirm, offerUndo } from '../../components/ui/kit';
import { Button, Chips, RoundButton, Rows, SectionLabel, TopBar, type ChipItem } from '../../components/ui2';
import { NoticeRow } from './notices/NoticeRow';
import { WriteSheet } from './notices/WriteSheet';
import { kaName } from '../../utils/georgianName';

// „შეტყობინებები“ in the new look (redesign stage 2, the prototype `shetyobinebebi`): the page the home bar's 🔔 and
// `/?open=bell` open, in place of the old drop-down under the header (layout/Bell.tsx). One line = one piece of news;
// chips sort the class's (and private) messages from the app's news and the admins' notices. What came since the last
// look is „ახალი“ while the page is open; „ყველა წაკითხულია“ moves it to „ადრე“ at once. A message opens its chat, the rest
// unfold in place; a row swiped aside is hidden for me on every device (with „გაუქმება“). An admin writes to everyone from
// the bottom and takes a notice back from inside it.

export type NoticeFilter = 'all' | 'class' | 'news';

const FILTERS: ChipItem<NoticeFilter>[] = [
  { id: 'all', label: 'ყველა' },
  { id: 'class', label: 'კლასი' },
  { id: 'news', label: 'აპის სიახლე' },
];

const KINDS: Record<NoticeFilter, NoticeKind[] | null> = {
  all: null,
  class: ['class', 'dm'],
  news: ['news', 'all'],
};

const EMPTY_LINE: Record<NoticeFilter, string> = {
  all: 'აქ გამოჩნდება კლასის ამბები, წერილები და აპის სიახლეები.',
  class: 'მასწავლებლის, კლასის და პირადი წერილები აქ გამოჩნდება.',
  news: 'აპის სიახლეები და სკოლის განცხადებები აქ გამოჩნდება.',
};

export interface NoticesViewProps {
  notices: Notice[];
  /** the last look before this one: what is newer is „ახალი“ */
  seenBefore: number;
  onBack: () => void;
  /** „ყველა წაკითხულია“: every new row goes to „ადრე“ */
  onAllRead: () => void;
  /** a message's chat: a dm's id or `class:<id>` */
  onOpenChat: (chat: string) => void;
  /** swiped aside: hidden for me */
  onHide: (n: Notice) => void;
  /** an admin writes to everyone and takes a notice back */
  admin?: {
    onSend: (text: string) => Promise<void>;
    onTakeBack: (n: Notice) => Promise<void>;
  };
  /** the time the rows' „when“ is counted from (a preview's fixed day) */
  now?: number;
  defaultFilter?: NoticeFilter;
  /** open with the admin's window up (a preview) */
  defaultWriting?: boolean;
}

/** The page drawn from what it is given — no database. */
export const NoticesView: React.FC<NoticesViewProps> = ({
  notices, seenBefore, onBack, onAllRead, onOpenChat, onHide, admin, now, defaultFilter = 'all', defaultWriting = false,
}) => {
  const [filter, setFilter] = useState<NoticeFilter>(defaultFilter);
  const [unfolded, setUnfolded] = useState<string | null>(null);
  const [writing, setWriting] = useState(defaultWriting);
  const [err, setErr] = useState('');

  const kinds = KINDS[filter];
  const shown = kinds ? notices.filter(n => kinds.includes(n.kind)) : notices;
  const fresh = shown.filter(n => n.at > seenBefore);
  const older = shown.filter(n => n.at <= seenBefore);
  const anyNew = notices.some(n => n.at > seenBefore);

  const takeBack = (n: Notice) => {
    setErr('');
    admin?.onTakeBack(n).catch(() => setErr('ვერ წაიშალა. სცადე ცოტა ხანში.'));
  };

  const card = (list: Notice[], isNew: boolean) => (
    <Rows>
      {list.map(n => (
        <NoticeRow
          key={n.id}
          n={n}
          isNew={isNew}
          open={unfolded === n.id}
          now={now}
          canTakeBack={!!admin}
          onTap={() => {
            if (n.chat) onOpenChat(n.chat);
            else setUnfolded(u => (u === n.id ? null : n.id));
          }}
          onHide={() => onHide(n)}
          onTakeBack={() => takeBack(n)}
        />
      ))}
    </Rows>
  );

  return (
    <>
      <TopBar
        title="შეტყობინებები"
        onBack={onBack}
        right={
          <RoundButton label="ყველა წაკითხულია" onClick={onAllRead} disabled={!anyNew}>
            <CheckCheck aria-hidden="true" strokeWidth={1.75} />
          </RoundButton>
        }
      />
      <div className="flex flex-col gap-3 pt-0.5">
        <Chips items={FILTERS} value={filter} onChange={setFilter} label="რომელი შეტყობინებები" />
        {err && <p role="alert" className="px-1.5 text-meta font-semibold text-danger">{err}</p>}

        {shown.length === 0 ? (
          <div className="flex shrink-0 flex-col items-center gap-1.5 px-5 pt-[22px] pb-1.5 text-center">
            <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-7">
              <Bell strokeWidth={1.75} />
            </span>
            <h2 className="mt-1 text-head font-bold">ახალი არაფერია</h2>
            <p className="text-body leading-normal text-mut">{EMPTY_LINE[filter]}</p>
          </div>
        ) : (
          <>
            {fresh.length > 0 && (
              <>
                <SectionLabel label={`ახალი · ${fresh.length}`} />
                {card(fresh, true)}
              </>
            )}
            {older.length > 0 && (
              <>
                <SectionLabel label="ადრე" />
                {card(older, false)}
              </>
            )}
          </>
        )}

        {admin && (
          <>
            <Button kind="quiet" size="md" icon={<Megaphone strokeWidth={1.75} />} className="self-center" onClick={() => setWriting(true)}>
              ყველას მიწერა
            </Button>
            <WriteSheet open={writing} onClose={() => setWriting(false)} onSend={admin.onSend} />
          </>
        )}
      </div>
    </>
  );
};

/** The app's page `notices`: my notices, marked seen on opening (the home bar's 🔔 count goes to 0). */
export const NoticesPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { handleGoBack, openDm } = useNavigation();
  const { notices, bell } = useMyNotices();
  // what was new at this look stays marked while the page is open
  const [seenBefore, setSeenBefore] = useState(() => bell.seen);
  const latest = () => Math.max(Date.now(), ...notices.map(n => n.at));
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    bell.markSeen(latest());
    // once, on opening (as the old header's 🔔 did)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const admin: NoticesViewProps['admin'] = isAdmin && user
    ? {
      onSend: async text => {
        const ref = await sendAnnouncement(user.uid, kaName(user.displayName) || '', text);
        void notifyAnnouncement(ref.id);
      },
      onTakeBack: async n => {
        if (!(await askConfirm({ title: 'ეს შეტყობინება ყველას წაეშალოს?', ok: 'წაშლა', danger: true }))) return;
        await deleteAnnouncement(n.id.slice(2));
      },
    }
    : undefined;

  return (
    <NoticesView
      notices={notices}
      seenBefore={seenBefore}
      onBack={handleGoBack}
      onAllRead={() => {
        const at = latest();
        setSeenBefore(at);
        bell.markSeen(at);
      }}
      onOpenChat={chat => openDm(chat)}
      onHide={n => {
        bell.hide(n.id);
        offerUndo('შეტყობინება წაიშალა', () => bell.unhide(n.id));
      }}
      admin={admin}
    />
  );
};
