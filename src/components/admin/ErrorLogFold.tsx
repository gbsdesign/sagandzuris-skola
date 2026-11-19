import React, { useState } from 'react';
import { Bug, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { clearErrorLog, deleteError, useErrorLog, type ErrorEntry, type ErrorKind } from '../../utils/errorLog';
import { shortDate } from '../../utils/dateNames';
import { errorText } from '../../utils/errorText';
import { askConfirm, Btn } from '../ui/kit';
import { Fold } from './Fold';

// ⚙ „სკოლა“ → „შეცდომების ჟურნალი“ (admins): what broke on members' phones, on which page and how many times, the
// newest first (utils/errorLog.ts writes it, without names). A line unfolds its details; admins delete or clear.

const PAGE = 30;

const PAGE_NAME: Record<string, string> = {
  home: 'მთავარი', gz: 'საგანძურის გზა', galoba: 'ღვთისმსახურება', medavitneoba: 'ღვთისმსახურება · მედავითნე',
  class: 'კლასი', messages: 'წერილები', dm: 'წერილი', prayers: 'ლოცვანი', prayer: 'ლოცვანი', biblioteka: 'ბიბლიოთეკა',
  games: 'სახალისო', profile: 'პროფილი', admin: 'ადმინის პანელი', simghera: 'ხალხური', sakravebi: 'ხალხური',
  mtkmeli: 'მთქმელი', videos: 'მთქმელი · ვიდეოები', churches: 'ტაძრები', abituri: 'აბიტურიენტს', psalter: 'ფსალმუნთა ჯგუფი',
  student: 'მოსწავლის გვერდი', birthdays: 'დაბადების დღეები', commemoration: 'მოსახსენებელი', tsinaprebi: 'წინაპრები',
  teacher: 'კლასი', pending: 'მოლოდინი', offline: 'მთავარი',
};
export const pageName = (id: string) => (id ? PAGE_NAME[id] || id : 'უცნობი გვერდი');

const DEVICE: Record<string, string> = {
  'android-app': 'Android-ის აპი', 'ios-app': 'iPhone-ის აპი', android: 'Android-ის ბრაუზერი', ios: 'iPhone-ის ბრაუზერი', desktop: 'კომპიუტერი',
};
export const deviceName = (dev: string) => DEVICE[dev.split(' ')[0]] || dev || 'უცნობი';

export const ERROR_KIND: Record<ErrorKind, string> = {
  error: 'შეცდომა', promise: 'დაუსრულებელი მოქმედება', react: 'ეკრანი ვერ დაიხატა', report: 'შენახვა ან ჩატვირთვა ვერ მოხერხდა',
};

export const errorWhen = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${shortDate(iso)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const Line: React.FC<{ l: ErrorEntry; onMessage: (text: string, type: 'success' | 'error') => void }> = ({ l, onMessage }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try { await deleteError(l.id); } catch (e) { onMessage(errorText(e), 'error'); setBusy(false); }
  };
  return (
    <li className="border-b border-[#f1e8d9] last:border-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 py-2 text-left min-h-[44px]">
        <span className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-[#f4ece0] text-[#7a5a3a] flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4"><Bug /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-[#2a2017] leading-snug break-words line-clamp-2">{l.msg}</span>
          <span className="block text-[12px] text-[#8a7a6a] leading-snug mt-0.5">
            {pageName(l.where)} · {l.count}-ჯერ · ბოლოს {errorWhen(l.last)} · {deviceName(l.dev)}
          </span>
        </span>
        <ChevronDown className={`mt-2 w-4 h-4 shrink-0 text-[#8a7a6a] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-3 pl-11 space-y-1.5 text-[12.5px] text-[#5a4a3a]">
          <p>{ERROR_KIND[l.kind] || l.kind} · პირველად: {errorWhen(l.first)}{l.ver ? ` · ვერსია: ${l.ver}` : ''}</p>
          {l.stack && (
            <pre className="text-[12px] leading-snug bg-[#faf6ef] border border-[#efe5d6] rounded-lg p-2 overflow-x-auto whitespace-pre font-mono text-[#4a3a2a]">{l.stack}</pre>
          )}
          <Btn size="sm" kind="ghost" icon={busy ? <Loader2 className="animate-spin" /> : <Trash2 />} disabled={busy} onClick={remove}>წაშლა</Btn>
        </div>
      )}
    </li>
  );
};

export const ErrorLogFold: React.FC<{ onMessage: (text: string, type: 'success' | 'error') => void }> = ({ onMessage }) => {
  const [count, setCount] = useState(PAGE);
  const { lines, loading } = useErrorLog(true, 100);
  const [clearing, setClearing] = useState(false);
  const last = lines[0];
  const clear = async () => {
    const ok = await askConfirm({ title: 'ჟურნალი მთლიანად გასუფთავდეს?', ok: 'გასუფთავება', danger: true });
    if (!ok) return;
    setClearing(true);
    try {
      await clearErrorLog(lines.map(l => l.id));
      onMessage('ჟურნალი გასუფთავდა.', 'success');
    } catch (e) {
      onMessage(errorText(e), 'error');
    } finally {
      setClearing(false);
    }
  };
  return (
    <Fold icon={<Bug />} title="შეცდომების ჟურნალი"
      summary={loading ? '…' : last ? `ბოლო: ${errorWhen(last.last)} · ${lines.length} სახის შეცდომა` : 'ჯერ ცარიელია'}
      info="აქ ჩანს, რა გაფუჭდა წევრებთან: რა, რომელ გვერდზე და რამდენჯერ. სახელები არ იწერება.">
      {lines.length === 0 ? (
        <p className="py-1 text-[13px] text-[#8a7a6a]">{loading ? 'იტვირთება…' : 'ჯერ არაფერი გაფუჭებულა. თუ ვინმესთან აპი შეფერხდება, აქ გამოჩნდება.'}</p>
      ) : (
        <>
          <ul>{lines.slice(0, count).map(l => <Line key={l.id} l={l} onMessage={onMessage} />)}</ul>
          <div className="pt-2 flex flex-wrap gap-2">
            {lines.length > count && <Btn size="sm" kind="ghost" onClick={() => setCount(c => c + PAGE)}>მეტის ჩვენება</Btn>}
            <Btn size="sm" kind="ghost" icon={clearing ? <Loader2 className="animate-spin" /> : <Trash2 />} disabled={clearing} onClick={clear}>ჟურნალის გასუფთავება</Btn>
          </div>
        </>
      )}
    </Fold>
  );
};
