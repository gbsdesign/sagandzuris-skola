// "დღევანდელი წირვა": the teacher's program for the service. The teacher dates it, orders it (drag the dots),
// keeps templates, shows a QR code, makes one PDF and sends it to a class; everyone can start the service
// in church mode or keep the whole program on the phone for singing without internet.
import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays, PenLine, Check, Radio, ChevronLeft, CloudDownload, Copy, FileText, GripVertical, Headphones, Church, Plus, QrCode, Send, Trash2, Users, X, LayoutTemplate, CircleCheck,
} from 'lucide-react';
import './notes.css';
import './program.css';
import { useNotes, shareProgramUrl } from '../../context/NotesContext';
import { findVersion } from '../../data/chantLookup';
import { versionMeta } from '../../data/tsirvaChants';
import { getChantMedia } from '../../data/chantMediaRegistry';
import { formatLiturgyDate, formatTime } from '../../hooks/useLiturgy';
import { isOffline, onOfflineChange, saveOffline, estimateMb, offlineSupported } from '../../utils/offlineNotes';
import { loadBookScore, saveBlob, BookScore } from '../../utils/chantSynth';
import { GrapeBunch } from '../../components/home/PlateOrnaments';
import { triggerHaptic } from '../../utils/haptics';
import { ChantPicker } from '../../components/teacher/ClassProgramPanel';

const labelOf = (id: string) => {
  const info = findVersion(id);
  if (!info) return { title: id, sub: '' };
  const v = info.variant;
  const sub = v.version !== undefined ? versionMeta(info.chant.id, info.chant.title, v) : v.code;
  return { title: info.chant.title.replace(/[;\s]+$/, ''), sub, rec: Boolean(getChantMedia(info.chant.id, v.code)) };
};

export const ProgramPage: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
  const { closeProgram, openNotes, setChurch, liturgy, program, fromLink, leading, setLeading, following, setFollowing, liveTurn } = useNotes();
  const regent = liturgy.role === 'teacher' && !fromLink;
  const items = program?.items ?? [];
  const [sheet, setSheet] = useState<'tpl' | 'qr' | null>(null);
  const [tplName, setTplName] = useState('');
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null);
  const [, bump] = useState(0);
  const [toast, setToast] = useState<{ msg: string; on: boolean }>({ msg: '', on: false });
  const toastT = useRef(0);
  const [qrSvg, setQrSvg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => onOfflineChange(() => bump(n => n + 1)), []);
  const say = (msg: string, ms = 3000) => {
    setToast({ msg, on: true });
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(t => ({ ...t, on: false })), ms);
  };

  const allOffline = items.length > 0 && items.every(isOffline);
  const keepAll = async () => {
    if (!items.length) return;
    if (allOffline) { say('უკვე ჩამოწერილია: ტაძარში ინტერნეტის გარეშეც გაიხსნება'); return; }
    if (!offlineSupported()) { say('ამ ბრაუზერში ჩამოწერა ვერ მუშაობს'); return; }
    triggerHaptic(10);
    setDl({ done: 0, total: items.filter(id => !isOffline(id)).length });
    await saveOffline(items, (done, total) => setDl({ done, total }));
    setDl(null);
    say(items.every(isOffline) ? 'ჩამოწერილია: ტაძარში ინტერნეტის გარეშეც გაიხსნება' : 'ნაწილი ვერ ჩამოიწერა. შეამოწმე ინტერნეტი და სცადე თავიდან', 4200);
  };

  const start = () => {
    if (!items.length) { say('პროგრამა ცარიელია'); return; }
    triggerHaptic(14);
    setChurch(true);
    openNotes(items[0], 'program');
  };

  const send = async () => {
    triggerHaptic(12);
    try {
      setBusy('send');
      const name = await liturgy.send();
      say(`გაეგზავნა „${name}“: ყველა წევრი ამ პროგრამას დაინახავს`, 4000);
    } catch (err) {
      console.warn(err);
      say(liturgy.classes.length ? 'გაგზავნა ვერ მოხერხდა. შეამოწმე ინტერნეტი' : 'ჯერ ადმინის პანელში შექმენი კლასი', 4200);
    } finally { setBusy(null); }
  };

  const makePdf = async () => {
    if (!items.length) return;
    triggerHaptic(10);
    setBusy('pdf');
    try {
      const scores: BookScore[] = [];
      for (const id of items) {
        const v = findVersion(id)?.variant;
        if (v?.bookNums?.length) scores.push(await loadBookScore(v.bookNums[0], v.book));
      }
      const { scoresToPdf } = await import('../../utils/scorePdf');
      const title = `დღევანდელი წირვა — ${formatLiturgyDate(program!.date)}`;
      saveBlob(await scoresToPdf(scores, title), `${title}.pdf`);
    } catch (err) {
      console.warn(err);
      say('PDF ვერ შეიქმნა. შეამოწმე ინტერნეტი და სცადე თავიდან');
    } finally { setBusy(null); }
  };

  const url = program ? shareProgramUrl(program) : '';
  useEffect(() => {
    if (sheet !== 'qr' || !url) return;
    let alive = true;
    import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      if (alive) setQrSvg(qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }));
    }).catch(() => alive && setQrSvg(''));
    return () => { alive = false; };
  }, [sheet, url]);
  const copyUrl = () => {
    try { navigator.clipboard.writeText(url).then(() => say('ბმული დაკოპირდა'), () => say('მონიშნე ბმული და დააკოპირე')); } catch { say('მონიშნე ბმული და დააკოპირე'); }
  };

  const removeItem = (id: string, li: HTMLElement) => {
    triggerHaptic(10);
    const done = () => liturgy.setItems(items.filter(x => x !== id));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else li.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-30px)' }], { duration: 200 }).onfinish = done;
  };

  // drag the dots to change the order
  const startDrag = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!regent) return;
    e.preventDefault();
    const h = e.currentTarget;
    const li = h.closest('li') as HTMLLIElement;
    const rows = [...listRef.current!.querySelectorAll<HTMLLIElement>('li.pp-row')];
    const from = rows.indexOf(li);
    const step = li.offsetHeight + 8, y0 = e.clientY;
    let to = from;
    li.classList.add('drag');
    try { h.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - y0;
      li.style.transform = `translateY(${dy}px)`;
      to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / step)));
      rows.forEach((r, j) => {
        if (r === li) return;
        const off = j > from && j <= to ? -step : j < from && j >= to ? step : 0;
        r.style.transform = off ? `translateY(${off}px)` : '';
      });
    };
    const up = () => {
      h.removeEventListener('pointermove', move);
      h.removeEventListener('pointerup', up);
      h.removeEventListener('pointercancel', up);
      rows.forEach(r => { r.style.transform = ''; });
      li.classList.remove('drag');
      if (to !== from) {
        const next = items.slice();
        const [it] = next.splice(from, 1);
        next.splice(to, 0, it);
        liturgy.setItems(next);
        triggerHaptic(10);
      }
    };
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', up);
  };

  // „+ საგალობლის დამატება“: the chants open right here, in a window over the program

  const sentNote = fromLink
    ? 'გაზიარებული პროგრამა'
    : regent
      ? (liturgy.sentInSync && program?.sentAt ? `გაგზავნილია ${formatTime(program.sentAt)}` : program?.sentAt ? 'შეცვლილია, ჯერ არ გაგზავნილა' : 'ჯერ არ გაგზავნილა')
      : program?.sentAt ? `მასწავლებელმა გამოგზავნა ${formatTime(program.sentAt)}` : '';

  return (
    <div className="np-root pp-root" hidden={hidden} role="dialog" aria-modal="true" aria-label="დღევანდელი წირვა">
      <div className="pp-scroll">
        <header className="pp-top">
          <button type="button" className="np-back" onClick={() => { triggerHaptic(8); closeProgram(); }} aria-label="უკან"><ChevronLeft strokeWidth={2.4} /></button>
          <h1>დღევანდელი წირვა</h1>
          <GrapeBunch color="#c4262e" curls className="pp-top-orn orn-in orn-swing" />
        </header>
        <div className="pp-wrap">
          {!program ? (
            <p className="pp-empty">
              {liturgy.role === 'guest' ? 'შედი საიტზე, რომ შენი კლასის პროგრამა ნახო.' : 'მასწავლებელს პროგრამა ჯერ არ გამოუგზავნია.'}
            </p>
          ) : (
            <>
              <div className="pp-head">
                <label className="pp-chip date">
                  <CalendarDays />
                  <span>{formatLiturgyDate(program.date)}</span>
                  {regent && <PenLine className="pen" aria-hidden />}
                  {regent && <input type="date" value={program.date} onChange={e => e.target.value && liturgy.setDate(e.target.value)} aria-label="თარიღი" />}
                </label>
                <span className="pp-chip class">
                  <Users />
                  {regent && liturgy.classes.length > 1 ? (
                    <select value={liturgy.classId ?? ''} onChange={e => liturgy.setClassId(e.target.value)} aria-label="რომელ კლასს">
                      {liturgy.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <span>{program.className || (regent ? 'კლასი ჯერ არ არის' : 'ჩემი კლასი')}</span>
                  )}
                  {sentNote && <span className={`pp-sent ${liturgy.sentInSync || !regent ? 'ok' : ''}`}>{sentNote}</span>}
                </span>
              </div>

              <div className={`pp-actions ${regent ? 'three' : 'two'}`}>
                {regent && <button type="button" className="pp-act" onClick={() => setSheet('tpl')}><LayoutTemplate /><span>შაბლონები</span></button>}
                <button type="button" className="pp-act" onClick={() => setSheet('qr')} disabled={!items.length}><QrCode /><span>QR კოდი</span></button>
                <button type="button" className="pp-act" onClick={makePdf} disabled={!items.length || busy === 'pdf'}><FileText /><span>{busy === 'pdf' ? 'მზადდება…' : 'PDF'}</span></button>
              </div>

              {/* the teacher's main step: sending the list to the class (bright while the class has an older one) */}
              {regent && (
                <button type="button" className={`pp-send ${liturgy.sentInSync ? 'done' : ''}`} onClick={send} disabled={!items.length || busy === 'send'}>
                  {liturgy.sentInSync ? <CircleCheck /> : <Send />}
                  <span>{busy === 'send' ? 'იგზავნება…' : liturgy.sentInSync ? 'კლასს გაგზავნილია' : 'კლასს გაგზავნა'}</span>
                </button>
              )}

              <button type="button" className="pp-primary" onClick={start} disabled={!items.length}><Church /><span>წირვის დაწყება · ტაძრის რეჟიმი</span></button>
              <button type="button" className={`pp-secondary ${allOffline ? 'done' : ''}`} onClick={keepAll} disabled={!items.length || Boolean(dl)}>
                {allOffline ? <CircleCheck /> : <CloudDownload />}
                <span>{dl ? `ჩამოიწერება… ${dl.done}/${dl.total}` : allOffline ? 'ჩამოწერილია' : `ჩამოწერა ოფლაინისთვის · ~${estimateMb(items)} MB`}</span>
                {dl && <i className="pp-bar" style={{ width: `${(100 * dl.done) / Math.max(1, dl.total)}%` }} />}
              </button>

              {/* „გუნდი მომყვება“: the teacher's page turns open the same chant on the class's phones */}
              {regent && (
                <button type="button" className={`pp-secondary pp-lead ${leading ? 'on' : ''}`} disabled={!program.sentAt}
                  onClick={() => { triggerHaptic(10); setLeading(!leading); say(leading ? 'გუნდი აღარ მოგყვება' : 'გუნდი მოგყვება: რასაც გადაშლი, მათთანაც გადაიშლება', 3600); }}>
                  <Radio />
                  <span>{leading ? 'გუნდი მოგყვება · გამორთვა' : program.sentAt ? 'გუნდი მომყვება — ფურცლები ყველასთან გადაიშლება' : 'გუნდი მომყვება — ჯერ კლასს გაუგზავნე'}</span>
                </button>
              )}
              {!regent && liveTurn && (
                <div className="pp-live">
                  <Radio />
                  <span className="tx"><b>რეგენტი ახლა:</b> {labelOf(liveTurn.vid).title}</span>
                  <button type="button" className={following ? 'on' : ''} onClick={() => { triggerHaptic(8); setFollowing(!following); }} aria-pressed={following}>
                    {following ? 'მივყვები' : 'მიყოლა'}
                  </button>
                </div>
              )}

              <ol ref={listRef} className="pp-list">
                {!items.length && (
                  <li className="pp-empty">პროგრამა ცარიელია.</li>
                )}
                {items.map((id, i) => {
                  const l = labelOf(id);
                  return (
                    <li key={id} className="pp-row" style={{ animationDelay: `${i * 40}ms` }}>
                      <span className="pp-num">{i + 1}</span>
                      <button type="button" className="pp-open" onClick={() => { triggerHaptic(10); openNotes(id, 'program'); }}>
                        <b>{l.title}</b><small>{l.sub}</small>
                      </button>
                      <span className="pp-icons">
                        {l.rec && <Headphones className="r" aria-label="ჩანაწერი" />}
                        {isOffline(id) && <CircleCheck className="ok" aria-label="ჩამოწერილია" />}
                      </span>
                      {regent && <button type="button" className="pp-x" onClick={e => removeItem(id, e.currentTarget.closest('li')!)} aria-label="ამოღება"><X /></button>}
                      {regent && <span className="pp-drag" onPointerDown={startDrag} aria-label="გადაადგილება" title="გადაადგილება"><GripVertical /></span>}
                    </li>
                  );
                })}
              </ol>
              {regent && <button type="button" className="pp-add" onClick={() => setPicking(true)}><Plus /><span>საგალობლის დამატება</span></button>}
            </>
          )}
        </div>
      </div>

      {sheet && <div className="pp-ov" onClick={() => setSheet(null)} />}
      {sheet === 'tpl' && (
        <div className="pp-sheet" role="dialog" aria-label="შაბლონები">
          <div className="pp-grip" />
          <button type="button" className="pp-close" onClick={() => setSheet(null)} aria-label="დახურვა"><X /></button>
          <h3>შაბლონები</h3>
          {!liturgy.templates.length && <p className="pp-sub">შაბლონები ჯერ არ გაქვს.</p>}
          {liturgy.templates.map(t => (
            <div key={t.name} className="pp-tpl">
              <span className="tx"><b>{t.name}</b><small>{t.items.length} საგალობელი</small></span>
              <button type="button" className="use" onClick={() => { liturgy.setItems(t.items); setSheet(null); say(`გამოყენებულია შაბლონი „${t.name}“`); }}>გამოყენება</button>
              <button type="button" className="del" onClick={() => liturgy.deleteTemplate(t.name)} aria-label={`„${t.name}“ წაშლა`}><Trash2 /></button>
            </div>
          ))}
          <form className="pp-tpl-save" onSubmit={e => {
            e.preventDefault();
            const name = tplName.trim();
            if (!name) { say('ჯერ დაარქვი სახელი'); return; }
            if (!items.length) { say('პროგრამა ცარიელია'); return; }
            liturgy.saveTemplate(name).then(() => say(`შაბლონი „${name}“ შენახულია`), () => say('შენახვა ვერ მოხერხდა'));
            setTplName('');
          }}>
            <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="ახალი შაბლონის სახელი" autoComplete="off" />
            <button type="submit"><Check /> შენახვა</button>
          </form>
        </div>
      )}
      {sheet === 'qr' && (
        <div className="pp-sheet" role="dialog" aria-label="QR კოდი">
          <div className="pp-grip" />
          <button type="button" className="pp-close" onClick={() => setSheet(null)} aria-label="დახურვა"><X /></button>
          <h3>დღევანდელი წირვა · QR</h3>
          <div className="pp-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div className="pp-link"><button type="button" onClick={copyUrl}><Copy /> ბმულის კოპირება</button></div>
        </div>
      )}

      {picking && <ChantPicker picked={items} onToggle={id => liturgy.toggle(id)} onClose={() => setPicking(false)} />}

      <div className={`np-toast ${toast.on ? 'on' : ''}`} role="status" aria-live="polite"><span>{toast.msg}</span></div>
    </div>
  );
};
