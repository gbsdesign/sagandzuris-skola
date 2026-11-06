import React, { useState } from 'react';
import { Bell, ChevronRight, Loader2, Megaphone, MessageCircle, Pin, Send, Sparkles, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { askConfirm } from '../ui/kit';
import { ClassLogo } from '../classes/ClassLogo';
import { Notice, deleteAnnouncement, sendAnnouncement } from '../../hooks/useNotices';

// The header's 🔔 and the list it drops down (hooks/useNotices.ts says what comes there). New since the last look =
// a soft wine row with its time in bold; a message opens its chat, a notice or a piece of news unfolds in place. An admin
// writes to everyone from the list's head („ყველას მიწერა“) and may take a notice back (🗑).

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

export const BellPanel: React.FC<{
  notices: Notice[];
  /** the last look before this one: what is newer shows as new */
  seenBefore: number;
  /** an admin: writes to everyone, takes a notice back */
  admin?: { uid: string; name: string };
  onOpenChat: (chat: string) => void;
}> = ({ notices, seenBefore, admin, onOpenChat }) => {
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
      await sendAnnouncement(admin.uid, admin.name, text);
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

  return (
    <section aria-label="შეტყობინებები">
      <h2 className="min-h-12 flex items-center gap-2">
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
          <p className="text-[13px] font-bold text-[#8a7a6a]">ყველას მოუვა, ვინც შესულია საიტზე</p>
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
        <p className="py-6 text-center text-[14px] text-[#8a7a6a]">ახალი არაფერია.</p>
      ) : (
        <ul className="-mx-2 space-y-1">
          {notices.map(n => {
            const fresh = n.at > seenBefore;
            const opens = !!n.chat;
            const open = unfolded === n.id;
            return (
              <li key={n.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    if (n.chat) onOpenChat(n.chat);
                    else setUnfolded(open ? null : n.id);
                  }}
                  aria-expanded={opens ? undefined : open}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-2xl text-left cursor-pointer transition-colors ${
                    fresh ? 'bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/10' : 'hover:bg-[#7a2028]/5'
                  }`}
                >
                  <span className="shrink-0"><Mark n={n} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 truncate text-[14.5px] font-bold text-[#4a3426]">{n.who}</span>
                      <span className={`ml-auto shrink-0 text-[12px] tabular-nums ${fresh ? 'font-bold text-[#7a2028]' : 'text-[#a4927c]'}`}>{whenText(n.at)}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-[#8a7a6a] min-w-0">
                      {n.card && <Pin className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{n.kind === 'class' && n.cls ? `${n.card ? 'შენთვის' : PLACE.class} · ${n.cls.name}` : PLACE[n.kind]}</span>
                    </span>
                    <span className={`mt-0.5 text-[14px] leading-snug text-[#2a2017] whitespace-pre-line break-words ${open ? 'block' : 'line-clamp-2'}`}>{n.text}</span>
                  </span>
                  {opens && <ChevronRight className="w-5 h-5 shrink-0 self-center text-[#c4b49c]" />}
                </button>
                {admin && n.kind === 'all' && open && (
                  <button
                    type="button"
                    onClick={() => takeBack(n)}
                    className="ml-[3.75rem] mb-1 h-9 px-3 rounded-full text-[13px] font-bold text-[#a02c2c] hover:bg-[#a02c2c]/8 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> ყველასთვის წაშლა
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
