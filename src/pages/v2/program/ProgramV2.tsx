import React, { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { useNavigation } from '../../../context';
import { useNotes, shareProgramUrl } from '../../../context/NotesContext';
import { useAccess } from '../../../hooks/useAccess';
import { findVersion } from '../../../data/chantLookup';
import { versionMeta } from '../../../data/tsirvaChants';
import { LITURGY_TITLE, formatLiturgyDate, formatTime } from '../../../hooks/useLiturgy';
import { isOffline, onOfflineChange, saveOffline, estimateMb, offlineSupported } from '../../../utils/offlineNotes';
import { loadBookScore, saveBlob, type BookScore } from '../../../utils/chantSynth';
import { triggerHaptic } from '../../../utils/haptics';
import { offerUndo } from '../../../components/ui/kit';
import { ChantPicker } from '../../../components/teacher/ClassProgramPanel';
import { Button, Sheet } from '../../../components/ui2';
import { ProgramView } from './ProgramView';
import { TemplatesSheet } from './TemplatesSheet';
import { MoreSheet } from './MoreSheet';

// The new look's „დღევანდელი წირვა“: the same logic as pages/notes/ProgramPage.tsx (the old look keeps that drawing), drawn
// with the kit. Lies over the app like the old page (z 79, under the notes at 80).

const labelOf = (id: string) => {
  const info = findVersion(id);
  if (!info) return { title: id, sub: '' };
  const v = info.variant;
  const sub = v.version !== undefined ? versionMeta(info.chant.id, info.chant.title, v) : v.code;
  return { title: info.chant.title.replace(/[;\s]+$/, ''), sub };
};

export const ProgramV2: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
  const { closeProgram, openNotes, setChurch, liturgy, program, fromLink, leading, setLeading, following, setFollowing, liveTurn } = useNotes();
  const { navigateTo, openMapItem } = useNavigation();
  const aiOn = useAccess().on('aiTeacher');
  const regent = liturgy.role === 'teacher' && !fromLink;
  const items = program?.items ?? [];
  const [sheet, setSheet] = useState<'more' | 'tpl' | 'qr' | null>(null);
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null);
  const [, bump] = useState(0);
  const [toast, setToast] = useState('');
  const toastT = useRef(0);
  const [qrSvg, setQrSvg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => onOfflineChange(() => bump(n => n + 1)), []);
  const say = (msg: string, ms = 3200) => {
    setToast(msg);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(''), ms);
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

  // „გუნდი მომყვება“: one switch; a program the class has not got yet is sent first (it used to wait for a separate send)
  const lead = async (on: boolean) => {
    triggerHaptic(10);
    if (on && !liturgy.sentInSync) {
      try {
        setBusy('lead');
        await liturgy.send();
      } catch (err) {
        console.warn(err);
        say(liturgy.classes.length ? 'კლასს ვერ გაეგზავნა. შეამოწმე ინტერნეტი' : 'ჯერ ადმინის პანელში შექმენი კლასი', 4200);
        return;
      } finally { setBusy(null); }
    }
    setLeading(on);
    say(on ? 'გუნდი მოგყვება: რასაც გადაშლი, მათთანაც გადაიშლება' : 'გუნდი აღარ მოგყვება', 3600);
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
      const { scoresToPdf } = await import('../../../utils/scorePdf');
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

  const removeItem = (id: string) => {
    const before = items;
    liturgy.setItems(items.filter(x => x !== id));
    offerUndo(`„${labelOf(id).title}“ ამოღებულია`, () => liturgy.setItems(before));
  };
  const move = (from: number, to: number) => {
    const next = items.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    liturgy.setItems(next);
  };

  // the AI lesson of the Sunday's chants lives in „გზა“: leave the program first, then go there
  const openAi = () => {
    const go = () => { navigateTo('gz'); openMapItem('tsirva'); };
    if (window.history.state?.sgBase) { closeProgram(); go(); return; }
    // closing steps history back: go on once that step has landed (a timer in case it never fires)
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', once);
      window.setTimeout(go, 0);
    };
    window.addEventListener('popstate', once);
    closeProgram();
    window.setTimeout(once, 700);
  };

  const rows = items.map(id => ({ id, ...labelOf(id) }));
  const empty = !program
    ? (liturgy.role === 'guest' ? 'შედი საიტზე, რომ შენი კლასის პროგრამა ნახო.' : 'მასწავლებელს პროგრამა ჯერ არ გამოუგზავნია.')
    : undefined;
  const sentTime = program?.sentAt ? ` ${formatTime(program.sentAt)}` : '';
  const sentNote = fromLink
    ? 'გაზიარებული პროგრამა'
    : !regent && program?.sentAt ? `მასწავლებელმა გამოგზავნა ${formatTime(program.sentAt)}` : undefined;

  return (
    <div hidden={hidden} role="dialog" aria-modal="true" aria-label={LITURGY_TITLE}
      className="fixed inset-0 z-[79] overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col px-4">
        <ProgramView
          day={program ? formatLiturgyDate(program.date) : ''}
          className={program ? (program.className || (regent ? 'კლასი ჯერ არ არის' : 'ჩემი კლასი')) : undefined}
          rows={rows}
          regent={regent}
          empty={empty}
          ai={aiOn}
          send={{
            label: busy === 'send' ? 'იგზავნება…' : liturgy.sentInSync ? `გაგზავნილია${sentTime}` : 'გაუგზავნე კლასს',
            busy: busy === 'send',
            done: liturgy.sentInSync,
            note: !liturgy.sentInSync && program?.sentAt ? 'შეცვალე გაგზავნის მერე — ხელახლა გაუგზავნე, რომ კლასმაც ნახოს.' : undefined,
          }}
          sentNote={sentNote}
          live={!regent && liveTurn ? { title: labelOf(liveTurn.vid).title, following, onToggle: () => { triggerHaptic(8); setFollowing(!following); } } : null}
          lead={{
            on: leading,
            busy: busy === 'lead',
            sub: busy === 'lead' ? 'კლასს ეგზავნება…' : leading ? 'რასაც გადაშლი, კლასთანაც გადაიშლება'
              : liturgy.sentInSync ? 'ფურცლები ყველასთან გადაიშლება' : 'ჩართვისას პროგრამა კლასს გაეგზავნება',
            onChange: on => void lead(on),
          }}
          onBack={() => { triggerHaptic(8); closeProgram(); }}
          onMore={() => setSheet('more')}
          onOpen={id => { triggerHaptic(10); openNotes(id, 'program'); }}
          onRemove={removeItem}
          onMove={move}
          onAdd={() => setPicking(true)}
          onAi={openAi}
          onSend={send}
          onChurch={start}
        />
      </div>

      {program && (
        <MoreSheet
          open={sheet === 'more'}
          onClose={() => setSheet(null)}
          regent={regent}
          dateText={formatLiturgyDate(program.date)}
          dateValue={program.date}
          onDate={liturgy.setDate}
          classes={liturgy.classes.map(c => ({ id: c.id, name: c.name }))}
          classId={liturgy.classId}
          className={program.className}
          onClass={liturgy.setClassId}
          onTemplates={() => setSheet('tpl')}
          hasItems={items.length > 0}
          offline={{
            done: allOffline,
            busy: Boolean(dl),
            label: dl ? `ჩამოიწერება… ${dl.done}/${dl.total}` : allOffline ? 'ჩამოწერილია — ინტერნეტის გარეშეც გაიხსნება' : `~${estimateMb(items)} MB`,
          }}
          onOffline={() => void keepAll()}
          onQr={() => setSheet('qr')}
          onPdf={() => void makePdf()}
          pdfBusy={busy === 'pdf'}
        />
      )}
      <TemplatesSheet
        open={sheet === 'tpl'}
        templates={liturgy.templates.map(t => ({ name: t.name, count: t.items.length }))}
        canSave={items.length > 0}
        onClose={() => setSheet(null)}
        onUse={name => {
          const t = liturgy.templates.find(x => x.name === name);
          if (!t) return;
          liturgy.setItems(t.items);
          setSheet(null);
          say(`გამოყენებულია შაბლონი „${name}“`);
        }}
        onDelete={name => void liturgy.deleteTemplate(name)}
        onSave={name => { liturgy.saveTemplate(name).then(() => say(`შაბლონი „${name}“ შენახულია`), () => say('შენახვა ვერ მოხერხდა')); }}
      />
      <Sheet open={sheet === 'qr'} title="დღევანდელი წირვა · QR" onClose={() => setSheet(null)}>
        <div className="mx-auto w-full max-w-[260px] rounded-card bg-surf p-4 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <Button kind="ghost" full icon={<Copy />} onClick={copyUrl}>ბმულის კოპირება</Button>
      </Sheet>

      {picking && <ChantPicker picked={items} onToggle={id => liturgy.toggle(id)} onClose={() => setPicking(false)} />}

      {toast && (
        <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(24px,env(safe-area-inset-bottom))] z-[90] flex justify-center px-4">
          <span className="max-w-[480px] rounded-full bg-ink px-5 py-3 text-center text-meta font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
};
