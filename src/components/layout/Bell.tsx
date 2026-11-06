import React, { useRef, useState } from 'react';
import { ArrowLeftRight, Bell, BellOff, ChevronRight, Loader2, Megaphone, MessageCircle, Pin, Send, Sparkles, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { askConfirm, offerUndo } from '../ui/kit';
import { ClassLogo } from '../classes/ClassLogo';
import { Notice, deleteAnnouncement, sendAnnouncement } from '../../hooks/useNotices';
import { notifyAnnouncement } from '../../utils/groupPush';

// The header's 🔔 and the list it drops down (hooks/useNotices.ts says what comes there). Two parts (2026-11-06, the
// user's pick): „ახალი“ — what came since the last look, white cards with a red dot — and „ადრე“, plain rows. A message
// opens its chat, a notice or a piece of news unfolds in place; a row swiped aside is hidden for me on every device, with
// „გაუქმება“ for 5 s. An admin writes to everyone from the list's head („ყველას მიწერა“ — the phones get it too) and may
// take a notice back (🗑 in the unfolded notice).

const MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

/** „ახლა“, „5 წთ“, „3 სთ“, „გუშინ“, „6 ნოე“ */
export const whenText = (at: number, now = Date.now()) => {
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return 'ახლა';
  if (min < 60) return `${min} წთ`;
  const d = new Date(at), today = new Date(now);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return `${Math.floor(min / 60)} სთ`;
  if (sameDay(d, new Date(now - 86_400_000))) return 'გუშინ';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const BellButton: React.FC<{ count: number; open: boolean; onToggle: () => void }> = ({ count, open, onToggle }) => {
  const label = count ? `შეტყობინებები — ახალი: ${count}` : 'შეტყობინებები';
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); onToggle(); }}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`relative shrink-0 w-9 h-9 rounded-full ring-1 flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
        open
          ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]'
          : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
      }`}
    >
      <Bell className="w-[18px] h-[18px]" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#c62828] text-white text-[11px] font-black leading-5 tabular-nums text-center ring-2 ring-[#fbf6ec]">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};

/** what each kind says under its name */
const PLACE: Record<Notice['kind'], string> = {
  news: 'აპის სიახლე',
  all: 'ყველასთვის',
  dm: 'პირადი წერილი',
  class: 'კლასის ჩათი',
};

const Mark: React.FC<{ n: Notice }> = ({ n }) => {
  if (n.kind === 'class' && n.cls) return <ClassLogo name={n.cls.name} logo={n.cls.logo} className="w-10 h-10 text-sm" />;
  if (n.kind === 'dm' && n.photo) {
    return <img src={n.photo} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e8dcc8]" />;
  }
  const look = n.kind === 'news'
    ? { cls: 'bg-[#f6e7c4] text-[#9a6b12]', Icon: Sparkles }
    : n.kind === 'all'
      ? { cls: 'bg-[#7a2028] text-[#fbf6ec]', Icon: Megaphone }
      : { cls: 'bg-[#f2e1de] text-[#7a2028]', Icon: MessageCircle };
  return (
    <span className={`w-10 h-10 rounded-full grid place-items-center ${look.cls}`}>
      <look.Icon className="w-5 h-5" />
    </span>
  );
};

/** A row that goes when swiped aside (a finger or a mouse): past a third of its width, or flicked, it slides out, folds up
 *  and `onGone` runs; less, and it springs back. A swipe never counts as a tap. Up and down stay the list's scroll. */
const SwipeRow: React.FC<{ onGone: () => void; children: React.ReactNode }> = ({ onGone, children }) => {
  const box = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; y0: number; t0: number; dx: number; on: boolean } | null>(null);
  const swiped = useRef(false);
  const [side, setSide] = useState(0);
  const place = (dx: number, animate: boolean) => {
    const el = face.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 0.22s ease, opacity 0.22s ease' : 'none';
    el.style.transform = dx ? `translateX(${dx}px)` : '';
    el.style.opacity = dx ? String(Math.max(0.35, 1 - Math.abs(dx) / ((box.current?.offsetWidth || 300) * 1.2))) : '';
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.on) return;
    const w = box.current?.offsetWidth || 300;
    const fast = Math.abs(d.dx) / Math.max(1, performance.now() - d.t0) > 0.6 && Math.abs(d.dx) > 40;
    if (Math.abs(d.dx) < w * 0.33 && !fast) {
      place(0, true);
      window.setTimeout(() => setSide(0), 220);
      return;
    }
    triggerHaptic(12);
    place(Math.sign(d.dx) * w * 1.1, true);
    window.setTimeout(() => {
      const el = box.current;
      if (el) {
        el.style.height = `${el.offsetHeight}px`;
        el.style.transition = 'height 0.2s ease, margin 0.2s ease';
        void el.offsetHeight;
        el.style.height = '0px';
        el.style.marginTop = '0px';
      }
      window.setTimeout(onGone, 200);
    }, 200);
  };
  return (
    <div
      ref={box}
      className="relative overflow-hidden rounded-2xl touch-pan-y select-none"
      onPointerDown={e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        drag.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, on: false };
        swiped.current = false;
      }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
        if (!d.on) {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
          if (Math.abs(dx) < 10) return;
          d.on = true;
          swiped.current = true;
          box.current?.setPointerCapture(e.pointerId);
        }
        d.dx = dx;
        setSide(Math.sign(dx));
        place(dx, false);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={e => {
        if (!swiped.current) return;
        swiped.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {side !== 0 && (
        <div aria-hidden className={`absolute inset-0 rounded-2xl bg-[#b3261e] text-white flex items-center px-5 gap-2 text-[13px] font-bold ${side > 0 ? 'justify-start' : 'justify-end'}`}>
          <Trash2 className="w-5 h-5" /> წაშლა
        </div>
      )}
      <div ref={face} className="relative">{children}</div>
    </div>
  );
};

export const BellPanel: React.FC<{
  notices: Notice[];
  /** the last look before this one: what is newer shows as new */
  seenBefore: number;
  /** an admin: writes to everyone, takes a notice back */
  admin?: { uid: string; name: string };
  onOpenChat: (chat: string) => void;
  /** swiped aside: hidden for me (and back with „გაუქმება“) */
  onHide: (id: string) => void;
  onUnhide: (id: string) => void;
}> = ({ notices, seenBefore, admin, onOpenChat, onHide, onUnhide }) => {
  const [unfolded, setUnfolded] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async () => {
    if (!admin || !text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const ref = await sendAnnouncement(admin.uid, admin.name, text);
      void notifyAnnouncement(ref.id);
      setText('');
      setWriting(false);
    } catch {
      setErr('ვერ გაიგზავნა. სცადე ცოტა ხანში.');
    } finally {
      setBusy(false);
    }
  };
  const takeBack = async (n: Notice) => {
    if (!(await askConfirm('ეს შეტყობინება ყველას წაეშალოს?'))) return;
    deleteAnnouncement(n.id.slice(2)).catch(() => setErr('ვერ წაიშალა.'));
  };
  const hide = (n: Notice) => {
    onHide(n.id);
    offerUndo('შეტყობინება წაიშალა', () => onUnhide(n.id));
  };

  const fresh = notices.filter(n => n.at > seenBefore);
  const older = notices.filter(n => n.at <= seenBefore);

  const row = (n: Notice, isNew: boolean) => {
    const opens = !!n.chat;
    const open = unfolded === n.id;
    return (
      <li key={n.id}>
        <SwipeRow onGone={() => hide(n)}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              if (n.chat) onOpenChat(n.chat);
              else setUnfolded(open ? null : n.id);
            }}
            aria-expanded={opens ? undefined : open}
            className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-2xl text-left cursor-pointer transition-colors ${
              isNew
                ? 'bg-white ring-1 ring-[#eadfcd] shadow-[0_3px_10px_-7px_rgba(74,52,38,0.45)] hover:ring-[#7a2028]/25'
                : 'bg-[#fffdf8] hover:bg-[#f7efe2]'
            }`}
          >
            <span className="shrink-0 mt-0.5"><Mark n={n} /></span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="min-w-0 truncate text-[14.5px] font-bold text-[#4a3426]">{n.who}</span>
                <span className="ml-auto shrink-0 inline-flex items-center gap-1.5">
                  {isNew && <span aria-label="ახალი" className="w-2 h-2 rounded-full bg-[#c62828]" />}
                  <span className={`text-[12px] tabular-nums ${isNew ? 'font-bold text-[#7a2028]' : 'text-[#a4927c]'}`}>{whenText(n.at)}</span>
                </span>
              </span>
              <span className="flex items-center gap-1 text-[12px] text-[#a4927c] min-w-0">
                {n.card && <Pin className="w-3 h-3 shrink-0" />}
                <span className="truncate">{n.kind === 'class' && n.cls ? `${n.card ? 'შენთვის' : PLACE.class} · ${n.cls.name}` : PLACE[n.kind]}</span>
              </span>
              <span className={`mt-1 text-[14px] leading-snug whitespace-pre-line break-words ${isNew ? 'text-[#2a2017]' : 'text-[#5a4a3c]'} ${open ? 'block' : 'line-clamp-2'}`}>{n.text}</span>
            </span>
            {opens && <ChevronRight className="w-5 h-5 shrink-0 self-center text-[#c4b49c]" />}
          </button>
        </SwipeRow>
        {admin && n.kind === 'all' && open && (
          <button
            type="button"
            onClick={() => takeBack(n)}
            className="ml-[3.75rem] mt-1 h-9 px-3 rounded-full text-[13px] font-bold text-[#a02c2c] hover:bg-[#a02c2c]/8 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> ყველასთვის წაშლა
          </button>
        )}
      </li>
    );
  };

  const part = (label: string, list: Notice[], isNew: boolean) => list.length > 0 && (
    <div className="mt-2 first:mt-0">
      <p className="px-1 mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#a4927c]">
        {label}
        {isNew && <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#c62828] text-white text-[11px] font-black leading-5 text-center tabular-nums">{list.length}</span>}
      </p>
      <ul className={`-mx-1 ${isNew ? 'space-y-1.5' : 'space-y-0.5'}`}>{list.map(n => row(n, isNew))}</ul>
    </div>
  );

  return (
    <section aria-label="შეტყობინებები">
      <h2 className="min-h-14 flex items-center gap-2">
        <Bell className="w-5 h-5 shrink-0 text-[#7a2028]" />
        <span className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">შეტყობინებები</span>
        {admin && !writing && (
          <button
            type="button"
            onClick={() => { triggerHaptic(8); setWriting(true); }}
            className="ml-auto shrink-0 h-9 px-3.5 rounded-full bg-[#7a2028]/10 hover:bg-[#7a2028]/15 text-[#7a2028] text-[13px] font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
          >
            <Megaphone className="w-4 h-4" /> ყველას მიწერა
          </button>
        )}
      </h2>

      {writing && (
        <div className="mb-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-3 space-y-2.5">
          <p className="text-[13px] font-bold text-[#8a7a6a]">ყველას მოუვა — აქაც და ტელეფონზეც</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            autoFocus
            placeholder="რა უნდა იცოდეს ყველამ?"
            className="w-full rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none px-3 py-2 text-[15px] text-[#2a2017] resize-none"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setWriting(false); setText(''); setErr(''); }}
              className="h-10 px-4 rounded-full text-[14px] font-bold text-[#8a7a6a] hover:bg-[#7a2028]/5 cursor-pointer"
            >
              გაუქმება
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy || !text.trim()}
              className="h-10 px-4 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-[14px] font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition disabled:opacity-50 disabled:cursor-default"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} გაგზავნა
            </button>
          </div>
        </div>
      )}
      {err && <p className="mb-2 text-sm text-[#a02c2c]">{err}</p>}

      {notices.length === 0 ? (
        <div className="py-7 flex flex-col items-center gap-2.5 text-center">
          <span className="w-14 h-14 rounded-full bg-[#f2e1de] text-[#7a2028] grid place-items-center"><BellOff className="w-6 h-6" /></span>
          <p className="text-[14px] font-bold text-[#8a7a6a]">ახალი არაფერია</p>
        </div>
      ) : (
        <>
          {part('ახალი', fresh, true)}
          {part(fresh.length ? 'ადრე' : 'ბოლო დღეები', older, false)}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#a4927c]">
            <ArrowLeftRight className="w-3.5 h-3.5" /> გვერდზე გაწიე — წაიშლება შენთვის
          </p>
        </>
      )}
    </section>
  );
};
